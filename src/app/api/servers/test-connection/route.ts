import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Server from '@/models/Server';
import { decryptSecret } from '@/lib/serverMonitoring/crypto';
import { collectServerViaSSH } from '@/lib/serverMonitoring/sshCollector';
import { formatConnectionDiagnostic } from '@/lib/serverMonitoring/errorDiagnostic';
import { convertPPKToOpenSSH } from '@/lib/serverMonitoring/ppkConverter';

/**
 * POST /api/servers/test-connection
 * Tests SSH connectivity and credentials without saving to database.
 * Supports testing with existing saved AES-256-GCM encrypted keys or newly supplied keys.
 */
export async function POST(request: NextRequest) {
  let hostStr = '';
  let portNum = 22;
  let methodStr = 'privateKey';

  try {
    await connectToDatabase();
    const body = await request.json();
    const {
      host,
      port = 22,
      username,
      authMethod = 'privateKey',
      authSecret,
      serverId,
      instanceId,
      name,
    } = body;

    hostStr = host || '';
    portNum = parseInt(port, 10) || 22;
    methodStr = authMethod;

    if (!hostStr) {
      return NextResponse.json(
        { error: 'Server host or IP address is required for testing' },
        { status: 400 }
      );
    }

    let secretToUse = (authSecret || '').trim();
    let userToUse = (username || '').trim();

    // If authSecret not provided, look for existing saved credentials in database
    if (!secretToUse) {
      let serverDoc: any = null;
      if (serverId && mongoose.isValidObjectId(serverId)) {
        serverDoc = await Server.findById(serverId);
      }
      if (!serverDoc && serverId) {
        serverDoc = await Server.findOne({
          $or: [
            { cloudResourceId: serverId },
            { instanceId: serverId },
            { name: serverId },
          ],
        });
      }
      if (!serverDoc && instanceId) {
        serverDoc = await Server.findOne({
          $or: [
            { cloudResourceId: instanceId },
            { instanceId: instanceId },
            { name: instanceId },
          ],
        });
      }
      if (!serverDoc && name) {
        serverDoc = await Server.findOne({ name });
      }
      if (!serverDoc && hostStr) {
        serverDoc = await Server.findOne({ host: hostStr });
      }

      if (serverDoc && serverDoc.encryptedAuthSecret) {
        try {
          secretToUse = decryptSecret({
            encrypted: serverDoc.encryptedAuthSecret,
            iv: serverDoc.authSecretIv,
            tag: serverDoc.authSecretTag,
          });
          methodStr = serverDoc.authMethod || methodStr;
          if (!userToUse) userToUse = serverDoc.username;
        } catch (decryptErr: any) {
          return NextResponse.json(
            { error: `Failed to decrypt existing saved SSH key: ${decryptErr.message}` },
            { status: 422 }
          );
        }
      }
    }

    if (!secretToUse) {
      return NextResponse.json(
        { error: 'SSH private key or password is required. Please provide a key or select a configured server.' },
        { status: 400 }
      );
    }
    if (!userToUse) {
      userToUse = 'ubuntu';
    }

    if (methodStr === 'privateKey') {
      const converted = convertPPKToOpenSSH(secretToUse);
      if (!converted.success) {
        return NextResponse.json({ error: converted.error }, { status: 400 });
      }
      if (converted.pemKey) {
        secretToUse = converted.pemKey;
      }
    }

    const specs = await collectServerViaSSH({
      host: hostStr.trim(),
      port: portNum,
      username: userToUse.trim(),
      authMethod: methodStr as any,
      authSecret: secretToUse,
      timeoutMs: 12000,
    });

    return NextResponse.json({
      success: true,
      message: 'SSH Connection and host verification successful!',
      preview: {
        os: specs.os,
        hardware: specs.hardware,
        dockerDetected: specs.docker.detected,
        dockerVersion: specs.docker.version,
        dockerContainers: specs.docker.containersCount,
        k8sDetected: specs.kubernetes.detected,
        k8sVersion: specs.kubernetes.version,
        initialCpu: `${specs.metrics.cpu.usagePercent}%`,
        initialMemory: `${specs.metrics.memory.usagePercent}%`,
        disksCount: specs.metrics.disks.length,
      },
    });
  } catch (err: any) {
    const diag = formatConnectionDiagnostic(err, { host: hostStr, port: portNum, authMethod: methodStr });
    return NextResponse.json(
      {
        success: false,
        error: diag.message,
        hint: diag.hint,
        rawError: err.message,
      },
      { status: 422 }
    );
  }
}
