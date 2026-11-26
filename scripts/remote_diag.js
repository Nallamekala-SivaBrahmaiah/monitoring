const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();

const diagCode = `
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\\n');
let uri = '';
for (const line of lines) {
  if (line.startsWith('MONGODB_URI=')) {
    uri = line.replace('MONGODB_URI=', '').trim().replace(/^['"]|['"]$/g, '');
  }
}
const mongoose = require('mongoose');
async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const prefs = await db.collection('notificationpreferences').find().toArray();
  console.log('=== NOTIFICATION PREFS ===', JSON.stringify(prefs, null, 2));

  const devops = await db.collection('devopsrecipients').find().toArray();
  console.log('=== DEVOPS RECIPIENTS ===', JSON.stringify(devops, null, 2));

  const alerts = await db.collection('alerts').find().sort({ updatedAt: -1 }).limit(10).toArray();
  console.log('=== RECENT ALERTS ===', JSON.stringify(alerts.map(a => ({
    id: a._id,
    resourceName: a.resourceName,
    metricName: a.metricName,
    value: a.value,
    threshold: a.threshold,
    severity: a.severity,
    status: a.status,
    emailSentAt: a.emailSentAt,
    updatedAt: a.updatedAt
  })), null, 2));

  const servers = await db.collection('servers').find().toArray();
  console.log('=== SERVERS ===', JSON.stringify(servers.map(s => ({
    name: s.name,
    provider: s.provider,
    ip: s.ipAddress,
    metrics: s.metrics
  })), null, 2));

  process.exit(0);
}
run().catch(e => { console.error('DIAG ERROR:', e); process.exit(1); });
`;

const b64 = Buffer.from(diagCode).toString('base64');

conn.on('ready', () => {
  conn.exec(`echo "${b64}" | base64 -d > /home/siva/monitoring/diag.js && cd /home/siva/monitoring && node diag.js`, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({
  host: '4.240.105.247',
  port: 22,
  username: 'siva',
  password: process.env.REMOTE_SSH_PASSWORD || 'Nsbyadav@143'
});
