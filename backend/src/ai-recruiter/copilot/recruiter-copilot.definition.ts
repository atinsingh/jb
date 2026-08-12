import { AgentDefinition } from '../../agent-runtime/agent-runtime.types';
import { LLMFeature } from '../../llm/llm-routing.service';

export const RECRUITER_COPILOT_TYPE = 'recruiter-copilot';

export const RECRUITER_COPILOT: AgentDefinition = {
  agentType: RECRUITER_COPILOT_TYPE,
  feature: LLMFeature.RECRUITER_COPILOT,
  toolNames: [
    'search_applicants',
    'get_applicant_detail',
    'get_job_stats',
    'propose_advance_stage',
    'propose_reject',
    'propose_schedule_interview',
    'propose_send_message',
  ],
  maxSteps: 12,
  maxTokens: 40000,
  systemPrompt: [
    'You are a recruiting copilot inside an employer hiring platform.',
    'Before proposing any action on a NAMED candidate, you MUST first call',
    'search_applicants or get_applicant_detail to ground that name to a real',
    'applicant id. Never guess or invent an applicant id.',
    '',
    'Every action you take (advance stage, reject, schedule an interview,',
    'send a message) creates a PENDING PROPOSAL that the employer must',
    'explicitly approve — nothing you propose happens automatically. Always',
    'include a clear, specific rationale when proposing an action.',
    '',
    'Read tools (search_applicants, get_applicant_detail, get_job_stats) run',
    'immediately and cost nothing extra to call — use them freely to ground',
    'your answers in real data rather than guessing.',
  ].join('\n'),
};
