const mongoose = require('mongoose');

const uri = 'mongodb+srv://nallasiva552_db_user:jGgTAPA9SGxTEYi0@monitoring.a7drjbi.mongodb.net/monitoring?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('Connected to MongoDB. Finding active CloudResources (AWS & Azure)...');

  // Find real active compute resources
  const cloudResources = await db.collection('cloudresources').find({
    provider: { $in: ['aws', 'azure'] },
    isDeleted: { $ne: true },
    status: { $nin: ['Terminated', 'terminated', 'deleted', 'Deleted'] },
  }).toArray();

  const registeredServers = await db.collection('servers').find({
    cloudProvider: { $in: ['aws', 'azure'] }
  }).toArray();

  const validHosts = new Set();
  const validInstanceIds = new Set();
  const validNames = new Set();

  cloudResources.forEach(c => {
    if (c.publicIp && c.publicIp !== '-') validHosts.add(c.publicIp.trim().toLowerCase());
    if (c.privateIp && c.privateIp !== '-') validHosts.add(c.privateIp.trim().toLowerCase());
    if (c.resourceId) validInstanceIds.add(c.resourceId.trim().toLowerCase());
    if (c.name) validNames.add(c.name.trim().toLowerCase());
  });

  registeredServers.forEach(s => {
    if (s.host && s.host !== '-') validHosts.add(s.host.trim().toLowerCase());
    if (s.ip && s.ip !== '-') validHosts.add(s.ip.trim().toLowerCase());
    if (s.resourceId) validInstanceIds.add(s.resourceId.trim().toLowerCase());
    if (s.cloudResourceId) validInstanceIds.add(s.cloudResourceId.trim().toLowerCase());
    if (s.name) validNames.add(s.name.trim().toLowerCase());
  });

  console.log('Valid Cloud Hosts:', Array.from(validHosts));
  console.log('Valid Cloud Names:', Array.from(validNames));

  // Check NginxServer collection
  const allNginxServers = await db.collection('nginxservers').find().toArray();
  console.log(`\nInspecting ${allNginxServers.length} Nginx servers...`);

  const ghostIds = [];
  const keptServers = [];

  for (const ns of allNginxServers) {
    const h = (ns.host || '').trim().toLowerCase();
    const inst = (ns.instanceId || '').trim().toLowerCase();
    const n = (ns.name || '').trim().toLowerCase();

    // Specific known fake / deleted hosts
    const isExplicitFake =
      h === '4.240.109.230' || // fake/deleted ansible
      h === '20.235.243.1' ||   // fake/deleted vm044
      h === '52.63.226.201' ||  // fake/deleted ansible-controller
      h === '3.27.205.136' ||   // fake/deleted ansible-worker-01
      h === '3.107.183.202' ||  // fake/deleted ansible-worker-02
      h === '3.106.216.16' ||   // fake/deleted ansible-worker-03
      h === '32.236.173.166' || // fake/deleted siva
      h === '3.106.129.147' ||  // fake/deleted siva
      h === '4.194.249.85' ||   // stale old IP of azure
      h === '44.199.21.34' ||   // demo host
      /racha|nacha|rachana/i.test(n) ||
      /racha|nacha|rachana/i.test(h);

    const isValid = !isExplicitFake && ((h && validHosts.has(h)) || (inst && validInstanceIds.has(inst)) || (n && validNames.has(n)));

    if (!isValid || isExplicitFake) {
      console.log(`GHOST DETECTED: [${ns.name}] host=${ns.host} id=${ns.instanceId} provider=${ns.cloudProvider}`);
      ghostIds.push(ns._id);
    } else {
      console.log(`REAL SERVER KEPT: [${ns.name}] host=${ns.host} provider=${ns.cloudProvider}`);
      keptServers.push(ns);
    }
  }

  if (ghostIds.length > 0) {
    const delRes = await db.collection('nginxservers').deleteMany({ _id: { $in: ghostIds } });
    console.log(`\nSuccessfully DELETED ${delRes.deletedCount} ghost servers from nginxservers!`);
  } else {
    console.log('\nNo ghost servers found to delete in nginxservers.');
  }

  // Also clean up servers collection
  const delSrv = await db.collection('servers').deleteMany({
    $or: [
      { host: { $in: ['4.240.109.230', '20.235.243.1', '52.63.226.201', '3.27.205.136', '3.107.183.202', '3.106.216.16', '32.236.173.166', '3.106.129.147', '4.194.249.85', '44.199.21.34'] } },
      { name: { $regex: /racha|nacha|rachana/i } },
      { host: { $regex: /racha|nacha|rachana/i } },
    ]
  });
  console.log(`Cleaned ${delSrv.deletedCount} ghost servers from servers collection.`);

  // Also clean up ansiblehosts collection
  const delAnsible = await db.collection('ansiblehosts').deleteMany({
    $or: [
      { ip: { $in: ['4.240.109.230', '20.235.243.1', '52.63.226.201', '3.27.205.136', '3.107.183.202', '3.106.216.16', '32.236.173.166', '3.106.129.147', '4.194.249.85', '44.199.21.34'] } },
      { name: { $regex: /racha|nacha|rachana/i } },
    ]
  });
  console.log(`Cleaned ${delAnsible.deletedCount} ghost hosts from ansiblehosts collection.`);

  // Also clean up ansiblecontrollers collection
  const delCtrl = await db.collection('ansiblecontrollers').deleteMany({
    $or: [
      { ipAddress: { $in: ['4.240.109.230', '20.235.243.1', '52.63.226.201', '3.27.205.136', '3.107.183.202', '3.106.216.16', '32.236.173.166', '3.106.129.147', '4.194.249.85', '44.199.21.34'] } },
      { name: { $regex: /racha|nacha|rachana/i } },
    ]
  });
  console.log(`Cleaned ${delCtrl.deletedCount} ghost controllers from ansiblecontrollers collection.`);

  // Remaining Nginx servers
  const remaining = await db.collection('nginxservers').find().toArray();
  console.log(`\n=== REMAINING NGINX SERVERS (${remaining.length}) ===`);
  remaining.forEach(r => console.log('REAL:', r.name, r.host, r.cloudProvider, r.connectionStatus));

  await mongoose.disconnect();
}

run().catch(console.error);
