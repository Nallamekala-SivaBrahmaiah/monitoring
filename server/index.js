const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const client = require('prom-client');

dotenv.config();

const CloudAccount = require('./models/CloudAccount');
const Resource = require('./models/Resource');
const { getEc2Instances, getEc2InstanceById, describeAwsRegions } = require('./services/awsService');
const { getAzureVMs, getAzureVMById, describeAzureLocations } = require('./services/azureService');

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

// Cloud Resources catalog adhering to the required MongoDB schema
const defaultResources = [
  {
    provider: 'aws',
    accountId: '1234-5678-9012',
    region: 'us-east-1',
    resourceType: 'ec2',
    resourceId: 'i-0a1b2c3d4e5f6789',
    name: 'web-server-01',
    status: 'Running',
    metadata: { instanceType: 't3.xlarge', ip: '54.210.12.89' },
  },
  {
    provider: 'aws',
    accountId: '1234-5678-9012',
    region: 'us-east-1',
    resourceType: 'ec2',
    resourceId: 'i-0123456789abcdef0',
    name: 'app-server-01',
    status: 'Running',
    metadata: { instanceType: 'm5.large', ip: '52.90.84.11' },
  },
  {
    provider: 'aws',
    accountId: '1234-5678-9012',
    region: 'us-west-2',
    resourceType: 'ec2',
    resourceId: 'i-0f1e2d3c4b5a6978',
    name: 'db-server-01',
    status: 'Running',
    metadata: { instanceType: 'r5.2xlarge', ip: '34.219.78.204' },
  },
  {
    provider: 'aws',
    accountId: '1234-5678-9012',
    region: 'ap-south-1',
    resourceType: 'ec2',
    resourceId: 'i-0987654321fedcba0',
    name: 'worker-node-01',
    status: 'Running',
    metadata: { instanceType: 'c5.2xlarge', ip: '13.233.155.40' },
  },
  {
    provider: 'aws',
    accountId: '1234-5678-9012',
    region: 'us-east-1',
    resourceType: 'container',
    resourceId: 'c-0a1b2c3d4e',
    name: 'nginx-reverse-proxy',
    status: 'Stopped',
    metadata: { hostInstance: 'web-server-01' },
  },
  {
    provider: 'aws',
    accountId: '1234-5678-9012',
    region: 'us-east-1',
    resourceType: 'container',
    resourceId: 'c-1b2c3d4e5f',
    name: 'redis-cache-master',
    status: 'Running',
    metadata: { hostInstance: 'app-server-01' },
  },
  {
    provider: 'aws',
    accountId: '1234-5678-9012',
    region: 'us-east-1',
    resourceType: 'cluster',
    resourceId: 'k8s-01',
    name: 'eks-cluster-prod',
    status: 'Healthy',
    metadata: { version: 'v1.28.2', type: 'EKS', nodes: 4 },
  },
  {
    provider: 'aws',
    accountId: '1234-5678-9012',
    region: 'us-east-1',
    resourceType: 'pod',
    resourceId: 'p-1',
    name: 'api-deployment-8v2lp',
    status: 'Running',
    metadata: { cluster: 'eks-cluster-prod', namespace: 'production' },
  },
  {
    provider: 'azure',
    subscriptionId: 'sub-89af4100-cba9-4f21-9988-ef129841bb01',
    region: 'eastus',
    resourceType: 'virtual-machine',
    resourceId: 'azure-vm-01',
    name: 'az-prod-api-01',
    status: 'Running',
    metadata: { vmSize: 'Standard_D4s_v5', ip: '20.120.44.18' },
  },
  {
    provider: 'azure',
    subscriptionId: 'sub-89af4100-cba9-4f21-9988-ef129841bb01',
    region: 'eastus',
    resourceType: 'virtual-machine',
    resourceId: 'azure-vm-02',
    name: 'az-prod-api-02',
    status: 'Running',
    metadata: { vmSize: 'Standard_D4s_v5', ip: '20.120.44.19' },
  },
  {
    provider: 'azure',
    subscriptionId: 'sub-89af4100-cba9-4f21-9988-ef129841bb01',
    region: 'westeurope',
    resourceType: 'virtual-machine',
    resourceId: 'azure-vm-03',
    name: 'az-analytics-node-01',
    status: 'Running',
    metadata: { vmSize: 'Standard_E8s_v5', ip: '51.144.18.90' },
  },
  {
    provider: 'azure',
    subscriptionId: 'sub-89af4100-cba9-4f21-9988-ef129841bb01',
    region: 'eastus',
    resourceType: 'container',
    resourceId: 'c-3d4e5f6a7b',
    name: 'az-gateway-envoy',
    status: 'Running',
    metadata: { hostInstance: 'az-prod-api-01' },
  },
  {
    provider: 'azure',
    subscriptionId: 'sub-89af4100-cba9-4f21-9988-ef129841bb01',
    region: 'eastus',
    resourceType: 'cluster',
    resourceId: 'k8s-02',
    name: 'aks-cluster-eastus',
    status: 'Healthy',
    metadata: { version: 'v1.28.3', type: 'AKS', nodes: 3 },
  },
  {
    provider: 'azure',
    subscriptionId: 'sub-89af4100-cba9-4f21-9988-ef129841bb01',
    region: 'eastus',
    resourceType: 'pod',
    resourceId: 'p-3',
    name: 'checkout-frontend-4f1ea',
    status: 'Running',
    metadata: { cluster: 'aks-cluster-eastus', namespace: 'frontend' },
  },
];

