/**
 * Azure SDK Service
 * Handles live Azure Authentication, ARM Location Discovery,
 * Resource Discovery via Azure Resource Manager, and Azure Monitor Metrics Telemetry.
 */

const { ClientSecretCredential } = require('@azure/identity');

// Comprehensive full Azure Global Locations Catalog
const ALL_AZURE_REGIONS_CATALOG = [
  // Americas
  { name: 'East US (Virginia)', code: 'eastus', status: 'available', geography: 'Americas' },
  { name: 'East US 2 (Virginia)', code: 'eastus2', status: 'available', geography: 'Americas' },
  { name: 'South Central US (Texas)', code: 'southcentralus', status: 'available', geography: 'Americas' },
  { name: 'West US (California)', code: 'westus', status: 'available', geography: 'Americas' },
  { name: 'West US 2 (Washington)', code: 'westus2', status: 'available', geography: 'Americas' },
  { name: 'West US 3 (Phoenix)', code: 'westus3', status: 'available', geography: 'Americas' },
  { name: 'Central US (Iowa)', code: 'centralus', status: 'available', geography: 'Americas' },
  { name: 'North Central US (Illinois)', code: 'northcentralus', status: 'available', geography: 'Americas' },
  { name: 'Canada Central (Toronto)', code: 'canadacentral', status: 'available', geography: 'Americas' },
  { name: 'Canada East (Quebec)', code: 'canadaeast', status: 'available', geography: 'Americas' },
  { name: 'Brazil South (São Paulo)', code: 'brazilsouth', status: 'available', geography: 'Americas' },
  { name: 'Mexico Central (Querétaro)', code: 'mexicocentral', status: 'available', geography: 'Americas' },

  // Europe
  { name: 'North Europe (Ireland)', code: 'northeurope', status: 'available', geography: 'Europe' },
  { name: 'West Europe (Netherlands)', code: 'westeurope', status: 'available', geography: 'Europe' },
  { name: 'UK South (London)', code: 'uksouth', status: 'available', geography: 'Europe' },
  { name: 'UK West (Cardiff)', code: 'ukwest', status: 'available', geography: 'Europe' },
  { name: 'France Central (Paris)', code: 'francecentral', status: 'available', geography: 'Europe' },
  { name: 'Germany West Central (Frankfurt)', code: 'germanywestcentral', status: 'available', geography: 'Europe' },
  { name: 'Switzerland North (Zurich)', code: 'switzerlandnorth', status: 'available', geography: 'Europe' },
  { name: 'Norway East (Oslo)', code: 'norwayeast', status: 'available', geography: 'Europe' },
  { name: 'Sweden Central (Gävle)', code: 'swedencentral', status: 'available', geography: 'Europe' },
  { name: 'Poland Central (Warsaw)', code: 'polandcentral', status: 'available', geography: 'Europe' },
  { name: 'Italy North (Milan)', code: 'italynorth', status: 'available', geography: 'Europe' },
  { name: 'Spain Central (Madrid)', code: 'spaincentral', status: 'available', geography: 'Europe' },

  // Asia Pacific
  { name: 'East Asia (Hong Kong)', code: 'eastasia', status: 'available', geography: 'Asia Pacific' },
  { name: 'Southeast Asia (Singapore)', code: 'southeastasia', status: 'available', geography: 'Asia Pacific' },
  { name: 'Japan East (Tokyo)', code: 'japaneast', status: 'available', geography: 'Asia Pacific' },
  { name: 'Japan West (Osaka)', code: 'japanwest', status: 'available', geography: 'Asia Pacific' },
  { name: 'Korea Central (Seoul)', code: 'koreacentral', status: 'available', geography: 'Asia Pacific' },
  { name: 'Korea South (Busan)', code: 'koreasouth', status: 'available', geography: 'Asia Pacific' },
  { name: 'Central India (Pune)', code: 'centralindia', status: 'available', geography: 'Asia Pacific' },
  { name: 'South India (Chennai)', code: 'southindia', status: 'available', geography: 'Asia Pacific' },
  { name: 'West India (Mumbai)', code: 'westindia', status: 'available', geography: 'Asia Pacific' },
  { name: 'Australia East (Sydney)', code: 'australiaeast', status: 'available', geography: 'Asia Pacific' },
  { name: 'Australia Southeast (Melbourne)', code: 'australiasoutheast', status: 'available', geography: 'Asia Pacific' },
  { name: 'Australia Central (Canberra)', code: 'australiacentral', status: 'available', geography: 'Asia Pacific' },
  { name: 'New Zealand North (Auckland)', code: 'newzealandnorth', status: 'available', geography: 'Asia Pacific' },

  // Middle East & Africa
  { name: 'UAE North (Dubai)', code: 'uaenorth', status: 'available', geography: 'Middle East & Africa' },
  { name: 'Qatar Central (Doha)', code: 'qatarcentral', status: 'available', geography: 'Middle East & Africa' },
  { name: 'Israel Central (Tel Aviv)', code: 'israelcentral', status: 'available', geography: 'Middle East & Africa' },
  { name: 'South Africa North (Johannesburg)', code: 'southafricanorth', status: 'available', geography: 'Middle East & Africa' },
];

