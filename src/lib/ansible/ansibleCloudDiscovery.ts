import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import AnsibleHost from '@/models/AnsibleHost';
import AnsibleController from '@/models/AnsibleController';
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
  sshServerId?: string;
}

/**
 * Discover real AWS EC2 instances and Azure Virtual Machines from existing cloud integrations.
 * Strictly excludes controllers from being listed as workers unless forController is true.
 * Checks whether an instance is already registered under the given target controller.
 */
export async function discoverCloudServers(
  targetControllerId?: string,
  forController = false
): Promise<DiscoveredCloudServer[]> {
  await connectToDatabase();

  // 1. Fetch all controllers to ensure NO controller is shown as a worker
  const [allControllers, existingAnsibleHosts, serversWithSecrets] = await Promise.all([
    AnsibleController.find({}).lean(),
    AnsibleHost.find(
      targetControllerId
        ? {
            $or: [
              { controllerId: targetControllerId },
              ...(mongoose.Types.ObjectId.isValid(targetControllerId)
                ? [{ controllerId: new mongoose.Types.ObjectId(targetControllerId) }]
                : []),
            ],
          }
        : {}
    ).lean(),
    Server.find({ encryptedAuthSecret: { $exists: true, $ne: '' } }).lean(),
  ]);

  const controllerIps = new Set<string>();
  const controllerInstIds = new Set<string>();

  allControllers.forEach((c: any) => {
    if (c.ipAddress) controllerIps.add(c.ipAddress.toLowerCase().trim());
    if (c.hostname) controllerIps.add(c.hostname.toLowerCase().trim());
    if (c.instanceId) controllerInstIds.add(c.instanceId.toLowerCase().trim());
    if (c.sourceResourceId) controllerInstIds.add(c.sourceResourceId.toLowerCase().trim());
  });

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
    const effectiveIp = s.publicIp !== '-' ? s.publicIp : s.privateIp !== '-' ? s.privateIp : '';
    const normIp = (effectiveIp || '').toLowerCase().trim();
    const normResourceId = (s.resourceId || s.id).toLowerCase().trim();

    if (!normIp && !normResourceId) continue;

    // Deduplicate by IP or resourceId
    const uniqueKey = normResourceId || normIp;
    if (seenKeys.has(uniqueKey)) continue;
    seenKeys.add(uniqueKey);

    // Skip all controllers only when discovering workers (not when picking a controller)
    if (!forController) {
      if (
        (normIp && controllerIps.has(normIp)) ||
        (normResourceId && controllerInstIds.has(normResourceId)) ||
        (s.id && controllerInstIds.has(s.id.toLowerCase().trim()))
      ) {
        continue;
      }
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
      (s.sshServerId && serverSecretMap.has(s.sshServerId)) ||
      (provider === 'aws' && serverSecretMap.size > 0);

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
      username: provider === 'aws' ? 'ubuntu' : provider === 'azure' ? 'azureuser' : 'ubuntu',
      hasStoredCredentials: Boolean(hasRealSecret),
      isAlreadyInAnsible: Boolean(isImported),
      ansibleHostId: matchedHostId,
      sshServerId: s.sshServerId,
    });
  }

  return discovered;
}
