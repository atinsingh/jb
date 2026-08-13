'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { useAuth } from '@/context/AuthContext';
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

const scoreColor = (score) => {
  if (score >= 75) return '#4EE6A8';
  if (score >= 50) return '#E6C94E';
  return '#E08A4E';
};

function ScoreMeter({ label, score }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'var(--jb-font-mono)',
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#4F6B62',
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span>{score}</span>
      </div>
      <div style={{ height: 5, background: '#1C2B26', borderRadius: 3 }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, score))}%`,
            height: '100%',
            background: scoreColor(score),
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

function LoadingPanel({ label }) {
  return (
    <div
      style={{
        background: '#0F1614',
        border: '1px solid #1C2B26',
        borderRadius: 10,
        padding: 40,
        textAlign: 'center',
        color: '#7A978C',
        fontSize: 13.5,
      }}
    >
      {label}
    </div>
  );
}

function ErrorPanel({ message, onRetry, retryLabel }) {
  return (
    <div
      style={{
        background: '#1A0F0F',
        border: '1px solid #3D2020',
        borderRadius: 10,
        padding: 24,
      }}
    >
      <div style={{ fontSize: 13.5, color: '#E0A89E', marginBottom: 14 }}>{message}</div>
      <button
        onClick={onRetry}
        style={{
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 700,
          color: '#0A0E0D',
          background: '#4EE6A8',
          border: 'none',
          borderRadius: 5,
          padding: '9px 16px',
          cursor: 'pointer',
        }}
      >
        {retryLabel}
      </button>
    </div>
  );
}

export default function AppMockInterview() {
  const { user } = useAuth();

  const [role, setRole] = useState({ title: '', company: '', jobId: undefined, applicationId: undefined });
  const [phase, setPhase] = useState('loading'); // loading | answering | submitting | feedback-ready | loading-question | completing | complete | error | question-error | complete-error
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
      const nextQuestion = await generateInterviewQuestion(newSession._id);
      setSession(newSession);
      setCurrentQuestion(nextQuestion);
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
          detectedRole = { title: first.jobTitle || '', company: first.companyName || '', jobId: first.jobId, applicationId: first.id };
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
      const q = await generateInterviewQuestion(session._id);
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

  const timer = fmtTime(elapsed);
  const progress = `${(questionNumber / QUESTION_CAP) * 100}%`;
  const answering = phase === 'answering' || phase === 'submitting' || phase === 'feedback-ready' || phase === 'feedback-error';
  const canSubmit = phase === 'answering' && draft.trim().length > 0;

  return (
    <>
      <Head>
        <title>
          Mock interview{role.title ? ` · ${role.title}` : ''}
          {role.company ? ` at ${role.company}` : ''} — Jobocate
        </title>
      </Head>

      <style jsx global>{`
        #jbapp-mock ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp-mock ::-webkit-scrollbar-thumb {
          background: #1c2b26;
          border-radius: 8px;
        }
        #jbapp-mock textarea:focus {
          outline: none;
          border-color: #4ee6a8;
          box-shadow: 0 0 0 3px rgba(78, 230, 168, 0.15);
        }
      `}</style>

      <div id="jbapp-mock" style={{ display: 'flex', minHeight: '100vh', background: '#0A0E0D', fontFamily: 'var(--jb-font-sans)', color: '#D8F5E8' }}>
        <AppSidebar active="interview" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 24px',
              background: 'rgba(10,14,13,0.92)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #16201C',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 12,
                color: '#4F6B62',
              }}
            >
              MOCK_INTERVIEW
              {role.title ? ` · ${role.title}` : ''}
              {role.company ? ` @ ${role.company}` : ''}
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, color: '#4EE6A8' }}>{timer}</span>
            <button
              onClick={finishSession}
              disabled={!session || phase === 'completing' || phase === 'submitting'}
              style={{
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 11,
                background: 'transparent',
                border: '1px solid #2A3D36',
                color: '#9ECBB9',
                padding: '6px 12px',
                borderRadius: 4,
                cursor: session && phase !== 'submitting' ? 'pointer' : 'default',
                opacity: session && phase !== 'submitting' ? 1 : 0.5,
              }}
            >
              END SESSION
            </button>
          </header>

          {(phase === 'loading' || answering || phase === 'loading-question' || phase === 'completing') && (
            <div style={{ padding: '24px 24px 56px', maxWidth: 720, width: '100%', margin: '0 auto' }}>
              {phase === 'loading' && <LoadingPanel label="Starting your practice session…" />}

              {(answering || phase === 'loading-question' || phase === 'completing') && session && (
                <>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                    {Array.from({ length: QUESTION_CAP }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2,
                          background: i < questionNumber ? '#4EE6A8' : '#1C2B26',
                        }}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 11,
                      color: '#4F6B62',
                      marginBottom: 14,
                    }}
                  >
                    <span>
                      Q{String(questionNumber).padStart(2, '0')} / {String(QUESTION_CAP).padStart(2, '0')}
                    </span>
                  </div>

                  {phase === 'loading-question' ? (
                    <LoadingPanel label="Generating your next question…" />
                  ) : (
                    <div style={{ fontSize: 19, lineHeight: 1.5, fontWeight: 600, marginBottom: 18 }}>{currentQuestion}</div>
                  )}

                  {phase !== 'loading-question' && (
                    <>
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        disabled={phase === 'submitting' || phase === 'feedback-ready'}
                        placeholder="Type your answer — aim for Situation → Task → Action → Result…"
                        style={{
                          width: '100%',
                          minHeight: 110,
                          fontFamily: 'inherit',
                          fontSize: 13.5,
                          lineHeight: 1.6,
                          color: '#D8F5E8',
                          background: '#0F1614',
                          border: '1px solid #1C2B26',
                          borderRadius: 6,
                          padding: 16,
                          resize: 'vertical',
                          marginBottom: 16,
                        }}
                      />

                      {phase !== 'feedback-ready' && phase !== 'feedback-error' && (
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                          <button
                            onClick={submitAnswer}
                            disabled={!canSubmit}
                            style={{
                              flex: 1,
                              background: canSubmit ? '#4EE6A8' : '#1C2B26',
                              color: canSubmit ? '#0A0E0D' : '#4F6B62',
                              border: 'none',
                              fontWeight: 700,
                              padding: 10,
                              borderRadius: 5,
                              fontSize: 13,
                              cursor: canSubmit ? 'pointer' : 'default',
                            }}
                          >
                            {phase === 'submitting' ? 'SCORING…' : 'SUBMIT ANSWER'}
                          </button>
                          <button
                            onClick={nextQuestion}
                            disabled={phase === 'submitting'}
                            style={{
                              background: 'transparent',
                              border: '1px solid #2A3D36',
                              color: phase === 'submitting' ? '#4F6B62' : '#7A978C',
                              padding: '10px 16px',
                              borderRadius: 5,
                              fontSize: 13,
                              cursor: phase === 'submitting' ? 'default' : 'pointer',
                            }}
                          >
                            SKIP
                          </button>
                        </div>
                      )}

                      {phase === 'feedback-error' && (
                        <ErrorPanel message={errorMessage} onRetry={submitAnswer} retryLabel="Retry scoring" />
                      )}

                      {phase === 'feedback-ready' && lastFeedback && (
                        <div style={{ background: '#0F1614', border: '1px solid #1C2B26', borderRadius: 6, padding: 16, marginBottom: 16 }}>
                          <div style={{ marginBottom: 10 }}>
                            <ScoreMeter label="Score" score={lastFeedback.score} />
                          </div>
                          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, color: '#9ECBB9', marginBottom: 4 }}>
                            Score: {lastFeedback.score}/100
                          </div>
                          <div style={{ fontSize: 12.5, color: '#C3D9CF', lineHeight: 1.5 }}>{lastFeedback.feedback}</div>
                          <button
                            onClick={nextQuestion}
                            style={{
                              marginTop: 14,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              fontFamily: 'inherit',
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#0A0E0D',
                              background: '#4EE6A8',
                              border: 'none',
                              borderRadius: 999,
                              padding: '10px 20px',
                              cursor: 'pointer',
                            }}
                          >
                            {questionNumber >= QUESTION_CAP ? 'Finish session →' : 'Next question →'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {phase === 'completing' && <LoadingPanel label="Scoring your session…" />}
            </div>
          )}

          {phase === 'error' && (
            <div style={{ padding: '24px 24px 56px', maxWidth: 720, width: '100%', margin: '0 auto' }}>
              <ErrorPanel message={errorMessage} onRetry={() => startSession(role)} retryLabel="Try again" />
            </div>
          )}

          {phase === 'question-error' && (
            <div style={{ padding: '24px 24px 56px', maxWidth: 720, width: '100%', margin: '0 auto' }}>
              <ErrorPanel message={errorMessage} onRetry={nextQuestion} retryLabel="Retry question" />
            </div>
          )}

          {(phase === 'complete' || phase === 'complete-error') && (
            <div style={{ padding: '36px 24px 64px', maxWidth: 680, width: '100%', margin: '0 auto' }}>
              {phase === 'complete-error' && <ErrorPanel message={errorMessage} onRetry={finishSession} retryLabel="Retry" />}

              {phase === 'complete' && results && (
                <div style={{ background: '#0F1614', border: '1px solid #1C2B26', borderRadius: 10, padding: 24 }}>
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#4F6B62', marginBottom: 6 }}>
                    SESSION COMPLETE · {results.questions?.length ?? 0} QUESTIONS
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 20 }}>
                    <div style={{ fontSize: 40, fontWeight: 800, color: scoreColor(results.overallScore || 0), fontFamily: 'var(--jb-font-mono)' }}>
                      {Math.round(results.overallScore || 0)}
                    </div>
                    <div style={{ fontSize: 13, color: '#7A978C' }}>overall score</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                    {(results.rubricScores || []).map((r) => (
                      <ScoreMeter key={r.category} label={r.category} score={r.score} />
                    ))}
                  </div>

                  <div style={{ background: '#0A0E0D', border: '1px solid #1C2B26', borderRadius: 6, padding: 14, marginBottom: 16 }}>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 10, color: '#4F6B62', marginBottom: 6 }}>SUMMARY</div>
                    <div style={{ fontSize: 12.5, color: '#C3D9CF', lineHeight: 1.6 }}>{results.feedbackSummary}</div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={practiceAgain}
                      style={{
                        flex: 1,
                        background: '#4EE6A8',
                        color: '#0A0E0D',
                        border: 'none',
                        fontWeight: 700,
                        padding: 10,
                        borderRadius: 5,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      PRACTICE AGAIN
                    </button>
                    <Link
                      href={appRoute('App Interview.dc.html')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        border: '1px solid #2A3D36',
                        color: '#9ECBB9',
                        padding: '10px 16px',
                        borderRadius: 5,
                        fontSize: 13,
                        textDecoration: 'none',
                      }}
                    >
                      BACK TO HUB
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