// Active discovered live resources cache (only populated when actual Azure subscription connects)
let liveDiscoveredResources = [];
let liveDiscoveredVMs = [];

/**
 * Validates Azure Service Principal Credentials against the Subscription
 */
async function validateAzureCredentials({ subscriptionId, tenantId, clientId, clientSecret }) {
  if (!subscriptionId || !tenantId || !clientId || !clientSecret) {
    throw new Error('Subscription ID, Tenant ID, Client ID, and Client Secret are required.');
  }

  try {
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const token = await credential.getToken('https://management.azure.com/.default');

    if (!token || !token.token) {
      throw new Error('Failed to acquire authentication token from Azure Active Directory.');
    }

    const res = await fetch(`https://management.azure.com/subscriptions/${subscriptionId}?api-version=2020-01-01`, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson.error?.message || `Azure returned HTTP ${res.status}: ${res.statusText}`;
      throw new Error(msg);
    }

    const subData = await res.json();
    return {
      success: true,
      subscriptionId: subData.subscriptionId,
      displayName: subData.displayName || 'Azure Subscription',
      state: subData.state || 'Enabled',
    };
  } catch (err) {
    throw new Error(`Azure Authentication Error: ${err.message}`);
  }
}

/**
 * Dynamically discover Azure locations using Azure Resource Manager Locations API
 * GET /subscriptions/{subscriptionId}/locations
 * Selects all supported regions by default.
 */
