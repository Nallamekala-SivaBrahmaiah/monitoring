import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import AnsibleHost from '@/models/AnsibleHost';
import AnsiblePlaybook from '@/models/AnsiblePlaybook';
import AnsibleExecution from '@/models/AnsibleExecution';
import AnsibleController from '@/models/AnsibleController';
import { ensurePlaybookTemplates } from '@/lib/ansible/ansibleEngine';
import { ensureWorkerControllerAffinity } from '@/lib/ansible/ansibleController';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    await ensurePlaybookTemplates();
    await ensureWorkerControllerAffinity();

    const { searchParams } = new URL(req.url);
    const controllerId = searchParams.get('controllerId');

    const hostQuery: any = {};
    const execQuery: any = {};

    if (controllerId && controllerId !== 'all') {
      const orCid: any[] = [{ controllerId }];
      if (mongoose.Types.ObjectId.isValid(controllerId)) {
        orCid.push({ controllerId: new mongoose.Types.ObjectId(controllerId) });
      }

      hostQuery.$or = orCid;
      execQuery.$or = [{ controllerId }];
      if (mongoose.Types.ObjectId.isValid(controllerId)) {
        execQuery.$or.push({ controllerId: new mongoose.Types.ObjectId(controllerId) });
      }
    }

    const [totalControllers, totalServers, totalPlaybooks, successfulRuns, failedRuns, runningJobs, lastExecution] =
      await Promise.all([
        AnsibleController.countDocuments(),
        AnsibleHost.countDocuments(hostQuery),
        AnsiblePlaybook.countDocuments(),
        AnsibleExecution.countDocuments({ ...execQuery, status: 'SUCCESS' }),
        AnsibleExecution.countDocuments({ ...execQuery, status: 'FAILED' }),
        AnsibleExecution.countDocuments({ ...execQuery, status: 'RUNNING' }),
        AnsibleExecution.findOne(execQuery).sort({ createdAt: -1 }).select('createdAt status playbookName durationSeconds').lean(),
      ]);

    const totalCompleted = successfulRuns + failedRuns;
    const successRatePercent = totalCompleted > 0 ? Math.round((successfulRuns / totalCompleted) * 100) : 100;
    const failureRatePercent = totalCompleted > 0 ? 100 - successRatePercent : 0;

    let lastRunDisplay = 'Never';
    if (lastExecution && lastExecution.createdAt) {
      const diffSec = Math.floor((Date.now() - new Date(lastExecution.createdAt).getTime()) / 1000);
      if (diffSec < 60) lastRunDisplay = `${diffSec}s ago`;
      else if (diffSec < 3600) lastRunDisplay = `${Math.floor(diffSec / 60)}m ago`;
      else if (diffSec < 86400) lastRunDisplay = `${Math.floor(diffSec / 3600)}h ago`;
      else lastRunDisplay = `${Math.floor(diffSec / 86400)}d ago`;
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalControllers,
        totalServers,
        totalPlaybooks,
        successfulRuns,
        failedRuns,
        runningJobs,
        successRatePercent,
        failureRatePercent,
        lastRunDisplay,
        lastExecution,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
