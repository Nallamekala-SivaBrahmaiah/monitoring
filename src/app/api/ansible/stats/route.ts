import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AnsibleHost from '@/models/AnsibleHost';
import AnsiblePlaybook from '@/models/AnsiblePlaybook';
import AnsibleExecution from '@/models/AnsibleExecution';
import { ensurePlaybookTemplates } from '@/lib/ansible/ansibleEngine';

export async function GET() {
  try {
    await connectToDatabase();
    await ensurePlaybookTemplates();

    const [totalServers, totalPlaybooks, successfulRuns, failedRuns, runningJobs, lastExecution] =
      await Promise.all([
        AnsibleHost.countDocuments(),
        AnsiblePlaybook.countDocuments(),
        AnsibleExecution.countDocuments({ status: 'SUCCESS' }),
        AnsibleExecution.countDocuments({ status: 'FAILED' }),
        AnsibleExecution.countDocuments({ status: 'RUNNING' }),
        AnsibleExecution.findOne().sort({ createdAt: -1 }).select('createdAt status playbookName durationSeconds').lean(),
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

