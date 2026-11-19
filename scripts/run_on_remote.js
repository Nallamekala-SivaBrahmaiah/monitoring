const fs = require('fs');
const { Client } = require('ssh2');

const host = process.env.REMOTE_HOST || '4.240.105.247';
const username = process.env.REMOTE_USER || 'siva';
const password = process.env.REMOTE_PASSWORD || 'Nsbyadav@143';

const fileToRun = process.argv[2];
if (!fileToRun) {
  console.error('Please specify a file to run on remote, e.g. node scripts/run_on_remote.js scripts/inspect_servers.js');
  process.exit(1);
}

const content = fs.readFileSync(fileToRun, 'utf8');
const base64Content = Buffer.from(content).toString('base64');
const targetPath = `/tmp/${require('path').basename(fileToRun)}`;

const cmd = `echo "${base64Content}" | base64 -d > ${targetPath} && NODE_PATH=/home/siva/monitoring/node_modules ENCRYPTION_KEY=multi-cloud-monitoring-master-sec-key-2026 node ${targetPath}`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      process.exit(1);
    }
    stream.on('close', (code, signal) => {
      conn.end();
      process.exit(code || 0);
    });
    stream.on('data', (data) => {
      process.stdout.write(data);
    });
    stream.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
});
conn.on('error', (err) => {
  console.error('Connection error:', err.message);
  process.exit(1);
});
conn.connect({
  host,
  port: 22,
  username,
  password,
  readyTimeout: 15000,
});

