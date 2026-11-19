const mongoose = require('mongoose');
const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('ssh2');
const crypto = require('crypto');

const uri = process.env.MONGODB_URI || 'mongodb+srv://nallasiva552_db_user:jGgTAPA9SGxTEYi0@monitoring.a7drjbi.mongodb.net/monitoring?retryWrites=true&w=majority';

function decryptSecret(data) {
  const encKey = process.env.ENCRYPTION_KEY || 'multi-cloud-monitoring-master-sec-key-2026';
  const key = crypto.createHash('sha256').update(String(encKey)).digest();
  const iv = Buffer.from(data.iv, 'hex');
  const tag = Buffer.from(data.tag, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function runRemoteCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('data', d => stdout += d.toString());
      stream.stderr.on('data', d => stderr += d.toString());
      stream.on('close', code => resolve({ code, stdout, stderr }));
    });
  });
}

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // 1. First configure OS firewall on Azure VM
  const s = await db.collection('servers').findOne({ host: '20.40.49.224' }) || await db.collection('servers').findOne({ name: 'azure' });
  if (s && s.encryptedAuthSecret) {
    console.log(`Connecting via SSH to Azure VM (${s.host}) to configure OS firewall...`);
    const secret = decryptSecret({
      encrypted: s.encryptedAuthSecret,
      iv: s.authSecretIv,
      tag: s.authSecretTag,
    });

    const conn = new Client();
    await new Promise((resolve, reject) => {
      conn.on('ready', resolve);
      conn.on('error', reject);
      conn.connect({
        host: s.host,
        port: s.port || 22,
        username: s.username,
        password: secret,
        readyTimeout: 15000,
      });
    });

    const pwB64 = Buffer.from(secret).toString('base64');
    const fwCmd = `
echo "${pwB64}" | base64 -d | sudo -S ufw status || true
echo "${pwB64}" | base64 -d | sudo -S ufw allow 3000:3010/tcp || true
echo "${pwB64}" | base64 -d | sudo -S ufw allow 5000:5010/tcp || true
echo "${pwB64}" | base64 -d | sudo -S ufw allow 8080/tcp || true
echo "${pwB64}" | base64 -d | sudo -S ufw allow 80/tcp || true
echo "${pwB64}" | base64 -d | sudo -S ufw allow 443/tcp || true
echo "${pwB64}" | base64 -d | sudo -S ufw allow 5431:5435/tcp || true
echo "${pwB64}" | base64 -d | sudo -S ufw disable || true
echo "OS firewall status:"
echo "${pwB64}" | base64 -d | sudo -S ufw status || true
`;
    const fwRes = await runRemoteCommand(conn, fwCmd);
    console.log('OS Firewall Result:\n', fwRes.stdout);
    conn.end();
  }

  // 2. Configure Azure Network Security Group (NSG) via Azure ARM REST API
  const acc = await db.collection('cloudaccounts').findOne({ provider: 'azure' });
  if (!acc) {
    console.error('Azure Cloud Account not found in database!');
    process.exit(1);
  }

  const subscriptionId = acc.subscriptionId || acc.azureSubscriptionId;
  const tenantId = acc.tenantId || acc.azureTenantId;
  const clientId = acc.clientId || acc.azureClientId;
  const clientSecret = acc.clientSecret || acc.azureClientSecret;

  console.log(`Authenticating with Azure AD (Tenant: ${tenantId}, Client: ${clientId})...`);
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const token = await credential.getToken('https://management.azure.com/.default');

  if (!token || !token.token) {
    throw new Error('Failed to acquire Azure access token');
  }

  console.log('Acquired Azure access token! Getting current rules for azure-nsg in resourceGroup rg01...');

  const nsgUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/rg01/providers/Microsoft.Network/networkSecurityGroups/azure-nsg?api-version=2023-09-01`;
  const nsgRes = await fetch(nsgUrl, {
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!nsgRes.ok) {
    const err = await nsgRes.text();
    throw new Error(`Failed to get NSG: ${nsgRes.status} - ${err}`);
  }

  const nsgData = await nsgRes.json();
  console.log('Current NSG Rules in azure-nsg:');
  (nsgData.properties?.securityRules || []).forEach(r => {
    console.log(` - Rule: ${r.name} | Priority: ${r.properties.priority} | Port: ${r.properties.destinationPortRange || r.properties.destinationPortRanges?.join(',')} | Access: ${r.properties.access}`);
  });

  // Now create/update Inbound Security Rule to open external ports
  console.log('Creating/Updating Inbound Rule: Allow_All_Docker_Apps (Priority 1020)...');
  const ruleUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/rg01/providers/Microsoft.Network/networkSecurityGroups/azure-nsg/securityRules/Allow_All_Docker_Apps?api-version=2023-09-01`;

  const ruleBody = {
    properties: {
      protocol: '*',
      sourcePortRange: '*',
      destinationPortRanges: [
        '80',
        '443',
        '3000-3010',
        '5000-5010',
        '8080',
        '5431-5435'
      ],
      sourceAddressPrefix: '*',
      destinationAddressPrefix: '*',
      access: 'Allow',
      priority: 1020,
      direction: 'Inbound',
      description: 'Allow external public inbound access to Docker frontend, backend, and database applications'
    }
  };

  const putRes = await fetch(ruleUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ruleBody),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`Failed to create NSG rule: ${putRes.status} - ${err}`);
  }

  const putData = await putRes.json();
  console.log('NSG Rule updated successfully! Provisioning state:', putData.properties?.provisioningState || 'Succeeded');

  console.log('Ports 80, 443, 3000-3010, 5000-5010, 8080, 5431-5435 are now OPEN to the public internet on 20.40.49.224!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

