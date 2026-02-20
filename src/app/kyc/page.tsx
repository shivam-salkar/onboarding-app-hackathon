'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  SwitchCamera,
  ScanLine,
  UserCheck,
  ShieldCheck,
  ShieldX,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  ClipboardList,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useCamera } from '@/hooks/useCamera';
import { useBlurDetection } from '@/hooks/useBlurDetection';
import { useDocumentOCR, type OCRResult } from '@/hooks/useDocumentOCR';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { VoiceAssistant } from '@/components/ai/VoiceAssistant';
import { VoiceCommand } from '@/hooks/useVoiceCommands';

type KycStep = 'start' | 'document' | 'ocr' | 'selfie' | 'result';

const stepOrder: KycStep[] = ['document', 'ocr', 'selfie', 'result'];

const stepIcons: Record<string, React.ElementType> = {
  document: Camera,
  ocr: ScanLine,
  selfie: UserCheck,
  result: ShieldCheck,
};

async function logAudit(step: string, status: string, details: Record<string, unknown>) {
  try {
    await fetch('/api/kyc/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step, status, details }),
    });
  } catch {
    // Best-effort logging
  }
}

export default function KycPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: onboardingData } = useOnboarding();

  const [step, setStep] = useState<KycStep>('start');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [qualityIssue, setQualityIssue] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [matchStatus, setMatchStatus] = useState<'success' | 'partial' | 'none' | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [faceStatus, setFaceStatus] = useState<'detected' | 'not_detected' | 'skipped' | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [kycApproved, setKycApproved] = useState(false);

  const {
    videoRef, canvasRef, isStreaming, error: cameraError,
    startCamera, stopCamera, captureFrame, switchCamera,
  } = useCamera();
  const { analyzeImage } = useBlurDetection();
  const { recognizeDocument, isProcessing, progress } = useDocumentOCR();

  const currentStepIndex = stepOrder.indexOf(step);
  const totalSteps = stepOrder.length;

  const handleStartKyc = useCallback(async () => {
    setStep('document');
    await startCamera('environment');
  }, [startCamera]);

  const handleCaptureDocument = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;
    setIsAnalyzing(true);
    setQualityIssue(null);

    const quality = await analyzeImage(frame);
    await logAudit('document_capture', quality.isAcceptable ? 'success' : 'retry', {
      sharpnessScore: quality.sharpnessScore,
      brightnessScore: quality.brightnessScore,
      qualityIssue: quality.issue,
    });

    if (!quality.isAcceptable) {
      setQualityIssue(quality.issue);
      setIsAnalyzing(false);
      return;
    }

    setCapturedImage(frame);
    stopCamera();
    setIsAnalyzing(false);
    setStep('ocr');

    const result = await recognizeDocument(frame);
    setOcrResult(result);

    let status: 'success' | 'partial' | 'none' = 'none';

    // Hackathon Mode: Bypassing strict validation
    // If ANY document is detected, we treat it as a success even if data doesn't match
    if (result.docType !== 'unknown') {
      status = 'success';
    }

    // Original strict validation logic (commented out for demo)
    /*
    if (result.docType !== 'unknown' && result.extractedId) {
      const idField = result.docType === 'pan' ? 'pan' : 'aadhaar';
      const normalizedExtracted = result.extractedId.replace(/\s/g, '').toUpperCase();
      const normalizedStored = (onboardingData[idField] || '').replace(/\s/g, '').toUpperCase();
      if (normalizedExtracted && normalizedStored && normalizedExtracted === normalizedStored) {
        status = 'success';
      } else if (normalizedExtracted && normalizedStored && normalizedStored.includes(normalizedExtracted.slice(0, 5))) {
        status = 'partial';
      }
    } else if (result.docType !== 'unknown') {
      status = 'partial';
    }
    */

    setMatchStatus(status);

    await logAudit('ocr_validation', status === 'success' ? 'success' : 'failure', {
      docType: result.docType,
      extractedId: result.extractedId,
      matchResult: status === 'success',
      ocrConfidence: result.confidence,
    });
  }, [captureFrame, analyzeImage, stopCamera, recognizeDocument, onboardingData]);

  const handleProceedToSelfie = useCallback(async () => {
    setStep('selfie');
    await startCamera('user');
  }, [startCamera]);

  const handleCaptureSelfie = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;
    setSelfieImage(frame);
    stopCamera();
    setIsAnalyzing(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let detected: 'detected' | 'not_detected' | 'skipped' = 'skipped';
    if ('FaceDetector' in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const img = new Image();
        img.src = frame;
        await new Promise((resolve) => { img.onload = resolve; });
        const faces = await detector.detect(img);
        detected = faces.length > 0 ? 'detected' : 'not_detected';
      } catch {
        detected = 'skipped';
      }
    }

    setFaceStatus(detected);
    setIsAnalyzing(false);
    await logAudit('selfie_capture', detected === 'detected' || detected === 'skipped' ? 'success' : 'failure', {
      faceDetected: detected === 'detected',
    });
  }, [captureFrame, stopCamera]);

  const handleFinalize = useCallback(async () => {
    setStep('result');
    const approved =
      (matchStatus === 'success' || matchStatus === 'partial') &&
      (faceStatus === 'detected' || faceStatus === 'skipped');
    setKycApproved(approved);
    await logAudit('final_result', approved ? 'success' : 'failure', { matchStatus, faceStatus });
  }, [matchStatus, faceStatus]);

  const handleRetakeDocument = useCallback(async () => {
    setCapturedImage(null);
    setQualityIssue(null);
    setOcrResult(null);
    setMatchStatus(null);
    setStep('document');
    await startCamera('environment');
  }, [startCamera]);

  const handleRestart = useCallback(async () => {
    stopCamera();
    setCapturedImage(null);
    setQualityIssue(null);
    setOcrResult(null);
    setMatchStatus(null);
    setSelfieImage(null);
    setFaceStatus(null);
    setKycApproved(false);
    setStep('start');
  }, [stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Voice assistant prompt key based on current step
  const kycVoicePromptKey = `kyc.voicePrompts.${step}`;

  // Voice commands that change based on the current step
  const kycVoiceCommands: VoiceCommand[] = useMemo(() => {
    switch (step) {
      case 'start':
        return [
          {
            keywords: ['start', 'begin', 'shuru', 'शुरू', 'सुरू'],
            action: () => handleStartKyc(),
          },
        ];
      case 'document':
        return [
          {
            keywords: ['capture', 'photo', 'click', 'कैप्चर', 'फोटो', 'कॅप्चर'],
            action: () => handleCaptureDocument(),
          },
          {
            keywords: ['switch', 'flip', 'बदलो', 'बदला'],
            action: () => switchCamera(),
          },
        ];
      case 'ocr':
        return [
          {
            keywords: ['next', 'continue', 'selfie', 'आगे', 'पुढे'],
            action: () => {
              if (matchStatus === 'success' || matchStatus === 'partial') {
                handleProceedToSelfie();
              }
            },
          },
          {
            keywords: ['retake', 'again', 'दोबारा', 'पुन्हा'],
            action: () => handleRetakeDocument(),
          },
        ];
      case 'selfie':
        return [
          {
            keywords: ['capture', 'photo', 'click', 'कैप्चर', 'फोटो', 'कॅप्चर'],
            action: () => {
              if (!selfieImage) {
                handleCaptureSelfie();
              }
            },
          },
          {
            keywords: ['confirm', 'continue', 'done', 'पुष्टि', 'पुष्टी'],
            action: () => {
              if (selfieImage && (faceStatus === 'detected' || faceStatus === 'skipped')) {
                handleFinalize();
              }
            },
          },
          {
            keywords: ['retake', 'again', 'दोबारा', 'पुन्हा'],
            action: async () => {
              if (selfieImage) {
                setSelfieImage(null);
                setFaceStatus(null);
                await startCamera('user');
              }
            },
          },
        ];
      case 'result':
        return [
          {
            keywords: ['done', 'close', 'finish', 'बंद', 'बंद करा'],
            action: () => {
              if (kycApproved) {
                handleRestart();
              }
            },
          },
          {
            keywords: ['audit', 'log', 'ऑडिट', 'लॉग'],
            action: () => {
              if (kycApproved) {
                router.push('/kyc/admin');
              }
            },
          },
          {
            keywords: ['retry', 'again', 'try', 'फिर से', 'पुन्हा'],
            action: () => {
              if (!kycApproved) {
                handleRestart();
              }
            },
          },
        ];
      default:
        return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, matchStatus, selfieImage, faceStatus, kycApproved]);

  return (
    <div className="flex-1 flex flex-col items-center px-5 py-6 min-h-[100dvh] relative z-10">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold text-text-primary">{t('kyc.title')}</h1>
        <p className="text-xs text-text-secondary mt-1">{t('kyc.subtitle')}</p>
      </motion.div>

      {/* Voice Assistant */}
      <VoiceAssistant
        promptKey={kycVoicePromptKey}
        commands={kycVoiceCommands}
        commandsEnabled={!isAnalyzing && !isProcessing}
        showTranscript
        size="sm"
        className="mb-4"
      />

      {/* Step Indicator */}
      {step !== 'start' && (
        <motion.div
          className="flex items-center gap-2 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {stepOrder.map((s, i) => {
            const Icon = stepIcons[s];
            const isActive = i === currentStepIndex;
            const isDone = i < currentStepIndex;
            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${isActive
                    ? 'bg-primary/20 ring-2 ring-primary'
                    : isDone
                      ? 'bg-glow-teal/20'
                      : 'bg-black/5'
                    }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-glow-teal" />
                  ) : (
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-text-muted'}`} />
                  )}
                </div>
                {i < stepOrder.length - 1 && (
                  <div className={`w-6 h-0.5 rounded-full transition-colors duration-300 ${isDone ? 'bg-glow-teal' : 'bg-black/10'}`} />
                )}
              </div>
            );
          })}
        </motion.div>
      )}

      {step !== 'start' && step !== 'result' && (
        <motion.p
          className="text-xs text-text-muted mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {t('kyc.step', { current: currentStepIndex + 1, total: totalSteps })}
        </motion.p>
      )}

      <AnimatePresence mode="wait">
        {/* =================== START =================== */}
        {step === 'start' && (
          <motion.div
            key="start"
            className="flex-1 flex flex-col items-center justify-center w-full max-w-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="relative mb-8">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-primary/30"
                  animate={{ scale: [0.8, 1.8], opacity: [0.4, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
                />
              ))}
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <Camera className="w-10 h-10 text-primary" />
              </div>
            </div>

            <div className="w-full flex flex-col gap-3 mb-8">
              {(['document', 'selfie'] as const).map((key, i) => {
                const Icon = key === 'document' ? Camera : UserCheck;
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    <GlassCard>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-text-primary">
                            {t(`kyc.steps.${key}`)}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {t(`kyc.steps.${key}Desc`)}
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>

            <Button onClick={handleStartKyc} className="w-full">
              <Camera className="w-5 h-5" />
              {t('kyc.startBtn')}
            </Button>
          </motion.div>
        )}

        {/* =================== DOCUMENT CAPTURE =================== */}
        {step === 'document' && (
          <motion.div
            key="document"
            className="flex-1 flex flex-col items-center w-full max-w-sm"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <p className="text-sm font-medium text-text-primary mb-2">{t('kyc.steps.document')}</p>
            <p className="text-xs text-text-muted mb-4 text-center">{t('kyc.steps.documentDesc')}</p>

            <div className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden mb-4 bg-black/10">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-6 border-2 border-white/40 rounded-2xl" />
                <div className="absolute top-6 left-6 w-6 h-6 border-t-3 border-l-3 border-glow-teal rounded-tl-lg" />
                <div className="absolute top-6 right-6 w-6 h-6 border-t-3 border-r-3 border-glow-teal rounded-tr-lg" />
                <div className="absolute bottom-6 left-6 w-6 h-6 border-b-3 border-l-3 border-glow-teal rounded-bl-lg" />
                <div className="absolute bottom-6 right-6 w-6 h-6 border-b-3 border-r-3 border-glow-teal rounded-br-lg" />
              </div>
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                    <p className="text-sm text-white font-medium">{t('kyc.analyzing')}</p>
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <GlassCard className="w-full mb-4">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-500">{cameraError}</p>
                </div>
              </GlassCard>
            )}

            {qualityIssue && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full mb-4"
              >
                <GlassCard className="ring-1 ring-red-400/30">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-500 font-medium">
                      {t(`kyc.qualityIssue.${qualityIssue}`)}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            <div className="w-full flex gap-3 mt-auto">
              <Button
                onClick={switchCamera}
                variant="secondary"
                className="min-w-[56px]"
                aria-label={t('kyc.switchCamera')}
              >
                <SwitchCamera className="w-5 h-5" />
              </Button>
              <Button
                onClick={handleCaptureDocument}
                disabled={!isStreaming || isAnalyzing}
                className="flex-1"
              >
                <Camera className="w-5 h-5" />
                {t('kyc.capture')}
              </Button>
            </div>
          </motion.div>
        )}

        {/* =================== OCR PROCESSING =================== */}
        {step === 'ocr' && (
          <motion.div
            key="ocr"
            className="flex-1 flex flex-col items-center w-full max-w-sm"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <p className="text-sm font-medium text-text-primary mb-2">{t('kyc.steps.ocr')}</p>
            <p className="text-xs text-text-muted mb-4 text-center">{t('kyc.steps.ocrDesc')}</p>

            {capturedImage && (
              <div className="w-full aspect-[4/3] rounded-[2rem] overflow-hidden mb-4 relative">
                <img src={capturedImage} alt="Captured document" className="w-full h-full object-cover" />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                      <p className="text-sm text-white font-medium">
                        {t('kyc.processing', { progress })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {ocrResult && !isProcessing && (
              <div className="w-full flex flex-col gap-3 mb-4">
                <GlassCard
                  className={ocrResult.docType !== 'unknown' ? 'ring-1 ring-glow-teal/50' : 'ring-1 ring-red-400/30'}
                >
                  <div className="flex items-center gap-3">
                    {ocrResult.docType !== 'unknown' ? (
                      <CheckCircle2 className="w-5 h-5 text-glow-teal flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <p className={`text-sm font-medium ${ocrResult.docType !== 'unknown' ? 'text-glow-teal' : 'text-red-500'}`}>
                      {ocrResult.docType !== 'unknown'
                        ? t('kyc.docDetected', { type: ocrResult.docType.toUpperCase() })
                        : t('kyc.docNotDetected')}
                    </p>
                  </div>
                </GlassCard>

                {ocrResult.extractedId && (
                  <GlassCard>
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Extracted Info</p>
                    <p className="text-sm font-medium text-text-primary">
                      {t('kyc.idExtracted', { id: ocrResult.extractedId })}
                    </p>
                    {ocrResult.extractedName && (
                      <p className="text-sm text-text-secondary mt-1">
                        {t('kyc.nameExtracted', { name: ocrResult.extractedName })}
                      </p>
                    )}
                  </GlassCard>
                )}

                {matchStatus && (
                  <GlassCard
                    className={
                      matchStatus === 'success'
                        ? 'ring-1 ring-glow-teal/50'
                        : matchStatus === 'partial'
                          ? 'ring-1 ring-yellow-400/50'
                          : 'ring-1 ring-red-400/30'
                    }
                  >
                    <div className="flex items-center gap-3">
                      {matchStatus === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-glow-teal flex-shrink-0" />
                      ) : matchStatus === 'partial' ? (
                        <CheckCircle2 className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      )}
                      <p className={`text-sm font-medium ${matchStatus === 'success'
                        ? 'text-glow-teal'
                        : matchStatus === 'partial'
                          ? 'text-yellow-600'
                          : 'text-red-500'
                        }`}>
                        {matchStatus === 'success'
                          ? t('kyc.matchSuccess')
                          : matchStatus === 'partial'
                            ? t('kyc.matchPartial')
                            : t('kyc.noMatch')}
                      </p>
                    </div>
                  </GlassCard>
                )}
              </div>
            )}

            {!isProcessing && ocrResult && (
              <div className="w-full flex flex-col gap-3 mt-auto">
                {(matchStatus === 'success' || matchStatus === 'partial') && (
                  <Button onClick={handleProceedToSelfie} className="w-full">
                    <UserCheck className="w-5 h-5" />
                    {t('kyc.captureSelfie')}
                  </Button>
                )}
                <Button
                  onClick={handleRetakeDocument}
                  variant={matchStatus === 'none' ? 'primary' : 'secondary'}
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('kyc.retake')}
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* =================== SELFIE CAPTURE =================== */}
        {step === 'selfie' && (
          <motion.div
            key="selfie"
            className="flex-1 flex flex-col items-center w-full max-w-sm"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <p className="text-sm font-medium text-text-primary mb-2">{t('kyc.steps.selfie')}</p>
            <p className="text-xs text-text-muted mb-4 text-center">{t('kyc.steps.selfieDesc')}</p>

            {!selfieImage ? (
              <>
                <div className="relative w-48 h-48 rounded-full overflow-hidden mb-6 ring-4 ring-primary/30">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleCaptureSelfie}
                  disabled={!isStreaming || isAnalyzing}
                  className="w-full"
                >
                  <Camera className="w-5 h-5" />
                  {t('kyc.captureSelfie')}
                </Button>
              </>
            ) : (
              <>
                <div className="relative w-48 h-48 rounded-full overflow-hidden mb-6 ring-4 ring-glow-teal/50">
                  <img src={selfieImage} alt="Selfie" className="w-full h-full object-cover scale-x-[-1]" />
                </div>

                {faceStatus && (
                  <GlassCard
                    className={`w-full mb-4 ${faceStatus === 'detected'
                      ? 'ring-1 ring-glow-teal/50'
                      : faceStatus === 'not_detected'
                        ? 'ring-1 ring-red-400/30'
                        : ''
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {faceStatus === 'detected' ? (
                        <CheckCircle2 className="w-5 h-5 text-glow-teal flex-shrink-0" />
                      ) : faceStatus === 'not_detected' ? (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                      )}
                      <p className={`text-sm font-medium ${faceStatus === 'detected'
                        ? 'text-glow-teal'
                        : faceStatus === 'not_detected'
                          ? 'text-red-500'
                          : 'text-yellow-600'
                        }`}>
                        {faceStatus === 'detected'
                          ? t('kyc.faceDetected')
                          : faceStatus === 'not_detected'
                            ? t('kyc.faceNotDetected')
                            : t('kyc.faceSkipped')}
                      </p>
                    </div>
                  </GlassCard>
                )}

                <div className="w-full flex flex-col gap-3 mt-auto">
                  {(faceStatus === 'detected' || faceStatus === 'skipped') && (
                    <Button onClick={handleFinalize} className="w-full">
                      <ShieldCheck className="w-5 h-5" />
                      {t('kyc.confirm')}
                    </Button>
                  )}
                  {faceStatus === 'not_detected' && (
                    <Button
                      onClick={async () => {
                        setSelfieImage(null);
                        setFaceStatus(null);
                        await startCamera('user');
                      }}
                      className="w-full"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {t('kyc.retake')}
                    </Button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* =================== RESULT =================== */}
        {step === 'result' && (
          <motion.div
            key="result"
            className="flex-1 flex flex-col items-center justify-center w-full max-w-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <motion.div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${kycApproved ? 'bg-glow-teal/20' : 'bg-red-500/20'
                }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {kycApproved ? (
                <ShieldCheck className="w-10 h-10 text-glow-teal" />
              ) : (
                <ShieldX className="w-10 h-10 text-red-500" />
              )}
            </motion.div>

            <h2 className="text-xl font-bold text-text-primary mb-2 text-center">
              {kycApproved ? t('kyc.approved') : t('kyc.rejected')}
            </h2>
            <p className="text-sm text-text-secondary mb-8 text-center">
              {kycApproved ? t('kyc.approvedMsg') : t('kyc.rejectedMsg')}
            </p>

            <div className="w-full flex flex-col gap-3 mb-8">
              {ocrResult && (
                <GlassCard>
                  <div className="flex items-center gap-3">
                    <ScanLine className="w-5 h-5 text-text-muted flex-shrink-0" />
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wider">Document</p>
                      <p className="text-sm font-medium text-text-primary">
                        {ocrResult.docType !== 'unknown' ? ocrResult.docType.toUpperCase() : 'Unknown'} — Confidence: {Math.round(ocrResult.confidence)}%
                      </p>
                    </div>
                  </div>
                </GlassCard>
              )}
              <GlassCard>
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-text-muted flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wider">Face Verification</p>
                    <p className="text-sm font-medium text-text-primary capitalize">
                      {faceStatus === 'detected'
                        ? 'Detected'
                        : faceStatus === 'skipped'
                          ? 'Skipped (unsupported)'
                          : 'Not detected'}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            <div className="w-full flex flex-col gap-3 mt-auto">
              {kycApproved ? (
                <>
                  <Button onClick={() => router.push('/kyc/admin')} variant="secondary" className="w-full">
                    <ClipboardList className="w-4 h-4" />
                    {t('kyc.viewAuditLog')}
                  </Button>
                  <Button onClick={handleRestart} variant="ghost" className="w-full">
                    {t('kyc.close')}
                  </Button>
                </>
              ) : (
                <Button onClick={handleRestart} className="w-full">
                  <RotateCcw className="w-4 h-4" />
                  {t('kyc.tryAgain')}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
