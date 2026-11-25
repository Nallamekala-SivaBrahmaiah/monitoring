import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AutomationPackage from '@/models/AutomationPackage';
import { TOOL_CATALOG, TOOL_CATEGORIES, ToolDefinition } from '@/lib/automation/toolCatalog';
import { getBaseScriptContent, extractFunctionBody } from '@/lib/automation/scriptGenerator';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const customDocs = await AutomationPackage.find().sort({ createdAt: -1 }).lean();

    // Map overrides by packageId
    const overrideMap = new Map<string, any>();
    for (const doc of customDocs) {
      overrideMap.set(doc.packageId, doc);
    }

    // Try reading central script to extract default function bodies for built-in tools
    let baseContent = '';
    try {
      baseContent = getBaseScriptContent();
    } catch {
      // ignore
    }

    // Transform built-in tools: merge user modifications if overridden in MongoDB
    const builtInTools: (ToolDefinition & {
      isCustom?: boolean;
      isCustomized?: boolean;
      _id?: string;
      installScript?: string;
    })[] = TOOL_CATALOG.map((tool) => {
      const override = overrideMap.get(tool.id);
      const defaultScript = baseContent ? extractFunctionBody(baseContent, tool.functionName) : '';

      if (override) {
        return {
          ...tool,
          _id: override._id.toString(),
          name: override.name || tool.name,
          category: override.category || tool.category,
          description: override.description !== undefined ? override.description : tool.description,
          badge: override.badge !== undefined ? override.badge : tool.badge,
          defaultVersion: override.defaultVersion || tool.defaultVersion,
          supportedVersions: override.supportedVersions?.length ? override.supportedVersions : tool.supportedVersions,
          port: override.port !== undefined ? override.port : tool.port,
          dependencies: override.dependencies !== undefined ? override.dependencies : tool.dependencies,
          verificationCommand: override.verificationCommand !== undefined ? override.verificationCommand : tool.verificationCommand,
          isCustom: false,
          isCustomized: true,
          installScript: override.installScript || defaultScript,
        };
      }

      return {
        ...tool,
        isCustom: false,
        isCustomized: false,
        installScript: defaultScript,
      };
    });

    // Extract pure custom tools (not matching built-in tool IDs)
    const builtInIds = new Set(TOOL_CATALOG.map((t) => t.id));
    const pureCustomTools: (ToolDefinition & {
      isCustom?: boolean;
      isCustomized?: boolean;
      _id?: string;
      installScript?: string;
    })[] = customDocs
      .filter((doc: any) => !builtInIds.has(doc.packageId))
      .map((doc: any) => ({
        _id: doc._id.toString(),
        id: doc.packageId,
        name: doc.name,
        category: doc.category,
        description: doc.description,
        badge: doc.badge || 'Custom',
        functionName: doc.functionName,
        defaultVersion: doc.defaultVersion,
        supportedVersions: doc.supportedVersions && doc.supportedVersions.length > 0 ? doc.supportedVersions : undefined,
        port: doc.port,
        dependencies: doc.dependencies,
        verificationCommand: doc.verificationCommand,
        iconName: doc.iconName || 'Boxes',
        isCustom: true,
        isCustomized: false,
        installScript: doc.installScript,
      }));

    // Combined catalog: built-in (with any customizations) + new custom tools
    const allTools = [...builtInTools, ...pureCustomTools];

    return NextResponse.json({
      success: true,
      categories: TOOL_CATEGORIES,
      tools: allTools,
      totalTools: allTools.length,
      customCount: pureCustomTools.length,
      customizedCount: customDocs.length - pureCustomTools.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const {
      name,
      packageId,
      category = 'devops',
      description = '',
      badge = 'Custom',
      defaultVersion = 'latest',
      supportedVersions = [],
      port,
      dependencies = [],
      verificationCommand = '',
      installScript,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Package name is required.' }, { status: 400 });
    }

    // Slugify identifier if not explicitly provided
    let cleanId = (packageId || name)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!cleanId) cleanId = `pkg-${Date.now()}`;

    // If customizing a built-in tool (e.g. java, python, docker)
    const existingBuiltIn = TOOL_CATALOG.find((t) => t.id === cleanId);
    if (existingBuiltIn) {
      const updated = await AutomationPackage.findOneAndUpdate(
        { packageId: cleanId },
        {
          packageId: cleanId,
          name: name.trim(),
          category,
          description: description.trim(),
          badge: badge.trim() || existingBuiltIn.badge,
          functionName: existingBuiltIn.functionName,
          installScript: (installScript || '').trim(),
          defaultVersion: defaultVersion.trim() || existingBuiltIn.defaultVersion,
          supportedVersions: Array.isArray(supportedVersions) ? supportedVersions : existingBuiltIn.supportedVersions,
          port: port ? Number(port) : existingBuiltIn.port,
          dependencies: Array.isArray(dependencies) ? dependencies : existingBuiltIn.dependencies,
          verificationCommand: verificationCommand.trim(),
          isCustom: false,
          author: 'User',
        },
        { upsert: true, new: true }
      );

      return NextResponse.json({
        success: true,
        package: updated,
        message: `Package "${name}" updated successfully.`,
      });
    }

    // If registering a new custom package
    const existingCustom = await AutomationPackage.findOne({ packageId: cleanId });
    if (existingCustom) {
      return NextResponse.json(
        { error: `A package with identifier "${cleanId}" already exists. Please choose a different name or identifier.` },
        { status: 400 }
      );
    }

    const fnName = `install_${cleanId.replace(/-/g, '_')}`;

    // Provide default bash template if no script supplied
    let scriptContent = (installScript || '').trim();
    if (!scriptContent) {
      scriptContent = `log_step "Installing ${name}"
if command -v ${cleanId} &>/dev/null; then
  log_success "${name} is already installed."
  return 0
fi

pkg_update
pkg_install ${cleanId}

if command -v ${cleanId} &>/dev/null; then
  log_success "${name} installed successfully!"
else
  log_error "Installation of ${name} failed."
  return 1
fi`;
    }

    const newPkg = new AutomationPackage({
      packageId: cleanId,
      name: name.trim(),
      category,
      description: description.trim(),
      badge: badge.trim() || 'Custom',
      functionName: fnName,
      installScript: scriptContent,
      defaultVersion: defaultVersion.trim() || 'latest',
      supportedVersions: Array.isArray(supportedVersions) ? supportedVersions : [],
      port: port ? Number(port) : undefined,
      dependencies: Array.isArray(dependencies) ? dependencies : [],
      verificationCommand: verificationCommand.trim(),
      isCustom: true,
      author: 'User',
    });

    await newPkg.save();

    return NextResponse.json({
      success: true,
      package: newPkg,
      message: `Package "${name}" created and added to installation catalog.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