// Optional MongoDB Connection and Resource Seeding
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('✓ Connected to MongoDB database');
      try {
        const count = await Resource.countDocuments();
        if (count === 0) {
          await Resource.insertMany(defaultResources);
          console.log('✓ Seeded MongoDB with initial cloud resources');
        }
      } catch (e) {
        console.warn('Seeding note:', e.message);
      }
    })
    .catch((err) => console.log('ℹ MongoDB not reachable, using in-memory mock datasets:', err.message));
}

// In-Memory Data Stores
let awsAccounts = [
  {
    id: 'acc-aws-01',
    accountName: 'Production AWS (Primary)',
    accountId: '1234-5678-9012',
    roleArn: 'arn:aws:iam::123456789012:role/MonitoringCrossAccountRole',
    externalId: 'MultiCloud-SecOps-Prod-4421',
    status: 'Connected',
    enabledRegions: ['us-east-1', 'us-west-2', 'ap-south-1'],
    resourcesCount: 12,
    lastSync: '1 min ago',
  },
  {
    id: 'acc-aws-02',
    accountName: 'Staging AWS (Secondary)',
    accountId: '9876-5432-1098',
    roleArn: 'arn:aws:iam::987654321098:role/MonitoringStagingRole',
    externalId: 'MultiCloud-SecOps-Stage-9182',
    status: 'Connected',
    enabledRegions: ['us-east-1', 'eu-west-1'],
    resourcesCount: 4,
    lastSync: '3 mins ago',
  },
];

let azureSubscriptions = [
  {
    id: 'sub-azure-01',
    subscriptionName: 'Corporate Azure Enterprise',
    subscriptionId: 'sub-89af4100-cba9-4f21-9988-ef129841bb01',
    tenantId: 'tenant-a9182374-1290-4821-bcde-90128475abcd',
    clientId: 'app-client-56128490-efba-4321-9087-123456789abc',
    authType: 'client_secret',
    status: 'Connected',
    enabledRegions: ['eastus', 'westeurope'],
    resourcesCount: 8,
    lastSync: 'Just now',
  },
];

let awsRegions = [
  { id: 'reg-aws-1', region: 'us-east-1', displayName: 'US East (N. Virginia)', cloud: 'aws', enabled: true, resourceCount: 12 },
  { id: 'reg-aws-2', region: 'us-west-2', displayName: 'US West (Oregon)', cloud: 'aws', enabled: true, resourceCount: 8 },
  { id: 'reg-aws-3', region: 'ap-south-1', displayName: 'Asia Pacific (Mumbai)', cloud: 'aws', enabled: true, resourceCount: 6 },
  { id: 'reg-aws-4', region: 'eu-west-1', displayName: 'Europe (Ireland)', cloud: 'aws', enabled: true, resourceCount: 4 },
];

