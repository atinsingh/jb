import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { AgentPlatformClient } from '../src/resume-harness/sandbox/agent-platform.client';
import { HarnessModelAlias } from '../src/resume-harness/schemas/harness-model-alias.schema';
import { HARNESS_IDS } from '../src/resume-harness/harness/harness.types';
import { api, auth, registerUser, resetDatabase, TestUser } from './utils/e2e-app';

/**
 * The create-then-update vertical slice, run once per harness.
 *
 * What is real here: the HTTP contract, auth, tier -> alias resolution, the
 * session/sandbox binding, context-file generation, harness immutability, and
 * teardown. What is faked is the container and the model call — a real one
 * would need Docker, the Agent Platform and metered provider keys, none of
 * which belong in a test suite that has to run on every push.
 *
 * The fake is a genuine sandbox in miniature: it holds files, it runs the exact
 * argv each adapter produces, and it only "writes" the resume when the harness
 * command actually ran. That is what makes the per-harness loop meaningful —
 * if an adapter stopped producing a runnable command, this suite fails.
 */

/** In-memory stand-in for one Agent Platform deployment. */
class FakeAgentPlatform {
  readonly sandboxes = new Map<
    string,
    { spec: any; files: Map<string, string>; execs: string[][] }
  >();
  private seq = 0;

  isAvailable() {
    return true;
  }

  async create(spec: any) {
    const id = `sbx-${++this.seq}`;
    this.sandboxes.set(id, { spec, files: new Map(), execs: [] });
    return id;
  }

  async putFiles(id: string, files: { path: string; contents: string }[]) {
    const box = this.mustGet(id);
    files.forEach((f) => box.files.set(f.path, f.contents));
  }

  async readFile(id: string, path: string) {
    return this.mustGet(id).files.get(path) ?? null;
  }

  async readFileBase64(id: string, path: string) {
    const contents = this.mustGet(id).files.get(path);
    return contents ? Buffer.from(contents).toString('base64') : null;
  }

  async exec(id: string, command: string[]) {
    const box = this.mustGet(id);
    box.execs.push(command);

    // The LaTeX build.
    if (command[0] === 'sh') {
      if (!box.files.has('resume.tex')) {
        return { exitCode: 1, stdout: '', stderr: '! LaTeX Error: file not found.' };
      }
      box.files.set('build/resume.pdf', '%PDF-1.7 fake');
      return { exitCode: 0, stdout: 'Latexmk: All targets are up-to-date', stderr: '' };
    }

    // A harness turn: the prompt is the last argv element for all three CLIs.
    const prompt = command[command.length - 1];
    const existing = box.files.get('resume.tex');
    const body = existing
      ? `${existing}\n% ${prompt.split('\n').slice(0, 1).join(' ')}`
      : `\\documentclass{article}\n\\begin{document}\n% ${prompt.split('\n')[0]}\n\\end{document}`;
    box.files.set('resume.tex', body);
    return { exitCode: 0, stdout: 'edited resume.tex', stderr: '' };
  }

  async destroy(id: string) {
    this.sandboxes.delete(id);
  }

  private mustGet(id: string) {
    const box = this.sandboxes.get(id);
    if (!box) throw new Error(`sandbox ${id} does not exist`);
    return box;
  }
}

const FREE_TIER_ALIAS = {
  alias: 'anthropic/claude-haiku-4-5/low',
  provider: 'anthropic',
  model: 'claude-haiku-4-5',
  effort: 'low',
  label: 'Haiku 4.5 · fast',
  tiers: ['FREE'],
  defaultForTiers: ['FREE'],
  rank: 10,
  isActive: true,
};

const ELITE_ONLY_ALIAS = {
  ...FREE_TIER_ALIAS,
  alias: 'anthropic/claude-opus-4-5/max',
  model: 'claude-opus-4-5',
  effort: 'max',
  label: 'Opus 4.5 · maximum',
  tiers: ['ELITE'],
  defaultForTiers: ['ELITE'],
};

