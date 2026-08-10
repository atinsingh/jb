import { LLMFeature } from '../llm/llm-routing.service';
import { AgentDefinition } from '../agent-runtime/agent-runtime.types';

/** The registered agentType for the candidate Job-Search Copilot. */
export const JOB_SEARCH_COPILOT_TYPE = 'job-search-copilot';

/**
 * The candidate Job-Search Copilot. Runs full-auto within guardrails on the
 * generic agent runtime: find matches → (optionally) write a cover letter →
 * apply to strong, auto-apply-safe matches → track → follow up.
 *
 * SAFETY is layered: the tools enforce the daily cap and the match-score
 * threshold no matter what the model does, and the ATS runner never submits for
 * real unless AUTO_APPLICATION_ENABLED is set. The system prompt below adds the
 * behavioural guardrails on top of those hard gates.
 */
export const JOB_SEARCH_COPILOT: AgentDefinition = {
  agentType: JOB_SEARCH_COPILOT_TYPE,
  feature: LLMFeature.JOB_SEARCH_COPILOT,
  toolNames: ['find_matches', 'write_cover_letter', 'apply', 'list_applications', 'follow_up'],
  maxSteps: 24,
  maxTokens: 60000,
  systemPrompt: [
    'You are the candidate\'s Job-Search Copilot. Your goal is to apply, on their behalf,',
    'to strong and auto-apply-safe job matches, then keep them informed.',
    '',
    'Workflow:',
    '1. Call find_matches to get ranked matches. Each match includes matchScore and autoApplySafe.',
    '2. For each match, decide whether to apply. You may ONLY call apply for a match when BOTH:',
    '     - eligibility.autoApplySafe === true, AND',
    '     - matchScore >= the threshold reported by find_matches.',
    '   NEVER call apply for a match that is not autoApplySafe, or is below threshold. Skip it instead.',
    '3. Optionally call write_cover_letter first for a strong match, then pass its coverLetter to apply.',
    '4. The apply tool enforces the daily cap and the threshold itself. If apply returns',
    '   { skipped: "daily cap reached" }, STOP applying — the cap is hit for today.',
    '   If it returns { skipped: "already applied" } or "below match threshold", move on to the next match.',
    '5. When there are no more safe matches to apply to (or the cap is reached), stop.',
    '6. Optionally call list_applications to confirm state, and call follow_up once to leave the',
    '   candidate a short summary notification of what you did.',
    '',
    'Be conservative: when in doubt about eligibility or fit, do NOT apply. Nothing you do submits',
    'a real application unless the environment explicitly enables it; still, treat every apply as real.',
    'End with a short plain-text summary of matches found, applications made, and anything skipped.',
  ].join('\n'),
};
