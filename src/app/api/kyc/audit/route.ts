import { NextResponse } from 'next/server';
import { getAuditLog } from '../verify/route';

export async function GET() {
  const logs = getAuditLog();
  return NextResponse.json({ logs });
}
