import { getAzureCredential, AzureCredentials } from './credentials';

export interface AzureRegionLocation {
  id: string;
  name: string;
  displayName: string;
  regionalDisplayName: string;
  geographyGroup?: string;
  latitude?: string;
  longitude?: string;
}

export async function discoverAzureRegions(
  subscriptionId: string,
  credentials?: AzureCredentials
): Promise<{ code: string; name: string; geography: string }[]> {
  try {
    let token = '';
    if (credentials?.tenantId && credentials?.clientId && credentials?.clientSecret) {
      const cred = getAzureCredential(credentials);
      const tokenResponse = await cred.getToken('https://management.azure.com/.default');
      token = tokenResponse.token;
    }

    if (!token) {
      return [];
    }

    const res = await fetch(
      `https://management.azure.com/subscriptions/${subscriptionId}/locations?api-version=2022-12-01`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      console.warn(`[Azure] Locations API returned HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data.value)) {
      return [];
    }

    return data.value.map((loc: any) => ({
      code: loc.name,
      name: loc.displayName || loc.regionalDisplayName || loc.name,
      geography: loc.metadata?.geographyGroup || 'Global',
    }));
  } catch (err) {
    console.error('[Azure] Error discovering regions:', err);
    return [];
  }
}
