// Next.js API proxy route — forwards requests to the Python FastAPI backend.
// Set BACKEND_URL in .env.local (e.g., http://localhost:8000 or your Railway URL).
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

async function proxy(req: NextRequest, path: string) {
  const url = `${BACKEND_URL}${path}`;
  const body = req.method !== 'GET' ? await req.text() : undefined;

  const response = await fetch(url, {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const apiPath = `/kyc/${path.join('/')}`;
  return proxy(req, apiPath);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const apiPath = `/kyc/${path.join('/')}`;
  return proxy(req, apiPath);
}
