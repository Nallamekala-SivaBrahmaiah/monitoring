import connectToDatabase from '@/lib/mongodb';
import AnsibleHost from '@/models/AnsibleHost';
import Server from '@/models/Server';
import { getUnifiedServerInventory, UnifiedServerResource } from '@/lib/serverMonitoring/inventoryService';

export interface DiscoveredCloudServer {
  id: string;
  resourceId: string;
  name: string;
  provider: 'aws' | 'azure' | 'linux' | 'local' | 'other';
  resourceType: 'ec2' | 'azure-vm' | 'server';
  ip: string;
  privateIp?: string;
  region: string;
  os: string;
  status: string;
  username: string;
  hasStoredCredentials: boolean;
  isAlreadyInAnsible: boolean;
  ansibleHostId?: string;
}

/**
 * Discover real AWS EC2 instances and Azure Virtual Machines from existing cloud integrations.
 * Strictly excludes fake/sample records, terminated EC2 instances, and deleted Azure VMs.
 */
export async function discoverCloudServers(): Promise<DiscoveredCloudServer[]> {
  await connectToDatabase();

  // 1. Fetch currently approved managed nodes & primary controller & servers with stored secrets
  const [existingAnsibleHosts, primaryController, serversWithSecrets] = await Promise.all([
    AnsibleHost.find({}).lean(),
    (await import('@/models/AnsibleController')).default.findOne({ isPrimary: true }).lean(),
    Server.find({ encryptedAuthSecret: { $exists: true, $ne: '' } }).lean(),
  ]);

  const controllerIp = primaryController?.ipAddress ? primaryController.ipAddress.toLowerCase().trim() : '';
  const controllerInstId = primaryController?.instanceId ? primaryController.instanceId.toLowerCase().trim() : '';

  const ansibleHostIpMap = new Map<string, string>();
  const ansibleResourceIdMap = new Map<string, string>();

  existingAnsibleHosts.forEach((h: any) => {
    if (h.ip) ansibleHostIpMap.set(h.ip.toLowerCase().trim(), String(h._id));
    if (h.instanceId) ansibleResourceIdMap.set(h.instanceId.toLowerCase().trim(), String(h._id));
    if (h.sourceResourceId) ansibleResourceIdMap.set(h.sourceResourceId.toLowerCase().trim(), String(h._id));
  });

  // Build a set of targets that genuinely have encrypted credentials in database
  const serverSecretMap = new Set<string>();
  serversWithSecrets.forEach((srv: any) => {
    if (srv._id) serverSecretMap.add(srv._id.toString());
    if (srv.host) serverSecretMap.add(srv.host.toLowerCase().trim());
    if (srv.ip) serverSecretMap.add(srv.ip.toLowerCase().trim());
    if (srv.resourceId) serverSecretMap.add(srv.resourceId.toLowerCase().trim());
  });

  // 2. Fetch unified server inventory (real cloud discovered EC2 & Azure VMs)
  const unifiedServers: UnifiedServerResource[] = await getUnifiedServerInventory();

  const discovered: DiscoveredCloudServer[] = [];
  const seenKeys = new Set<string>();

  for (const s of unifiedServers) {
    // Only real AWS, Azure, or verified servers
    const effectiveIp = s.publicIp !== '-' ? s.publicIp : s.privateIp !== '-' ? s.privateIp : '';
    const normIp = (effectiveIp || '').toLowerCase().trim();
    const normResourceId = (s.resourceId || s.id).toLowerCase().trim();

    if (!normIp && !normResourceId) continue;

    // Deduplicate by IP or resourceId
    const uniqueKey = normResourceId || normIp;
    if (seenKeys.has(uniqueKey)) continue;
    seenKeys.add(uniqueKey);

    // Skip controller node so it is never shown as a managed node
    if (
      (controllerIp && normIp === controllerIp) ||
      (controllerInstId && normResourceId === controllerInstId)
    ) {
      continue;
    }

    const isImported =
      (normIp && ansibleHostIpMap.has(normIp)) ||
      (normResourceId && ansibleResourceIdMap.has(normResourceId));

    const matchedHostId =
      (normIp ? ansibleHostIpMap.get(normIp) : undefined) ||
      (normResourceId ? ansibleResourceIdMap.get(normResourceId) : undefined);

    let provider: 'aws' | 'azure' | 'linux' = 'linux';
    if (s.cloudProvider === 'aws') provider = 'aws';
    else if (s.cloudProvider === 'azure') provider = 'azure';

    const resourceType: 'ec2' | 'azure-vm' | 'server' =
      s.cloudProvider === 'aws' ? 'ec2' : s.cloudProvider === 'azure' ? 'azure-vm' : 'server';

    // Verify whether this server REALLY has an encrypted secret stored in DB
    const hasRealSecret =
      serverSecretMap.has(s.id) ||
      (normIp && serverSecretMap.has(normIp)) ||
      (normResourceId && serverSecretMap.has(normResourceId)) ||
      (s.sshServerId && serverSecretMap.has(s.sshServerId));

    discovered.push({
      id: s.id,
      resourceId: s.resourceId,
      name: s.name,
      provider,
      resourceType,
      ip: s.publicIp !== '-' ? s.publicIp : s.privateIp,
      privateIp: s.privateIp !== '-' ? s.privateIp : undefined,
      region: s.region,
      os: s.os || 'Linux',
      status: s.status,
      username: provider === 'aws' ? 'ec2-user' : provider === 'azure' ? 'azureuser' : 'ubuntu',
      hasStoredCredentials: Boolean(hasRealSecret),
      isAlreadyInAnsible: Boolean(isImported),
      ansibleHostId: matchedHostId,
    });
  }

  return discovered;
}
