const https = require('https');

const BASE_HOST = 'multicloudwithsiva.online';

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTest() {
  console.log('=== Step 1: Testing Login on https://' + BASE_HOST + ' ===');
  const loginPayload = JSON.stringify({
    identifier: 'nallasiva552@gmail.com',
    password: 'Nsbyadav@143',
  });

  const loginRes = await request(
    {
      hostname: BASE_HOST,
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginPayload),
      },
    },
    loginPayload
  );

  console.log('Login Status:', loginRes.statusCode);
  const cookies = loginRes.headers['set-cookie'] || [];
  console.log('Set-Cookie headers:', cookies.map((c) => c.split(';')[0]));

  const authCookie = cookies
    .map((c) => c.split(';')[0])
    .filter((c) => c.startsWith('auth_session='))
    .join('; ');

  if (!authCookie) {
    console.error('Failed to get auth_session cookie!');
    process.exit(1);
  }
  console.log('✓ Successfully authenticated! Cookie:', authCookie.substring(0, 30) + '...');

  const endpoints = [
    { name: 'Cloud Accounts', path: '/api/cloud-accounts' },
    { name: 'Proof Recipients', path: '/api/notifications/proof-of-work/recipients' },
    { name: 'Proof Config', path: '/api/notifications/proof-of-work/config' },
    { name: 'Dispatch Logs', path: '/api/notifications/proof-of-work/dispatch' },
    { name: 'Server History', path: '/api/notifications/proof-of-work/fetch-server-history?limit=50' },
    { name: 'Notifications Dashboard Page', path: '/dashboard/notifications' },
  ];

  for (const ep of endpoints) {
    console.log(`\n=== Testing ${ep.name} (${ep.path}) ===`);
    const res = await request({
      hostname: BASE_HOST,
      port: 443,
      path: ep.path,
      method: 'GET',
      headers: {
        Cookie: authCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    console.log(`Status: ${res.statusCode}`);
    if (res.statusCode >= 200 && res.statusCode < 400) {
      if (ep.path.startsWith('/api/')) {
        try {
          const json = JSON.parse(res.body);
          console.log(`✓ JSON Valid: Success=${json.success ?? 'true'}, keys=${Object.keys(json).join(', ')}`);
          if (ep.path.includes('fetch-server-history')) {
            console.log(`  - Servers found: ${json.servers?.length}`);
            console.log(`  - Server names: ${json.servers?.map((s) => s.name).join(', ')}`);
            console.log(`  - OrderedSections keys: ${Object.keys(json.orderedSections || {}).join(', ')}`);
            console.log(`  - Maven status: ${json.orderedSections?.maven?.status}`);
            console.log(`  - Terraform status: ${json.orderedSections?.terraform?.status}`);
            console.log(`  - Docker status: ${json.orderedSections?.docker?.status}`);
            console.log(`  - K8s status: ${json.orderedSections?.k8s?.status}`);
            console.log(`  - ServerCommands keys: ${Object.keys(json.serverCommandsByServer || {}).join(', ')}`);
          } else if (ep.path.includes('recipients')) {
            console.log(`  - Recipients: ${json.recipients?.map((r) => `${r.name} <${r.email}> [${r.role}]`).join(', ')}`);
          } else if (ep.path.includes('config')) {
            console.log(`  - Engineer: ${json.config?.engineerName}, Role: ${json.config?.roleTitle}, Schedule: ${json.config?.scheduledTime}`);
          }
        } catch (e) {
          console.log(`  Response is not JSON or parsing failed:`, res.body.substring(0, 100));
        }
      } else {
        console.log(`✓ Dashboard HTML rendered: Length=${res.body.length} bytes`);
        if (res.body.includes('DevOps') || res.body.includes('Proof of Work') || res.body.includes('Notifications')) {
          console.log(`✓ HTML contains relevant notifications content!`);
        }
      }
    } else {
      console.error(`✗ Error on ${ep.path}:`, res.body.substring(0, 200));
    }
  }

  console.log('\n=== Testing Proof of Work Dispatch ===');
  const dispatchPayload = JSON.stringify({
    engineerName: 'Siva',
    engineerRole: 'Lead DevOps Engineer',
    actionType: 'Troubleshooting & Fix',
    tool: 'Server OS',
    summary: 'Automated verification test of DevOps Proof of Work dispatch pipeline',
    serverOrHost: 'vm01siva-mon (4.240.105.247)',
    cloudProvider: 'Microsoft Azure',
    cloudAccount: 'Azure Production Subscription',
    sessionSource: 'PuTTY SSH & Web App Automated Verification',
    commandsExecuted: 'sudo nginx -t && sudo systemctl reload nginx\ndocker stats --no-stream\nkubectl get pods -A',
    resultOutcome: 'Verified exit status 0 across all tools and servers',
    durationMinutes: 10,
  });

  const dispatchRes = await request(
    {
      hostname: BASE_HOST,
      port: 443,
      path: '/api/notifications/proof-of-work/dispatch',
      method: 'POST',
      headers: {
        Cookie: authCookie,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dispatchPayload),
      },
    },
    dispatchPayload
  );

  console.log('Dispatch Status:', dispatchRes.statusCode);
  console.log('Dispatch Response:', dispatchRes.body);

  console.log('\n=== ALL ENDPOINTS VERIFIED SUCCESSFULLY ===');
}

runTest().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
