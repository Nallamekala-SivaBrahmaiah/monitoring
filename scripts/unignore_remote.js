const { Client } = require('ssh2');
const conn = new Client();

const script = `
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
  const res = await db.collection('notificationpreferences').updateMany({}, { $set: { ignoredServers: [] } });
  console.log('CLEARED IGNORED SERVERS:', res);
  process.exit(0);
}
run();
`;

const b64 = Buffer.from(script).toString('base64');
conn.on('ready', () => {
  conn.exec(`echo "${b64}" | base64 -d > /home/siva/monitoring/unignore.js && cd /home/siva/monitoring && node unignore.js`, (err, stream) => {
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
