'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import AppTopNav, { AppShell } from '@/components/app/AppTopNav';
import { listResumes, getLoginHistory } from '@/services/resumeApi';
import { listHarnessSessions } from '@/services/resumeHarnessApi';

const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const displayDate = date => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const displayTime = date => new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function AppDashboard() {
  const [data, setData] = useState(null);
  const [errors, setErrors] = useState({});
  const [retry, setRetry] = useState(0);
  const [period, setPeriod] = useState('Month');
  const [date, setDate] = useState('');

  useEffect(() => { setDate(dateKey(new Date())); }, []);
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([listResumes(), listHarnessSessions(), getLoginHistory()]).then(([saved, sessions, logins]) => {
      if (cancelled) return;
      setData({
        resumes: saved.status === 'fulfilled' ? (Array.isArray(saved.value) ? saved.value : saved.value?.resumes || []) : [],
        sessions: sessions.status === 'fulfilled' && Array.isArray(sessions.value) ? sessions.value : [],
        logins: logins.status === 'fulfilled' && Array.isArray(logins.value) ? logins.value : [],
      });
      setErrors({ comparison: saved.status === 'rejected', generation: sessions.status === 'rejected', login: logins.status === 'rejected' });
    });
    return () => { cancelled = true; };
  }, [retry]);

  const start = new Date(`${date || '2000-01-01'}T00:00:00`);
  if (period === 'Week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  if (period === 'Month') start.setDate(1);
  const end = new Date(start);
  if (period === 'Month') end.setMonth(end.getMonth() + 1);
  else end.setDate(end.getDate() + (period === 'Week' ? 7 : 1));
  const withinPeriod = at => new Date(at) >= start && new Date(at) < end;
  const comparisons = (data?.resumes || []).flatMap(resume => resume.comparisonHistory || []).filter(event => withinPeriod(event.at));
  const turns = (data?.sessions || []).flatMap(session => session.turns || []).filter(turn => withinPeriod(turn.createdAt));
  const generations = turns.filter(turn => turn.kind === 'instruction' && turn.revision > 0 && turn.latex?.trim());
  const pdfs = turns.filter(turn => turn.hasPdf);
  const logins = (data?.logins || []).filter(event => withinPeriod(event.at)).sort((a, b) => new Date(b.at) - new Date(a.at));
  const activeDays = new Set([...comparisons.map(event => dateKey(new Date(event.at))), ...turns.map(turn => dateKey(new Date(turn.createdAt)))]).size;
  const average = field => {
    const scores = comparisons.map(event => event[field]).filter(Number.isFinite);
    return scores.length ? `${Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)}%` : '—';
  };
  const metrics = [
    { label: 'Comparisons completed', value: comparisons.length, source: 'comparison', note: 'Recorded comparison runs' },
    { label: 'Resume generations', value: generations.length, source: 'generation', note: 'New drafts and content revisions' },
    { label: 'Average ATS match', value: average('atsScore'), source: 'comparison', note: 'Across your comparison runs' },
    { label: 'Average job match', value: average('jobMatchScore'), source: 'comparison', note: 'Coverage of job requirements' },
    { label: 'PDFs generated', value: pdfs.length, source: 'generation', note: 'Successfully saved PDFs' },
    { label: 'Active resume days', value: activeDays, source: 'activity', note: 'Days with comparisons or revisions' },
  ];
  const days = [];
  for (let cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
    const key = dateKey(cursor);
    days.push({ date: new Date(cursor), comparisons: comparisons.filter(event => dateKey(new Date(event.at)) === key).length, generations: generations.filter(event => dateKey(new Date(event.createdAt)) === key).length });
  }
  const peak = Math.max(1, ...days.flatMap(day => [day.comparisons, day.generations]));
  const rangeEnd = new Date(end); rangeEnd.setDate(rangeEnd.getDate() - 1);
  const rangeLabel = period === 'Day' ? displayDate(start) : `${displayDate(start)} – ${displayDate(rangeEnd)}`;
  const unavailable = source => !data || errors[source] || source === 'activity' && (errors.comparison || errors.generation);
  const latest = (events, field) => events.length ? displayTime(Math.max(...events.map(event => new Date(event[field]).getTime()))) : '—';
  const activeResumes = (data?.resumes || []).filter(resume => resume.status !== 'archived' && !resume.archivedAt && ['imported', 'ai_rewrite'].includes(resume.creationMethod));
  const activeSessions = (data?.sessions || []).filter(session => !session.archivedAt);
  const inventory = [
    { label: 'Imported resumes', value: activeResumes.length, source: 'comparison' },
    { label: 'Resumes generated', value: activeSessions.filter(session => session.revision > 0).length, source: 'generation' },
    { label: 'PDFs ready', value: activeSessions.filter(session => session.hasCurrentPdf).length, source: 'generation' },
    { label: 'Drafts awaiting generation', value: activeSessions.filter(session => !session.revision).length, source: 'generation' },
  ];

  return (
    <>
      <Head><title>Resume activity · Jobocate</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--jb-v3-bg)', color: 'var(--jb-v3-fg)' }}>
        <AppTopNav />
        <AppShell>
          <main className="resume-dashboard">
            <header>
              <div><p className="dashboard-eyebrow">Your dashboard</p><h1>Resume activity</h1><p className="dashboard-muted">A clear view of your progress, one day at a time.</p></div>
              <div className="dashboard-filters">
                <div role="group" aria-label="Activity period" className="dashboard-period">{['Day', 'Week', 'Month'].map(value => <button key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value}</button>)}</div>
                <label className="dashboard-date"><span>Activity date</span><input type="date" value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} /></label>
              </div>
            </header>
            <div className="dashboard-range"><span>{date ? rangeLabel : 'Loading dates…'}</span><span>Local time · weeks start Monday</span></div>
            {!data && <p role="status" className="dashboard-muted">Loading your statistics…</p>}
            {Object.values(errors).some(Boolean) && <p role="alert" className="dashboard-error">Some statistics are unavailable. <button onClick={() => setRetry(n => n + 1)}>Retry</button></p>}
            <div className="resume-dashboard-stats">
              {metrics.map(metric => <section key={metric.label} role="group" aria-label={metric.label}><h2>{metric.label}</h2><p data-stat-value>{unavailable(metric.source) ? data ? '—' : '…' : metric.value}</p><small>{metric.note}</small></section>)}
            </div>
            <div className="dashboard-details">
              <section className="dashboard-panel" aria-label="Resume activity chart">
                <div className="dashboard-panel-heading"><h2>Activity over time</h2><div className="dashboard-legend"><span><i className="compare-dot" />Comparisons</span><span><i className="generate-dot" />Generations</span></div></div>
                {(errors.comparison || errors.generation) && <p className="dashboard-muted">Chart includes available activity only.</p>}
                <div className="dashboard-chart" role="img" aria-label={`Daily comparisons and generations for ${rangeLabel}. ${comparisons.length} comparisons and ${generations.length} generations.`}>
                  {days.map((day, index) => <div className="dashboard-chart-day" key={dateKey(day.date)} title={`${displayDate(day.date)}: ${day.comparisons} comparisons, ${day.generations} generations`}>
                    <div className="dashboard-bar-pair"><i className="compare-bar" style={{ height: `${day.comparisons / peak * 100}%` }} /><i className="generate-bar" style={{ height: `${day.generations / peak * 100}%` }} /></div>
                    <span>{days.length <= 7 || index === 0 || index === days.length - 1 || (index + 1) % 5 === 0 ? day.date.getDate() : ''}</span>
                  </div>)}
                </div>
                {data && !errors.comparison && !errors.generation && !comparisons.length && !generations.length && <p className="dashboard-muted">No comparisons or generations in this period.</p>}
                <table className="dashboard-accessible" aria-label="Daily resume activity"><thead><tr><th>Date</th><th>Comparisons</th><th>Generations</th></tr></thead><tbody>{days.map(day => <tr key={dateKey(day.date)}><th>{displayDate(day.date)}</th><td>{day.comparisons}</td><td>{day.generations}</td></tr>)}</tbody></table>
                <div className="dashboard-last-activity"><div><span>Last comparison in period</span><strong>{unavailable('comparison') ? '—' : latest(comparisons, 'at')}</strong></div><div><span>Last generation in period</span><strong>{unavailable('generation') ? '—' : latest(generations, 'createdAt')}</strong></div></div>
              </section>
              <section className="dashboard-panel dashboard-logins" aria-label="Login history">
                <div className="dashboard-panel-heading"><h2>Login history</h2><span className="dashboard-login-count">{unavailable('login') ? '—' : `${logins.length} sign-in${logins.length === 1 ? '' : 's'}`}</span></div>
                <p className="dashboard-muted">Platform sessions in this period</p>
                {errors.login ? <p className="dashboard-muted">Login history is unavailable.</p> : !data ? <p className="dashboard-muted">Loading sign-ins…</p> : !logins.length ? <p className="dashboard-muted">No recorded sign-ins in this period.</p> : <ol>{logins.slice(0, 10).map((event, index) => <li key={`${event.at}-${index}`}><span className="dashboard-login-mark" aria-hidden="true">↗</span><div><strong>{({ google: 'Google', linkedin: 'LinkedIn', password: 'Email and password', otp: 'Email link or code' })[event.method] || 'Platform sign-in'}</strong><time dateTime={event.at}>{displayTime(event.at)}</time></div></li>)}</ol>}
                {logins.length > 10 && <p className="dashboard-muted">Showing the latest 10 of {logins.length} sign-ins.</p>}
              </section>
            </div>
            <section className="dashboard-inventory" aria-label="Current workspace totals"><h2>Saved workspace <span>Current totals · independent of date filter</span></h2><div>{inventory.map(metric => <section key={metric.label} role="group" aria-label={metric.label}><h3>{metric.label}</h3><p>{unavailable(metric.source) ? data ? '—' : '…' : metric.value}</p></section>)}</div></section>
            <p className="dashboard-footnote">History includes archived resumes. Up to 500 recent comparisons per resume and 100 recent sign-ins are retained; earlier untracked activity is unavailable.</p>
          </main>
        </AppShell>
      </div>
      <style jsx global>{`
        .resume-dashboard { min-width: 0; padding-bottom: 24px; }
        .resume-dashboard header { margin: 22px 0 26px; display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; }
        .dashboard-eyebrow { margin: 0 0 12px; font-size: 12px; color: var(--jb-v3-accent-faint); }
        .resume-dashboard h1 { margin: 0; font-size: clamp(28px, 4vw, 38px); font-weight: 500; letter-spacing: -.045em; }
        .dashboard-muted { color: var(--jb-v3-fg-3); font-size: 12px; line-height: 1.6; }
        .dashboard-filters { display: flex; align-items: end; gap: 14px; flex-wrap: wrap; }
        .dashboard-period { display: flex; padding: 4px; border: 1px solid var(--jb-v3-line); border-radius: 9px; }
        .dashboard-period button { padding: 9px 15px; border: none; border-radius: 6px; color: var(--jb-v3-fg-3); background: transparent; font-size: 12px; cursor: pointer; }
        .dashboard-period button[aria-pressed=true] { background: var(--jb-v3-accent); color: var(--jb-v3-accent-ink); }
        .dashboard-date { display: grid; gap: 6px; font-size: 11px; color: var(--jb-v3-fg-3); }
        .dashboard-date input { min-width: 0; border: 1px solid var(--jb-v3-line); border-radius: 8px; padding: 10px 12px; color: var(--jb-v3-fg); background: var(--jb-v3-panel); font: inherit; font-size: 12px; color-scheme: dark; }
        html[data-jb-theme='light'] .dashboard-date input { color-scheme: light; }
        .dashboard-range { display: flex; gap: 10px; justify-content: space-between; flex-wrap: wrap; margin-bottom: 16px; color: var(--jb-v3-fg-3); font-size: 11px; }
        .dashboard-range span:first-child { color: var(--jb-v3-fg-2); }
        .resume-dashboard-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        .resume-dashboard-stats section, .dashboard-panel, .dashboard-inventory { border: 1px solid var(--jb-v3-line); border-radius: 12px; background: var(--jb-v3-panel); }
        .resume-dashboard-stats section { padding: 24px; }
        .resume-dashboard-stats h2 { margin: 0 0 20px; font-size: 12px; font-weight: 400; color: var(--jb-v3-fg-2); }
        .resume-dashboard-stats p { margin: 0 0 14px; font-size: 38px; line-height: 1; font-weight: 500; letter-spacing: -.04em; }
        .resume-dashboard-stats small { font-size: 10px; color: var(--jb-v3-fg-3); }
        .dashboard-details { margin-top: 20px; display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 20px; align-items: start; }
        .dashboard-panel { padding: 24px; min-width: 0; }
        .dashboard-panel-heading { display: flex; justify-content: space-between; gap: 14px; align-items: center; flex-wrap: wrap; }
        .dashboard-panel h2, .dashboard-inventory h2 { margin: 0; font-size: 14px; font-weight: 500; }
        .dashboard-legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 10px; color: var(--jb-v3-fg-3); }
        .dashboard-legend span { display: flex; align-items: center; gap: 6px; }
        .dashboard-legend i { width: 6px; height: 6px; border-radius: 50%; }
        .compare-dot, .compare-bar { background: var(--jb-v3-accent); }
        .generate-dot, .generate-bar { background: #8b9eff; }
        .dashboard-chart { display: flex; gap: 3px; height: 165px; margin: 30px 0 20px; }
        .dashboard-chart-day { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .dashboard-bar-pair { display: flex; align-items: end; justify-content: center; gap: 2px; width: 100%; height: 140px; border-bottom: 1px solid var(--jb-v3-line); }
        .dashboard-bar-pair i { width: 42%; max-width: 28px; border-radius: 3px 3px 0 0; }
        .dashboard-chart-day > span { font-size: 9px; height: 12px; color: var(--jb-v3-fg-3); }
        .dashboard-last-activity { border-top: 1px solid var(--jb-v3-line); padding-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .dashboard-last-activity div { display: grid; gap: 8px; font-size: 11px; }
        .dashboard-last-activity span { color: var(--jb-v3-fg-3); }
        .dashboard-last-activity strong { font-weight: 400; color: var(--jb-v3-fg-2); }
        .dashboard-login-count { padding: 5px 8px; border-radius: 5px; background: var(--jb-v3-bg); color: var(--jb-v3-accent-faint); font-size: 10px; }
        .dashboard-logins ol { list-style: none; margin: 18px 0 0; padding: 0; max-height: 260px; overflow: auto; }
        .dashboard-logins li { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px solid var(--jb-v3-line); }
        .dashboard-login-mark { width: 28px; height: 28px; display: grid; place-items: center; border: 1px solid var(--jb-v3-line); border-radius: 8px; color: var(--jb-v3-accent-faint); }
        .dashboard-logins li div { display: grid; gap: 5px; }
        .dashboard-logins strong { font-size: 11px; font-weight: 400; }
        .dashboard-logins time { font-size: 10px; color: var(--jb-v3-fg-3); }
        .dashboard-inventory { padding: 24px; margin-top: 20px; }
        .dashboard-inventory h2 span { display: block; margin-top: 7px; font-size: 10px; color: var(--jb-v3-fg-3); font-weight: 400; }
        .dashboard-inventory > div { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-top: 22px; }
        .dashboard-inventory h3 { font-size: 11px; font-weight: 400; color: var(--jb-v3-fg-3); }
        .dashboard-inventory p { margin: 10px 0 0; font-size: 26px; }
        .dashboard-footnote { font-size: 10px; color: var(--jb-v3-fg-3); line-height: 1.6; margin: 18px 0; }
        .dashboard-error { font-size: 12px; color: var(--jb-v3-fg-2); }
        .dashboard-error button { background: none; border: none; color: var(--jb-v3-accent-faint); text-decoration: underline; cursor: pointer; }
        .dashboard-accessible { position: absolute; width: 1px; height: 1px; margin: -1px; clip-path: inset(50%); overflow: hidden; white-space: nowrap; }
        @media(max-width: 900px) { .dashboard-details { grid-template-columns: minmax(0, 1fr); } }
        @media(max-width: 600px) { .resume-dashboard-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } .resume-dashboard-stats section { padding: 18px 14px; } .resume-dashboard-stats p { font-size: 30px; } .resume-dashboard-stats h2 { min-height: 32px; margin-bottom: 12px; } .dashboard-inventory > div { grid-template-columns: 1fr 1fr; } .dashboard-panel, .dashboard-inventory { padding: 18px; } .dashboard-filters { gap: 10px; } .dashboard-period button { padding: 9px 12px; } }
      `}</style>
    </>
  );
}
