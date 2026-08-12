import { AgentRunDocument, AgentRunStep } from '../../agent-runtime/schemas/agent-run.schema';

const ACTION_TOOL_NAMES = new Set([
  'propose_advance_stage',
  'propose_reject',
  'propose_schedule_interview',
  'propose_send_message',
]);

export function extractCopilotReply(run: AgentRunDocument): {
  reply: string;
  actions: Array<{ type: string; label: string; proposedActionId?: string }>;
} {
  if (run.status === 'failed') {
    return {
      reply: run.error
        ? `Sorry, I couldn't finish that: ${run.error}`
        : "Sorry, I couldn't finish that. Please try again.",
      actions: [],
    };
  }

  const steps: AgentRunStep[] = run.steps || [];

  const finalSteps = steps.filter((s) => s.type === 'final');
  const lastFinal = finalSteps[finalSteps.length - 1];
  const reply = lastFinal?.text || "I didn't have a specific reply for that.";

  const actions: Array<{ type: string; label: string; proposedActionId?: string }> = [];
  // A multi-turn run can call the same action tool more than once (e.g. two
  // `propose_reject` calls for two different applicants). Pair each tool_call
  // with the NEXT *unconsumed* tool_result of that name, so the second call
  // cannot re-read the first call's result and misattribute proposedActionId.
  const consumedResults = new Set<number>();
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.type !== 'tool_call' || !step.tool || !ACTION_TOOL_NAMES.has(step.tool)) continue;

    let resultStep: AgentRunStep | undefined;
    for (let j = i + 1; j < steps.length; j++) {
      if (consumedResults.has(j)) continue;
      const candidate = steps[j];
      if (candidate.type === 'tool_result' && candidate.tool === step.tool) {
        consumedResults.add(j);
        resultStep = candidate;
        break;
      }
    }

    const output: any = resultStep?.output;
    if (!output || output.error) continue;

    actions.push({
      type: step.tool,
      label: output.summary || `Proposed action (${step.tool})`,
      proposedActionId: output.proposedActionId,
    });
  }

  return { reply, actions };
}
