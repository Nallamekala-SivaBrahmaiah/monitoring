import { ClientSecretCredential } from '@azure/identity';

export interface AzureCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export function getAzureCredential(creds: AzureCredentials): ClientSecretCredential {
  return new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
}

export async function validateAzureCredentials(
  subscriptionId: string,
  tenantId: string,
  clientId: string,
  clientSecret: string
): Promise<{ success: boolean; displayName?: string; state?: string; error?: string }> {
  try {
    const credential = getAzureCredential({ tenantId, clientId, clientSecret });
    const token = await credential.getToken('https://management.azure.com/.default');

    if (!token || !token.token) {
      return { success: false, error: 'Failed to acquire access token from Azure Active Directory' };
    }

    const res = await fetch(`https://management.azure.com/subscriptions/${subscriptionId}?api-version=2020-01-01`, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        error: err.error?.message || `Subscription verification failed with HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const subData = await res.json();
    return {
      success: true,
      displayName: subData.displayName || 'Azure Subscription',
      state: subData.state || 'Enabled',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Azure credential validation failed',
    };
  }
}