let azureRegions = [
  { id: 'reg-azure-1', region: 'eastus', displayName: 'East US (Virginia)', cloud: 'azure', enabled: true, resourceCount: 5 },
  { id: 'reg-azure-2', region: 'westeurope', displayName: 'West Europe (Netherlands)', cloud: 'azure', enabled: true, resourceCount: 3 },
];

// Prometheus Endpoint
app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// AWS Endpoints
app.get('/api/aws/accounts', (req, res) => res.json(awsAccounts));

app.post('/api/aws/accounts', async (req, res) => {
  const selectedRegions = req.body.selectedRegions || req.body.enabledRegions || ['us-east-1', 'us-west-2'];
  const newAcc = {
    id: `acc-aws-${Date.now()}`,
    accountName: req.body.accountName || 'AWS Account',
    accountId: req.body.accountId || '1234-5678-9012',
    roleArn: req.body.roleArn,
    externalId: req.body.externalId,
    status: 'Connected',
    availableRegions: req.body.availableRegions || [],
    selectedRegions: selectedRegions,
    enabledRegions: selectedRegions,
    monitoringEnabled: req.body.monitoringEnabled ?? true,
    resourcesCount: selectedRegions.length * 3,
    lastSync: 'Just now',
  };

  if (mongoose.connection.readyState === 1) {
    try {
      await CloudAccount.create({
        provider: 'aws',
        accountName: newAcc.accountName,
        accountId: newAcc.accountId,
        roleArn: newAcc.roleArn,
        externalId: newAcc.externalId,
        availableRegions: newAcc.availableRegions,
        selectedRegions: newAcc.selectedRegions,
        enabledRegions: newAcc.enabledRegions,
        monitoringEnabled: newAcc.monitoringEnabled,
        status: newAcc.status,
      });
    } catch (e) {
      console.warn('Could not persist to MongoDB, stored in memory:', e.message);
    }
  }

  awsAccounts.push(newAcc);
  res.status(201).json(newAcc);
});

// Dynamic AWS Region Discovery for Account
app.get('/api/aws/accounts/:accountId/regions', async (req, res) => {
  const { accountId } = req.params;
  const account = awsAccounts.find((a) => a.id === accountId || a.accountId === accountId);

  const discovery = await describeAwsRegions({
    roleArn: account?.roleArn,
    externalId: account?.externalId,
    accountId,
  });

  const selectedSet = new Set(account?.selectedRegions || account?.enabledRegions || ['us-east-1', 'us-west-2', 'ap-south-1']);
  const structuredRegions = discovery.regions.map((r) => ({
    name: r.name,
    code: r.code,
    status: r.status,
    optInStatus: r.optInStatus || 'opt-in-not-required',
    geography: r.geography || 'Global',
    enabled: selectedSet.has(r.code),
  }));

  res.json({
    success: true,
    accountId,
    totalCount: structuredRegions.length,
    selectedCount: structuredRegions.filter((r) => r.enabled).length,
    regions: structuredRegions,
  });
});

app.get('/api/aws/regions', async (req, res) => {
  const discovery = await describeAwsRegions();
  res.json({
    success: true,
    totalCount: discovery.regions.length,
    regions: discovery.regions,
  });
});

app.put('/api/aws/regions', (req, res) => {
  const { regionId, regionCode, enabled } = req.body;
  const target = regionCode || regionId;
  awsRegions = awsRegions.map((r) => (r.id === target || r.region === target ? { ...r, enabled } : r));
  res.json({ success: true, regions: awsRegions });
});

app.get('/api/aws/ec2/instances', async (req, res) => {
  const { accountId, region } = req.query;
  // Aggregate active enabled regions across connected accounts unless explicitly filtered
  const activeConnected = awsAccounts.filter((a) => a.status === 'Connected');
  const allSelectedRegions = Array.from(new Set(activeConnected.flatMap((a) => a.selectedRegions || a.enabledRegions || [])));

  let instances = await getEc2Instances({
    ...req.query,
    enabledRegions: allSelectedRegions.length > 0 ? allSelectedRegions : undefined,
  });

  if (accountId && accountId !== 'all') {
    instances = instances.filter((i) => i.accountId === accountId || (accountId === '1234-5678-9012' && i.accountId === 'acc-aws-01'));
  }
  if (region && region !== 'all') {
    instances = instances.filter((i) => i.region === region);
  }

  res.json(instances);
});

