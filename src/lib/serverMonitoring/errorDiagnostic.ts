/**
 * Helper to translate raw SSH2 and network errors into actionable diagnostics
 */
export function formatConnectionDiagnostic(
  err: any,
  context?: { host?: string; port?: number; authMethod?: string }
): { message: string; hint?: string } {
  const raw = (err?.message || String(err || '')).trim();
  const host = context?.host || 'remote host';
  const port = context?.port || 22;
  const authMethod = context?.authMethod || 'password';

  if (raw.includes('All configured authentication methods failed')) {
    if (authMethod === 'password') {
      const isAzure = host.startsWith('20.') || host.startsWith('4.');
      return {
        message: 'Authentication failed: Remote server rejected password authentication.',
        hint: isAzure
          ? 'Ensure the SSH Username is set to the correct admin user for this Azure VM (e.g., "siva" or "azureuser", not "ubuntu") and that the password is correct.'
          : 'Azure and AWS Linux virtual machines disable SSH password authentication by default. Ensure the username is correct (e.g., "siva" on Azure, "ubuntu" on AWS) or switch to "SSH Private Key".',
      };
    }
    return {
      message: 'Authentication failed: Remote server rejected SSH private key credentials.',
      hint: 'Please check that the SSH Username matches the user authorized in ~/.ssh/authorized_keys (e.g., "ubuntu" on Ubuntu, "ec2-user" on Amazon Linux, "azureuser" on Azure).',
    };
  }

  if (raw.includes('timed out') || raw.includes('ETIMEDOUT')) {
    return {
      message: `Connection timed out while reaching ${host}:${port}.`,
      hint: `Verify that the host IP is accessible from the internet and port ${port} is open in your cloud Security Group / Firewall (Azure Network Security Group inbound rule, AWS Security Group inbound port 22).`,
    };
  }

  if (raw.includes('ECONNREFUSED')) {
    return {
      message: `Connection refused on ${host}:${port}.`,
      hint: `The host is reachable, but nothing is listening on port ${port}. Ensure the SSH service is running (systemctl status ssh).`,
    };
  }

  if (raw.includes('ENOTFOUND') || raw.includes('getaddrinfo')) {
    return {
      message: `DNS / Hostname lookup failed for "${host}".`,
      hint: 'Please check the IP address or domain name for typographical errors.',
    };
  }

  if (raw.includes('Cannot parse privateKey') || raw.includes('Unsupported key format')) {
    return {
      message: 'Invalid SSH Private Key format.',
      hint: 'Ensure your private key is an OpenSSH or RSA PEM formatted key starting with "-----BEGIN OPENSSH PRIVATE KEY-----" or "-----BEGIN RSA PRIVATE KEY-----".',
    };
  }

  if (raw.includes('Encrypted private key') || raw.includes('passphrase')) {
    return {
      message: 'Encrypted private key requires a passphrase.',
      hint: 'Your private key is protected by a passphrase. Please provide the passphrase or decrypt it first.',
    };
  }

  return {
    message: raw || 'SSH Connection probe failed.',
    hint: 'Check that the IP, port, username, and authentication secret are correct and reachable.',
  };
}
