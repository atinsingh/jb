'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/context/AuthContext';
import { ErrorState } from '@/components/app/AppStates';
import { Screen, CellGrid, Cell, MonoButton, mono, HAIR } from '@/components/app/v3/kit';
import {
  getInterviewApplications,
  createInterviewSession,
  generateInterviewQuestion,
  submitInterviewAnswer,
  completeInterviewSession,
} from '@/services/interviewApi';

const QUESTION_CAP = 6;

const fmtTime = (elapsed) => {
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  return `${mm}:${ss < 10 ? '0' + ss : ss}`;
};

/*
 * v3's session screen carries a live waveform. This app records typed answers,
 * not audio, so there is no amplitude to draw — a fake waveform would be a
 * picture of data that does not exist. The bar field is driven by the answer
 * the candidate is actually typing: it fills as the draft grows, which is the
 * one real signal this screen has about progress through an answer.
 */
function DraftMeter({ text }) {
  const bars = 48;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  // ~120 words is a complete STAR answer; past that the meter simply caps.
  const filled = Math.min(bars, Math.round((words / 120) * bars));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 68, marginBottom: 40 }}>
      {Array.from({ length: bars }, (_, i) => {
        // A fixed, deterministic profile — no randomness, so it does not
        // shimmer on every keystroke.
        const h = 18 + ((i * 37) % 50);
        return (
          <span
            key={i}
            style={{
              flex: 1,
              display: 'block',
              height: `${h}%`,
              background: i < filled ? 'var(--jb-v3-accent)' : 'var(--jb-v3-tick-off)',
              opacity: i < filled ? 0.75 : 1,
              transition: 'background .3s ease',
            }}
          />
        );
      })}
    </div>
  );
}

