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
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.type !== 'tool_call' || !step.tool || !ACTION_TOOL_NAMES.has(step.tool)) continue;

    const resultStep = steps
      .slice(i + 1)
      .find((s) => s.type === 'tool_result' && s.tool === step.tool);

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
