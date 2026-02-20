import { NextRequest, NextResponse } from 'next/server';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  step: 'document_capture' | 'ocr_validation' | 'selfie_capture' | 'final_result';
  status: 'success' | 'failure' | 'retry';
  details: {
    docType?: string;
    extractedId?: string | null;
    matchResult?: boolean;
    sharpnessScore?: number;
    brightnessScore?: number;
    qualityIssue?: string | null;
    ocrConfidence?: number;
    faceDetected?: boolean;
    reason?: string;
  };
}

// In-memory audit log store (hackathon demo — swap to DB in production)
const auditLog: AuditLogEntry[] = [];

export function getAuditLog(): AuditLogEntry[] {
  return auditLog;
}

export function addAuditEntry(entry: AuditLogEntry) {
  auditLog.push(entry);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId: body.userId || 'anonymous',
      step: body.step,
      status: body.status,
      details: body.details || {},
    };

    addAuditEntry(entry);

    // Determine overall KYC result if this is the final step
    let approved = false;
    if (entry.step === 'final_result') {
      approved = entry.status === 'success';
    }

    return NextResponse.json({
      success: true,
      entryId: entry.id,
      approved,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