export default function AppMockInterview() {
  const { user } = useAuth();

  const [role, setRole] = useState({ title: '', company: '', jobId: undefined, applicationId: undefined });
  const [phase, setPhase] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const [session, setSession] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [draft, setDraft] = useState('');
  const [lastFeedback, setLastFeedback] = useState(null);
  const [results, setResults] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const ivRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    ivRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(ivRef.current);
  }, []);

  useEffect(() => {
    if (phase === 'complete' || phase === 'error') clearInterval(ivRef.current);
  }, [phase]);

  const startSession = async (roleContext) => {
    setPhase('loading');
    setErrorMessage('');
    setSession(null);
    setResults(null);
    setLastFeedback(null);
    setDraft('');
    setQuestionNumber(0);

    const jobId = roleContext?.jobId;
    const applicationId = roleContext?.applicationId;
    const title = roleContext?.title ? `Mock Interview: ${roleContext.title}` : undefined;

    try {
      const newSession = await createInterviewSession({ jobId, applicationId, title });
      const { question: nextQ } = await generateInterviewQuestion(newSession._id);
      setSession(newSession);
      setCurrentQuestion(nextQ);
      setQuestionNumber(1);
      setPhase('answering');
    } catch (err) {
      setErrorMessage(err?.message || 'Could not start the practice session.');
      setPhase('error');
    }
  };

  useEffect(() => {
    if (!user || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      let detectedRole = role;
      try {
        const data = await getInterviewApplications();
        const apps = data?.applications || [];
        const first = apps[0];
        if (first) {
          detectedRole = {
            title: first.jobTitle || '',
            company: first.companyName || '',
            jobId: first.jobId,
            applicationId: first.id,
          };
          setRole(detectedRole);
        }
      } catch {
        /* no application context available — practice generically */
      }
      await startSession(detectedRole);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submitAnswer = async () => {
    if (!draft.trim() || !session) return;
    setPhase('submitting');
    setErrorMessage('');
    try {
      const feedback = await submitInterviewAnswer(session._id, {
        question: currentQuestion,
        answer: draft,
      });
      setLastFeedback(feedback);
      setPhase('feedback-ready');
    } catch (err) {
      setErrorMessage(err?.message || 'Could not score that answer.');
      setPhase('feedback-error');
    }
  };

  const finishSession = async () => {
    if (!session) return;
    setPhase('completing');
    setErrorMessage('');
    try {
      const completed = await completeInterviewSession(session._id);
      setResults(completed);
      setPhase('complete');
    } catch (err) {
      setErrorMessage(err?.message || 'Could not finish the session.');
      setPhase('complete-error');
    }
  };

  const nextQuestion = async () => {
    if (!session) return;
    if (questionNumber >= QUESTION_CAP) {
      await finishSession();
      return;
    }
    setDraft('');
    setLastFeedback(null);
    setPhase('loading-question');
    setErrorMessage('');
    try {
      const { question: q } = await generateInterviewQuestion(session._id);
      setCurrentQuestion(q);
      setQuestionNumber((n) => n + 1);
      setPhase('answering');
    } catch (err) {
      setErrorMessage(err?.message || 'Could not load the next question.');
      setPhase('question-error');
    }
  };

  const practiceAgain = () => {
    clearInterval(ivRef.current);
    setElapsed(0);
    ivRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    startSession(role);
  };

  const canSubmit = phase === 'answering' && draft.trim().length > 0;
  const busy = phase === 'submitting' || phase === 'loading-question' || phase === 'completing';

  const sessionStats = useMemo(() => {
    const score = lastFeedback?.score ?? lastFeedback?.overallScore;
    return [
      { k: 'Question', v: `${questionNumber} / ${QUESTION_CAP}` },
      { k: 'Elapsed', v: fmtTime(elapsed) },
      { k: 'Last score', v: score == null ? '—' : String(Math.round(score)) },
    ];
  }, [questionNumber, elapsed, lastFeedback]);

  return (
    <>
      <Head>
        <title>
          Mock interview{role.title ? ` · ${role.title}` : ''} — Jobocate
        </title>
      </Head>

      <Screen width={860} pad="56px 28px 80px">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: phase === 'complete' ? 'var(--jb-v3-ok)' : 'var(--jb-v3-accent)',
                display: 'block',
              }}
            />
            <span style={mono(10, '0.14em')}>
              {phase === 'complete'
                ? 'Session complete'
                : `In session · question ${questionNumber} of ${QUESTION_CAP}`}
            </span>
          </div>
          <span
            style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 15, color: 'var(--jb-v3-fg-2)' }}
          >
            {fmtTime(elapsed)}
          </span>
        </div>

        {(phase === 'error' || phase === 'question-error' || phase === 'complete-error') && (
          <ErrorState error={new Error(errorMessage)} onRetry={practiceAgain} />
        )}

        {phase === 'complete' && (
          <>
            <h2
              style={{
                margin: '0 0 44px',
                fontSize: 30,
                fontWeight: 600,
                letterSpacing: '-0.035em',
                lineHeight: 1.2,
              }}
            >
              {results?.overallScore != null
                ? `You scored ${Math.round(results.overallScore)}.`
                : 'Session finished.'}
            </h2>
            <MonoButton filled onClick={practiceAgain} style={{ padding: '10px 22px' }}>
              Practice again
            </MonoButton>
          </>
        )}

        {phase !== 'complete' && phase !== 'error' && (
          <>
            <h2
              style={{
                margin: '0 0 44px',
                fontSize: 30,
                fontWeight: 600,
                letterSpacing: '-0.035em',
                lineHeight: 1.2,
                textWrap: 'pretty',
              }}
            >
              {currentQuestion || 'Preparing your first question…'}
            </h2>

            <DraftMeter text={draft} />

            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Answer here. Situation, task, action, result."
              disabled={phase !== 'answering'}
              style={{
                width: '100%',
                minHeight: 160,
                resize: 'vertical',
                background: 'var(--jb-v3-panel)',
                border: '1px solid var(--jb-v3-line-2)',
                borderRadius: 2,
                padding: 16,
                fontFamily: 'inherit',
                fontSize: 14,
                lineHeight: 1.6,
                color: 'var(--jb-v3-fg)',
                marginBottom: 20,
              }}
            />

            {lastFeedback && (
              <div style={{ borderTop: HAIR, padding: '16px 0', marginBottom: 20 }}>
                <div style={{ ...mono(), marginBottom: 8 }}>Feedback</div>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--jb-v3-fg-2)' }}>
                  {lastFeedback.feedback || lastFeedback.summary || 'Scored.'}
                </p>
              </div>
            )}

            {errorMessage && phase === 'feedback-error' && (
              <div style={{ ...mono(10, '0.1em', 'var(--jb-v3-danger)'), marginBottom: 20 }}>
                {errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
              {phase === 'feedback-ready' || phase === 'feedback-error' ? (
                <MonoButton filled onClick={nextQuestion} style={{ padding: '10px 22px' }}>
                  {questionNumber >= QUESTION_CAP ? 'Finish' : 'Next'}
                </MonoButton>
              ) : (
                <MonoButton
                  filled
                  onClick={submitAnswer}
                  disabled={!canSubmit}
                  style={{ padding: '10px 22px', opacity: canSubmit ? 1 : 0.5 }}
                >
                  {busy ? '…' : 'Submit'}
                </MonoButton>
              )}
              <MonoButton onClick={() => setDraft('')} style={{ padding: '10px 18px' }}>
                Clear
              </MonoButton>
              <MonoButton
                onClick={finishSession}
                style={{ padding: '10px 12px', border: 0, color: 'var(--jb-v3-fg-3)' }}
              >
                End
              </MonoButton>
            </div>

            <CellGrid cols={3}>
              {sessionStats.map((s) => (
                <Cell key={s.k} label={s.k} value={s.v} valueSize={22} />
              ))}
            </CellGrid>
          </>
        )}
      </Screen>
    </>
  );
}
