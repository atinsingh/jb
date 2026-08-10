import { BadRequestException } from '@nestjs/common';
import { buildCopilotTools, CopilotToolDeps } from '../copilot.tools';
import { AgentTool, AgentToolContext } from '../../agent-runtime/agent-runtime.types';

function makeDeps(overrides: Partial<Record<keyof CopilotToolDeps, any>> = {}): {
  deps: CopilotToolDeps;
  mocks: Record<string, any>;
} {
  const eligibleJobs = { getEligibleJobs: jest.fn() };
  const coverLetters = { generateCoverLetter: jest.fn() };
  const applications = {
    createApplication: jest.fn(),
    getUserApplications: jest.fn(),
    getApplicationStats: jest.fn(),
  };
  const applicationAgent = { canApplyMore: jest.fn() };
  const applyRunner = { submitOne: jest.fn() };
  const notifications = { create: jest.fn() };
  const deps = {
    eligibleJobs,
    coverLetters,
    applications,
    applicationAgent,
    applyRunner,
    notifications,
    ...overrides,
  } as unknown as CopilotToolDeps;
  return {
    deps,
    mocks: { eligibleJobs, coverLetters, applications, applicationAgent, applyRunner, notifications },
  };
}

function tool(tools: AgentTool[], name: string): AgentTool {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`tool ${name} not built`);
  return t;
}

const CTX: AgentToolContext = {
  userId: 'user-1',
  run: { input: { candidate: { name: 'Ada', email: 'ada@x.com', skills: ['ts'] } } } as any,
};

