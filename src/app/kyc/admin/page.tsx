'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Camera,
  ScanLine,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  step: string;
  status: string;
  details: Record<string, unknown>;
}

const stepIcons: Record<string, React.ElementType> = {
  document_capture: Camera,
  ocr_validation: ScanLine,
  selfie_capture: UserCheck,
  final_result: ShieldCheck,
};

const stepLabels: Record<string, string> = {
  document_capture: 'Document Capture',
  ocr_validation: 'OCR Validation',
  selfie_capture: 'Selfie Capture',
  final_result: 'Final Result',
};

const statusColors: Record<string, string> = {
  success: 'text-glow-teal bg-glow-teal/10 ring-glow-teal/30',
  failure: 'text-red-500 bg-red-500/10 ring-red-400/30',
  retry: 'text-yellow-600 bg-yellow-500/10 ring-yellow-400/30',
};

export default function AdminAuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kyc/audit');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="flex-1 flex flex-col items-center px-5 py-6 min-h-[100dvh] relative z-10">
      {/* Header */}
      <motion.div
        className="text-center mb-6 w-full max-w-lg"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold text-text-primary">
          KYC Audit Log
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Review all verification attempts and their outcomes
        </p>
      </motion.div>

      {/* Controls */}
      <div className="w-full max-w-lg flex gap-3 mb-6">
        <Button onClick={() => router.push('/kyc')} variant="ghost" className="min-w-[48px]">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button onClick={fetchLogs} variant="secondary" className="flex-1">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats summary */}
      {logs.length > 0 && (
        <motion.div
          className="w-full max-w-lg grid grid-cols-3 gap-3 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {[
            { label: 'Total', count: logs.length, color: 'text-text-primary' },
            { label: 'Success', count: logs.filter((l) => l.status === 'success').length, color: 'text-glow-teal' },
            { label: 'Failed', count: logs.filter((l) => l.status === 'failure').length, color: 'text-red-500' },
          ].map((stat) => (
            <GlassCard key={stat.label}>
              <div className="text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">{stat.label}</p>
              </div>
            </GlassCard>
          ))}
        </motion.div>
      )}

      {/* Log entries */}
      <div className="w-full max-w-lg flex flex-col gap-3">
        {loading ? (
          <GlassCard>
            <div className="flex items-center justify-center gap-3 py-4">
              <RefreshCw className="w-5 h-5 text-text-muted animate-spin" />
              <p className="text-sm text-text-muted">Loading audit logs...</p>
            </div>
          </GlassCard>
        ) : logs.length === 0 ? (
          <GlassCard>
            <div className="text-center py-8">
              <p className="text-sm text-text-muted">No audit logs yet.</p>
              <p className="text-xs text-text-muted mt-1">Complete a KYC verification to see logs here.</p>
            </div>
          </GlassCard>
        ) : (
          [...logs].reverse().map((entry, i) => {
            const Icon = stepIcons[entry.step] || ShieldCheck;
            const statusClass = statusColors[entry.status] || statusColors.failure;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-text-primary">
                          {stepLabels[entry.step] || entry.step}
                        </p>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ring-1 ${statusClass}`}>
                          {entry.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted mb-2">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>

                      {/* Details */}
                      {Object.keys(entry.details).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(entry.details).map(([key, val]) => (
                            val !== null && val !== undefined && (
                              <span
                                key={key}
                                className="text-[10px] bg-black/5 rounded-full px-2 py-0.5 text-text-secondary"
                              >
                                {key}: {String(val)}
                              </span>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
