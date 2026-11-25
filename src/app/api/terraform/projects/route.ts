import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import TerraformProject from '@/models/TerraformProject';
import TerraformExecution from '@/models/TerraformExecution';
import { ENTERPRISE_TERRAFORM_TEMPLATES } from '@/app/api/terraform/templates/route';

export async function GET() {
  try {
    await connectToDatabase();

    const projects = await TerraformProject.find({ status: 'active' })
      .sort({ updatedAt: -1 })
      .lean();

    const totalProjects = projects.length;
    const awsProjects = projects.filter((p) => p.provider === 'aws').length;
    const azureProjects = projects.filter((p) => p.provider === 'azure').length;
    const prodProjects = projects.filter((p) => p.environment === 'production').length;

    // Get recent executions
    const recentExecutions = await TerraformExecution.find()
      .sort({ startedAt: -1 })
      .limit(10)
      .lean();

    const successfulRuns = await TerraformExecution.countDocuments({ status: 'successful' });
    const failedRuns = await TerraformExecution.countDocuments({ status: 'failed' });

    return NextResponse.json({
      success: true,
      projects,
      stats: {
        totalProjects,
        awsProjects,
        azureProjects,
        prodProjects,
        successfulRuns,
        failedRuns,
      },
      recentExecutions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      name,
      description = '',
      provider = 'aws',
      region = provider === 'aws' ? 'us-east-1' : 'eastus',
      environment = 'dev',
      terraformVersion = '1.14.6',
      backendType = 'local',
      cloudAccountId,
      serverId,
      files = [],
      tags = {},
      templateId,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    const existing = await TerraformProject.findOne({ name: cleanName });
    if (existing) {
      return NextResponse.json({ error: `Project '${cleanName}' already exists` }, { status: 400 });
    }

    // Template lookup or default files
    let projectFiles = files;
    if (projectFiles.length === 0 && templateId) {
      const template = ENTERPRISE_TERRAFORM_TEMPLATES.find((t) => t.id === templateId);
      if (template?.files) {
        projectFiles = template.files;
      }
    }

    if (projectFiles.length === 0) {
      projectFiles = [
        {
          name: 'main.tf',
          content: `# ==============================================================================
# Terraform Infrastructure Configuration
# Project: ${cleanName}
# Provider: ${provider.toUpperCase()} | Environment: ${environment}
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    ${
      provider === 'aws'
        ? `aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }`
        : `azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }`
    }
  }
}

provider "${provider === 'aws' ? 'aws' : 'azurerm'}" {
  ${
    provider === 'aws'
      ? `region = "${region}"`
      : `features {}`
  }
}

# Add your ${provider.toUpperCase()} resources below:
`,
        },
        {
          name: 'variables.tf',
          content: `# Input Variables for ${cleanName}\n\nvariable "environment" {\n  type        = string\n  default     = "${environment}"\n  description = "Target deployment environment"\n}\n`,
        },
        {
          name: 'outputs.tf',
          content: `# Output definitions for ${cleanName}\n`,
        },
      ];
    }

    const project = await TerraformProject.create({
      name: cleanName,
      description,
      provider,
      region,
      environment,
      terraformVersion,
      backendType,
      cloudAccountId: cloudAccountId || undefined,
      serverId: serverId || undefined,
      workspaces: ['default', environment !== 'default' ? environment : 'prod'],
      currentWorkspace: 'default',
      files: projectFiles,
      tags,
    });

    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
