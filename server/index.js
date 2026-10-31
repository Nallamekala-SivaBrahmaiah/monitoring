const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const client = require('prom-client');

dotenv.config();

const CloudAccount = require('./models/CloudAccount');
const Resource = require('./models/Resource');
const { getEc2Instances, getEc2InstanceById, describeAwsRegions } = require('./services/awsService');
const {
  validateAzureCredentials,
  describeAzureLocations,
  discoverAllAzureResources,
  getAzureVMs,
  getAzureVMById,
  clearDiscoveredAzureResources,
} = require('./services/azureService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Prometheus Metrics Registry
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 200, 300, 400, 500, 1000],
});
register.registerMetric(httpRequestDurationMicroseconds);

// In-Memory Data Stores - Clean empty state (Populated strictly by real user-connected clouds)
let awsAccounts = [];
let azureSubscriptions = [];
let liveAlerts = [];

// Optional MongoDB Connection & Safe Legacy Mock Data Migration
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('✓ Connected to MongoDB database');
      try {
        // Requirement 10: Safe migration removing mock/demo/seed data records
        await Resource.deleteMany({
          $or: [
            { accountId: '1234-5678-9012' },
            { accountId: 'acc-aws-01' },
            { accountId: 'acc-aws-02' },
            { subscriptionId: 'sub-89af4100-cba9-4f21-9988-ef129841bb01' },
            { subscriptionId: 'sub-azure-01' },
            { subscriptionId: 'sub-azure-02' },
            { resourceId: /^i-0a1b2c3d/ },
            { resourceId: /^i-01234567/ },
            { resourceId: /^vm-eastus-/ },
            { resourceId: 'azure-vm-01' },
            { resourceId: 'azure-vm-02' },
            { resourceId: 'azure-vm-03' },
          ],
        });
        await CloudAccount.deleteMany({
          $or: [
            { accountId: '1234-5678-9012' },
            { id: 'acc-aws-01' },
            { id: 'acc-aws-02' },
            { subscriptionId: 'sub-89af4100-cba9-4f21-9988-ef129841bb01' },
            { id: 'sub-azure-01' },
            { id: 'sub-azure-02' },
          ],
        });
        console.log('✓ Cleaned legacy dummy/mock data from MongoDB');

        // Load any real connected accounts from MongoDB
        const realSubs = await CloudAccount.find({ provider: 'azure' }).select('+clientSecret').lean();
        azureSubscriptions = realSubs.map((s) => ({
          id: s._id.toString(),
          subscriptionName: s.accountName,
          subscriptionId: s.subscriptionId,
          tenantId: s.tenantId,
          clientId: s.clientId,
          clientSecret: s.clientSecret,
          authType: s.authType || 'client_secret',
          status: s.status,
          enabledRegions: s.enabledRegions || [],
          resourcesCount: s.resourcesCount || 0,
          lastSync: s.lastSync ? new Date(s.lastSync).toLocaleString() : 'Never',
        }));

        // Trigger resource discovery for active Azure subscriptions
        for (const sub of azureSubscriptions) {
          if (sub.clientSecret && sub.status === 'Connected') {
            discoverAllAzureResources({
              subscriptionId: sub.subscriptionId,
              tenantId: sub.tenantId,
              clientId: sub.clientId,
              clientSecret: sub.clientSecret,
              subscriptionName: sub.subscriptionName,
              selectedRegions: sub.enabledRegions,
            })
              .then(async ({ resources, vms }) => {
                // Persist real discovered resources to MongoDB
                await Resource.deleteMany({ provider: 'azure', subscriptionId: sub.subscriptionId });
                if (resources.length > 0) {
                  await Resource.insertMany(resources);
                }
                await CloudAccount.updateOne(
                  { subscriptionId: sub.subscriptionId },
                  { resourcesCount: resources.length, lastSync: new Date() }
                );
                console.log(`✓ Discovered ${resources.length} real Azure resources (${vms.length} VMs) for ${sub.subscriptionName}`);
              })
              .catch((e) => console.warn('Background discovery note:', e.message));
          }
        }
      } catch (e) {
        console.warn('Migration note:', e.message);
      }
    })
    .catch((err) => console.log('ℹ MongoDB not reachable, using in-memory state:', err.message));
}

