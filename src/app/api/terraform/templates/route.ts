import { NextResponse } from 'next/server';
import { ENTERPRISE_TERRAFORM_TEMPLATES } from '@/lib/terraform/templatesData';

export { ENTERPRISE_TERRAFORM_TEMPLATES };

export async function GET() {
  return NextResponse.json({
    success: true,
    templates: ENTERPRISE_TERRAFORM_TEMPLATES,
  });
}