app.get('/api/aws/ec2/instances/:instanceId', async (req, res) => {
  const instance = await getEc2InstanceById(req.params.instanceId);
  if (!instance) return res.status(404).json({ error: 'Instance not found' });
  res.json(instance);
});

// Azure Endpoints
app.get('/api/azure/subscriptions', (req, res) => res.json(azureSubscriptions));

app.post('/api/azure/subscriptions', async (req, res) => {
  const selectedRegions = req.body.selectedRegions || req.body.enabledRegions || ['eastus', 'westeurope'];
  const newSub = {
    id: `sub-azure-${Date.now()}`,
    subscriptionName: req.body.subscriptionName || 'Azure Subscription',
    subscriptionId: req.body.subscriptionId,
    tenantId: req.body.tenantId,
    clientId: req.body.clientId,
    authType: req.body.authType || 'client_secret',
    status: 'Connected',
    availableRegions: req.body.availableRegions || [],
    selectedRegions: selectedRegions,
    enabledRegions: selectedRegions,
    monitoringEnabled: req.body.monitoringEnabled ?? true,
    resourcesCount: selectedRegions.length * 2,
    lastSync: 'Just now',
  };

  if (mongoose.connection.readyState === 1) {
    try {
      await CloudAccount.create({
        provider: 'azure',
        accountName: newSub.subscriptionName,
        subscriptionId: newSub.subscriptionId,
        tenantId: newSub.tenantId,
        clientId: newSub.clientId,
        authType: newSub.authType,
        availableRegions: newSub.availableRegions,
        selectedRegions: newSub.selectedRegions,
        enabledRegions: newSub.enabledRegions,
        monitoringEnabled: newSub.monitoringEnabled,
        status: newSub.status,
      });
    } catch (e) {
      console.warn('Could not persist to MongoDB, stored in memory:', e.message);
    }
  }

  azureSubscriptions.push(newSub);
  res.status(201).json(newSub);
});

// Dynamic Azure Region Discovery for Subscription
app.get('/api/azure/subscriptions/:subscriptionId/regions', async (req, res) => {
  const { subscriptionId } = req.params;
  const sub = azureSubscriptions.find((s) => s.id === subscriptionId || s.subscriptionId === subscriptionId);

  const discovery = await describeAzureLocations({
    subscriptionId: sub?.subscriptionId || subscriptionId,
    tenantId: sub?.tenantId,
    clientId: sub?.clientId,
  });

  const selectedSet = new Set(sub?.selectedRegions || sub?.enabledRegions || ['eastus', 'westeurope']);
  const structuredRegions = discovery.regions.map((r) => ({
    name: r.name,
    code: r.code,
    status: r.status,
    geography: r.geography || 'Global',
    enabled: selectedSet.has(r.code),
  }));

  res.json({
    success: true,
    subscriptionId,
    totalCount: structuredRegions.length,
    selectedCount: structuredRegions.filter((r) => r.enabled).length,
    regions: structuredRegions,
  });
});

app.get('/api/azure/regions', async (req, res) => {
  const discovery = await describeAzureLocations();
  res.json({
    success: true,
    totalCount: discovery.regions.length,
    regions: discovery.regions,
  });
});

app.put('/api/azure/regions', (req, res) => {
  const { regionId, regionCode, enabled } = req.body;
  const target = regionCode || regionId;
  azureRegions = azureRegions.map((r) => (r.id === target || r.region === target ? { ...r, enabled } : r));
  res.json({ success: true, regions: azureRegions });
});

app.get('/api/azure/vms', async (req, res) => {
  const { subscriptionId, region } = req.query;
  // Aggregate active enabled regions across connected subscriptions unless explicitly filtered
  const activeConnected = azureSubscriptions.filter((s) => s.status === 'Connected');
  const allSelectedRegions = Array.from(new Set(activeConnected.flatMap((s) => s.selectedRegions || s.enabledRegions || [])));

  let vms = await getAzureVMs({
    ...req.query,
    enabledRegions: allSelectedRegions.length > 0 ? allSelectedRegions : undefined,
  });

  if (subscriptionId && subscriptionId !== 'all') {
    vms = vms.filter((v) => v.subscriptionId === subscriptionId || (subscriptionId.startsWith('sub-89af') && v.subscriptionId === 'sub-azure-01'));
  }
  if (region && region !== 'all') {
    vms = vms.filter((v) => v.region === region);
  }

  res.json(vms);
});

