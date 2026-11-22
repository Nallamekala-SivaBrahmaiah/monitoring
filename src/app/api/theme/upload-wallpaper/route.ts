import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Please upload JPG, PNG, WebP, GIF, or SVG.` },
        { status: 400 }
      );
    }

    // Validate size (max 15MB)
    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: 'File size exceeds 15MB limit. Please upload a smaller image.' },
        { status: 400 }
      );
    }

    // Target upload folder in public
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'wallpapers');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Sanitize filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || (file.type === 'image/png' ? '.png' : '.jpg');
    const safeBaseName = path
      .basename(file.name, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const uniqueFilename = `wp_${Date.now()}_${safeBaseName}${ext}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/wallpapers/${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: uniqueFilename,
      title: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error('Wallpaper upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload wallpaper image' },
      { status: 500 }
    );
  }
}
