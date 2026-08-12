import { extractCopilotReply } from './extract-copilot-reply';

describe('extractCopilotReply', () => {
  it('extracts the text of the last final step as the reply', () => {
    const run: any = {
      status: 'completed',
      steps: [
        { type: 'llm', at: new Date() },
        { type: 'final', text: 'Here are your top candidates.', at: new Date() },
      ],
    };

    const result = extractCopilotReply(run);

    expect(result.reply).toBe('Here are your top candidates.');
  });

  it('derives an action entry for each propose_* tool call, using its tool_result output', () => {
    const run: any = {
      status: 'completed',
      steps: [
        {
          type: 'tool_call', tool: 'propose_advance_stage',
          args: { applicantId: 'a1', targetStage: 'interview' }, at: new Date(),
        },
        {
          type: 'tool_result', tool: 'propose_advance_stage',
          output: { proposedActionId: 'p1', summary: 'Proposed advancing to interview, awaiting your approval.' },
          at: new Date(),
        },
        { type: 'final', text: 'Done — check your Approvals.', at: new Date() },
      ],
    };

    const result = extractCopilotReply(run);

    expect(result.actions).toEqual([
      { type: 'propose_advance_stage', label: 'Proposed advancing to interview, awaiting your approval.', proposedActionId: 'p1' },
    ]);
  });

  it('pairs each of two same-named action tool calls with its OWN result', () => {
    const run: any = {
      status: 'completed',
      steps: [
        { type: 'tool_call', tool: 'propose_reject', args: { applicantId: 'a1' }, at: new Date() },
        {
          type: 'tool_result', tool: 'propose_reject',
          output: { proposedActionId: 'p1', summary: 'Proposed rejecting Ada.' },
          at: new Date(),
        },
        { type: 'tool_call', tool: 'propose_reject', args: { applicantId: 'a2' }, at: new Date() },
        {
          type: 'tool_result', tool: 'propose_reject',
          output: { proposedActionId: 'p2', summary: 'Proposed rejecting Grace.' },
          at: new Date(),
        },
        { type: 'final', text: 'Both proposed.', at: new Date() },
      ],
    };

    const result = extractCopilotReply(run);

    expect(result.actions).toEqual([
      { type: 'propose_reject', label: 'Proposed rejecting Ada.', proposedActionId: 'p1' },
      { type: 'propose_reject', label: 'Proposed rejecting Grace.', proposedActionId: 'p2' },
    ]);
  });

  it('does not re-consume an earlier result when a later same-named call has none', () => {
    const run: any = {
      status: 'completed',
      steps: [
        { type: 'tool_call', tool: 'propose_reject', args: { applicantId: 'a1' }, at: new Date() },
        {
          type: 'tool_result', tool: 'propose_reject',
          output: { proposedActionId: 'p1', summary: 'Proposed rejecting Ada.' },
          at: new Date(),
        },
        { type: 'tool_call', tool: 'propose_reject', args: { applicantId: 'a2' }, at: new Date() },
        { type: 'final', text: 'One proposed.', at: new Date() },
      ],
    };

    const result = extractCopilotReply(run);

    expect(result.actions).toEqual([
      { type: 'propose_reject', label: 'Proposed rejecting Ada.', proposedActionId: 'p1' },
    ]);
  });

  it('ignores read-only tool calls (search_applicants etc) when deriving actions', () => {
    const run: any = {
      status: 'completed',
      steps: [
        { type: 'tool_call', tool: 'search_applicants', args: {}, at: new Date() },
        { type: 'tool_result', tool: 'search_applicants', output: { applicants: [] }, at: new Date() },
        { type: 'final', text: 'No applicants matched.', at: new Date() },
      ],
    };

    const result = extractCopilotReply(run);

    expect(result.actions).toEqual([]);
  });

  it('falls back to a clear message when the run failed rather than crashing', () => {
    const run: any = { status: 'failed', error: 'Quota exceeded', steps: [] };

    const result = extractCopilotReply(run);

    expect(result.reply).toContain('Quota exceeded');
    expect(result.actions).toEqual([]);
  });
});