app.get('/api/azure/vms/:vmId', async (req, res) => {
  const vm = await getAzureVMById(req.params.vmId);
  if (!vm) return res.status(404).json({ error: 'Azure VM not found' });
  res.json(vm);
});

// Docker Endpoints
app.get('/api/docker/containers', (req, res) => {
  const { provider } = req.query;
  const mockContainers = [
    {
      id: 'doc-01',
      containerId: 'c-0a1b2c3d4e',
      name: 'nginx-reverse-proxy',
      image: 'nginx:1.25-alpine',
      hostInstance: 'web-server-01',
      cloudProvider: 'aws',
      region: 'us-east-1',
      status: 'Stopped',
      cpuUsage: 0,
      memoryUsage: 8,
      memoryLimit: '512 MB',
      diskIO: '0 MB/s',
      networkTraffic: '0 KB/s',
      restartCount: 2,
    },
    {
      id: 'doc-02',
      containerId: 'c-1b2c3d4e5f',
      name: 'redis-cache-master',
      image: 'redis:7.2-alpine',
      hostInstance: 'app-server-01',
      cloudProvider: 'aws',
      region: 'us-east-1',
      status: 'Running',
      cpuUsage: 14,
      memoryUsage: 42,
      memoryLimit: '2048 MB',
      diskIO: '1.2 MB/s',
      networkTraffic: '4.8 MB/s',
      restartCount: 0,
    },
    {
      id: 'doc-04',
      containerId: 'c-3d4e5f6a7b',
      name: 'az-gateway-envoy',
      image: 'envoyproxy/envoy:v1.28',
      hostInstance: 'az-prod-api-01',
      cloudProvider: 'azure',
      region: 'eastus',
      status: 'Running',
      cpuUsage: 32,
      memoryUsage: 48,
      memoryLimit: '2048 MB',
      diskIO: '2.1 MB/s',
      networkTraffic: '18.4 MB/s',
      restartCount: 0,
    },
  ];

  if (provider && provider !== 'all') {
    return res.json(mockContainers.filter((c) => c.cloudProvider === provider));
  }
  res.json(mockContainers);
});

// Kubernetes Endpoints
app.get('/api/kubernetes/clusters', (req, res) => {
  const { provider } = req.query;
  const clusters = [
    { id: 'k8s-01', name: 'eks-cluster-prod', cloudProvider: 'aws', region: 'us-east-1', type: 'EKS', version: 'v1.28.2', nodeCount: 4, namespaceCount: 6, podCount: 48, status: 'Healthy' },
    { id: 'k8s-02', name: 'aks-cluster-eastus', cloudProvider: 'azure', region: 'eastus', type: 'AKS', version: 'v1.28.3', nodeCount: 3, namespaceCount: 5, podCount: 32, status: 'Healthy' },
  ];
  if (provider && provider !== 'all') {
    return res.json(clusters.filter((c) => c.cloudProvider === provider));
  }
  res.json(clusters);
});

app.get('/api/kubernetes/nodes', (req, res) => {
  res.json([
    { id: 'node-01', name: 'ip-10-0-1-14.ec2.internal', cluster: 'eks-cluster-prod', status: 'Ready', cpuUsage: 64, memoryUsage: 72 },
    { id: 'node-02', name: 'aks-nodepool1-vmss000001', cluster: 'aks-cluster-eastus', status: 'Ready', cpuUsage: 52, memoryUsage: 65 },
  ]);
});