// Background Resource Discovery Worker - Runs every 5 minutes
setInterval(async () => {
  for (const sub of azureSubscriptions) {
    if (sub.clientSecret && sub.status === 'Connected') {
      try {
        const { resources, vms } = await discoverAllAzureResources({
          subscriptionId: sub.subscriptionId,
          tenantId: sub.tenantId,
          clientId: sub.clientId,
          clientSecret: sub.clientSecret,
          subscriptionName: sub.subscriptionName,
          selectedRegions: sub.enabledRegions,
        });

        if (mongoose.connection.readyState === 1) {
          await Resource.deleteMany({ provider: 'azure', subscriptionId: sub.subscriptionId });
          if (resources.length > 0) {
            await Resource.insertMany(resources);
          }
          await CloudAccount.updateOne(
            { subscriptionId: sub.subscriptionId },
            { resourcesCount: resources.length, lastSync: new Date() }
          );
        }
        sub.resourcesCount = resources.length;
        sub.lastSync = 'Just now';
      } catch (err) {
        console.warn(`[Background Discovery Worker] Refresh note for ${sub.subscriptionId}:`, err.message);
      }
    }
  }
}, 5 * 60 * 1000);

// Prometheus Metrics Endpoint
app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ==========================================
// Azure Endpoints
// ==========================================

