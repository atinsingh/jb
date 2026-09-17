'use client';

import auth from '@/components/auth/v3/AuthV3.module.css';
import styles from './ResumeAssessmentPanel.module.css';

const assessmentStateCopy = {
  NOT_RUN: 'Assessment has not run.',
  RUNNING: 'Resume assessment is running…',
  STALE: 'Assessment is stale because the submitted resume or job description changed.',
  NO_RESUME: 'No submitted resume is attached to this applicant.',
  NO_JOB_DESCRIPTION: 'This job needs a description before its resume can be assessed.',
  BUDGET_EXHAUSTED: 'ATS match was not run because the employer AI budget is exhausted.',
  CONFIGURATION_ERROR: 'ATS match could not start because employer ATS is not configured. Contact support before retrying.',
  ATS_FAILED: 'ATS matching failed during execution. Retry the assessment.',
  ATS_INTERRUPTED: 'ATS matching stopped because this tab lost focus and the scoring container was shut down. Keep this page visible and retry.',
  DETECTOR_FAILED: 'The local AI-content heuristic failed during execution. Retry the assessment.',
};

const signalLabel = (key) =>
  String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase());

const dollars = (value) => `$${Number(value || 0).toFixed(2)}`;

function AtsBudgetStatus({ budget }) {
  if (!budget) return null;
  const hasAmounts = Number.isFinite(Number(budget.limitUsd));
  const reset = budget.resetAt
    ? new Date(budget.resetAt).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : null;
  const copy = budget.status === 'CONFIGURATION_ERROR'
    ? 'ATS budget is unavailable because employer ATS is not configured.'
    : budget.status === 'BUDGET_EXHAUSTED'
      ? `ATS budget is exhausted: ${dollars(budget.remainingUsd)} of ${dollars(budget.limitUsd)} remaining this month.`
      : hasAmounts
        ? `ATS budget: ${dollars(budget.remainingUsd)} of ${dollars(budget.limitUsd)} remaining this month${reset ? ` · resets ${reset}` : ''}.`
        : 'ATS budget is ready.';

  return (
    <div className={styles.budget}>
      <div>{copy}</div>
      <div>ATS match uses the same Resume-Matcher sandbox path as the candidate résumé flow. The local heuristic does not use this budget.</div>
    </div>
  );
}

export default function ResumeAssessmentPanel({
  assessment,
  budget,
  loading,
  busy,
  onRun,
  title = 'Submitted resume assessment',
  runLabel = 'Run resume assessment',
}) {
  if (loading) return <div className={styles.muted}>Loading resume assessment…</div>;

  const status = assessment?.status || 'NOT_RUN';
  const inputState = ['NOT_RUN', 'RUNNING', 'STALE', 'NO_RESUME', 'NO_JOB_DESCRIPTION'].includes(status);
  const ats = assessment?.ats;
  const aiContent = assessment?.aiContent;
  const canRun = status !== 'RUNNING';

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>{title}</div>
          {status === 'PARTIAL' && <div className={styles.warn}>Partial assessment — the available result is shown below.</div>}
          {inputState && (
            <div className={status === 'STALE' ? styles.warn : styles.muted}>
              {assessmentStateCopy[status]}
            </div>
          )}
          <AtsBudgetStatus budget={budget} />
        </div>
        {canRun && onRun && (
          <button
            type="button"
            onClick={onRun}
            disabled={busy}
            className={`${auth.btn} ${auth.btnPrimary}`}
            style={{ width: 'auto', flex: 'none' }}
          >
            {busy ? 'Assessing…' : runLabel}
          </button>
        )}
      </div>

      {!inputState && (
        <div className={styles.grid}>
          <section>
            <div className={styles.row}>
              <strong>ATS semantic match</strong>
              {ats?.status === 'COMPLETE' && (
                <span className={styles.score}>{ats.semanticMatch}/100</span>
              )}
            </div>
            {ats?.status === 'COMPLETE' ? (
              <>
                <div className={ats.semanticMatch > 70 ? styles.good : styles.warn}>
                  {ats.semanticMatch > 70 ? 'Good to submit' : 'Improve before submitting'}
                </div>
                {Object.keys(ats.subScores || {}).length > 0 && (
                  <div className={styles.subs}>
                    {Object.entries(ats.subScores).map(([key, value]) => (
                      <div key={key} className={styles.sub}>
                        <span>{signalLabel(key)}</span>
                        <span>{value}/100</span>
                      </div>
                    ))}
                  </div>
                )}
                {(ats.gaps || []).length > 0 && (
                  <div className={styles.body}><b>Missing keywords:</b> {ats.gaps.join(', ')}</div>
                )}
                {(ats.suggestions || []).length > 0 && (
                  <div className={styles.body}><b>Recommendations:</b> {ats.suggestions.join(' ')}</div>
                )}
              </>
            ) : (
              <div className={
                ats?.status === 'ATS_FAILED' || ats?.status === 'ATS_INTERRUPTED'
                  ? styles.fail
                  : styles.muted
              }>
                {ats?.status === 'BUDGET_EXHAUSTED'
                  ? assessmentStateCopy.BUDGET_EXHAUSTED
                  : ats?.status === 'CONFIGURATION_ERROR'
                    ? assessmentStateCopy.CONFIGURATION_ERROR
                    : ats?.status === 'NOT_RUN' && ats?.reason === 'EMPLOYER_ATS_RUN_IN_PROGRESS'
                      ? 'ATS match did not start because another employer assessment is already running.'
                      : ats?.status === 'ATS_INTERRUPTED'
                        ? assessmentStateCopy.ATS_INTERRUPTED
                        : ats?.status === 'ATS_FAILED'
                          ? assessmentStateCopy.ATS_FAILED
                          : 'ATS match has not run.'}
              </div>
            )}
          </section>

          <section>
            <div className={styles.row}>
              <strong>AI-content likelihood (directional)</strong>
              {aiContent?.status === 'COMPLETE' && (
                <span className={styles.scoreDim}>{aiContent.composite}/100</span>
              )}
            </div>
            <div className={styles.caveat}>
              Directional evidence only. This heuristic can produce false positives and false negatives and never changes fit, ranking, stage, or hiring actions.
            </div>
            {aiContent?.status === 'COMPLETE' ? (
              <div>
                {Object.entries(aiContent.signals || {}).map(([key, signal]) => (
                  <div key={key} className={styles.signal}>
                    <div className={styles.sub}>
                      <span>{signalLabel(key)}</span>
                      <span>{signal.likelihood}/100</span>
                    </div>
                    <div className={styles.muted}>{signal.explanation}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={aiContent?.status === 'DETECTOR_FAILED' ? styles.fail : styles.muted}>
                {aiContent?.status === 'DETECTOR_FAILED'
                  ? assessmentStateCopy.DETECTOR_FAILED
                  : 'AI-content likelihood has not run.'}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
