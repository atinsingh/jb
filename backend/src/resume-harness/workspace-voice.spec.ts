import { hideWorkspaceFiles, WORKSPACE_VOICE_RULE } from './workspace-voice';

describe('hideWorkspaceFiles', () => {
  it('replaces sandbox filenames with the words a person can understand', () => {
    expect(hideWorkspaceFiles('JOB.txt requires AWS that RESUME.txt does not show')).toBe(
      'the job description requires AWS that the résumé does not show',
    );
    expect(hideWorkspaceFiles('Read ORIGINAL_RESUME.pdf and CANDIDATE.md')).toBe(
      'Read the original résumé and the candidate profile',
    );
    expect(WORKSPACE_VOICE_RULE).toMatch(/never name workspace files/i);
  });
});
