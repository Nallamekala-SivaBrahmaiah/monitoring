import { DiscoveredRegion } from '@/types/monitoring';

/**
 * Complete AWS Global Regions Catalog (Standard & Opt-in)
 */
export const ALL_AWS_REGIONS: DiscoveredRegion[] = [
  // North America
  { name: 'US East (N. Virginia)', code: 'us-east-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'North America', enabled: true },
  { name: 'US East (Ohio)', code: 'us-east-2', status: 'available', optInStatus: 'opt-in-not-required', geography: 'North America', enabled: true },
  { name: 'US West (N. California)', code: 'us-west-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'North America', enabled: false },
  { name: 'US West (Oregon)', code: 'us-west-2', status: 'available', optInStatus: 'opt-in-not-required', geography: 'North America', enabled: true },
  { name: 'Canada (Central)', code: 'ca-central-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'North America', enabled: false },
  { name: 'Canada West (Calgary)', code: 'ca-west-1', status: 'available', optInStatus: 'opted-in', geography: 'North America', enabled: false },
  { name: 'Mexico (Central)', code: 'mx-central-1', status: 'available', optInStatus: 'opted-in', geography: 'North America', enabled: false },

  // South America
  { name: 'South America (São Paulo)', code: 'sa-east-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'South America', enabled: false },

  // Europe
  { name: 'Europe (Ireland)', code: 'eu-west-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Europe', enabled: true },
  { name: 'Europe (London)', code: 'eu-west-2', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Europe', enabled: false },
  { name: 'Europe (Paris)', code: 'eu-west-3', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Europe', enabled: false },
  { name: 'Europe (Frankfurt)', code: 'eu-central-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Europe', enabled: false },
  { name: 'Europe (Zurich)', code: 'eu-central-2', status: 'available', optInStatus: 'opted-in', geography: 'Europe', enabled: false },
  { name: 'Europe (Stockholm)', code: 'eu-north-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Europe', enabled: false },
  { name: 'Europe (Milan)', code: 'eu-south-1', status: 'available', optInStatus: 'opted-in', geography: 'Europe', enabled: false },
  { name: 'Europe (Spain)', code: 'eu-south-2', status: 'available', optInStatus: 'opted-in', geography: 'Europe', enabled: false },

  // Asia Pacific
  { name: 'Asia Pacific (Mumbai)', code: 'ap-south-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Asia Pacific', enabled: true },
  { name: 'Asia Pacific (Hyderabad)', code: 'ap-south-2', status: 'available', optInStatus: 'opted-in', geography: 'Asia Pacific', enabled: false },
  { name: 'Asia Pacific (Singapore)', code: 'ap-southeast-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Asia Pacific', enabled: false },
  { name: 'Asia Pacific (Sydney)', code: 'ap-southeast-2', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Asia Pacific', enabled: false },
  { name: 'Asia Pacific (Jakarta)', code: 'ap-southeast-3', status: 'available', optInStatus: 'opted-in', geography: 'Asia Pacific', enabled: false },
  { name: 'Asia Pacific (Melbourne)', code: 'ap-southeast-4', status: 'available', optInStatus: 'opted-in', geography: 'Asia Pacific', enabled: false },
  { name: 'Asia Pacific (Malaysia)', code: 'ap-southeast-5', status: 'available', optInStatus: 'opted-in', geography: 'Asia Pacific', enabled: false },
  { name: 'Asia Pacific (Tokyo)', code: 'ap-northeast-1', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Asia Pacific', enabled: false },
  { name: 'Asia Pacific (Seoul)', code: 'ap-northeast-2', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Asia Pacific', enabled: false },
  { name: 'Asia Pacific (Osaka)', code: 'ap-northeast-3', status: 'available', optInStatus: 'opt-in-not-required', geography: 'Asia Pacific', enabled: false },
  { name: 'Asia Pacific (Hong Kong)', code: 'ap-east-1', status: 'available', optInStatus: 'opted-in', geography: 'Asia Pacific', enabled: false },

  // Middle East & Africa
  { name: 'Middle East (Bahrain)', code: 'me-south-1', status: 'available', optInStatus: 'opted-in', geography: 'Middle East & Africa', enabled: false },
  { name: 'Middle East (UAE)', code: 'me-central-1', status: 'available', optInStatus: 'opted-in', geography: 'Middle East & Africa', enabled: false },
  { name: 'Israel (Tel Aviv)', code: 'il-central-1', status: 'available', optInStatus: 'opted-in', geography: 'Middle East & Africa', enabled: false },
  { name: 'Africa (Cape Town)', code: 'af-south-1', status: 'available', optInStatus: 'opted-in', geography: 'Middle East & Africa', enabled: false },
];

/**
 * Complete Azure Global Locations Catalog
 */
export const ALL_AZURE_REGIONS: DiscoveredRegion[] = [
  // Americas
  { name: 'East US (Virginia)', code: 'eastus', status: 'available', geography: 'Americas', enabled: true },
  { name: 'East US 2 (Virginia)', code: 'eastus2', status: 'available', geography: 'Americas', enabled: false },
  { name: 'South Central US (Texas)', code: 'southcentralus', status: 'available', geography: 'Americas', enabled: false },
  { name: 'West US (California)', code: 'westus', status: 'available', geography: 'Americas', enabled: false },
  { name: 'West US 2 (Washington)', code: 'westus2', status: 'available', geography: 'Americas', enabled: false },
  { name: 'West US 3 (Phoenix)', code: 'westus3', status: 'available', geography: 'Americas', enabled: false },
  { name: 'Central US (Iowa)', code: 'centralus', status: 'available', geography: 'Americas', enabled: false },
  { name: 'North Central US (Illinois)', code: 'northcentralus', status: 'available', geography: 'Americas', enabled: false },
  { name: 'Canada Central (Toronto)', code: 'canadacentral', status: 'available', geography: 'Americas', enabled: false },
  { name: 'Canada East (Quebec)', code: 'canadaeast', status: 'available', geography: 'Americas', enabled: false },
  { name: 'Brazil South (São Paulo)', code: 'brazilsouth', status: 'available', geography: 'Americas', enabled: false },
  { name: 'Mexico Central (Querétaro)', code: 'mexicocentral', status: 'available', geography: 'Americas', enabled: false },

  // Europe
  { name: 'Austria East (Vienna)', code: 'austriaeast', status: 'available', geography: 'Europe', enabled: true },
  { name: 'North Europe (Ireland)', code: 'northeurope', status: 'available', geography: 'Europe', enabled: false },
  { name: 'West Europe (Netherlands)', code: 'westeurope', status: 'available', geography: 'Europe', enabled: true },
  { name: 'UK South (London)', code: 'uksouth', status: 'available', geography: 'Europe', enabled: false },
  { name: 'UK West (Cardiff)', code: 'ukwest', status: 'available', geography: 'Europe', enabled: false },
  { name: 'France Central (Paris)', code: 'francecentral', status: 'available', geography: 'Europe', enabled: false },
  { name: 'Germany West Central (Frankfurt)', code: 'germanywestcentral', status: 'available', geography: 'Europe', enabled: false },
  { name: 'Switzerland North (Zurich)', code: 'switzerlandnorth', status: 'available', geography: 'Europe', enabled: false },
  { name: 'Norway East (Oslo)', code: 'norwayeast', status: 'available', geography: 'Europe', enabled: false },
  { name: 'Sweden Central (Gävle)', code: 'swedencentral', status: 'available', geography: 'Europe', enabled: false },
  { name: 'Poland Central (Warsaw)', code: 'polandcentral', status: 'available', geography: 'Europe', enabled: false },
  { name: 'Italy North (Milan)', code: 'italynorth', status: 'available', geography: 'Europe', enabled: false },
  { name: 'Spain Central (Madrid)', code: 'spaincentral', status: 'available', geography: 'Europe', enabled: false },

  // Asia Pacific
  { name: 'East Asia (Hong Kong)', code: 'eastasia', status: 'available', geography: 'Asia Pacific', enabled: false },
  { name: 'Southeast Asia (Singapore)', code: 'southeastasia', status: 'available', geography: 'Asia Pacific', enabled: false },
  { name: 'Japan East (Tokyo)', code: 'japaneast', status: 'available', geography: 'Asia Pacific', enabled: false },
  { name: 'Japan West (Osaka)', code: 'japanwest', status: 'available', geography: 'Asia Pacific', enabled: false },
  { name: 'Korea Central (Seoul)', code: 'koreacentral', status: 'available', geography: 'Asia Pacific', enabled: false },
  { name: 'Korea South (Busan)', code: 'koreasouth', status: 'available', geography: 'Asia Pacific', enabled: false },
  { name: 'Central India (Pune)', code: 'centralindia', status: 'available', geography: 'Asia Pacific', enabled: false },
  { name: 'South India (Chennai)', code: 'southindia', status: 'available', geography: 'Asia Pacific', enabled: false },
  { name: 'West India (Mumbai)', code: 'westindia', status: 'available', geography: 'Asia Pacific', enabled: false },
  { name: 'Australia East (Sydney)', code: 'australiaeast', status: 'available', geography: 'Asia Pacific', enabled: false },
  { name: 'Australia Southeast (Melbourne)', code: 'australiasoutheast', status: 'available', geography: 'Asia Pacific', enabled: false },
  { name: 'Australia Central (Canberra)', code: 'australiacentral', status: 'available', geography: 'Asia Pacific', enabled: false },
  { name: 'New Zealand North (Auckland)', code: 'newzealandnorth', status: 'available', geography: 'Asia Pacific', enabled: false },

  // Middle East & Africa
  { name: 'UAE North (Dubai)', code: 'uaenorth', status: 'available', geography: 'Middle East & Africa', enabled: false },
  { name: 'Qatar Central (Doha)', code: 'qatarcentral', status: 'available', geography: 'Middle East & Africa', enabled: false },
  { name: 'Israel Central (Tel Aviv)', code: 'israelcentral', status: 'available', geography: 'Middle East & Africa', enabled: false },
  { name: 'South Africa North (Johannesburg)', code: 'southafricanorth', status: 'available', geography: 'Middle East & Africa', enabled: false },
];

/**
 * Dynamically discover regions from backend API with fallback to comprehensive global catalog
 */
export async function fetchAwsRegions(accountId?: string): Promise<DiscoveredRegion[]> {
  try {
    const url = accountId && accountId !== 'all'
      ? `/api/aws/accounts/${accountId}/regions`
      : `/api/aws/regions`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch AWS regions from backend');
    const data = await res.json();
    if (data.success && Array.isArray(data.regions)) {
      return data.regions;
    }
    if (Array.isArray(data) && data.length > 5) {
      return data.map((r) => ({
        name: r.displayName || r.name,
        code: r.code || r.region,
        status: r.status || 'available',
        optInStatus: r.optInStatus || 'opt-in-not-required',
        geography: r.geography || 'Global',
        enabled: r.enabled ?? true,
      }));
    }
  } catch (err) {
    console.warn('[RegionDiscovery] Fetch failed, using dynamic AWS catalog:', err);
  }
  return ALL_AWS_REGIONS;
}

export async function fetchAzureRegions(subscriptionId?: string): Promise<DiscoveredRegion[]> {
  try {
    const url = subscriptionId && subscriptionId !== 'all'
      ? `/api/azure/subscriptions/${subscriptionId}/regions`
      : `/api/azure/regions`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch Azure regions from backend');
    const data = await res.json();
    if (data.success && Array.isArray(data.regions)) {
      return data.regions;
    }
    if (Array.isArray(data) && data.length > 5) {
      return data.map((r) => ({
        name: r.displayName || r.name,
        code: r.code || r.region,
        status: r.status || 'available',
        geography: r.geography || 'Global',
        enabled: r.enabled ?? true,
      }));
    }
  } catch (err) {
    console.warn('[RegionDiscovery] Fetch failed, using dynamic Azure catalog:', err);
  }
  return ALL_AZURE_REGIONS;
}
