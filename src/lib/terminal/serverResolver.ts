import connectToDatabase from '@/lib/mongodb';
import Server, { IServer } from '@/models/Server';
import CloudResource from '@/models/CloudResource';
import AnsibleController from '@/models/AnsibleController';
import { decryptSecret } from '@/lib/serverMonitoring/crypto';
import { convertPPKToOpenSSH } from '@/lib/serverMonitoring/ppkConverter';
import mongoose from 'mongoose';

export interface ResolvedSSHCredentials {
  serverId: string;
  serverName: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'privateKey' | 'password';
  authSecret: string; // Decrypted in backend memory ONLY
}

function normalize(s?: string | null): string {
  return (s || '').trim().toLowerCase();
}

/**
 * Safely resolves and decrypts the SSH credentials for a target VM or server.
 * Restricts connection strictly to authorized and registered infrastructure resources.
 * NEVER exposes credentials to the frontend.
 */
export async function resolveServerCredentials(target: {
  sshServerId?: string;
  vmId?: string;
  resourceId?: string;
  name?: string;
  host?: string;
}): Promise<ResolvedSSHCredentials | null> {
  await connectToDatabase();

  let serverDoc: any = null;

  // 1. Try by sshServerId directly if provided
  if (target.sshServerId && mongoose.Types.ObjectId.isValid(target.sshServerId)) {
    serverDoc = await Server.findById(target.sshServerId).lean();
  }

  // 2. Try by host IP
  const targetHost = normalize(target.host);
  if (!serverDoc && targetHost && targetHost !== '-') {
    serverDoc = await Server.findOne({
      host: { $regex: new RegExp(`^${targetHost}$`, 'i') },
    }).lean();
  }

  // 3. Try by Name
  const targetName = normalize(target.name);
  if (!serverDoc && targetName) {
    serverDoc = await Server.findOne({
      name: { $regex: new RegExp(`^${targetName}$`, 'i') },
    }).lean();
  }

  // 4. Try matching via CloudResource
  if (!serverDoc && (target.vmId || target.resourceId || target.name)) {
    const searchId = target.vmId || target.resourceId;
    const cr = await CloudResource.findOne({
      $or: [
        ...(searchId ? [{ resourceId: searchId }] : []),
        ...(targetName ? [{ name: { $regex: new RegExp(`^${targetName}$`, 'i') } }] : []),
      ],
    }).lean();

    if (cr) {
      const crPublic = normalize(cr.publicIp);
      const crPrivate = normalize(cr.privateIp);
      const crName = normalize(cr.name);

      serverDoc = await Server.findOne({
        $or: [
          ...(crPublic && crPublic !== '-' ? [{ host: { $regex: new RegExp(`^${crPublic}$`, 'i') } }] : []),
          ...(crPrivate && crPrivate !== '-' ? [{ host: { $regex: new RegExp(`^${crPrivate}$`, 'i') } }] : []),
          ...(crName ? [{ name: { $regex: new RegExp(`^${crName}$`, 'i') } }] : []),
        ],
      }).lean();
    }
  }

  // 5. Check NginxServer registration if not found in Server
  if (!serverDoc) {
    try {
      const NginxServer = (await import('@/models/NginxServer')).default;
      if (target.sshServerId && mongoose.Types.ObjectId.isValid(target.sshServerId)) {
        serverDoc = await NginxServer.findById(target.sshServerId).lean();
      }
      if (!serverDoc && targetHost && targetHost !== '-') {
        serverDoc = await NginxServer.findOne({
          host: { $regex: new RegExp(`^${targetHost}$`, 'i') },
        }).lean();
      }
      if (!serverDoc && targetName) {
        serverDoc = await NginxServer.findOne({
          name: { $regex: new RegExp(`^${targetName}$`, 'i') },
        }).lean();
      }
    } catch {}
  }

  if (!serverDoc) {
    return null;
  }

  // Decrypt credentials in-memory on backend
  let rawSecret = '';
  if (serverDoc.encryptedAuthSecret && serverDoc.authSecretIv && serverDoc.authSecretTag) {
    try {
      rawSecret = decryptSecret({
        encrypted: serverDoc.encryptedAuthSecret,
        iv: serverDoc.authSecretIv,
        tag: serverDoc.authSecretTag,
      });
    } catch (err: any) {
      console.error('Failed to decrypt SSH secret for server:', serverDoc.name, err);
      throw new Error('Failed to decrypt saved SSH credentials. Please reconfigure credentials.');
    }
  }

  if (!rawSecret) {
    // Fallback: inherit credentials from Server or Controller monitoring
    try {
      const orConditions: any[] = [
        { host: serverDoc.host },
        { ip: serverDoc.host },
        { name: serverDoc.name },
      ];
      if (serverDoc.cloudProvider === 'aws') {
        orConditions.push({ cloudProvider: 'aws' });
      }

      const srv: any = await Server.findOne({
        $or: orConditions,
        encryptedAuthSecret: { $exists: true, $ne: '' },
      }).lean();

      if (srv && srv.encryptedAuthSecret) {
        rawSecret = decryptSecret({
          encrypted: srv.encryptedAuthSecret,
          iv: srv.authSecretIv || '',
          tag: srv.authSecretTag || '',
        });
      }
    } catch {}
  }

  if (!rawSecret) {
    try {
      const ctrl: any = await AnsibleController.findOne({
        encryptedAuthSecret: { $exists: true, $ne: '' },
      }).lean();
      if (ctrl && ctrl.encryptedAuthSecret) {
        rawSecret = decryptSecret({
          encrypted: ctrl.encryptedAuthSecret,
          iv: ctrl.authSecretIv || '',
          tag: ctrl.authSecretTag || '',
        });
      }
    } catch {}
  }

  if (!rawSecret) {
    throw new Error('No encrypted secret found for registered server: ' + serverDoc.name);
  }

  let finalSecret = rawSecret;
  if (serverDoc.authMethod === 'privateKey') {
    const converted = convertPPKToOpenSSH(rawSecret);
    if (!converted.success) {
      throw new Error(converted.error || 'Failed to parse SSH private key format.');
    }
    if (converted.pemKey) {
      finalSecret = converted.pemKey;
    }
  }

  return {
    serverId: serverDoc._id.toString(),
    serverName: serverDoc.name,
    host: serverDoc.host,
    port: serverDoc.port || 22,
    username: serverDoc.username,
    authMethod: serverDoc.authMethod || 'privateKey',
    authSecret: finalSecret,
  };
}