app.get('/api/kubernetes/pods', (req, res) => {
  const { status, provider } = req.query;
  let pods = [
    { id: 'p-1', name: 'api-deployment-8v2lp', namespace: 'production', cluster: 'eks-cluster-prod', cloudProvider: 'aws', status: 'Running', cpuUsage: 35, memoryUsage: 48, restartCount: 0 },
    { id: 'p-2', name: 'api-deployment-9k3mx', namespace: 'production', cluster: 'eks-cluster-prod', cloudProvider: 'aws', status: 'CrashLoopBackOff', cpuUsage: 8, memoryUsage: 22, restartCount: 5 },
    { id: 'p-3', name: 'checkout-frontend-4f1ea', namespace: 'frontend', cluster: 'aks-cluster-eastus', cloudProvider: 'azure', status: 'Running', cpuUsage: 18, memoryUsage: 36, restartCount: 0 },
  ];
  if (status && status !== 'all') pods = pods.filter((p) => p.status.toLowerCase() === status.toLowerCase());
  if (provider && provider !== 'all') pods = pods.filter((p) => p.cloudProvider === provider);
  res.json(pods);
});

// Alerts In-Memory Store
const mockAlerts = [
  { id: 'alt-01', title: 'High CPU Utilization (>85%) on web-server-01', provider: 'aws', resource: 'i-0a1b2c3d4e5f6789', severity: 'critical', status: 'active', time: '10m ago' },
  { id: 'alt-02', title: 'Memory pressure approaching limit on az-prod-api-01', provider: 'azure', resource: 'azure-vm-01', severity: 'warning', status: 'active', time: '25m ago' },
  { id: 'alt-03', title: 'Disk space low (<15% free) on db-server-01', provider: 'aws', resource: 'i-0f1e2d3c4b5a6978', severity: 'critical', status: 'resolved', time: '1h ago' },
  { id: 'alt-04', title: 'Network latency spike on az-analytics-node-01', provider: 'azure', resource: 'az-analytics-node-01', severity: 'warning', status: 'active', time: '2h ago' },
];

app.get('/api/alerts', (req, res) => {
  const { provider, severity, status } = req.query;
  let filtered = [...mockAlerts];
  if (provider && provider !== 'all') {
    filtered = filtered.filter((a) => a.provider === provider);
  }
  if (severity && severity !== 'all') {
    filtered = filtered.filter((a) => a.severity.toLowerCase() === severity.toLowerCase());
  }
  if (status && status !== 'all') {
    filtered = filtered.filter((a) => a.status.toLowerCase() === status.toLowerCase());
  }
  res.json(filtered);
});

// Resources API with MongoDB Query Provider Filtering
app.get('/api/resources', async (req, res) => {
  const { provider, accountId, subscriptionId, region, resourceType, search } = req.query;

  // If MongoDB is connected and active:
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
      console.warn('MongoDB query failed, falling back to in-memory:', err.message);
    }
  }

  // In-memory fallback
  let filtered = [...defaultResources];
  if (provider === 'aws') {
    filtered = filtered.filter((r) => r.provider === 'aws');
  } else if (provider === 'azure') {
    filtered = filtered.filter((r) => r.provider === 'azure');
  } else if (provider === 'all' || !provider) {
    filtered = filtered.filter((r) => ['aws', 'azure'].includes(r.provider));
  }

  if (accountId && accountId !== 'all') {
    filtered = filtered.filter((r) => r.accountId === accountId || (accountId === '1234-5678-9012' && r.accountId === 'acc-aws-01'));
  }
  if (subscriptionId && subscriptionId !== 'all') {
    filtered = filtered.filter((r) => r.subscriptionId === subscriptionId || (subscriptionId.startsWith('sub-89af') && r.subscriptionId === 'sub-azure-01'));
  }
  if (region && region !== 'all') {
    filtered = filtered.filter((r) => r.region === region);
  }
  if (resourceType && resourceType !== 'all') {
    filtered = filtered.filter((r) => r.resourceType === resourceType);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((r) => (r.name && r.name.toLowerCase().includes(q)) || r.resourceId.toLowerCase().includes(q));
  }

  const queryObj =
    provider === 'aws'
      ? { provider: 'aws' }
      : provider === 'azure'
      ? { provider: 'azure' }
      : { provider: { $in: ['aws', 'azure'] } };

  res.json({
    success: true,
    count: filtered.length,
    provider: provider || 'all',
    query: queryObj,
    resources: filtered,
  });
});

