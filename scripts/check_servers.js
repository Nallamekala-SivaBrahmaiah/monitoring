const mongoose = require('mongoose');

const uri = 'mongodb+srv://nallasiva552_db_user:jGgTAPA9SGxTEYi0@monitoring.a7drjbi.mongodb.net/monitoring?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const nginxServers = await db.collection('nginxservers').find().toArray();
  const servers = await db.collection('servers').find().toArray();
  const cloudResources = await db.collection('cloudresources').find().toArray();
  const ansibleControllers = await db.collection('ansiblecontrollers').find().toArray();
  const ansibleHosts = await db.collection('ansiblehosts').find().toArray();

  console.log(`=== NGINX SERVERS (${nginxServers.length}) ===`);
  nginxServers.forEach(s => console.log('NGINX:', s._id.toString(), '| Name:', s.name, '| Host:', s.host, '| Provider:', s.cloudProvider, '| Status:', s.connectionStatus, '| ID:', s.instanceId));

  console.log(`\n=== CLOUD RESOURCES (${cloudResources.length}) ===`);
  cloudResources.forEach(c => console.log('CR:', c.provider, '| Name:', c.name, '| PubIP:', c.publicIp, '| PrivIP:', c.privateIp, '| Status:', c.status, '| ID:', c.resourceId));

  console.log(`\n=== REGISTERED SERVERS (${servers.length}) ===`);
  servers.forEach(s => console.log('SRV:', s._id.toString(), '| Name:', s.name, '| Host:', s.host, '| Provider:', s.cloudProvider, '| Status:', s.status, '| ID:', s.resourceId || s.cloudResourceId));

  console.log(`\n=== ANSIBLE HOSTS (${ansibleHosts.length}) ===`);
  ansibleHosts.forEach(h => console.log('HOST:', h.name, '| IP:', h.ip, '| Provider:', h.provider, '| Status:', h.status));

  console.log(`\n=== ANSIBLE CONTROLLERS (${ansibleControllers.length}) ===`);
  ansibleControllers.forEach(c => console.log('CTRL:', c.name, '| IP:', c.ipAddress, '| Provider:', c.provider, '| Status:', c.status));

  await mongoose.disconnect();
}

run().catch(console.error);
