import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CloudAccount from '@/models/CloudAccount';
import CloudResource from '@/models/CloudResource';
import { executeAWSPowerAction, executeAzurePowerAction, PowerAction } from '@/lib/cloudPowerService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/on-premises/cloud-servers/power
 * Dispatches real AWS EC2 Start / Stop and Azure VM Start / Deallocate commands
 * strictly through authorized cloud accounts configured in Cloud Accounts.
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const {
      resourceId,
      name,
      provider,
      action,
      accountId,
      subscriptionId,
      resourceGroup,
      region,
    } = body;

    const powerAction = action as PowerAction;
    if (!['start', 'stop', 'restart'].includes(powerAction)) {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: start, stop, restart' },
        { status: 400 }
      );
    }

    if (!provider || (provider !== 'aws' && provider !== 'azure')) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "aws" or "azure".' },
        { status: 400 }
      );
    }

    // 1. Verify authorization: ensure the account is connected and exists
    const accountFilter: any = { provider, status: 'Connected' };
    if (provider === 'aws' && accountId) {
      accountFilter.accountId = accountId;
    } else if (provider === 'azure' && (subscriptionId || accountId)) {
      accountFilter.subscriptionId = subscriptionId || accountId;
    }

    const verifiedAccount = await CloudAccount.findOne(accountFilter).lean();
    if (!verifiedAccount) {
      return NextResponse.json(
        { error: `Unauthorized or disconnected ${provider.toUpperCase()} account. Please check Cloud Accounts configuration.` },
        { status: 403 }
      );
    }

    // 2. Dispatch real Cloud Power Operation
    if (provider === 'aws') {
      const cleanInstanceId = (resourceId || name || '').trim();
      if (!cleanInstanceId) {
        return NextResponse.json({ error: 'AWS EC2 Instance ID is required' }, { status: 400 });
      }

      console.log(`[OnPremisesCloudPower] Dispatching real AWS EC2 ${powerAction} for ${cleanInstanceId} in region ${region || 'ap-southeast-2'}`);
      const result = await executeAWSPowerAction({
        instanceId: cleanInstanceId,
        region: region || verifiedAccount.selectedRegions?.[0] || 'ap-southeast-2',
        accountId: verifiedAccount.accountId,
        action: powerAction,
      });

      // Update CloudResource live status
      const updatedStatus = powerAction === 'start' ? 'running' : 'stopped';
      await CloudResource.updateMany(
        { resourceId: cleanInstanceId, provider: 'aws' },
        { $set: { status: updatedStatus, lastSyncAt: new Date() } }
      );

      return NextResponse.json({
        success: true,
        action: powerAction,
        status: result.status,
        message: result.message || `AWS EC2 Instance ${cleanInstanceId} ${powerAction === 'start' ? 'started' : 'stopped'} successfully.`,
        provider: 'aws',
        resourceId: cleanInstanceId,
      });
    }

    if (provider === 'azure') {
      const vmName = (name || resourceId || '').split('/').pop() || '';
      if (!vmName) {
        return NextResponse.json({ error: 'Azure Virtual Machine Name is required' }, { status: 400 });
      }

      console.log(`[OnPremisesCloudPower] Dispatching real Azure VM ${powerAction} for ${vmName} (Subscription: ${verifiedAccount.subscriptionId})`);
      const result = await executeAzurePowerAction({
        vmName,
        resourceGroup: resourceGroup || 'default-rg',
        subscriptionId: verifiedAccount.subscriptionId,
        action: powerAction,
      });

      // Update CloudResource live status
      const updatedStatus = powerAction === 'start' ? 'Running' : 'Stopped';
      await CloudResource.updateMany(
        { $or: [{ name: vmName }, { resourceId: new RegExp(`${vmName}$`, 'i') }], provider: 'azure' },
        { $set: { status: updatedStatus, lastSyncAt: new Date() } }
      );

      return NextResponse.json({
        success: true,
        action: powerAction,
        status: result.status,
        message: result.message || `Azure Virtual Machine "${vmName}" ${powerAction === 'start' ? 'started' : 'stopped'} successfully.`,
        provider: 'azure',
        resourceId: vmName,
      });
    }

    return NextResponse.json({ error: 'Unhandled provider' }, { status: 400 });
  } catch (err: any) {
    console.error('On-premises cloud power operation failed:', err);
    return NextResponse.json(
      { error: err.message || 'Cloud power operation failed' },
      { status: 500 }
    );
  }
}
