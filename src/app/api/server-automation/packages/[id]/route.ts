import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import AutomationPackage from '@/models/AutomationPackage';
import { TOOL_CATALOG } from '@/lib/automation/toolCatalog';
import { getBaseScriptContent, extractFunctionBody } from '@/lib/automation/scriptGenerator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    let pkg = mongoose.isValidObjectId(id)
      ? await AutomationPackage.findById(id).lean()
      : await AutomationPackage.findOne({ packageId: id }).lean();

    if (!pkg) {
      // Check if built-in tool
      const builtIn = TOOL_CATALOG.find((t) => t.id === id);
      if (builtIn) {
        let baseContent = '';
        try {
          baseContent = getBaseScriptContent();
        } catch {}
        const defaultScript = baseContent ? extractFunctionBody(baseContent, builtIn.functionName) : '';

        return NextResponse.json({
          success: true,
          package: {
            ...builtIn,
            packageId: builtIn.id,
            isCustom: false,
            isCustomized: false,
            installScript: defaultScript,
          },
        });
      }
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, package: pkg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      category,
      description,
      badge,
      defaultVersion,
      supportedVersions,
      port,
      dependencies,
      verificationCommand,
      installScript,
    } = body;

    let pkg = mongoose.isValidObjectId(id)
      ? await AutomationPackage.findById(id)
      : await AutomationPackage.findOne({ packageId: id });

    // If overriding a built-in tool that has no MongoDB record yet
    if (!pkg) {
      const builtIn = TOOL_CATALOG.find((t) => t.id === id);
      if (builtIn) {
        pkg = new AutomationPackage({
          packageId: builtIn.id,
          name: name?.trim() || builtIn.name,
          category: category || builtIn.category,
          functionName: builtIn.functionName,
          isCustom: false,
          badge: badge !== undefined ? badge.trim() : builtIn.badge,
          defaultVersion: defaultVersion || builtIn.defaultVersion,
          supportedVersions: supportedVersions || builtIn.supportedVersions,
          port: port !== undefined ? (port ? Number(port) : undefined) : builtIn.port,
          dependencies: dependencies || builtIn.dependencies,
          verificationCommand: verificationCommand !== undefined ? verificationCommand : builtIn.verificationCommand,
        });
      } else {
        return NextResponse.json({ error: 'Package not found' }, { status: 404 });
      }
    }

    if (name) pkg.name = name.trim();
    if (category) pkg.category = category;
    if (description !== undefined) pkg.description = description.trim();
    if (badge !== undefined) pkg.badge = badge.trim();
    if (defaultVersion !== undefined) pkg.defaultVersion = defaultVersion.trim();
    if (supportedVersions !== undefined) pkg.supportedVersions = supportedVersions;
    if (port !== undefined) pkg.port = port ? Number(port) : undefined;
    if (dependencies !== undefined) pkg.dependencies = dependencies;
    if (verificationCommand !== undefined) pkg.verificationCommand = verificationCommand.trim();
    if (installScript !== undefined) pkg.installScript = installScript.trim();

    await pkg.save();
    return NextResponse.json({ success: true, package: pkg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    let pkg = mongoose.isValidObjectId(id)
      ? await AutomationPackage.findById(id)
      : await AutomationPackage.findOne({ packageId: id });

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    const isBuiltInOverride = TOOL_CATALOG.some((t) => t.id === pkg.packageId);
    await AutomationPackage.findByIdAndDelete(pkg._id);

    return NextResponse.json({
      success: true,
      message: isBuiltInOverride
        ? `Package "${pkg.name}" reverted to default catalog settings.`
        : `Package "${pkg.name}" deleted successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