// Dashboard Overview Endpoints with Dynamic Calculations
app.get('/api/dashboard/overview', async (req, res) => {
  const { provider, accountId, subscriptionId } = req.query;
  const ec2 = await getEc2Instances({ accountId });
  const vms = await getAzureVMs({ subscriptionId });

  let awsInstances = ec2;
  let azureInstances = vms;

  let awsTotal = awsInstances.length;
  let azureTotal = azureInstances.length;

  const mockContainers = [
    { id: 'c1', provider: 'aws', status: 'Running' },
    { id: 'c2', provider: 'aws', status: 'Stopped' },
    { id: 'c3', provider: 'azure', status: 'Running' },
  ];

  const mockClusters = [
    { id: 'k1', provider: 'aws', status: 'Healthy' },
    { id: 'k2', provider: 'azure', status: 'Healthy' },
  ];

  let totalServersCount = awsTotal + azureTotal;
  let totalRunningServers =
    awsInstances.filter((i) => i.status === 'Running').length +
    azureInstances.filter((v) => v.powerState === 'Running').length;

  let totalContainers = mockContainers.length;
  let runningContainers = mockContainers.filter((c) => c.status === 'Running').length;

  let totalClusters = mockClusters.length;
  let healthyClusters = mockClusters.filter((k) => k.status === 'Healthy').length;

  let totalAlerts = mockAlerts.filter((a) => a.status === 'active').length;

  if (provider === 'aws') {
    azureTotal = 0;
    totalServersCount = awsTotal;
    totalRunningServers = awsInstances.filter((i) => i.status === 'Running').length;
    const awsContainers = mockContainers.filter((c) => c.provider === 'aws');
    totalContainers = awsContainers.length;
    runningContainers = awsContainers.filter((c) => c.status === 'Running').length;
    const awsClusters = mockClusters.filter((k) => k.provider === 'aws');
    totalClusters = awsClusters.length;
    healthyClusters = awsClusters.filter((k) => k.status === 'Healthy').length;
    totalAlerts = mockAlerts.filter((a) => a.provider === 'aws' && a.status === 'active').length;
  } else if (provider === 'azure') {
    awsTotal = 0;
    totalServersCount = azureTotal;
    totalRunningServers = azureInstances.filter((v) => v.powerState === 'Running').length;
    const azContainers = mockContainers.filter((c) => c.provider === 'azure');
    totalContainers = azContainers.length;
    runningContainers = azContainers.filter((c) => c.status === 'Running').length;
    const azClusters = mockClusters.filter((k) => k.provider === 'azure');
    totalClusters = azClusters.length;
    healthyClusters = azClusters.filter((k) => k.status === 'Healthy').length;
    totalAlerts = mockAlerts.filter((a) => a.provider === 'azure' && a.status === 'active').length;
  }

  res.json({
    awsResources: {
      total: provider === 'azure' ? 0 : awsTotal,
      changeText: '+1 new',
      trend: [8, 9, 10, 10, 11, awsTotal],
    },
    azureResources: {
      total: provider === 'aws' ? 0 : azureTotal,
      changeText: '+0 new',
      trend: [7, 7, 8, 8, 8, azureTotal],
    },
    totalServers: {
      total: totalServersCount,
      runningText: `${totalRunningServers} running`,
      trend: [16, 17, 18, 19, 19, totalServersCount],
    },
    dockerContainers: {
      total: totalContainers,
      runningText: `${runningContainers} running`,
      trend: [10, 11, 12, 13, 14, totalContainers],
    },
    k8sClusters: {
      total: totalClusters,
      healthyText: `${healthyClusters} healthy`,
      trend: [1, 1, 2, 2, 2, totalClusters],
    },
    activeAlerts: {
      total: totalAlerts,
      newText: `${totalAlerts} new`,
      trend: [1, 2, 1, 3, 2, totalAlerts],
    },
  });
});

app.get('/api/dashboard/metrics', (req, res) => {
  res.json([
    { time: '14:00', aws: 42, azure: 38 },
    { time: '14:10', aws: 68, azure: 46 },
    { time: '14:20', aws: 82, azure: 64 },
    { time: '14:30', aws: 44, azure: 58 },
    { time: '14:40', aws: 76, azure: 52 },
    { time: '14:50', aws: 69, azure: 54 },
  ]);
});

app.listen(PORT, () => {
  console.log(`✓ Multi-Cloud Monitoring Backend running on http://localhost:${PORT}`);
});
