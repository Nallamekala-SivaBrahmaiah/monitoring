const { Client } = require('ssh2');

const host = process.env.REMOTE_HOST || '4.240.105.247';
const username = process.env.REMOTE_USER || 'siva';
const password = process.env.REMOTE_PASSWORD || 'Nsbyadav@143';
const cmd = process.argv.slice(2).join(' ') || 'hostname && uptime';

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
  readyTimeout: 10000,
});
