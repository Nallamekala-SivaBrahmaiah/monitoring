import { NextResponse } from 'next/server';
import { TOOL_CATALOG, TOOL_CATEGORIES } from '@/lib/automation/toolCatalog';

export async function GET() {
  return NextResponse.json({
    success: true,
    categories: TOOL_CATEGORIES,
    tools: TOOL_CATALOG,
    totalTools: TOOL_CATALOG.length,
  });
}
