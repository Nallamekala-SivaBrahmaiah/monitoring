const { Client } = require('ssh2');

const host = process.env.REMOTE_HOST || '4.240.105.247';
const username = process.env.REMOTE_USER || 'siva';
const password = process.env.REMOTE_PASSWORD || 'Nsbyadav@143';

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to production server. Pulling changes and deploying...');
  conn.exec(
    'cd /home/siva/monitoring && git pull origin main && npm install --prefer-offline && npm run build && pm2 reload monitoring-app',
    (err, stream) => {
      if (err) {
        console.error('Exec error:', err);
        conn.end();
        process.exit(1);
      }
      stream.on('close', (code, signal) => {
        console.log(`Deployment process finished with code ${code}`);
        conn.end();
        process.exit(code || 0);
      });
      stream.on('data', (data) => {
        process.stdout.write(data);
      });
      stream.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
    }
  );
});

conn.on('error', (err) => {
  console.error('SSH Connection error:', err.message);
  process.exit(1);
});

conn.connect({
  host,
  port: 22,
  username,
  password,
  readyTimeout: 30000,
  keepaliveInterval: 10000,
});