describe('copilot tools', () => {
  const OLD_ENV = process.env.MIN_MATCH_SCORE_FOR_AUTO_APPLY;
  afterEach(() => {
    process.env.MIN_MATCH_SCORE_FOR_AUTO_APPLY = OLD_ENV;
    jest.clearAllMocks();
  });

  describe('find_matches', () => {
    it('returns compact matches from EligibleJobsService', async () => {
      const { deps, mocks } = makeDeps();
      mocks.eligibleJobs.getEligibleJobs.mockResolvedValue({
        jobs: [
          {
            id: 'job-1',
            title: 'Engineer',
            companyName: 'Acme',
            location: 'Remote',
            workplaceType: 'REMOTE',
            externalUrl: 'https://acme/apply',
            matchScore: 88,
            matchLabel: 'Strong',
            matchedSkills: ['ts'],
            missingSkills: [],
            eligibility: { status: 'ELIGIBLE', autoApplySafe: true, confidence: 0.9 },
          },
        ],
        total: 1,
      });
      const t = tool(buildCopilotTools(deps), 'find_matches');

      const res = await t.handler(CTX, { keywords: 'eng', limit: 5 });

      expect(mocks.eligibleJobs.getEligibleJobs).toHaveBeenCalledWith('user-1', {
        keywords: 'eng',
        limit: 5,
        includeConditional: true,
      });
      expect(res.total).toBe(1);
      expect(res.matches[0]).toMatchObject({
        id: 'job-1',
        title: 'Engineer',
        matchScore: 88,
        autoApplySafe: true,
        eligibilityStatus: 'ELIGIBLE',
      });
      expect(res.threshold).toBe(75);
    });

    it('never throws — returns { error } on service failure', async () => {
      const { deps, mocks } = makeDeps();
      mocks.eligibleJobs.getEligibleJobs.mockRejectedValue(new Error('boom'));
      const t = tool(buildCopilotTools(deps), 'find_matches');
      const res = await t.handler(CTX, {});
      expect(res.error).toBe('boom');
      expect(res.matches).toEqual([]);
    });
  });

  describe('apply', () => {
    it('daily-cap reached → skipped, no create/submit', async () => {
      const { deps, mocks } = makeDeps();
      mocks.applicationAgent.canApplyMore.mockResolvedValue({ canApply: false, remaining: 0 });
      const t = tool(buildCopilotTools(deps), 'apply');

      const res = await t.handler(CTX, { jobId: 'job-1', matchScore: 90 });

      expect(res).toEqual({ skipped: 'daily cap reached', remaining: 0 });
      expect(mocks.applications.createApplication).not.toHaveBeenCalled();
      expect(mocks.applyRunner.submitOne).not.toHaveBeenCalled();
    });

    it('below-threshold → skipped, no create/submit', async () => {
      const { deps, mocks } = makeDeps();
      mocks.applicationAgent.canApplyMore.mockResolvedValue({ canApply: true, remaining: 5 });
      const t = tool(buildCopilotTools(deps), 'apply');

      const res = await t.handler(CTX, { jobId: 'job-1', matchScore: 50 });

      expect(res.skipped).toBe('below match threshold');
      expect(res.threshold).toBe(75);
      expect(mocks.applications.createApplication).not.toHaveBeenCalled();
      expect(mocks.applyRunner.submitOne).not.toHaveBeenCalled();
    });

    it('happy path → createApplication(autoApplied:true) then submitOne, returns status', async () => {
      const { deps, mocks } = makeDeps();
      mocks.applicationAgent.canApplyMore.mockResolvedValue({ canApply: true, remaining: 5 });
      mocks.applications.createApplication.mockResolvedValue({ _id: 'app-1' });
      mocks.applyRunner.submitOne.mockResolvedValue({ id: 'app-1', status: 'submitted' });
      const t = tool(buildCopilotTools(deps), 'apply');

      const res = await t.handler(CTX, { jobId: 'job-1', matchScore: 90, coverLetter: 'Dear...' });

      expect(mocks.applications.createApplication).toHaveBeenCalledWith(
        'user-1',
        'job-1',
        'Dear...',
        90,
        true, // autoApplied MUST be true
      );
      expect(mocks.applyRunner.submitOne).toHaveBeenCalledWith('app-1');
      expect(res).toMatchObject({
        applied: true,
        applicationId: 'app-1',
        status: 'submitted',
        remaining: 4,
      });
    });

    it('already-applied (createApplication throws BadRequest) → skipped, no submit', async () => {
      const { deps, mocks } = makeDeps();
      mocks.applicationAgent.canApplyMore.mockResolvedValue({ canApply: true, remaining: 5 });
      mocks.applications.createApplication.mockRejectedValue(
        new BadRequestException('Application already exists for this job'),
      );
      const t = tool(buildCopilotTools(deps), 'apply');

      const res = await t.handler(CTX, { jobId: 'job-1', matchScore: 90 });

      expect(res).toEqual({ skipped: 'already applied', jobId: 'job-1' });
      expect(mocks.applyRunner.submitOne).not.toHaveBeenCalled();
    });

    it("passes through submitOne 'needs_human' status", async () => {
      const { deps, mocks } = makeDeps();
      mocks.applicationAgent.canApplyMore.mockResolvedValue({ canApply: true, remaining: 3 });
      mocks.applications.createApplication.mockResolvedValue({ _id: 'app-2' });
      mocks.applyRunner.submitOne.mockResolvedValue({
        id: 'app-2',
        status: 'needs_human',
        failReason: 'CAPTCHA',
      });
      const t = tool(buildCopilotTools(deps), 'apply');

      const res = await t.handler(CTX, { jobId: 'job-2', matchScore: 90 });

      expect(res).toMatchObject({
        applied: true,
        status: 'needs_human',
        failReason: 'CAPTCHA',
      });
    });

    it('applies when no matchScore provided (threshold only gates when present)', async () => {
      const { deps, mocks } = makeDeps();
      mocks.applicationAgent.canApplyMore.mockResolvedValue({ canApply: true, remaining: 2 });
      mocks.applications.createApplication.mockResolvedValue({ _id: 'app-3' });
      mocks.applyRunner.submitOne.mockResolvedValue({ id: 'app-3', status: 'skipped' });
      const t = tool(buildCopilotTools(deps), 'apply');

      const res = await t.handler(CTX, { jobId: 'job-3' });

      expect(mocks.applications.createApplication).toHaveBeenCalledWith(
        'user-1',
        'job-3',
        undefined,
        undefined,
        true,
      );
      expect(res.status).toBe('skipped');
    });

    it('never throws — unexpected error resolves to { error }', async () => {
      const { deps, mocks } = makeDeps();
      mocks.applicationAgent.canApplyMore.mockRejectedValue(new Error('db down'));
      const t = tool(buildCopilotTools(deps), 'apply');
      const res = await t.handler(CTX, { jobId: 'job-1' });
      expect(res).toEqual({ error: 'db down' });
    });
  });

  describe('write_cover_letter', () => {
    it('builds candidate info from run input and returns the final letter', async () => {
      const { deps, mocks } = makeDeps();
      mocks.coverLetters.generateCoverLetter.mockResolvedValue({ finalLetter: 'Dear Acme...' });
      const t = tool(buildCopilotTools(deps), 'write_cover_letter');

      const res = await t.handler(CTX, {
        jobId: 'job-1',
        title: 'Engineer',
        companyName: 'Acme',
        description: 'Build things',
      });

      expect(mocks.coverLetters.generateCoverLetter).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ name: 'Ada', email: 'ada@x.com', skills: ['ts'] }),
        expect.objectContaining({ title: 'Engineer', companyName: 'Acme' }),
      );
      expect(res.coverLetter).toBe('Dear Acme...');
    });
  });

  describe('follow_up', () => {
    it('writes a candidate notification with default href', async () => {
      const { deps, mocks } = makeDeps();
      mocks.notifications.create.mockResolvedValue({});
      const t = tool(buildCopilotTools(deps), 'follow_up');

      const res = await t.handler(CTX, { text: 'Applied to 3 roles' });

      expect(mocks.notifications.create).toHaveBeenCalledWith({
        audience: 'candidate',
        userId: 'user-1',
        type: 'applications',
        text: 'Applied to 3 roles',
        href: '/app/applications',
      });
      expect(res).toEqual({ notified: true });
    });
  });

  describe('list_applications', () => {
    it('returns compact applications + stats', async () => {
      const { deps, mocks } = makeDeps();
      mocks.applications.getUserApplications.mockResolvedValue([
        { _id: 'a1', jobId: { _id: 'j1', title: 'Eng', companyName: 'Acme' }, status: 'pending', matchScore: 80, autoApplied: true },
      ]);
      mocks.applications.getApplicationStats.mockResolvedValue({ total: 1, pending: 1 });
      const t = tool(buildCopilotTools(deps), 'list_applications');

      const res = await t.handler(CTX, { status: 'pending' });

      expect(mocks.applications.getUserApplications).toHaveBeenCalledWith('user-1', 'pending');
      expect(res.applications[0]).toMatchObject({ id: 'a1', jobId: 'j1', title: 'Eng', status: 'pending' });
      expect(res.stats).toEqual({ total: 1, pending: 1 });
    });
  });
});
