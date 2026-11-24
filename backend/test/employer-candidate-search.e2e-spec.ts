import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { api, auth, createE2EApp, registerUser, resetDatabase, TestUser } from './utils/e2e-app';

describe('Employer candidate search (e2e)', () => {
  let app: INestApplication;
  let employer: TestUser;
  let candidate: TestUser;
  let maya: TestUser;
  let harkit: TestUser;
  let jobId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    await resetDatabase(app);
    employer = await registerUser(app, 'ROLE_EMPLOYER', 'search-employer');
    candidate = await registerUser(app, 'ROLE_CANDIDATE', 'ada');
    const connection = app.get<Connection>(getConnectionToken());
    const userId = new Types.ObjectId(candidate.id);
    await connection.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          name: 'Ada Lovelace',
          phone: '5550101000',
          linkedin: 'https://www.linkedin.com/in/ada-lovelace/',
          location: 'London',
        },
      },
    );

    const generated = await connection.collection('resumes').insertOne({
      userId,
      template: 'modern',
      name: 'Backend résumé',
      creationMethod: 'generated',
      status: 'ready',
      fullName: 'Ada Lovelace',
      email: candidate.email,
      phone: '5550101000',
      linkedin: 'linkedin.com/in/ada-lovelace',
      targetRole: 'Senior Backend Engineer',
      headline: 'Backend engineer',
      skills: ['TypeScript'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const compared = await connection.collection('resumes').insertOne({
      userId,
      template: 'modern',
      name: 'Compared résumé',
      creationMethod: 'imported',
      status: 'ready',
      fullName: 'Ada Lovelace',
      email: candidate.email,
      source: { jobUrl: 'https://jobs.example.com/open/platform-engineer' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await connection.collection('resumes').insertOne({
      userId,
      template: 'modern',
      name: 'Someone else',
      creationMethod: 'job_tailored',
      status: 'ready',
      fullName: 'Bob Other',
      email: 'bob@elsewhere.com',
      linkedin: 'https://www.linkedin.com/in/bob-other',
      targetRole: 'Nurse',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await connection.collection('resumes').insertOne({
      userId,
      template: 'modern',
      name: 'Archived',
      creationMethod: 'job_tailored',
      status: 'archived',
      fullName: 'Ada Lovelace',
      email: candidate.email,
      targetRole: 'Archived Role',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await connection.collection('resumes').insertOne({
      userId,
      template: 'modern',
      name: 'Draft',
      creationMethod: 'manual',
      status: 'draft',
      fullName: 'Ada Lovelace',
      email: candidate.email,
      targetRole: 'Manual Role',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await connection.collection('resumes').insertOne({
      userId,
      template: 'modern',
      name: 'Uncompared',
      creationMethod: 'imported',
      status: 'needs_review',
      fullName: 'Ada Lovelace',
      email: candidate.email,
      targetRole: 'Uncompared Role',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await connection.collection('candidate_ats_review_sessions').insertOne({
      userId,
      resumeId: compared.insertedId.toString(),
      status: 'completed',
      jobText: 'Role: Platform Engineer\nWe need someone who has shipped payments.',
      jobDescriptionHash: 'hash',
      resumeTextHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await connection.collection('resume_harness_sessions').insertOne(harness(userId, {
      name: 'Backend résumé',
      candidateName: 'Ada Lovelace',
      candidateMarkdown: facts({ name: 'Ada Lovelace', email: candidate.email, skills: 'TypeScript' }),
      targetRole: 'Senior Backend Engineer',
      jobUrl: 'https://jobs.example.com/staff-platform-engineer',
      jobDescription: 'This paragraph must not be returned to employers.',
    }));
    // Generated on Ada's account for someone else.
    await connection.collection('resume_harness_sessions').insertOne(harness(userId, {
      candidateName: 'Bob Other',
      candidateMarkdown: facts({ name: 'Bob Other', email: 'bob@elsewhere.com', skills: 'Nursing' }),
      targetRole: 'Nurse Recruiter',
    }));
    void generated;

    // Maya only has what the product actually stores: a compiled harness
    // résumé, and an imported résumé compared against a pasted job whose
    // review kept no jobText.
    maya = await registerUser(app, 'ROLE_CANDIDATE', 'maya');
    const mayaId = new Types.ObjectId(maya.id);
    await connection.collection('users').updateOne({ _id: mayaId }, { $set: { name: 'Maya Ellison' } });
    await connection.collection('resume_harness_sessions').insertOne(harness(mayaId, {
      name: 'Cloud Engineer',
      candidateName: 'Maya Ellison',
      candidateMarkdown: facts({ name: 'Maya Ellison', email: maya.email, skills: 'Kubernetes, Terraform' }),
      targetRole: 'Cloud Engineer',
      jobDescription: 'Select how often (in days) to receive an alert:\n\nCreate Alert',
    }));
    const mayaCompared = await connection.collection('resumes').insertOne({
      userId: mayaId,
      template: 'modern',
      name: 'Maya compare',
      creationMethod: 'imported',
      status: 'needs_review',
      fullName: 'Maya Ellison',
      email: maya.email,
      skills: ['React'],
      source: {
        jobDescription: 'Senior Full-Stack Engineer at Northwind Labs, Toronto (hybrid). Build the customer platform.',
        jobUrl: '',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await connection.collection('candidate_ats_review_sessions').insertOne({
      userId: mayaId,
      resumeId: mayaCompared.insertedId.toString(),
      status: 'completed',
      jobText: '',
      jobDescriptionHash: 'hash',
      resumeTextHash: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // An account that only stores a first name still owns its full-name résumé.
    harkit = await registerUser(app, 'ROLE_CANDIDATE', 'harkit');
    const harkitId = new Types.ObjectId(harkit.id);
    await connection.collection('users').updateOne({ _id: harkitId }, { $set: { name: 'Harkit' } });
    await connection.collection('resume_harness_sessions').insertOne(harness(harkitId, {
      candidateName: 'Harkit',
      candidateMarkdown: facts({ name: 'Harkit', email: harkit.email, skills: 'Java' }),
      targetRole: 'HARKIT CHHABRA_SOFTWARE ENGINEER',
    }));
    await connection.collection('resume_harness_sessions').insertOne(harness(harkitId, {
      candidateName: 'Kaouthar Wadjinny',
      candidateMarkdown: facts({ name: 'Kaouthar Wadjinny', email: 'kaouthar@elsewhere.com', skills: 'Payroll' }),
      targetRole: 'Kaouthar_Wadjinny_Resume (2)',
    }));

    // Another account wrote a résumé under Ada's name with no shared social.
    // A name alone must not hand it to Ada.
    const zed = await registerUser(app, 'ROLE_CANDIDATE', 'zed');
    await connection.collection('resumes').insertOne({
      userId: new Types.ObjectId(zed.id),
      template: 'modern',
      name: 'For Ada',
      creationMethod: 'job_tailored',
      status: 'ready',
      fullName: 'Ada Lovelace',
      targetRole: 'Astronaut',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const jobs = app.get<Model<any>>(getModelToken('EmployerJob'));
    const job = await jobs.create({
      ownerId: new Types.ObjectId(employer.id),
      title: 'Senior Full-Stack Engineer',
      skills: ['Payroll'],
    });
    jobId = String(job._id);
  });

  function harness(userId: Types.ObjectId, fields: Record<string, unknown>) {
    return {
      userId,
      harness: 'opencode',
      alias: 'test',
      provider: 'test',
      model: 'test',
      effort: 'low',
      modelLabel: 'test',
      status: 'ended',
      compiled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...fields,
    };
  }

  function facts(input: { name: string; email: string; skills: string }) {
    return `# Candidate facts\n\n## Identity\n\n- Name: ${input.name}\n- Email: ${input.email}\n\n## Skills\n\n${input.skills}\n`;
  }

  afterAll(async () => {
    await app?.close();
  });

  const closed = (status: number) => [401, 403].includes(status);

  it('returns the candidate and targeted roles, without the other person', async () => {
    const res = await api(app)
      .get('/api/employer/candidate-search')
      .query({ q: 'Ada' })
      .set(auth(employer.token));

    expect(res.status).toBe(200);
    expect(res.body.candidates).toHaveLength(1);
    expect(res.body.candidates[0].name).toBe('Ada Lovelace');
    expect(res.body.candidates[0].targetRoles).toEqual(
      expect.arrayContaining(['Senior Backend Engineer', 'Platform Engineer', 'staff platform engineer']),
    );
    const body = JSON.stringify(res.body);
    for (const absent of ['Nurse', 'Bob Other', 'bob@elsewhere.com', 'Archived Role', 'Manual Role', 'Uncompared Role', 'shipped payments', candidate.email]) {
      expect(body).not.toContain(absent);
    }
  });

  it('finds a compare-derived role and drops a role that belongs to someone else', async () => {
    const platform = await api(app)
      .get('/api/employer/candidate-search')
      .query({ role: 'Platform' })
      .set(auth(employer.token));
    expect(platform.status).toBe(200);
    expect(platform.body.candidates.map((row: { name: string }) => row.name)).toEqual(['Ada Lovelace']);

    const nurse = await api(app)
      .get('/api/employer/candidate-search')
      .query({ q: 'Ada', role: 'Nurse' })
      .set(auth(employer.token));
    expect(nurse.status).toBe(200);
    expect(nurse.body.candidates).toEqual([]);
  });

  const search = (query: Record<string, string>) =>
    api(app).get('/api/employer/candidate-search').query(query).set(auth(employer.token));

  it('finds a candidate whose only résumés are a generated session and a compared import', async () => {
    const byName = await search({ q: 'Maya' });
    expect(byName.status).toBe(200);
    expect(byName.body.total).toBe(1);
    expect(byName.body.candidates).toHaveLength(1);
    expect(byName.body.candidates[0].name).toBe('Maya Ellison');
    expect(byName.body.candidates[0].targetRoles).toEqual(
      expect.arrayContaining(['Cloud Engineer', 'Senior Full-Stack Engineer']),
    );
    expect(byName.body.candidates[0].skills).toEqual(expect.arrayContaining(['Kubernetes', 'React']));
    const body = JSON.stringify(byName.body);
    for (const absent of ['Northwind', 'receive an alert', maya.email]) expect(body).not.toContain(absent);

    const bySkill = await search({ q: 'terraform' });
    expect(bySkill.body.candidates.map((row: { name: string }) => row.name)).toEqual(['Maya Ellison']);

    const byRole = await search({ role: 'full-stack' });
    expect(byRole.body.candidates.map((row: { name: string }) => row.name)).toEqual(['Maya Ellison']);
    expect(byRole.body.candidates[0].matchedRoles).toEqual(['Senior Full-Stack Engineer']);
  });

  it('keeps a first-name account and leaves out the résumés it wrote for other people', async () => {
    const res = await search({ q: 'Harkit' });
    expect(res.status).toBe(200);
    expect(res.body.candidates).toHaveLength(1);
    expect(res.body.candidates[0].targetRoles).toEqual(['Software Engineer']);
    expect(JSON.stringify(res.body)).not.toContain('Kaouthar');

    for (const query of [{ q: 'Kaouthar' }, { q: 'Payroll' }, { q: 'Bob' }, { role: 'Nurse' }]) {
      const other = await search(query);
      expect(other.body.candidates).toEqual([]);
    }
  });

  it('does not give Ada a résumé another account wrote under her name', async () => {
    const res = await search({ q: 'Ada' });
    expect(JSON.stringify(res.body)).not.toContain('Astronaut');
    const astronaut = await search({ role: 'Astronaut' });
    expect(astronaut.body.candidates).toEqual([]);
  });

  it('recommends identity-matched candidates for a posted job', async () => {
    const res = await api(app)
      .get(`/api/employer/candidate-search/for-job/${jobId}`)
      .set(auth(employer.token));
    expect(res.status).toBe(200);
    expect(res.body.candidates.map((row: { name: string }) => row.name)).toEqual(['Maya Ellison']);
    expect(res.body.candidates[0].matchedRoles).toEqual(['Senior Full-Stack Engineer']);
  });

  it('rejects a candidate, an anonymous caller, and a blank query', async () => {
    const asCandidate = await api(app)
      .get('/api/employer/candidate-search')
      .query({ q: 'Ada' })
      .set(auth(candidate.token));
    expect(closed(asCandidate.status)).toBe(true);

    const anonymous = await api(app).get('/api/employer/candidate-search').query({ q: 'Ada' });
    expect(closed(anonymous.status)).toBe(true);

    const blank = await api(app)
      .get('/api/employer/candidate-search')
      .query({ q: '   ', role: ' ' })
      .set(auth(employer.token));
    expect(blank.status).toBe(400);
  });
});