// 1. Test Azure Credentials & Access to Subscription
app.post('/api/azure/test-connection', async (req, res) => {
  const { subscriptionId, tenantId, clientId, clientSecret } = req.body;
  try {
    const result = await validateAzureCredentials({
      subscriptionId,
      tenantId,
      clientId,
      clientSecret,
    });
    res.json({
      success: true,
      message: 'Azure credentials and subscription verified successfully',
      subscription: result,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 2. Get Connected Azure Subscriptions (Never exposes clientSecret)
app.get('/api/azure/subscriptions', (req, res) => {
  const sanitized = azureSubscriptions.map((s) => {
    const { clientSecret, ...rest } = s;
    return rest;
  });
  res.json(sanitized);
});

// 3. Connect & Save New Azure Subscription
app.post('/api/azure/subscriptions', async (req, res) => {
  const { subscriptionName, subscriptionId, tenantId, clientId, clientSecret } = req.body;

  if (!subscriptionId || !tenantId || !clientId) {
    return res.status(400).json({ error: 'Missing required Azure credentials' });
  }

  try {
    // Validate credentials first
    if (clientSecret) {
      await validateAzureCredentials({ subscriptionId, tenantId, clientId, clientSecret });
    }

    // Discover all regions for this subscription
    const regionDiscovery = await describeAzureLocations({
      subscriptionId,
      tenantId,
      clientId,
      clientSecret,
    });

    // Select ALL discovered regions by default
    const allRegionCodes = regionDiscovery.regions.map((r) => r.code);
    const selectedRegions = req.body.selectedRegions || allRegionCodes;

    const newSub = {
      id: `sub-azure-${Date.now()}`,
      subscriptionName: subscriptionName || 'Azure Subscription',
      subscriptionId,
      tenantId,
      clientId,
      clientSecret,
      authType: req.body.authType || 'client_secret',
      status: 'Connected',
      availableRegions: regionDiscovery.regions,
      selectedRegions,
      enabledRegions: selectedRegions,
      resourcesCount: 0,
      lastSync: 'Just now',
    };

    // Discover actual resources across selected regions
    if (clientSecret) {
      const discovery = await discoverAllAzureResources({
        subscriptionId,
        tenantId,
        clientId,
        clientSecret,
        subscriptionName: newSub.subscriptionName,
        selectedRegions,
      });

      newSub.resourcesCount = discovery.count;

      if (mongoose.connection.readyState === 1 && discovery.resources.length > 0) {
        await Resource.deleteMany({ provider: 'azure', subscriptionId });
        await Resource.insertMany(discovery.resources);
      }
    }

    if (mongoose.connection.readyState === 1) {
      await CloudAccount.create({
        provider: 'azure',
        accountName: newSub.subscriptionName,
        subscriptionId: newSub.subscriptionId,
        tenantId: newSub.tenantId,
        clientId: newSub.clientId,
        clientSecret: newSub.clientSecret,
        authType: newSub.authType,
        availableRegions: newSub.availableRegions,
        selectedRegions: newSub.selectedRegions,
        enabledRegions: newSub.enabledRegions,
        resourcesCount: newSub.resourcesCount,
        status: newSub.status,
      });
    }

    azureSubscriptions = azureSubscriptions.filter((s) => s.subscriptionId !== subscriptionId);
    azureSubscriptions.push(newSub);

    const { clientSecret: _, ...clientResponse } = newSub;
    res.status(201).json(clientResponse);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Discover Regions for Subscription (Locations API)
app.get('/api/azure/subscriptions/:subscriptionId/regions', async (req, res) => {
  const { subscriptionId } = req.params;
  const sub = azureSubscriptions.find((s) => s.id === subscriptionId || s.subscriptionId === subscriptionId);

  const discovery = await describeAzureLocations({
    subscriptionId: sub?.subscriptionId || subscriptionId,
    tenantId: sub?.tenantId,
    clientId: sub?.clientId,
    clientSecret: sub?.clientSecret,
  });

  // Enable all regions by default unless explicitly deselected
  const selectedSet = sub?.selectedRegions
    ? new Set(sub.selectedRegions)
    : new Set(discovery.regions.map((r) => r.code));

  const structured = discovery.regions.map((r) => ({
    ...r,
    enabled: selectedSet.has(r.code),
  }));

  res.json({
    success: true,
    subscriptionId,
    totalCount: structured.length,
    selectedCount: structured.filter((r) => r.enabled).length,
    regions: structured,
  });
});

// 5. Update Monitored Regions for Subscription
app.put('/api/azure/subscriptions/:subscriptionId/regions', async (req, res) => {
  const { subscriptionId } = req.params;
  const { regions } = req.body;

  const sub = azureSubscriptions.find((s) => s.id === subscriptionId || s.subscriptionId === subscriptionId);
  if (sub) {
    sub.selectedRegions = regions || [];
    sub.enabledRegions = regions || [];
  }

  if (mongoose.connection.readyState === 1) {
    await CloudAccount.updateOne(
      { $or: [{ subscriptionId }, { id: subscriptionId }] },
      { selectedRegions: regions, enabledRegions: regions }
    );
  }

  res.json({ success: true, enabledRegions: regions });
});

// 6. Manual Resource Discovery Refresh for Subscription
app.post('/api/azure/subscriptions/:subscriptionId/refresh', async (req, res) => {
  const { subscriptionId } = req.params;
  const sub = azureSubscriptions.find((s) => s.id === subscriptionId || s.subscriptionId === subscriptionId);

  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  try {
    const { resources, vms, count } = await discoverAllAzureResources({
      subscriptionId: sub.subscriptionId,
      tenantId: sub.tenantId,
      clientId: sub.clientId,
      clientSecret: sub.clientSecret,
      subscriptionName: sub.subscriptionName,
      selectedRegions: sub.enabledRegions,
    });

    sub.resourcesCount = count;
    sub.lastSync = 'Just now';

    if (mongoose.connection.readyState === 1) {
      await Resource.deleteMany({ provider: 'azure', subscriptionId: sub.subscriptionId });
      if (resources.length > 0) {
        await Resource.insertMany(resources);
      }
      await CloudAccount.updateOne(
        { subscriptionId: sub.subscriptionId },
        { resourcesCount: count, lastSync: new Date() }
      );
    }

    res.json({ success: true, count, vmCount: vms.length, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Disconnect Subscription
app.post('/api/azure/subscriptions/:subscriptionId/disconnect', async (req, res) => {
  const { subscriptionId } = req.params;
  azureSubscriptions = azureSubscriptions.filter((s) => s.id !== subscriptionId && s.subscriptionId !== subscriptionId);
  clearDiscoveredAzureResources(subscriptionId);

  if (mongoose.connection.readyState === 1) {
    await CloudAccount.deleteMany({ $or: [{ subscriptionId }, { id: subscriptionId }] });
    await Resource.deleteMany({ subscriptionId });
  }

  res.json({ success: true, message: 'Subscription disconnected successfully' });
});

app.delete('/api/azure/subscriptions/:subscriptionId', async (req, res) => {
  const { subscriptionId } = req.params;
  azureSubscriptions = azureSubscriptions.filter((s) => s.id !== subscriptionId && s.subscriptionId !== subscriptionId);
  clearDiscoveredAzureResources(subscriptionId);

  if (mongoose.connection.readyState === 1) {
    await CloudAccount.deleteMany({ $or: [{ subscriptionId }, { id: subscriptionId }] });
    await Resource.deleteMany({ subscriptionId });
  }

  res.json({ success: true, message: 'Subscription deleted successfully' });
});

// 8. Azure Virtual Machines
app.get('/api/azure/vms', async (req, res) => {
  const { subscriptionId, region, status, search } = req.query;
  const activeConnected = azureSubscriptions.filter((s) => s.status === 'Connected');

  if (activeConnected.length === 0) {
    return res.json([]);
  }

  const allSelectedRegions = Array.from(new Set(activeConnected.flatMap((s) => s.selectedRegions || s.enabledRegions || [])));

  const vms = await getAzureVMs({
    ...req.query,
    enabledRegions: allSelectedRegions.length > 0 ? allSelectedRegions : undefined,
  });

  res.json(vms);
});

app.get('/api/azure/vms/:vmId', async (req, res) => {
  const vm = await getAzureVMById(req.params.vmId);
  if (!vm) return res.status(404).json({ error: 'Azure VM not found' });
  res.json(vm);
});

// ==========================================
// AWS Endpoints (Clean empty state)
// ==========================================
app.get('/api/aws/accounts', (req, res) => res.json(awsAccounts));

app.post('/api/aws/accounts', async (req, res) => {
  const newAcc = {
    id: `acc-aws-${Date.now()}`,
    accountName: req.body.accountName || 'AWS Account',
    accountId: req.body.accountId,
    roleArn: req.body.roleArn,
    externalId: req.body.externalId,
    status: 'Connected',
    availableRegions: req.body.availableRegions || [],
    selectedRegions: req.body.selectedRegions || [],
    enabledRegions: req.body.selectedRegions || [],
    resourcesCount: 0,
    lastSync: 'Just now',
  };
  awsAccounts.push(newAcc);
  res.status(201).json(newAcc);
});

app.get('/api/aws/ec2/instances', async (req, res) => {
  if (awsAccounts.length === 0) return res.json([]);
  const instances = await getEc2Instances(req.query);
  res.json(instances);
});

app.get('/api/aws/ec2/instances/:instanceId', async (req, res) => {
  const instance = await getEc2InstanceById(req.params.instanceId);
  if (!instance) return res.status(404).json({ error: 'Instance not found' });
  res.json(instance);
});

// ==========================================
// Unified Resources & Dashboard Endpoints
// ==========================================

// Global Cloud Accounts API
app.get('/api/cloud/accounts', (req, res) => {
  const unified = [
    ...awsAccounts.map((a) => ({ ...a, cloud: 'aws' })),
    ...azureSubscriptions.map((s) => {
      const { clientSecret, ...rest } = s;
      return { ...rest, cloud: 'azure' };
    }),
  ];
  res.json(unified);
});

// Resources API (Filtered strictly by provider and database)
app.get('/api/resources', async (req, res) => {
  const { provider, accountId, subscriptionId, region, resourceType, search } = req.query;

  if (mongoose.connection.readyState === 1) {
    try {
      const extraFilters = {};
      if (accountId && accountId !== 'all') extraFilters.accountId = accountId;
      if (subscriptionId && subscriptionId !== 'all') extraFilters.subscriptionId = subscriptionId;
      if (region && region !== 'all') extraFilters.region = region;
      if (resourceType && resourceType !== 'all') extraFilters.resourceType = resourceType;
      if (search) {
        extraFilters.$or = [
          { name: { $regex: search, $options: 'i' } },
          { resourceId: { $regex: search, $options: 'i' } },
        ];
      }

      const mongoQuery = Resource.buildProviderQuery(provider, extraFilters);
      const docs = await Resource.find(mongoQuery).lean();
      return res.json({
        success: true,
        count: docs.length,
        provider: provider || 'all',
        query: mongoQuery,
        resources: docs,
      });
    } catch (err) {
      console.warn('MongoDB query note:', err.message);
    }
  }

  // Memory resolution (only real discovered data)
  const azureVMs = await getAzureVMs({ subscriptionId, region, search });
  const resources = provider === 'aws' ? [] : azureVMs.map((v) => ({
    provider: 'azure',
    subscriptionId: v.subscriptionId,
    region: v.region,
    resourceType: 'virtual-machine',
    resourceId: v.vmId,
    name: v.name,
    status: v.powerState,
  }));

  res.json({
    success: true,
    count: resources.length,
    provider: provider || 'all',
    resources,
  });
});

// Dashboard Overview - Dynamic Actual Counts Only
app.get('/api/dashboard/overview', async (req, res) => {
  const { provider, accountId, subscriptionId } = req.query;

  let awsInstances = [];
  if (awsAccounts.length > 0) {
    awsInstances = await getEc2Instances({ accountId });
  }

  let azureVMs = [];
  if (azureSubscriptions.length > 0) {
    azureVMs = await getAzureVMs({ subscriptionId });
  }

  let awsTotal = awsInstances.length;
  let azureTotal = azureVMs.length;

  if (provider === 'aws') azureTotal = 0;
  if (provider === 'azure') awsTotal = 0;

  const totalServersCount = awsTotal + azureTotal;
  const runningServers =
    awsInstances.filter((i) => i.status === 'Running').length +
    azureVMs.filter((v) => (v.powerState || '').toLowerCase() === 'running').length;

  res.json({
    awsResources: {
      total: awsTotal,
      changeText: awsTotal > 0 ? '+0 new' : '0 new',
      trend: awsTotal > 0 ? [awsTotal] : [],
    },
    azureResources: {
      total: azureTotal,
      changeText: azureTotal > 0 ? '+0 new' : '0 new',
      trend: azureTotal > 0 ? [azureTotal] : [],
    },
    totalServers: {
      total: totalServersCount,
      runningText: `${runningServers} running`,
      trend: totalServersCount > 0 ? [totalServersCount] : [],
    },
    dockerContainers: {
      total: 0,
      runningText: '0 running',
      trend: [],
    },
    k8sClusters: {
      total: 0,
      healthyText: '0 healthy',
      trend: [],
    },
    activeAlerts: {
      total: liveAlerts.length,
      newText: `${liveAlerts.length} new`,
      trend: [],
    },
  });
});

// Metrics Telemetry Endpoint - Real Data Only
app.get('/api/dashboard/metrics', async (req, res) => {
  const vms = await getAzureVMs();
  const vmsWithMetrics = vms.filter((v) => v.cpuUsage !== null && v.cpuUsage !== undefined);

  if (vmsWithMetrics.length === 0) {
    return res.json([]);
  }

  // Calculate real average metrics across connected VMs
  const avgCpu = Math.round(vmsWithMetrics.reduce((sum, v) => sum + v.cpuUsage, 0) / vmsWithMetrics.length);
  res.json([
    {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      aws: 0,
      azure: avgCpu,
    },
  ]);
});

// Alerts Endpoint
app.get('/api/alerts', (req, res) => {
  const { provider, severity } = req.query;
  let filtered = [...liveAlerts];
  if (provider && provider !== 'all') {
    filtered = filtered.filter((a) => a.provider === provider);
  }
  if (severity && severity !== 'all') {
    filtered = filtered.filter((a) => (a.severity || '').toLowerCase() === severity.toLowerCase());
  }
  res.json(filtered);
});

// Containers & Kubernetes Endpoints (Clean empty state)
app.get('/api/docker/containers', (req, res) => res.json([]));
app.get('/api/kubernetes/clusters', (req, res) => res.json([]));
app.get('/api/kubernetes/nodes', (req, res) => res.json([]));
app.get('/api/kubernetes/pods', (req, res) => res.json([]));

app.listen(PORT, () => {
  console.log(`✓ Real Multi-Cloud Monitoring Backend running on http://localhost:${PORT}`);
});
