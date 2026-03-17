import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export async function GET() {
  const zipPath = path.join('/tmp', `project-${Date.now()}.zip`);

  try {
    const projectRoot = process.cwd();

    await execAsync(
      `cd "${projectRoot}" && zip -r "${zipPath}" . -x "*.git*" "*/node_modules/*" "*/.next/*" "*/dist/*" "*/.bolt/*" "*/supabase/.temp/*"`,
      { maxBuffer: 1024 * 1024 * 100 }
    );

    const fileBuffer = await readFile(zipPath);

    await unlink(zipPath).catch(() => {});

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="project.zip"',
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error creating zip:', error);

    await unlink(zipPath).catch(() => {});

    return NextResponse.json(
      { error: 'Failed to create project archive' },
      { status: 500 }
    );
  }
}
