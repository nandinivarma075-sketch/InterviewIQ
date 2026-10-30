import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Square, Clock, Volume2, AlertCircle,
  Camera, CameraOff, Eye, Activity, Hand, SkipForward, CheckCircle2, Loader2,
  Play, ShieldCheck, Sparkles, ArrowLeft, Zap, Award, Send, Code2,
} from 'lucide-react';
import CodingSandbox from '../components/CodingSandbox';
import { useTimer } from '../hooks/useApp';
import { useCamera } from '../hooks/useCamera';
import { useInterview } from '../context/InterviewContext';
import { useAuth } from '../context/AuthContext';
import { sessions as sessionsApi } from '../utils/api';
import './LiveInterviewPage.css';

/** Returns browser SpeechRecognition or null */
function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/** Human-readable labels for CV classifications */
const GAZE_LABELS = {
  facing_camera: '👁️ Facing Camera',
  looking_side:  '👀 Looking Side',
  looking_down:  '⬇️ Looking Down',
  unknown:       '❓ Unknown',
};
const POSTURE_LABELS = {
  upright:                 '🧍 Upright',
  leaning_forward:         '⬆️ Leaning Forward',
  leaning_back:            '⬇️ Leaning Back',
  slouching:               '😔 Slouching',
  insufficient_visibility: '🔍 Not Visible',
  unknown:                 '❓ Unknown',
};
const GESTURE_LABELS = {
  none:             '✋ No Gesture',
  one_hand_raised:  '🙋 Hand Raised',
  both_hands_raised:'🙌 Both Hands',
  unknown:          '❓ Unknown',
};

/** Flush observation batches every N seconds */
const FLUSH_INTERVAL_MS = 5000;

/**
 * Per-question state — maintains explicit state and transcript for each question
 * independently, ensuring accurate tracking.
 *
 * State values (mirrors backend state machine):
 *   NOT_STARTED | PRESENTED | ANSWERING | ANSWERED | PARTIALLY_ANSWERED | SKIPPED
 */
function initQuestionStates(questions) {
  return questions.map((q, i) => ({
    questionIndex:    i,
    questionId:       q.questionId ?? q.id ?? `q-${i}`,
    questionText:     q.questionText ?? q.text ?? '',
    questionType:     q.questionType ?? q.type ?? 'technical',
    questionDifficulty: q.questionDifficulty ?? q.difficulty ?? 'Medium',
    state:            i === 0 ? 'PRESENTED' : 'NOT_STARTED',
    transcriptText:   '',
    wordCount:        0,
    answerStartedAt:  null,
    presentedAt:      i === 0 ? Date.now() : null,
    submittedToApi:   false,
  }));
}

