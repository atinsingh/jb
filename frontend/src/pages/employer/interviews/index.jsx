'use client';

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, EmptyState, InlineError } from '@/components/employer/EmployerStates';
import { employerInterviewsApi } from '@/services/employerApi';

const TYPE_LABELS = { video: 'Video Call', phone: 'Phone Call', onsite: 'On-site' };
const TYPE_GLYPH = { video: '▷', phone: '☎', onsite: '⌂' };

const EMPTY_SCHEDULE = {
  candidateName: '',
  type: 'video',
  scheduledAt: '', // datetime-local value
  durationMins: 45,
};

// Convert an ISO string into the value a datetime-local input expects.
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const initialsOf = (name) =>
  (name || 'C')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'C';

/* ------------------------------------------------------------- ui atoms --- */
const monoLabel = { fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286' };
const blueBtn = { display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '9px 16px', cursor: 'pointer' };
const ghostBtn = { fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 15px', cursor: 'pointer' };
const fieldInput = { width: '100%', fontFamily: 'inherit', fontSize: 13.5, color: '#1B1A16', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 10, padding: '10px 12px' };

const STATUS_STYLE = {
  scheduled: { bg: '#EDF0FE', border: '#C7D2FB', color: '#1F2D6B' },
  completed: { bg: '#EAF6EE', border: '#CDE9D6', color: '#157A49' },
  cancelled: { bg: '#F2ECE0', border: '#E6DECF', color: '#8A8378' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.cancelled;
  return (
    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: s.color, background: s.bg, border: `1px solid ${s.border}`, padding: '3px 9px', borderRadius: 999 }}>{status}</span>
  );
}

export default function EmployerInterviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('upcoming');

  // Schedule / reschedule modal
  const [modal, setModal] = useState(null); // { mode: 'create' | 'reschedule', id? }
  const [form, setForm] = useState(EMPTY_SCHEDULE);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Feedback (scorecard) modal
  const [feedback, setFeedback] = useState(null); // interview object
  const [scoreForm, setScoreForm] = useState({ recommendation: 'yes', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employerInterviewsApi.list();
      setInterviews(Array.isArray(res?.interviews) ? res.interviews : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredInterviews = interviews.filter((iv) =>
    selectedTab === 'upcoming'
      ? iv.status === 'scheduled'
      : iv.status === 'completed' || iv.status === 'cancelled',
  );

  const upcomingCount = interviews.filter((iv) => iv.status === 'scheduled').length;
  const pastCount = interviews.filter((iv) => iv.status === 'completed' || iv.status === 'cancelled').length;

  const openCreate = () => {
    setForm(EMPTY_SCHEDULE);
    setSaveError(null);
    setModal({ mode: 'create' });
  };

  const openReschedule = (iv) => {
    setForm({
      candidateName: iv.candidateName || '',
      type: iv.type || 'video',
      scheduledAt: toLocalInput(iv.scheduledAt),
      durationMins: iv.durationMins || 45,
    });
    setSaveError(null);
    setModal({ mode: 'reschedule', id: iv._id });
  };

  const closeModal = () => {
    setModal(null);
    setSaveError(null);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const scheduledAt = form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined;
      const durationMins = Number(form.durationMins) || undefined;
      if (modal.mode === 'create') {
        await employerInterviewsApi.create({
          candidateName: form.candidateName,
          type: form.type,
          scheduledAt,
          durationMins,
        });
      } else {
        await employerInterviewsApi.update(modal.id, { scheduledAt, durationMins });
      }
      closeModal();
      await load();
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  };

  const openFeedback = (iv) => {
    setFeedback(iv);
    setScoreForm({ recommendation: 'yes', notes: '' });
    setSubmitError(null);
  };

  const closeFeedback = () => {
    setFeedback(null);
    setSubmitError(null);
  };

  const handleSubmitScorecard = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await employerInterviewsApi.submitScorecard(feedback._id, {
        recommendation: scoreForm.recommendation,
        notes: scoreForm.notes,
      });
      closeFeedback();
      await load();
    } catch (err) {
      setSubmitError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const TAB_DEFS = [
    { key: 'upcoming', label: `Upcoming (${upcomingCount})` },
    { key: 'past', label: `Past (${pastCount})` },
  ];

  return (
    <>
      <Head>
        <title>Interviews · Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar { width: 8px; }
        #emapp ::-webkit-scrollbar-thumb { background: #e1d9c9; border-radius: 8px; }
        #emapp input:focus, #emapp select:focus, #emapp textarea:focus { outline: none; border-color: #4263eb; box-shadow: 0 0 0 3px rgba(66,99,235,0.14); }
        #emapp .em-blue-btn:hover { background: #364fc7 !important; }
        #emapp .em-ghost:hover { background: #f4efe4 !important; }
        #emapp .em-card:hover { border-color: #d9cfbb; }
        @keyframes emrise { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes empop { from { opacity: 0; transform: translateY(8px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="interviews" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <span style={{ ...monoLabel, fontSize: 11.5, letterSpacing: '0.1em' }}>Hiring · Interviews</span>
            <div style={{ flex: 1 }} />
            {!loading && !error && (
              <button onClick={openCreate} className="em-blue-btn" style={blueBtn}>＋ Schedule interview</button>
            )}
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 1080, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Interviews</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>Schedule and manage candidate interviews.</p>
            </div>

            {/* TABS */}
            <div style={{ display: 'inline-flex', padding: 3, background: '#F2ECE0', border: '1px solid #E6DECF', borderRadius: 999, gap: 3, marginBottom: 20 }}>
              {TAB_DEFS.map((t) => {
                const on = selectedTab === t.key;
                return (
                  <button key={t.key} onClick={() => setSelectedTab(t.key)} style={{ fontSize: 12.5, fontWeight: 600, color: on ? '#1B1A16' : '#8A8378', background: on ? '#FFFEFB' : 'transparent', border: 'none', borderRadius: 999, padding: '7px 15px', cursor: 'pointer', boxShadow: on ? '0 1px 3px rgba(27,26,22,0.12)' : 'none', fontFamily: 'inherit' }}>
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* LIST */}
            {loading ? (
              <LoadingState label="Loading interviews…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : filteredInterviews.length === 0 ? (
              <EmptyState
                icon="○"
                title={`No ${selectedTab} interviews`}
                hint={selectedTab === 'upcoming' ? 'Get started by scheduling a new interview.' : 'No past interviews to display.'}
                action={selectedTab === 'upcoming' ? <button onClick={openCreate} className="em-blue-btn" style={{ ...blueBtn, marginTop: 10 }}>＋ Schedule interview</button> : null}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredInterviews.map((interview) => {
                  const hasFeedback = (interview.scorecards || []).length > 0;
                  const dateStr = interview.scheduledAt
                    ? new Date(interview.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    : null;
                  const timeStr = interview.scheduledAt
                    ? new Date(interview.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                    : null;
                  const typeKey = interview.type || 'video';
                  return (
                    <div key={interview._id} className="em-card" style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 18, transition: 'border-color 0.15s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: '50%', background: '#EDE7DA', color: '#5A544A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>{initialsOf(interview.candidateName)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 15.5, fontWeight: 700, color: '#1B1A16' }}>{interview.candidateName || 'Candidate'}</span>
                            <StatusBadge status={interview.status} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#8A8378' }}>
                            {dateStr && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <span aria-hidden style={{ color: '#A79E8F' }}>◷</span>{dateStr} · {timeStr} ({interview.durationMins || 45} min)
                              </span>
                            )}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span aria-hidden style={{ color: '#A79E8F' }}>{TYPE_GLYPH[typeKey] || TYPE_GLYPH.video}</span>{TYPE_LABELS[typeKey] || TYPE_LABELS.video}
                            </span>
                            {hasFeedback && (
                              <span style={{ color: '#157A49' }}>✓ {interview.scorecards.length} scorecard{interview.scorecards.length === 1 ? '' : 's'}</span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {interview.status === 'scheduled' && (
                            <button onClick={() => openReschedule(interview)} className="em-ghost" style={ghostBtn}>Reschedule</button>
                          )}
                          <button onClick={() => openFeedback(interview)} className="em-blue-btn" style={blueBtn}>{hasFeedback ? 'View feedback' : 'Add feedback'}</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Schedule / Reschedule Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={closeModal} style={{ position: 'absolute', inset: 0, background: 'rgba(27,26,22,0.42)', backdropFilter: 'blur(2px)' }} />
          <form onSubmit={handleSaveSchedule} style={{ position: 'relative', width: '100%', maxWidth: 460, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 24, boxShadow: '0 24px 60px rgba(27,26,22,0.22)', animation: 'empop 0.2s ease' }}>
            <h3 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 26, lineHeight: 1.1, margin: '0 0 4px' }}>
              {modal.mode === 'create' ? 'Schedule interview' : 'Reschedule interview'}
            </h3>
            <p style={{ fontSize: 13, color: '#8A8378', margin: '0 0 18px' }}>
              {modal.mode === 'create' ? 'Set up a new candidate interview.' : 'Update the time or duration for this interview.'}
            </p>
            {saveError && <InlineError error={saveError} />}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {modal.mode === 'create' && (
                <div>
                  <label style={{ ...monoLabel, display: 'block', marginBottom: 6 }}>Candidate name</label>
                  <input type="text" required value={form.candidateName} onChange={(e) => setForm((f) => ({ ...f, candidateName: e.target.value }))} style={fieldInput} />
                </div>
              )}
              {modal.mode === 'create' && (
                <div>
                  <label style={{ ...monoLabel, display: 'block', marginBottom: 6 }}>Type</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} style={{ ...fieldInput, cursor: 'pointer' }}>
                    <option value="video">Video Call</option>
                    <option value="phone">Phone Call</option>
                    <option value="onsite">On-site</option>
                  </select>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ ...monoLabel, display: 'block', marginBottom: 6 }}>Date &amp; time</label>
                  <input type="datetime-local" required value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} style={fieldInput} />
                </div>
                <div>
                  <label style={{ ...monoLabel, display: 'block', marginBottom: 6 }}>Duration (min)</label>
                  <input type="number" min={5} value={form.durationMins} onChange={(e) => setForm((f) => ({ ...f, durationMins: e.target.value }))} style={fieldInput} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 22 }}>
              <button type="button" onClick={closeModal} disabled={saving} className="em-ghost" style={ghostBtn}>Cancel</button>
              <button type="submit" disabled={saving} className="em-blue-btn" style={{ ...blueBtn, opacity: saving ? 0.6 : 1, cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'Saving…' : modal.mode === 'create' ? 'Schedule' : 'Save changes'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Feedback / Scorecard Modal */}
      {feedback && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={closeFeedback} style={{ position: 'absolute', inset: 0, background: 'rgba(27,26,22,0.42)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 480, maxHeight: '86vh', overflowY: 'auto', background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 24, boxShadow: '0 24px 60px rgba(27,26,22,0.22)', animation: 'empop 0.2s ease' }}>
            <h3 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 26, lineHeight: 1.1, margin: '0 0 4px' }}>Feedback</h3>
            <p style={{ fontSize: 13, color: '#8A8378', margin: '0 0 18px' }}>{feedback.candidateName || 'Candidate'}</p>

            {(feedback.scorecards || []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
                {feedback.scorecards.map((sc, i) => (
                  <div key={i} style={{ background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 12, padding: '11px 13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1B1A16' }}>{sc.interviewerName || 'Interviewer'}</span>
                      {sc.recommendation && (
                        <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#1F2D6B', background: '#EDF0FE', border: '1px solid #C7D2FB', padding: '3px 8px', borderRadius: 999 }}>{String(sc.recommendation).replace('_', ' ')}</span>
                      )}
                    </div>
                    {sc.notes && <p style={{ fontSize: 13, color: '#5A544A', margin: '6px 0 0', lineHeight: 1.5 }}>{sc.notes}</p>}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmitScorecard} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {submitError && <InlineError error={submitError} />}
              <div>
                <label style={{ ...monoLabel, display: 'block', marginBottom: 6 }}>Recommendation</label>
                <select value={scoreForm.recommendation} onChange={(e) => setScoreForm((f) => ({ ...f, recommendation: e.target.value }))} style={{ ...fieldInput, cursor: 'pointer' }}>
                  <option value="strong_yes">Strong yes</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="strong_no">Strong no</option>
                </select>
              </div>
              <div>
                <label style={{ ...monoLabel, display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea rows={3} value={scoreForm.notes} onChange={(e) => setScoreForm((f) => ({ ...f, notes: e.target.value }))} style={{ ...fieldInput, resize: 'vertical', minHeight: 84 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 4 }}>
                <button type="button" onClick={closeFeedback} disabled={submitting} className="em-ghost" style={ghostBtn}>Close</button>
                <button type="submit" disabled={submitting} className="em-blue-btn" style={{ ...blueBtn, opacity: submitting ? 0.6 : 1, cursor: submitting ? 'wait' : 'pointer' }}>{submitting ? 'Saving…' : 'Submit feedback'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
