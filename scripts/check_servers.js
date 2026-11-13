const mongoose = require('mongoose');

const uri = 'mongodb+srv://nallasiva552_db_user:jGgTAPA9SGxTEYi0@monitoring.a7drjbi.mongodb.net/monitoring?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const accounts = await db.collection('cloudaccounts').find().toArray();
  console.log('=== CLOUD ACCOUNTS (' + accounts.length + ') ===');
  accounts.forEach(a => console.log('ACC:', a.provider, '| Name:', a.name, '| Status:', a.status, '| AWS ID:', a.awsAccountId, '| Azure Sub:', a.azureSubscriptionId));

  const cloudResources = await db.collection('cloudresources').find().toArray();
  console.log('\n=== ALL CLOUD RESOURCES (' + cloudResources.length + ') ===');
  cloudResources.forEach(c => {
    console.log('CR:', c.provider, '| Type:', c.type, '| Name:', c.name, '| PubIP:', c.publicIp, '| PrivIP:', c.privateIp, '| Status:', c.status, '| ID:', c.resourceId);
  });

  const nginxServers = await db.collection('nginxservers').find().toArray();
  console.log('\n=== NGINX SERVERS IN DB (' + nginxServers.length + ') ===');
  nginxServers.forEach(s => {
    console.log('NGINX:', s._id.toString(), '| Name:', s.name, '| Host:', s.host, '| Provider:', s.cloudProvider, '| Status:', s.connectionStatus, '| ID:', s.instanceId);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