export default function LiveInterviewPage() {
  const navigate = useNavigate();
  const { difficulty, selectedRole, interviewType, questionCount, parsedResume } = useInterview();
  const { user } = useAuth();

  // ── Session state ──────────────────────────────────────────────────────────
  const [sessionId,          setSessionId]          = useState(null);
  const [sessionError,       setSessionError]       = useState('');
  const [initLoading,        setInitLoading]        = useState(true);  // loading while questions are fetched
  const [isInterviewStarted, setIsInterviewStarted] = useState(false); // only start timer when candidate clicks Start Interview

  // ── Dynamic questions from backend ─────────────────────────────────────────
  const [questions,      setQuestions]      = useState([]);
  const totalQuestionsRef = useRef(questionCount ?? 4);

  // ── Per-question state tracking (THE FIX) ─────────────────────────────────
  const [questionStates, setQuestionStates] = useState([]);
  const questionStatesRef = useRef(null);
  // Keep a ref in sync so async handlers have the latest value
  useEffect(() => { questionStatesRef.current = questionStates; }, [questionStates]);

  // ── Speech state ───────────────────────────────────────────────────────────
  const [listening,       setListening]       = useState(false);
  const [currentQ,        setCurrentQ]        = useState(0);
  const [transcript,      setTranscript]      = useState('');
  const [interimText,     setInterimText]     = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [permError,       setPermError]       = useState('');
  const recognitionRef = useRef(null);
  const timer = useTimer(0);

  // ── Dynamic Follow-Up Question State ─────────────────────────────────────
  const [activeFollowUp, setActiveFollowUp] = useState(null);
  const activeFollowUpRef = useRef(null);
  useEffect(() => { activeFollowUpRef.current = activeFollowUp; }, [activeFollowUp]);
  const [isSubmittingPrimary, setIsSubmittingPrimary] = useState(false);

  // ── Coding Sandbox State ─────────────────────────────────────────────────
  const codeDataRef = useRef({});
  const [showCodingSandbox, setShowCodingSandbox] = useState(false);

  // Track when the mic was first activated for the current question
  const answerStartRef = useRef(null);

  // ── Camera / CV ────────────────────────────────────────────────────────────
  const {
    cameraState, error: cameraError,
    analysis, videoRef, startCamera, stopCamera, drainObservations,
  } = useCamera();

  const [cameraOpen, setCameraOpen] = useState(false);
  const flushIntervalRef = useRef(null);
  const sessionInitRef = useRef(false);

  // ── Init: create session, generate questions, detect speech support ────────
  useEffect(() => {
    if (sessionInitRef.current) return;
    sessionInitRef.current = true;

    if (!getSpeechRecognition()) setSpeechSupported(false);

    (async () => {
      try {
        setInitLoading(true);
        // Create backend session with interview config
        const data = await sessionsApi.create(
          selectedRole ?? null,
          difficulty ?? 'Medium',
          interviewType ?? 'mixed',
          questionCount ?? 4
        );
        const sid = data.session.id;
        setSessionId(sid);

        // Generate dynamic questions for this session
        let generatedQuestions = [];
        try {
          const genResult = await sessionsApi.generateQuestions(sid, {
            role:          selectedRole ?? null,
            difficulty:    difficulty ?? 'Medium',
            interviewType: interviewType ?? 'mixed',
            count:         questionCount ?? 4,
            resumeData:    parsedResume ?? null,
          });
          generatedQuestions = genResult.questions ?? [];
        } catch (genErr) {
          console.warn('[LiveInterview] generateQuestions failed:', genErr.message);
          // Fallback: create 4 generic questions
          generatedQuestions = getFallbackQuestions(selectedRole, difficulty);
        }

        setQuestions(generatedQuestions);
        totalQuestionsRef.current = generatedQuestions.length;

        // Initialize per-question state
        const initialStates = initQuestionStates(generatedQuestions);
        setQuestionStates(initialStates);
      } catch (e) {
        setSessionError(`Could not start session: ${e.message}`);
      } finally {
        setInitLoading(false);
      }
    })();

    // Timer is NOT started here — it starts strictly when candidate clicks "Start Interview"
    return () => { timer.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler to explicitly start the interview and start the timer
  const handleStartInterview = useCallback(async () => {
    setIsInterviewStarted(true);
    timer.start();

    // Mark Q0 as PRESENTED in the backend
    if (questions.length > 0 && sessionId) {
      const q0 = questions[0];
      try {
        await sessionsApi.presentQuestion(sessionId, 0, {
          questionId:         q0.questionId,
          questionText:       q0.questionText,
          questionType:       q0.questionType,
          questionDifficulty: q0.questionDifficulty ?? difficulty ?? 'Medium',
        });
      } catch (e) {
        console.warn('[LiveInterview] presentQuestion Q0 failed:', e.message);
      }
    }
  }, [questions, sessionId, difficulty, timer]);

  // Flush camera observations to backend periodically (only when interview has started)
  useEffect(() => {
    if (!sessionId || !isInterviewStarted) return;
    flushIntervalRef.current = setInterval(async () => {
      const batch = drainObservations();
      if (batch.length === 0) return;
      const deduped = Object.values(
        batch.reduce((m, o) => { m[o.ts] = o; return m; }, {})
      );
      try {
        await sessionsApi.addObservations(sessionId, deduped);
      } catch (e) {
        console.warn('[LiveInterview] observation flush failed:', e.message);
      }
    }, FLUSH_INTERVAL_MS);
    return () => clearInterval(flushIntervalRef.current);
  }, [sessionId, drainObservations]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.abort(); stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Speech recognition ─────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.continuous = true; r.interimResults = true; r.lang = 'en-US'; r.maxAlternatives = 1;

    r.onstart = () => {
      setListening(true); setPermError(''); setInterimText('');
      if (!answerStartRef.current) {
        answerStartRef.current = Math.floor(Date.now() / 1000);
      }
      setQuestionStates((prev) => {
        const next = [...prev];
        if (next[currentQ] && (next[currentQ].state === 'PRESENTED' || next[currentQ].state === 'NOT_STARTED')) {
          next[currentQ] = {
            ...next[currentQ],
            state: 'ANSWERING',
            answerStartedAt: answerStartRef.current,
          };
        }
        return next;
      });
    };

    r.onresult = (event) => {
      let final = '', interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) final += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (final) {
        if (activeFollowUpRef.current) {
          setActiveFollowUp((prev) => prev ? ({
            ...prev,
            answer: (prev.answer ? prev.answer + ' ' : '') + final.trim(),
          }) : null);
        } else {
          setTranscript((p) => {
            const next = p + final + ' ';
            setQuestionStates((prev) => {
              const qs = [...prev];
              if (!qs[currentQ]) return qs;
              const words = next.trim().split(/\s+/).filter(Boolean).length;
              qs[currentQ] = {
                ...qs[currentQ],
                transcriptText: next,
                wordCount:      words,
                state:          words >= 3 ? 'ANSWERING' : qs[currentQ].state,
              };
              return qs;
            });
            return next;
          });
        }
      }
      setInterimText(interim);
    };

    r.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed')
        setPermError('Microphone access denied. Please allow microphone permission.');
      else if (event.error !== 'no-speech')
        setPermError(`Speech error: ${event.error}`);
      setListening(false);
    };

    r.onend = () => { setListening(false); setInterimText(''); };
    recognitionRef.current = r;
    r.start();
  }, [currentQ]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false); setInterimText('');
  }, []);

  const toggleMic = () => { if (listening) stopListening(); else startListening(); };

  // ── Camera controls ────────────────────────────────────────────────────────
  const handleStartCamera = () => { setCameraOpen(true); startCamera(); };
  const handleStopCamera  = () => { setCameraOpen(false); stopCamera(); };

  // ── Submit current question answer to backend ─────────────────────────────
  const submitCurrentAnswer = useCallback(async (sid, qIndex, explicitState = null) => {
    const qs  = questionStatesRef.current;
    if (!qs || !sid) return;
    const qa  = qs[qIndex];
    if (!qa || qa.submittedToApi) return; // already submitted

    const words   = qa.wordCount;
    const txText  = qa.transcriptText.trim();

    const codeInfo = codeDataRef.current?.[qIndex];
    const hasCode = Boolean(codeInfo?.code && codeInfo.code.trim().length > 0);

    let finalTx = txText;
    if (!finalTx && hasCode) {
      finalTx = `[Live Coding Solution - ${codeInfo.language || 'JavaScript'}]:\n${codeInfo.code}\n[Complexity]: ${codeInfo.complexity?.timeComplexity || 'O(N)'} / ${codeInfo.complexity?.spaceComplexity || 'O(1)'}`;
    }

    let state = explicitState;
    if (!state) {
      if (qa.state === 'SKIPPED') {
        state = 'SKIPPED';
      } else if (!finalTx || finalTx.length === 0) {
        state = 'NOT_ATTEMPTED';
      } else {
        state = 'ANSWERED';
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      state,
      transcriptVerbatim: finalTx,
      transcriptReadable:  finalTx,
      answerStartedAt:  qa.answerStartedAt ?? null,
      answerEndedAt:    now,
      codeSolution:     codeInfo?.code ?? null,
      codeResults:      codeInfo?.testResults ?? null,
    };

    try {
      const res = await sessionsApi.submitAnswer(sid, qIndex, payload);
      setQuestionStates((prev) => {
        const next = [...prev];
        if (next[qIndex]) next[qIndex] = { ...next[qIndex], state, submittedToApi: true };
        return next;
      });
      return res;
    } catch (e) {
      console.warn(`[LiveInterview] submitAnswer Q${qIndex} failed:`, e.message);
      return null;
    }
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────

  /**
   * goToQuestion — navigate to a specific question index.
   * Updates local state and marks the target PRESENTED in the backend.
   * Does NOT submit the previous question's answer — callers are responsible.
   */
  const goToQuestion = useCallback(async (sid, nextIndex) => {
    const TOTAL = totalQuestionsRef.current;
    if (nextIndex < 0 || nextIndex >= TOTAL) return;

    setActiveFollowUp(null);
    answerStartRef.current = null;
    setCurrentQ(nextIndex);
    setTranscript('');
    setInterimText('');

    const nextQ       = questions[nextIndex];
    const presentedAt = Math.floor(Date.now() / 1000);

    setQuestionStates((prev) => {
      const next = [...prev];
      if (next[nextIndex]) {
        next[nextIndex] = {
          ...next[nextIndex],
          state:       'PRESENTED',
          presentedAt: presentedAt * 1000,
        };
      }
      return next;
    });

    if (sid && nextQ) {
      try {
        await sessionsApi.presentQuestion(sid, nextIndex, {
          questionId:         nextQ.questionId,
          questionText:       nextQ.questionText,
          questionType:       nextQ.questionType,
          questionDifficulty: nextQ.questionDifficulty ?? difficulty ?? 'Medium',
        });
      } catch (e) {
        console.warn(`[LiveInterview] presentQuestion Q${nextIndex} failed:`, e.message);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, difficulty]);

  const handleNextQuestion = useCallback(async () => {
    stopListening();
    const sid       = sessionId;
    const nextIndex = currentQ + 1;
    const TOTAL     = totalQuestionsRef.current;

    setIsSubmittingPrimary(true);
    try {
      const res = await submitCurrentAnswer(sid, currentQ);
      // Check if dynamic follow up question was generated and question was not skipped
      if (res?.followUpQuestion && questionStatesRef.current?.[currentQ]?.state !== 'SKIPPED') {
        setActiveFollowUp({
          qIndex: currentQ,
          question: res.followUpQuestion,
          answer: '',
          bonusPoints: null,
          feedback: null,
          evaluating: false,
        });

        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(`Follow up question: ${res.followUpQuestion}`);
          utter.lang = 'en-US';
          utter.rate = 0.95;
          window.speechSynthesis.speak(utter);
        }
        setIsSubmittingPrimary(false);
        return;
      }
    } catch (e) {
      console.warn('[LiveInterview] submit answer error:', e);
    } finally {
      setIsSubmittingPrimary(false);
    }

    if (nextIndex < TOTAL) {
      await goToQuestion(sid, nextIndex);
    }
  }, [currentQ, sessionId, submitCurrentAnswer, stopListening, goToQuestion]);

  const handleSkipQuestion = useCallback(async () => {
    stopListening();
    setActiveFollowUp(null);
    const sid   = sessionId;
    const TOTAL = totalQuestionsRef.current;

    // Mark SKIPPED in local state first
    setQuestionStates((prev) => {
      const next = [...prev];
      if (next[currentQ]) next[currentQ] = { ...next[currentQ], state: 'SKIPPED' };
      return next;
    });

    // Submit SKIPPED to backend
    await submitCurrentAnswer(sid, currentQ, 'SKIPPED');

    // Navigate directly via goToQuestion — NOT via handleNextQuestion
    if (currentQ < TOTAL - 1) {
      await goToQuestion(sid, currentQ + 1);
    }
  }, [currentQ, sessionId, submitCurrentAnswer, stopListening, goToQuestion]);

  const handleSubmitFollowUp = useCallback(async () => {
    if (!activeFollowUp || !sessionId) return;
    stopListening();
    setActiveFollowUp((prev) => ({ ...prev, evaluating: true }));

    try {
      const res = await sessionsApi.submitAnswer(sessionId, activeFollowUp.qIndex, {
        followUpAnswer: activeFollowUp.answer.trim() || 'No clarification provided.',
      });

      const bonus = res?.followUpBonus ?? 0;
      const feedback = res?.followUpEvaluation?.followUpFeedback ?? 'Follow-up evaluated.';

      setActiveFollowUp((prev) => ({
        ...prev,
        evaluating: false,
        bonusPoints: bonus,
        feedback,
      }));

      if (window.speechSynthesis && bonus > 0) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(`Clarification evaluated. You recovered ${bonus} bonus points.`);
        utter.lang = 'en-US';
        utter.rate = 1.0;
        window.speechSynthesis.speak(utter);
      }

      setTimeout(async () => {
        setActiveFollowUp(null);
        const nextIndex = currentQ + 1;
        const TOTAL = totalQuestionsRef.current;
        if (nextIndex < TOTAL) {
          await goToQuestion(sessionId, nextIndex);
        }
      }, 1800);
    } catch (err) {
      console.warn('[LiveInterview] submitFollowUp failed:', err);
      setActiveFollowUp(null);
      const nextIndex = currentQ + 1;
      const TOTAL = totalQuestionsRef.current;
      if (nextIndex < TOTAL) {
        await goToQuestion(sessionId, nextIndex);
      }
    }
  }, [activeFollowUp, sessionId, stopListening, currentQ, goToQuestion]);

  const handleSkipFollowUp = useCallback(async () => {
    if (!activeFollowUp || !sessionId) return;
    stopListening();
    try {
      await sessionsApi.submitAnswer(sessionId, activeFollowUp.qIndex, {
        skipFollowUp: true,
      });
    } catch (e) {
      console.warn('[LiveInterview] skipFollowUp failed:', e);
    }
    setActiveFollowUp(null);
    const nextIndex = currentQ + 1;
    const TOTAL = totalQuestionsRef.current;
    if (nextIndex < TOTAL) {
      await goToQuestion(sessionId, nextIndex);
    }
  }, [activeFollowUp, sessionId, stopListening, currentQ, goToQuestion]);


  const handleEndInterview = useCallback(async () => {
    stopListening(); stopCamera(); timer.pause();
    clearInterval(flushIntervalRef.current);

    const sid = sessionId;
    let breakdown = null;
    let attemptSummaryResult = null;

    if (sid) {
      const remaining = drainObservations();
      if (remaining.length) {
        try { await sessionsApi.addObservations(sid, remaining); } catch {}
      }

      // Submit the current question's answer
      await submitCurrentAnswer(sid, currentQ);

      // End the session
      try {
        const endResult = await sessionsApi.end(sid, {
          questionsAsked: currentQ + 1,
          transcript: questionStatesRef.current
            ?.filter((q) => q.state !== 'NOT_STARTED' && q.transcriptText)
            .map((q) => q.transcriptText)
            .join('\n\n') ?? '',
        });
        breakdown = endResult?.breakdown ?? null;
        attemptSummaryResult = endResult?.attemptSummary ?? null;
      } catch (e) {
        console.warn('[LiveInterview] end session failed:', e.message);
        try { await sessionsApi.interrupt(sid); } catch {}
      }
    }

    navigate('/interview/completed', {
      state: { sessionId: sid, breakdown, attemptSummary: attemptSummaryResult },
    });
  }, [currentQ, sessionId, submitCurrentAnswer, stopListening, stopCamera, timer, drainObservations, navigate]);

  const speakQuestion = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const text = questions[currentQ]?.questionText ?? '';
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US'; utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  };

  const TOTAL_QUESTIONS = totalQuestionsRef.current;
  const q             = questions[currentQ];
  const currentQState = questionStates[currentQ];
  const answeredCount = questionStates.filter((s) =>
    s.state === 'ANSWERED' || s.state === 'PARTIALLY_ANSWERED'
  ).length;

  // ── Loading state while questions are generated ────────────────────────────
  if (initLoading) {
    return (
      <div className="live-interview" id="live-interview-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} style={{ color: 'var(--purple-500)', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
          <p style={{ color: 'var(--navy-600)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
            Generating your personalised interview questions…
          </p>
          <p style={{ color: 'var(--navy-400)', fontSize: 'var(--text-xs)', marginTop: 8 }}>
            Role: {selectedRole ?? 'General'} · {interviewType ?? 'mixed'} · {difficulty ?? 'Medium'}
          </p>
        </div>
      </div>
    );
  }

  // ── No questions fallback ──────────────────────────────────────────────────
  if (!initLoading && questions.length === 0) {
    return (
      <div className="live-interview" id="live-interview-page">
        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: 'var(--error-400)', marginBottom: 16 }} />
          <p style={{ color: 'var(--navy-600)', marginBottom: 16 }}>
            {sessionError || 'Could not generate interview questions. Please try again.'}
          </p>
          <button className="btn btn-primary" onClick={() => window.history.back()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ── Pre-interview Readiness & Start Screen ──────────────────────────────────
  if (!isInterviewStarted) {
    return (
      <div className="live-interview" id="live-interview-page" style={{ maxWidth: 840, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
        <div className="card" style={{ padding: 'var(--space-8)', borderRadius: 'var(--radius-xl)', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(59, 130, 246, 0.15))',
              color: 'var(--purple-600)',
              marginBottom: 'var(--space-3)',
            }}>
              <Sparkles size={28} />
            </div>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--navy-900)', marginBottom: 'var(--space-1)' }}>
              Interview Readiness Check
            </h2>
            <p style={{ color: 'var(--navy-500)', fontSize: 'var(--text-sm)' }}>
              Review your session details and instructions before starting. The interview timer will record only once you click &ldquo;Start Interview&rdquo;.
            </p>
          </div>

          {/* Session Overview Badges */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-4)',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-6)',
          }}>
            <span className="badge badge-purple" style={{ fontSize: 'var(--text-xs)', padding: '6px 12px' }}>
              🎯 Target Role: {selectedRole ?? 'Software Engineer'}
            </span>
            <span className="badge badge-blue" style={{ fontSize: 'var(--text-xs)', padding: '6px 12px', textTransform: 'capitalize' }}>
              ⚡ Difficulty: {difficulty ?? 'Medium'}
            </span>
            <span className="badge badge-navy" style={{ fontSize: 'var(--text-xs)', padding: '6px 12px' }}>
              📝 {questions.length} Questions
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'var(--purple-700)',
              background: 'rgba(124, 58, 237, 0.1)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
            }}>
              <ShieldCheck size={14} /> Strict Technical Evaluation Mode
            </span>
          </div>

          {/* Guidelines / Evaluation Rigor Notice */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <div style={{ padding: 'var(--space-4)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', color: 'var(--purple-600)', fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                <Clock size={16} /> Timer Control
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-600)', lineHeight: 'var(--leading-relaxed)' }}>
                The timer is currently paused at <strong>00:00</strong>. It will begin recording the moment you click <strong>Start Interview</strong>.
              </p>
            </div>

            <div style={{ padding: 'var(--space-4)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', color: 'var(--success-600)', fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                <CheckCircle2 size={16} /> Strict Accuracy Evaluation
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-600)', lineHeight: 'var(--leading-relaxed)' }}>
                Responses are graded strictly on factual correctness and core concepts. Quality and precision are rewarded; incorrect claims are strictly penalized.
              </p>
            </div>

            <div style={{ padding: 'var(--space-4)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', color: 'var(--blue-600)', fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                <Mic size={16} /> Voice & Text Input
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-600)', lineHeight: 'var(--leading-relaxed)' }}>
                {speechSupported
                  ? 'Speech recognition is ready. You can tap the microphone to speak or type directly into the answer box.'
                  : 'Speech recognition is unavailable in this browser. Text input mode will be enabled.'}
              </p>
            </div>
          </div>

          {/* Setup / Camera Check */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-4) var(--space-5)',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-6)',
          }}>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--navy-800)' }}>
                Video & Posture Analysis (Optional)
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-500)', marginTop: 2 }}>
                {cameraOpen ? 'Camera is active and analyzing posture/eye contact.' : 'Camera is currently off. You can enable it now or anytime during the interview.'}
              </div>
            </div>
            <button
              type="button"
              className={`btn btn-sm ${cameraOpen ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={cameraOpen ? stopCamera : startCamera}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {cameraOpen ? <CameraOff size={14} /> : <Camera size={14} />}
              {cameraOpen ? 'Turn Off Preview' : 'Test Camera'}
            </button>
          </div>

          {/* Camera preview video element if open */}
          {cameraOpen && (
            <div style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#000', border: '2px solid var(--purple-500)' }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: 320, height: 240, objectFit: 'cover' }} />
                {analysis && (
                  <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: 11 }}>
                    {GAZE_LABELS[analysis.gaze] ?? analysis.gaze} · {POSTURE_LABELS[analysis.posture] ?? analysis.posture}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/interview/setup')}
              style={{ padding: '12px 24px', fontSize: 'var(--text-sm)' }}
            >
              <ArrowLeft size={16} /> Back to Setup
            </button>
            <button
              id="start-interview-btn"
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleStartInterview}
              style={{
                padding: '14px 40px',
                fontSize: 'var(--text-base)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)',
                cursor: 'pointer',
              }}
            >
              <Play size={18} fill="currentColor" />
              Start Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="live-interview" id="live-interview-page">
      {/* ── Top bar ── */}
      <div className="live-interview__bar">
        <div className="live-interview__bar-left">
          <span className="live-interview__live-dot" aria-hidden="true" />
          <span className="live-interview__live-label">LIVE INTERVIEW</span>
        </div>
        <div className="live-interview__timer"><Clock size={14} />{timer.formatted}</div>
        <div className="live-interview__bar-right">
          <span className="badge badge-navy">Q {currentQ + 1} / {TOTAL_QUESTIONS}</span>
          <span className="badge badge-purple" style={{ textTransform: 'capitalize' }}>{difficulty}</span>
          <span className="badge badge-blue" style={{ textTransform: 'capitalize', fontSize: 10 }}>{interviewType ?? 'mixed'}</span>
          <button id="live-end-btn" className="btn btn-danger btn-sm" onClick={handleEndInterview}>
            <Square size={13} /> End Interview
          </button>
        </div>
      </div>

      {/* ── Question state tracker ── */}
      <div className="live-interview__q-tracker" aria-label="Question progress">
        {questionStates.map((qs, i) => {
          const isDone    = qs.state === 'ANSWERED' || qs.state === 'PARTIALLY_ANSWERED';
          const isSkipped = qs.state === 'SKIPPED';
          const isCurrent = i === currentQ;
          return (
            <div
              key={i}
              className={[
                'live-q-pip',
                isCurrent ? 'live-q-pip--current' : '',
                isDone    ? 'live-q-pip--done'    : '',
                isSkipped ? 'live-q-pip--skipped' : '',
              ].filter(Boolean).join(' ')}
              title={`Q${i + 1}: ${qs.state.replace(/_/g, ' ')}`}
              aria-label={`Question ${i + 1}: ${qs.state.replace(/_/g, ' ')}`}
            >
              {isDone ? <CheckCircle2 size={10} /> : i + 1}
            </div>
          );
        })}
        <span className="live-q-count">{answeredCount}/{TOTAL_QUESTIONS} answered</span>
      </div>

      {/* ── Session error ── */}
      {sessionError && (
        <div className="live-interview__error-banner" role="alert">
          <AlertCircle size={15} /> {sessionError} — interview will not be saved.
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="live-interview__grid">
        {/* Left column */}
        <div className="live-interview__left">
          {/* Question */}
          <div className="live-interview__question card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <span className={`badge ${q?.questionType === 'technical' ? 'badge-purple' : q?.questionType === 'coding' ? 'badge-blue' : q?.questionType === 'behavioral' ? 'badge-blue' : q?.questionType === 'scenario' ? 'badge-navy' : q?.questionType === 'resume' ? 'badge-success' : 'badge-navy'}`}>
                  {q?.questionType}
                </span>
                {q?.questionText?.includes('In your resume') && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--purple-700)',
                    background: 'rgba(124, 58, 237, 0.12)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                  }}>
                    <Sparkles size={11} /> Project Deep-Dive
                  </span>
                )}
                <button className="btn btn-ghost btn-sm btn-icon" id="live-speak-question"
                  aria-label="Read question aloud" onClick={speakQuestion}>
                  <Volume2 size={15} />
                </button>
                {/* Code Sandbox Toggle */}
                <button
                  type="button"
                  id="toggle-code-sandbox-btn"
                  className={`btn btn-sm ${showCodingSandbox || q?.questionType === 'coding' ? 'btn-secondary' : 'btn-ghost'}`}
                  onClick={() => setShowCodingSandbox((prev) => !prev)}
                  style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11 }}
                >
                  <Code2 size={13} /> {showCodingSandbox ? 'Hide Code Sandbox' : 'Open Code Sandbox'}
                </button>
                {/* Current question state badge */}
                <span className={`badge ${
                  currentQState?.state === 'ANSWERED' ? 'badge-success' :
                  currentQState?.state === 'ANSWERING' ? 'badge-purple' :
                  currentQState?.state === 'SKIPPED' ? 'badge-navy' : 'badge-navy'
                }`} style={{ fontSize: 10, opacity: 0.8 }}>
                  {currentQState?.state?.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="live-interview__question-text">{q?.questionText}</p>
            </div>
          </div>

          {/* Speech error */}
          {permError && (
            <div className="live-interview__error-banner" role="alert">
              <AlertCircle size={15} /> {permError}
            </div>
          )}
          {!speechSupported && (
            <div className="live-interview__error-banner live-interview__error-banner--warn" role="note">
              <AlertCircle size={15} /> Speech recognition not supported. Type your answer below.
            </div>
          )}

          {/* Transcript */}
          <div className="live-interview__transcript card">
            <div className="card-header">
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--navy-700)' }}>
                Your Response
              </span>
              <span style={{
                fontSize: 'var(--text-xs)', color: currentQState?.wordCount >= 80 ? 'var(--success-500)' :
                currentQState?.wordCount >= 30 ? 'var(--warning-500)' : 'var(--navy-400)',
                fontWeight: 600,
              }}>
                {currentQState?.wordCount ?? 0} words
                {(currentQState?.wordCount ?? 0) >= 80 ? ' ✓' : ` / aim for 80+`}
              </span>
              {listening && (
                <div className="live-interview__waveform" aria-label="Recording">
                  {[...Array(8)].map((_, i) => (
                    <span key={i} className="live-interview__wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              )}
            </div>
            <div className="card-body">
              {!speechSupported ? (
                <textarea id="live-transcript-input" className="live-interview__transcript-textarea"
                  placeholder="Type your answer here…" value={transcript} rows={5}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTranscript(val);
                    const words = val.trim().split(/\s+/).filter(Boolean).length;
                    setQuestionStates((prev) => {
                      const next = [...prev];
                      if (!next[currentQ]) return next;
                      next[currentQ] = {
                        ...next[currentQ],
                        transcriptText: val,
                        wordCount:      words,
                        state:          words >= 3 ? 'ANSWERING' : next[currentQ].state,
                      };
                      return next;
                    });
                  }}
                  aria-label="Type your answer" />
              ) : (
                <p className="live-interview__transcript-text">
                  {transcript || interimText ? (
                    <>{transcript}{interimText && <span className="live-interview__interim">{interimText}</span>}</>
                  ) : (
                    <span style={{ color: 'var(--navy-300)' }}>
                      {listening ? 'Listening… speak now' : 'Tap the microphone to start speaking…'}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Interactive Coding Sandbox (Live Coding Rounds) */}
          {(showCodingSandbox || q?.questionType === 'coding' || q?.questionText?.includes('Live Coding Challenge')) && (
            <CodingSandbox
              questionText={q?.questionText || ''}
              initialCode={codeDataRef.current[currentQ]?.code}
              onCodeChange={(data) => {
                codeDataRef.current[currentQ] = data;
              }}
            />
          )}

          {/* AI Follow-Up Probe Card (Recovery Opportunity) */}
          {activeFollowUp && (
            <div className="card live-interview__followup-card" style={{
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05), rgba(59, 130, 246, 0.05))',
              border: '2px solid var(--purple-500)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.15)',
              padding: 'var(--space-5)',
              marginBottom: 'var(--space-4)',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 'var(--text-xs)',
                    fontWeight: 800,
                    background: 'var(--purple-600)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    <Zap size={13} fill="#fff" /> AI Interrogator Probe
                  </span>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: 'var(--success-700)',
                    background: 'rgba(16, 185, 129, 0.12)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                  }}>
                    Recovery Opportunity: Up to +20 Pts
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => {
                    if (!window.speechSynthesis) return;
                    window.speechSynthesis.cancel();
                    const utter = new SpeechSynthesisUtterance(activeFollowUp.question);
                    utter.lang = 'en-US';
                    window.speechSynthesis.speak(utter);
                  }}
                  title="Listen to follow-up question"
                >
                  <Volume2 size={16} />
                </button>
              </div>

              {/* Follow-up Question Prompt */}
              <div style={{
                fontSize: 'var(--text-base)',
                fontWeight: 700,
                color: 'var(--navy-900)',
                lineHeight: 1.45,
                marginBottom: 'var(--space-4)',
                background: 'rgba(255, 255, 255, 0.85)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '4px solid var(--purple-600)',
              }}>
                {activeFollowUp.question}
              </div>

              {/* Follow-up Bonus Award Banner if already evaluated */}
              {activeFollowUp.bonusPoints != null && (
                <div style={{
                  padding: 'var(--space-3) var(--space-4)',
                  background: activeFollowUp.bonusPoints > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${activeFollowUp.bonusPoints > 0 ? 'var(--success-500)' : 'var(--error-400)'}`,
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: activeFollowUp.bonusPoints > 0 ? 'var(--success-700)' : 'var(--error-700)',
                  fontWeight: 700,
                  fontSize: 'var(--text-sm)',
                }}>
                  <Award size={18} />
                  {activeFollowUp.bonusPoints > 0
                    ? `+${activeFollowUp.bonusPoints} Recovery Bonus Points Awarded! ${activeFollowUp.feedback || ''}`
                    : `No recovery bonus awarded: ${activeFollowUp.feedback || 'Follow-up did not address the missing concepts.'}`}
                </div>
              )}

              {/* Follow-up Response Input */}
              {activeFollowUp.bonusPoints == null && (
                <>
                  <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
                    <textarea
                      id="followup-answer-input"
                      rows={3}
                      placeholder="Speak or type your follow-up explanation here to recover marks..."
                      value={activeFollowUp.answer}
                      onChange={(e) => {
                        const val = e.target.value;
                        setActiveFollowUp((prev) => prev ? ({ ...prev, answer: val }) : null);
                      }}
                      style={{
                        width: '100%',
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--navy-900)',
                        background: '#fff',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      {speechSupported && (
                        <button
                          type="button"
                          className={`btn btn-sm ${listening ? 'btn-danger' : 'btn-secondary'}`}
                          onClick={toggleMic}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          {listening ? <MicOff size={14} /> : <Mic size={14} />}
                          {listening ? 'Stop Speaking' : 'Speak Answer'}
                        </button>
                      )}
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-500)' }}>
                        {activeFollowUp.answer.trim().split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleSkipFollowUp}
                        disabled={activeFollowUp.evaluating}
                      >
                        Skip Follow-Up
                      </button>
                      <button
                        id="submit-followup-btn"
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleSubmitFollowUp}
                        disabled={activeFollowUp.evaluating || !activeFollowUp.answer.trim()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        {activeFollowUp.evaluating ? (
                          <>
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Evaluating...
                          </>
                        ) : (
                          <>
                            <Send size={14} /> Submit Follow-Up (+Bonus)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="live-interview__controls">
            {speechSupported && !activeFollowUp && (
              <>
                <button id="live-mic-btn"
                  className={`live-interview__mic-btn ${listening ? 'live-interview__mic-btn--active' : ''}`}
                  onClick={toggleMic} aria-label={listening ? 'Stop recording' : 'Start recording'}>
                  {listening ? <MicOff size={28} /> : <Mic size={28} />}
                </button>
                <p className="live-interview__mic-hint">{listening ? 'Listening… tap to stop' : 'Tap to speak'}</p>
              </>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
              {!activeFollowUp && (
                <>
                  {currentQ < TOTAL_QUESTIONS - 1 ? (
                    <button
                      id="live-next-question"
                      className="btn btn-primary"
                      onClick={handleNextQuestion}
                      disabled={isSubmittingPrimary}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {isSubmittingPrimary ? (
                        <>
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Submitting & Probing...
                        </>
                      ) : (
                        'Submit & Next Question'
                      )}
                    </button>
                  ) : (
                    <button
                      id="live-submit-final"
                      className="btn btn-primary"
                      onClick={handleNextQuestion}
                      disabled={isSubmittingPrimary || currentQState?.submittedToApi}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {isSubmittingPrimary ? (
                        <>
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Submitting & Probing...
                        </>
                      ) : currentQState?.submittedToApi ? (
                        'Final Answer Submitted'
                      ) : (
                        'Submit Final Answer'
                      )}
                    </button>
                  )}
                  <button
                    id="live-skip-question"
                    className="btn btn-ghost btn-sm"
                    onClick={handleSkipQuestion}
                    title="Skip this question (marks it as skipped in your report)"
                  >
                    <SkipForward size={13} /> Skip
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right column — Camera panel */}
        <div className="live-interview__right">
          <div className="card live-interview__camera-card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Camera size={16} style={{ color: 'var(--purple-500)' }} />
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--navy-700)' }}>
                  Behaviour Analysis
                </span>
              </div>
              {cameraState === 'active' && (
                <span className="live-interview__cam-badge">● LIVE</span>
              )}
            </div>

            <div className="card-body">
              {!cameraOpen && cameraState === 'idle' && (
                <div className="live-interview__cam-consent">
                  <Camera size={40} style={{ color: 'var(--navy-300)', marginBottom: 'var(--space-3)' }} />
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--navy-500)', textAlign: 'center', marginBottom: 'var(--space-3)', lineHeight: 'var(--leading-relaxed)' }}>
                    Camera is used to analyse head orientation, posture, and hand gestures locally.
                    <strong> No video is stored or transmitted.</strong>
                  </p>
                  <button id="live-start-camera" className="btn btn-secondary" onClick={handleStartCamera}>
                    <Camera size={15} /> Enable Camera
                  </button>
                </div>
              )}

              {cameraState === 'loading' && (
                <div className="live-interview__cam-loading">
                  <span className="auth-spinner" style={{ width: 24, height: 24, borderWidth: 3, borderColor: 'var(--purple-200)', borderTopColor: 'var(--purple-500)' }} />
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--navy-500)', marginTop: 'var(--space-3)' }}>
                    Loading analysis models…
                  </p>
                </div>
              )}

              {(cameraState === 'error' || cameraState === 'denied') && (
                <div className="live-interview__error-banner" role="alert" style={{ margin: 0 }}>
                  <AlertCircle size={15} /> {cameraError}
                </div>
              )}

              <video
                ref={videoRef}
                style={{
                  width: '100%', borderRadius: 'var(--radius-lg)',
                  display: cameraState === 'active' ? 'block' : 'none',
                  transform: 'scaleX(-1)',
                  maxHeight: 220, objectFit: 'cover',
                }}
                playsInline muted aria-label="Camera preview"
              />

              {cameraState === 'active' && (
                <button id="live-stop-camera" className="btn btn-ghost btn-sm"
                  style={{ marginTop: 'var(--space-3)', width: '100%' }}
                  onClick={handleStopCamera}>
                  <CameraOff size={14} /> Stop Camera
                </button>
              )}

              {cameraState === 'active' && (
                <div className="live-interview__cv-indicators">
                  <div className="cv-indicator">
                    <Eye size={14} />
                    <span className="cv-indicator__label">Gaze</span>
                    <span className="cv-indicator__value">{GAZE_LABELS[analysis.gaze] ?? analysis.gaze}</span>
                  </div>
                  <div className="cv-indicator">
                    <Activity size={14} />
                    <span className="cv-indicator__label">Posture</span>
                    <span className="cv-indicator__value">{POSTURE_LABELS[analysis.posture] ?? analysis.posture}</span>
                  </div>
                  <div className="cv-indicator">
                    <Hand size={14} />
                    <span className="cv-indicator__label">Gesture</span>
                    <span className="cv-indicator__value">{GESTURE_LABELS[analysis.gesture] ?? analysis.gesture}</span>
                  </div>
                  {!analysis.faceDetected && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-300)', marginTop: 'var(--space-2)' }}>
                      No face detected — ensure you are visible in the camera.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Fallback questions when backend generation fails.
 * These are generic questions that don't rely on the static mockData array.
 */
function getFallbackQuestions(role, difficulty) {
  return [
    { questionId: 'fallback-1', questionText: 'Tell me about yourself and your professional background.', questionType: 'behavioral', questionDifficulty: difficulty ?? 'Medium' },
    { questionId: 'fallback-2', questionText: 'What is your greatest technical strength and how have you applied it?', questionType: 'technical', questionDifficulty: difficulty ?? 'Medium' },
    { questionId: 'fallback-3', questionText: 'Describe a challenging project you worked on and how you overcame obstacles.', questionType: 'behavioral', questionDifficulty: difficulty ?? 'Medium' },
    { questionId: 'fallback-4', questionText: 'How do you approach debugging a complex problem you have not seen before?', questionType: 'scenario', questionDifficulty: difficulty ?? 'Medium' },
  ];
}