async function describeAzureLocations(options = {}) {
  const { subscriptionId, tenantId, clientId, clientSecret } = options;

  if (subscriptionId && tenantId && clientId && clientSecret) {
    try {
      const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
      const token = await credential.getToken('https://management.azure.com/.default');

      if (token && token.token) {
        const response = await fetch(
          `https://management.azure.com/subscriptions/${subscriptionId}/locations?api-version=2022-12-01`,
          {
            headers: {
              Authorization: `Bearer ${token.token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.value)) {
            const discovered = data.value.map((loc) => {
              const catalogMatch = ALL_AZURE_REGIONS_CATALOG.find((cat) => cat.code === loc.name);
              return {
                name: loc.displayName || (catalogMatch ? catalogMatch.name : loc.name),
                code: loc.name,
                status: 'available',
                geography: loc.metadata?.geographyGroup || (catalogMatch ? catalogMatch.geography : 'Global'),
                enabled: true, // Select All Regions by default
              };
            });

            return {
              success: true,
              totalCount: discovered.length,
              regions: discovered,
            };
          }
        }
      }
    } catch (err) {
      console.warn(`[Azure Service] Live ARM Locations API note: ${err.message}`);
    }
  }

  // Comprehensive catalog with ALL regions enabled by default
  return {
    success: true,
    totalCount: ALL_AZURE_REGIONS_CATALOG.length,
    regions: ALL_AZURE_REGIONS_CATALOG.map((r) => ({
      ...r,
      enabled: true, // All regions enabled by default
    })),
  };
}

/**
 * Discovers all supported Azure resources in the subscription across all selected regions
 * Uses Azure Resource Manager Resources API with pagination (nextLink)
 */
async function discoverAllAzureResources(options = {}) {
  const { subscriptionId, tenantId, clientId, clientSecret, selectedRegions } = options;

  if (!subscriptionId || !tenantId || !clientId || !clientSecret) {
    return { resources: [], vms: [], count: 0 };
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const token = await credential.getToken('https://management.azure.com/.default');

  if (!token || !token.token) {
    throw new Error('Unable to authenticate with Azure to discover resources.');
  }

  const bearerHeader = { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' };
  let url = `https://management.azure.com/subscriptions/${subscriptionId}/resources?api-version=2021-04-01`;

  let rawResources = [];

  // Follow pagination tokens until all pages are retrieved
  while (url) {
    const res = await fetch(url, { headers: bearerHeader });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Failed to list Azure resources: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    if (Array.isArray(data.value)) {
      rawResources.push(...data.value);
    }
    url = data.nextLink || null;
  }

  // Filter by selected regions if specified
  const enabledRegionSet = Array.isArray(selectedRegions) && selectedRegions.length > 0
    ? new Set(selectedRegions)
    : null;

  if (enabledRegionSet) {
    rawResources = rawResources.filter((r) => enabledRegionSet.has(r.location));
  }

  const discoveredResources = [];
  const discoveredVMs = [];

  for (const item of rawResources) {
    const resourceTypeRaw = item.type;
    let mappedType = 'other';

    if (resourceTypeRaw === 'Microsoft.Compute/virtualMachines') mappedType = 'virtual-machine';
    else if (resourceTypeRaw === 'Microsoft.Compute/virtualMachineScaleSets') mappedType = 'vmss';
    else if (resourceTypeRaw === 'Microsoft.Compute/disks') mappedType = 'disk';
    else if (resourceTypeRaw === 'Microsoft.Network/networkInterfaces') mappedType = 'network-interface';
    else if (resourceTypeRaw === 'Microsoft.Network/publicIPAddresses') mappedType = 'public-ip';
    else if (resourceTypeRaw === 'Microsoft.Network/loadBalancers') mappedType = 'load-balancer';
    else if (resourceTypeRaw === 'Microsoft.Network/virtualNetworks') mappedType = 'virtual-network';
    else if (resourceTypeRaw === 'Microsoft.ContainerService/managedClusters') mappedType = 'cluster';
    else if (resourceTypeRaw === 'Microsoft.Storage/storageAccounts') mappedType = 'storage-account';

    // Extract Resource Group from resource ID
    const rgMatch = item.id.match(/resourceGroups\/([^\/]+)/i);
    const resourceGroup = rgMatch ? rgMatch[1] : 'default-rg';

    const normalizedResource = {
      provider: 'azure',
      subscriptionId,
      region: item.location,
      resourceType: mappedType,
      resourceId: item.id,
      name: item.name,
      status: 'Active',
      metadata: {
        rawType: item.type,
        resourceGroup,
        tags: item.tags || {},
      },
    };

    discoveredResources.push(normalizedResource);

    // If resource is a Virtual Machine, fetch instance view and real metrics
    if (mappedType === 'virtual-machine') {
      try {
        let powerState = 'Unknown';
        let vmSize = 'Unknown';
        let os = 'Linux';
        let privateIp = 'N/A';
        let publicIp = 'N/A';

        // 1. Fetch VM Instance View for actual Power State & Sizing
        const vmDetailRes = await fetch(
          `https://management.azure.com${item.id}?$expand=instanceView&api-version=2023-09-01`,
          { headers: bearerHeader }
        );

        if (vmDetailRes.ok) {
          const vmDetail = await vmDetailRes.json();
          vmSize = vmDetail.properties?.hardwareProfile?.vmSize || 'Standard_D2s_v3';
          os = vmDetail.properties?.storageProfile?.osDisk?.osType || 'Linux';

          const statuses = vmDetail.properties?.instanceView?.statuses || [];
          const powerStatus = statuses.find((s) => s.code && s.code.startsWith('PowerState/'));
          if (powerStatus) {
            powerState = powerStatus.displayStatus?.replace('VM ', '') || powerStatus.code.replace('PowerState/', '');
          }

          // Try resolving Network Interface IP
          const nics = vmDetail.properties?.networkProfile?.networkInterfaces || [];
          if (nics.length > 0 && nics[0].id) {
            const nicRes = await fetch(`https://management.azure.com${nics[0].id}?api-version=2023-09-01`, {
              headers: bearerHeader,
            });
            if (nicRes.ok) {
              const nicData = await nicRes.json();
              const ipConfigs = nicData.properties?.ipConfigurations || [];
              if (ipConfigs.length > 0) {
                privateIp = ipConfigs[0].properties?.privateIPAddress || 'N/A';
                if (ipConfigs[0].properties?.publicIPAddress?.id) {
                  const pipRes = await fetch(
                    `https://management.azure.com${ipConfigs[0].properties.publicIPAddress.id}?api-version=2023-09-01`,
                    { headers: bearerHeader }
                  );
                  if (pipRes.ok) {
                    const pipData = await pipRes.json();
                    publicIp = pipData.properties?.ipAddress || 'N/A';
                  }
                }
              }
            }
          }
        }

        // 2. Query Azure Monitor Metrics API for Real Telemetry
        let cpuUsage = null;
        let memoryUsage = null;
        let diskUsage = null;
        let networkInMB = null;
        let networkOutMB = null;

        const metricsRes = await fetch(
          `https://management.azure.com${item.id}/providers/Microsoft.Insights/metrics?api-version=2018-01-01&metricnames=Percentage CPU,Available Memory Bytes,Disk Read Bytes,Disk Write Bytes,Network In Total,Network Out Total&timespan=PT1H&interval=PT5M&aggregation=Average`,
          { headers: bearerHeader }
        );

        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          if (Array.isArray(metricsData.value)) {
            for (const m of metricsData.value) {
              const name = m.name?.value;
              const points = m.timeseries?.[0]?.data || [];
              const validPoints = points.filter((p) => p.average !== undefined && p.average !== null);
              const latest = validPoints.length > 0 ? validPoints[validPoints.length - 1].average : null;

              if (name === 'Percentage CPU' && latest !== null) {
                cpuUsage = Math.round(latest);
              } else if (name === 'Available Memory Bytes' && latest !== null) {
                memoryUsage = Math.round(latest / (1024 * 1024));
              } else if (name === 'Disk Read Bytes' && latest !== null) {
                diskUsage = Math.round((latest / (1024 * 1024)) * 10) / 10;
              } else if (name === 'Network In Total' && latest !== null) {
                networkInMB = Math.round((latest / (1024 * 1024)) * 10) / 10;
              } else if (name === 'Network Out Total' && latest !== null) {
                networkOutMB = Math.round((latest / (1024 * 1024)) * 10) / 10;
              }
            }
          }
        }

        const vmObject = {
          id: item.name,
          vmId: item.id,
          name: item.name,
          subscriptionId,
          subscriptionName: options.subscriptionName || 'Azure Subscription',
          resourceGroup,
          region: item.location,
          vmSize,
          powerState: powerState === 'running' ? 'Running' : powerState,
          cpuUsage, // null if unavailable ("Metric unavailable")
          memoryUsage, // null if unavailable
          diskUsage, // null if unavailable
          networkInMB, // null if unavailable
          networkOutMB, // null if unavailable
          uptime: 'Active',
          os,
          privateIp,
          publicIp,
        };

        discoveredVMs.push(vmObject);
      } catch (vmErr) {
        console.warn(`Could not fetch details for VM ${item.name}:`, vmErr.message);
      }
    }
  }

  // Update live memory cache
  liveDiscoveredResources = discoveredResources;
  liveDiscoveredVMs = discoveredVMs;

  return {
    resources: discoveredResources,
    vms: discoveredVMs,
    count: discoveredResources.length,
    vmCount: discoveredVMs.length,
  };
}

/**
 * Returns real Azure VMs filtered by subscription, region, status, search
 */
async function getAzureVMs(options = {}) {
  const { subscriptionId, region, status, search, enabledRegions } = options;

  let vms = [...liveDiscoveredVMs];

  if (subscriptionId && subscriptionId !== 'all') {
    vms = vms.filter((v) => v.subscriptionId === subscriptionId);
  }

  if (region && region !== 'all') {
    vms = vms.filter((v) => v.region === region);
  }

  if (Array.isArray(enabledRegions) && enabledRegions.length > 0) {
    const enabledSet = new Set(enabledRegions);
    vms = vms.filter((v) => enabledSet.has(v.region));
  }

  if (status && status !== 'all') {
    vms = vms.filter((v) => (v.powerState || '').toLowerCase() === status.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    vms = vms.filter((v) => (v.name && v.name.toLowerCase().includes(q)) || (v.vmId && v.vmId.toLowerCase().includes(q)));
  }

  return vms;
}

async function getAzureVMById(vmId) {
  return liveDiscoveredVMs.find((v) => v.vmId === vmId || v.id === vmId) || null;
}

function clearDiscoveredAzureResources(subscriptionId) {
  if (subscriptionId) {
    liveDiscoveredResources = liveDiscoveredResources.filter((r) => r.subscriptionId !== subscriptionId);
    liveDiscoveredVMs = liveDiscoveredVMs.filter((v) => v.subscriptionId !== subscriptionId);
  } else {
    liveDiscoveredResources = [];
    liveDiscoveredVMs = [];
  }
}

module.exports = {
  validateAzureCredentials,
  describeAzureLocations,
  discoverAllAzureResources,
  getAzureVMs,
  getAzureVMById,
  clearDiscoveredAzureResources,
  ALL_AZURE_REGIONS_CATALOG,
};