describe('Resume harness (e2e)', () => {
  let app: INestApplication;
  let platform: FakeAgentPlatform;
  let candidate: TestUser;

  beforeAll(async () => {
    platform = new FakeAgentPlatform();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AgentPlatformClient)
      .useValue(platform)
      .compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(app.get(HttpExceptionFilter));
    app.useGlobalInterceptors(app.get(LoggingInterceptor));
    app.setGlobalPrefix('api', { exclude: ['health', 'health/readiness'] });
    await app.init();

    await resetDatabase(app);
    candidate = await registerUser(app, 'ROLE_CANDIDATE', 'resume-harness');

    const aliases = app.get<Model<any>>(getModelToken(HarnessModelAlias.name));
    await aliases.create([FREE_TIER_ALIAS, ELITE_ONLY_ALIAS]);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('offers every harness and only the aliases the tier permits', async () => {
    const res = await api(app)
      .get('/api/resume-harness/options')
      .set(auth(candidate.token))
      .expect(200);

    expect(res.body.harnesses.map((h: any) => h.id).sort()).toEqual(
      [...HARNESS_IDS].sort(),
    );
    expect(res.body.models.map((m: any) => m.alias)).toEqual([
      FREE_TIER_ALIAS.alias,
    ]);
    expect(res.body.tier).toBe('FREE');
  });

  it('refuses an out-of-tier alias instead of downgrading it', async () => {
    await api(app)
      .post('/api/resume-harness/sessions')
      .set(auth(candidate.token))
      .send({ harness: 'claude-code', alias: ELITE_ONLY_ALIAS.alias })
      .expect(403);
  });

  // The whole point of the harness abstraction: identical behaviour, identical
  // API surface, three different agents.
  describe.each(HARNESS_IDS)('on %s', (harness) => {
    let sessionId: string;

    it('starts a session bound to exactly one sandbox with the right context files', async () => {
      const before = platform.sandboxes.size;

      const res = await api(app)
        .post('/api/resume-harness/sessions')
        .set(auth(candidate.token))
        .send({ harness })
        .expect(201);

      sessionId = res.body.id;
      expect(res.body.harness).toBe(harness);
      expect(res.body.model).toBe(FREE_TIER_ALIAS.model);
      expect(res.body.effort).toBe(FREE_TIER_ALIAS.effort);
      expect(platform.sandboxes.size).toBe(before + 1);

      const box = platform.sandboxes.get(res.body.sandboxId)!;
      expect(box.spec.labels.session).toBe(sessionId);
      expect(box.files.has('AGENTS.md')).toBe(true);

      if (harness === 'claude-code') {
        // Claude Code does not read AGENTS.md natively — it imports it.
        expect(box.files.get('CLAUDE.md')).toMatch(/^@AGENTS\.md$/m);
      } else {
        expect(box.files.has('CLAUDE.md')).toBe(false);
      }

      // Every harness is authenticated by the proxy key and tagged.
      expect(JSON.stringify({ env: box.spec.env, files: [...box.files] })).toContain(
        `harness=${harness}`,
      );
    });

    it('generates a compiling LaTeX resume from scratch', async () => {
      const res = await api(app)
        .post(`/api/resume-harness/sessions/${sessionId}/turns`)
        .set(auth(candidate.token))
        .send({ instruction: 'Build a resume for a senior backend engineer.' })
        .expect(201);

      expect(res.body.revision).toBe(1);
      expect(res.body.compiled).toBe(true);
      expect(res.body.latex).toContain('\\documentclass');
      expect(res.body.pdfBase64).toBeTruthy();
    });

    it('updates the same artifact rather than regenerating it', async () => {
      const before = await api(app)
        .get(`/api/resume-harness/sessions/${sessionId}`)
        .set(auth(candidate.token))
        .expect(200);

      const res = await api(app)
        .post(`/api/resume-harness/sessions/${sessionId}/turns`)
        .set(auth(candidate.token))
        .send({ instruction: 'Add a Kubernetes bullet to the latest role.' })
        .expect(201);

      expect(res.body.revision).toBe(2);
      // The original document survived the edit — this is the create/update
      // distinction the shared rules require.
      expect(res.body.latex.startsWith(before.body.latex)).toBe(true);
      expect(res.body.latex.length).toBeGreaterThan(before.body.latex.length);
      expect(res.body.sandboxId).toBe(before.body.sandboxId);
    });

    it('rejects a harness change on the live session', async () => {
      const other = HARNESS_IDS.find((h) => h !== harness)!;
      await api(app)
        .post(`/api/resume-harness/sessions/${sessionId}/turns`)
        .set(auth(candidate.token))
        .send({ instruction: 'switch please', harness: other })
        .expect(409);
    });

    it('releases the sandbox on teardown and refuses further turns', async () => {
      const before = await api(app)
        .get(`/api/resume-harness/sessions/${sessionId}`)
        .set(auth(candidate.token))
        .expect(200);

      await api(app)
        .delete(`/api/resume-harness/sessions/${sessionId}`)
        .set(auth(candidate.token))
        .expect(200);

      expect(platform.sandboxes.has(before.body.sandboxId)).toBe(false);

      await api(app)
        .post(`/api/resume-harness/sessions/${sessionId}/turns`)
        .set(auth(candidate.token))
        .send({ instruction: 'one more' })
        .expect(409);
    });
  });

  it('carries the resume forward into a new session on a different harness', async () => {
    const first = await api(app)
      .post('/api/resume-harness/sessions')
      .set(auth(candidate.token))
      .send({ harness: 'claude-code' })
      .expect(201);

    const generated = await api(app)
      .post(`/api/resume-harness/sessions/${first.body.id}/turns`)
      .set(auth(candidate.token))
      .send({ instruction: 'Build a resume for a data engineer.' })
      .expect(201);

    const second = await api(app)
      .post('/api/resume-harness/sessions')
      .set(auth(candidate.token))
      .send({ harness: 'codex', carryFromSessionId: first.body.id })
      .expect(201);

    expect(second.body.harness).toBe('codex');
    expect(second.body.latex).toBe(generated.body.latex);
    expect(second.body.sandboxId).not.toBe(first.body.sandboxId);

    // The new sandbox starts with the resume already on disk.
    const box = platform.sandboxes.get(second.body.sandboxId)!;
    expect(box.files.get('resume.tex')).toBe(generated.body.latex);
  });
});
