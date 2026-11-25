import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TerraformProject from '@/models/TerraformProject';
import TerraformExecution from '@/models/TerraformExecution';
import TerraformApproval from '@/models/TerraformApproval';
import { executeLocalTerraform } from '@/lib/terraform/terraformService';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const body = await req.json();

    const {
      operation = 'plan',
      workspace,
      targetResource: paramTargetResource,
      importAddress: paramImportAddress,
      importId: paramImportId,
      extraArgs = [],
      initiator = 'DevOps Architect',
    } = body;

    const targetResource = paramTargetResource || extraArgs?.[0];
    const importAddress = paramImportAddress || extraArgs?.[0];
    const importId = paramImportId || extraArgs?.[1];

    const project = await TerraformProject.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const targetWorkspace = workspace || project.currentWorkspace || 'default';

    // State locking check
    if (project.isLocked && operation !== 'unlock') {
      return NextResponse.json(
        {
          error: `Workspace '${targetWorkspace}' is currently locked by ${project.lockInfo?.owner || 'another process'}. Please verify lock before executing.`,
        },
        { status: 423 }
      );
    }

    // Production approval check for Apply and Destroy
    if (
      project.environment === 'production' &&
      (operation === 'apply' || operation === 'destroy')
    ) {
      const approval = await TerraformApproval.findOne({
        projectId: project._id,
        operation,
        status: 'approved',
      }).sort({ decidedAt: -1 });

      if (!approval) {
        return NextResponse.json(
          {
            requiresApproval: true,
            error: `Production ${operation.toUpperCase()} requires executive approval before execution. Submit an approval request in the Approvals tab.`,
          },
          { status: 403 }
        );
      }
    }

    // Build Terraform CLI command arguments
    let args: string[] = [];
    switch (operation) {
      case 'init':
        args = ['init', '-input=false', '-no-color'];
        break;
      case 'validate':
        args = ['validate', '-no-color'];
        break;
      case 'fmt':
        args = ['fmt', '-write=true'];
        break;
      case 'plan':
        args = ['plan', '-input=false', '-no-color'];
        break;
      case 'apply':
        args = ['apply', '-auto-approve', '-input=false', '-no-color'];
        break;
      case 'destroy':
        args = ['destroy', '-auto-approve', '-input=false', '-no-color'];
        break;
      case 'refresh':
        args = ['refresh', '-input=false', '-no-color'];
        break;
      case 'taint':
        if (!targetResource) {
          return NextResponse.json(
            { error: 'Taint requires a target resource address (e.g. aws_instance.app_server)' },
            { status: 400 }
          );
        }
        args = ['taint', targetResource];
        break;
      case 'untaint':
        if (!targetResource) {
          return NextResponse.json(
            { error: 'Untaint requires a target resource address' },
            { status: 400 }
          );
        }
        args = ['untaint', targetResource];
        break;
      case 'state':
        args = ['show', '-no-color'];
        break;
      case 'output':
        args = ['output', '-json'];
        break;
      case 'workspace_new':
        args = ['workspace', 'new', targetWorkspace];
        break;
      case 'workspace_select':
        args = ['workspace', 'select', targetWorkspace];
        break;
      case 'workspace_list':
        args = ['workspace', 'list'];
        break;
      case 'import':
        if (!importAddress || !importId) {
          return NextResponse.json(
            { error: 'Import requires both resource address and resource ID' },
            { status: 400 }
          );
        }
        args = ['import', '-input=false', '-no-color', importAddress, importId];
        break;
      default:
        args = ['plan', '-input=false', '-no-color'];
    }

    // Create execution record
    const execution = await TerraformExecution.create({
      projectId: project._id,
      projectName: project.name,
      provider: project.provider,
      workspace: targetWorkspace,
      environment: project.environment,
      operation,
      terraformVersion: project.terraformVersion || '1.14.6',
      status: 'running',
      startedAt: new Date(),
      initiator,
    });

    // Execute real Terraform command
    const result = await executeLocalTerraform(project, targetWorkspace, args);

    // Update execution record
    execution.status = result.success ? 'successful' : 'failed';
    execution.completedAt = new Date();
    execution.durationMs = result.durationMs;
    execution.logs = result.rawLogs;
    execution.exitCode = result.exitCode;
    execution.planSummary = result.planSummary;
    execution.resourceChanges = result.resourceChanges;
    if (!result.success) {
      execution.error = result.stderr || 'Command exited with error';
    }
    await execution.save();

    // Update project lastExecution & metrics
    project.lastExecution = {
      operation,
      status: execution.status,
      executedAt: new Date(),
      durationMs: result.durationMs,
      planSummary: result.planSummary,
    };

    if (operation === 'apply' && result.success && result.planSummary) {
      project.managedResourcesCount = Math.max(
        0,
        (project.managedResourcesCount || 0) +
          result.planSummary.toAdd -
          result.planSummary.toDestroy
      );
    } else if (operation === 'destroy' && result.success) {
      project.managedResourcesCount = 0;
    }

    await project.save();

    return NextResponse.json({
      success: result.success,
      executionId: execution._id,
      operation,
      status: execution.status,
      durationMs: result.durationMs,
      planSummary: result.planSummary,
      resourceChanges: result.resourceChanges,
      logs: result.rawLogs,
      exitCode: result.exitCode,
      error: execution.error,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
