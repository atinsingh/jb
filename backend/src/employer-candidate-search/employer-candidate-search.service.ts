import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Resume, ResumeDocument } from '../schemas/resume.schema';
import {
  CandidateAtsReviewSession,
  CandidateAtsReviewSessionDocument,
} from '../resume-builder/schemas/candidate-ats-review-session.schema';
import {
  ResumeHarnessSession,
  ResumeHarnessSessionDocument,
} from '../resume-harness/schemas/resume-harness-session.schema';
import { jobRoleQuery, roleFits, skillFits } from './job-fit';
import { generatedResumeFromSession } from './generated-resume';
import { resumeMatchesAccount } from './resume-identity';
import { isSearchableResume, rolesForResume, shortTitle, RoleSession } from './target-roles';

const CAP = 200;
const SKILL_CAP = 20;
const ELIGIBLE_METHODS = ['ai_rewrite', 'job_tailored', 'generated', 'imported'];

export type CandidateSearchRow = {
  candidateId: string;
  name: string;
  headline: string;
  location: string;
  targetRoles: string[];
  matchedRoles: string[];
  skills: string[];
};

type SearchInput = {
  q?: string;
  role?: string;
  page?: number;
  limit?: number;
};

type Identity = { fullName?: string; email?: string; phone?: string; linkedin?: string };
type SearchDoc = { ownerId: string; identity: Identity; headline?: string; skills: string[]; roles: string[] };
type Found = { userIds: Set<string>; resumeIds: Set<string>; sessionIds: Set<string> };
type Account = {
  _id: unknown;
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  headline?: string;
  location?: string;
};

@Injectable()
export class EmployerCandidateSearchService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Resume.name) private readonly resumes: Model<ResumeDocument>,
    @InjectModel(CandidateAtsReviewSession.name)
    private readonly reviews: Model<CandidateAtsReviewSessionDocument>,
    @InjectModel(ResumeHarnessSession.name)
    private readonly sessions: Model<ResumeHarnessSessionDocument>,
  ) {}

  async search(input: SearchInput): Promise<{ candidates: CandidateSearchRow[]; page: number; limit: number; total: number }> {
    const q = input.q?.trim() || '';
    const role = input.role?.trim() || '';
    if (!q && !role) throw new BadRequestException('Provide a name or a role');
    const page = Number.isFinite(input.page) && (input.page as number) > 0 ? Math.floor(input.page as number) : 1;
    const limit = Number.isFinite(input.limit) && (input.limit as number) > 0
      ? Math.min(50, Math.floor(input.limit as number))
      : 20;

    const found = emptyFound();
    if (q) await this.discoverQuery(q, found);
    if (role) await this.discoverRole(role, found);
    const rows = await this.matchedRows(found, { q, role });
    rows.sort((a, b) => a.name.localeCompare(b.name));
    const start = (page - 1) * limit;
    return { candidates: rows.slice(start, start + limit), page, limit, total: rows.length };
  }

  async recommend(input: { title?: string; skills?: string[] }): Promise<{ candidates: CandidateSearchRow[] }> {
    const title = input.title?.trim() || '';
    const skills = (input.skills || []).map((skill) => skill.trim()).filter(Boolean);
    const role = jobRoleQuery(title);
    if (!role && !skills.length) return { candidates: [] };
    const found = emptyFound();
    if (role) await this.discoverRole(role, found);
    if (skills.length) await this.discoverSkills(skills, found);
    const rows = await this.matchedRows(found);
    const candidates = rows
      .filter((row) => row.targetRoles.some((target) => roleFits(title, target)) || skillFits(skills, row.skills))
      .map((row) => ({
        ...row,
        matchedRoles: row.targetRoles.filter((target) => roleFits(title, target)),
      }));
    candidates.sort((a, b) => a.name.localeCompare(b.name));
    return { candidates: candidates.slice(0, 20) };
  }

  private async discoverQuery(q: string, found: Found) {
    // shortcut: first 200 name, résumé and session hits, raise when the corpus needs an index
    const name = contains(q);
    const named = await this.users
      .find({ role: 'ROLE_CANDIDATE', name })
      .limit(CAP)
      .select('_id')
      .lean();
    for (const user of named) found.userIds.add(String(user._id));
    const byText = await this.resumes
      .find({ status: { $ne: 'archived' }, $or: [{ fullName: name }, { headline: name }, { skills: name }] })
      .limit(CAP)
      .select('_id userId')
      .lean();
    for (const resume of byText) remember(found, 'resumeIds', resume.userId, resume._id);
    const bySession = await this.sessions
      .find({ $or: [{ candidateName: name }, { candidateMarkdown: name }] })
      .limit(CAP)
      .select('_id userId')
      .lean();
    for (const session of bySession) remember(found, 'sessionIds', session.userId, session._id);
  }

  private async discoverRole(role: string, found: Found) {
    const roleMatch = contains(role);
    const byRole = await this.resumes
      .find({
        status: { $ne: 'archived' },
        $or: [{ targetRole: roleMatch }, { headline: roleMatch }, { 'source.jobDescription': roleMatch }],
      })
      .limit(CAP)
      .select('_id userId')
      .lean();
    for (const resume of byRole) remember(found, 'resumeIds', resume.userId, resume._id);
    const escaped = escapeRegex(role);
    const titled = await this.reviews
      .find({
        status: 'completed',
        $or: [
          { jobText: new RegExp(`(?:^|\\n)\\s*(?:job title|title|role|position)\\s*[:\\-][^\\n]{0,80}${escaped}`, 'i') },
          { jobText: new RegExp(`^\\s*${escaped}`, 'i') },
        ],
      })
      .limit(CAP)
      .select('resumeId userId')
      .lean();
    for (const review of titled) remember(found, 'resumeIds', review.userId, review.resumeId);
    const bySession = await this.sessions
      .find({ $or: [{ targetRole: roleMatch }, { name: roleMatch }, { jobDescription: roleMatch }] })
      .limit(CAP)
      .select('_id userId')
      .lean();
    for (const session of bySession) remember(found, 'sessionIds', session.userId, session._id);
  }

  private async discoverSkills(skills: string[], found: Found) {
    const capped = skills.slice(0, SKILL_CAP);
    const skillOr = capped.map((skill) => ({ skills: new RegExp(`^${escapeRegex(skill)}$`, 'i') }));
    const bySkill = await this.resumes
      .find({ status: { $ne: 'archived' }, $or: skillOr })
      .limit(CAP)
      .select('_id userId')
      .lean();
    for (const resume of bySkill) remember(found, 'resumeIds', resume.userId, resume._id);
    const bySession = await this.sessions
      .find({ $or: capped.map((skill) => ({ candidateMarkdown: contains(skill) })) })
      .limit(CAP)
      .select('_id userId')
      .lean();
    for (const session of bySession) remember(found, 'sessionIds', session.userId, session._id);
  }

  private async matchedRows(found: Found, filter: { q?: string; role?: string } = {}): Promise<CandidateSearchRow[]> {
    const q = filter.q || '';
    const role = filter.role || '';
    const userIds = objectIds(found.userIds);
    const resumeIds = objectIds(found.resumeIds);
    const sessionIds = objectIds(found.sessionIds);
    if (!userIds.length && !resumeIds.length && !sessionIds.length) return [];

    // Cross-account attach: only a discovered candidate's own email pulls in documents, never a name.
    const people = userIds.length
      ? await this.users
          .find({ _id: { $in: userIds }, role: 'ROLE_CANDIDATE' })
          .limit(CAP)
          .select('email')
          .lean()
      : [];
    const emails = [...new Set(people.map((person) => String(person.email || '').trim()).filter(Boolean))];

    const resumeScope: Record<string, unknown>[] = [];
    if (userIds.length) resumeScope.push({ userId: { $in: userIds } });
    if (resumeIds.length) resumeScope.push({ _id: { $in: resumeIds } });
    for (const email of emails) resumeScope.push({ email: emailMatch(email) });
    const loaded = resumeScope.length
      ? await this.resumes
          .find({
            status: { $ne: 'archived' },
            $and: [
              { $or: resumeScope },
              { $or: [{ creationMethod: { $in: ELIGIBLE_METHODS } }, { source: 'generated' }] },
            ],
          })
          .lean()
      : [];

    const sessionScope: Record<string, unknown>[] = [];
    if (userIds.length) sessionScope.push({ userId: { $in: userIds } });
    if (sessionIds.length) sessionScope.push({ _id: { $in: sessionIds } });
    for (const email of emails) sessionScope.push({ candidateMarkdown: emailLine(email) });
    const sessionRows = sessionScope.length
      ? await this.sessions
          .find({ $or: sessionScope })
          .limit(CAP)
          .select('userId candidateName candidateMarkdown targetRole name jobDescription jobUrl compiled turns.compiled archivedAt')
          .lean()
      : [];

    const imported = loaded.filter((resume) => resume.creationMethod === 'imported');
    const reviewRows = imported.length
      ? await this.reviews
          .find({
            status: 'completed',
            resumeId: { $in: imported.map((resume) => String(resume._id)) },
          })
          .select('resumeId userId jobText')
          .lean()
      : [];
    const reviewsByResume = new Map<string, Array<{ jobText?: string }>>();
    for (const review of reviewRows) {
      const key = String(review.resumeId);
      const list = reviewsByResume.get(key) || [];
      list.push({ jobText: review.jobText });
      reviewsByResume.set(key, list);
    }

    const sessionDocs: Array<{ doc: SearchDoc; role: RoleSession }> = [];
    for (const row of sessionRows) {
      const generated = generatedResumeFromSession(row);
      if (!generated) continue;
      sessionDocs.push({
        doc: {
          ownerId: String(row.userId),
          identity: {
            fullName: generated.fullName,
            email: generated.email,
            phone: generated.phone,
            linkedin: generated.linkedin,
          },
          headline: shortTitle(generated.headline),
          skills: generated.skills,
          roles: generated.roles,
        },
        role: { targetRole: row.targetRole, name: row.name, jobUrl: row.jobUrl },
      });
    }

    const resumeDocs: SearchDoc[] = [];
    for (const resume of loaded) {
      const reviews = reviewsByResume.get(String(resume._id)) || [];
      if (!isSearchableResume(resume, reviews.length > 0)) continue;
      const ownerId = String(resume.userId);
      const identity: Identity = {
        fullName: resume.fullName,
        email: resume.email,
        phone: resume.phone,
        linkedin: resume.linkedin,
      };
      // A session only lends a role to a résumé when it describes the same person.
      const sessions = sessionDocs
        .filter((entry) => entry.doc.ownerId === ownerId && sameIdentity(entry.doc.identity, identity))
        .map((entry) => entry.role);
      const roles: string[] = [];
      for (const review of reviews.length ? reviews : [{ jobText: undefined }]) {
        roles.push(...rolesForResume(resume, { jobText: review.jobText, sessions }));
      }
      resumeDocs.push({
        ownerId,
        identity,
        headline: shortTitle(resume.headline),
        skills: resume.skills || [],
        roles: dedupe(roles),
      });
    }

    const docs = [...resumeDocs, ...sessionDocs.map((entry) => entry.doc)];
    const ownerIds = objectIds(new Set([...found.userIds, ...docs.map((doc) => doc.ownerId)]));
    const docEmails = [...new Set(docs.map((doc) => (doc.identity.email || '').trim()).filter(Boolean))];
    const ownerScope: Record<string, unknown>[] = [];
    if (ownerIds.length) ownerScope.push({ _id: { $in: ownerIds } });
    for (const email of docEmails) ownerScope.push({ email: emailMatch(email) });
    const owners: Account[] = ownerScope.length
      ? await this.users
          .find({ role: 'ROLE_CANDIDATE', $or: ownerScope })
          .limit(CAP)
          .select('name email phone linkedin headline location')
          .lean()
      : [];

    const rows: CandidateSearchRow[] = [];
    for (const user of owners) {
      const included = docs.filter((doc) => attributes(user, doc));
      if (!included.length) continue;
      if (q && !matchesQuery(user.name, included, q)) continue;

      const roleList: string[] = [];
      for (const doc of included) roleList.push(...doc.roles);
      const targetRoles = dedupe(roleList);
      const matchedRoles = role
        ? targetRoles.filter((title) => title.toLowerCase().includes(role.toLowerCase()))
        : [];
      if (role && !matchedRoles.length) continue;

      const skills: string[] = [];
      const seenSkills = new Set<string>();
      for (const doc of included) {
        for (const skill of doc.skills) {
          const cleaned = skill.trim();
          const key = cleaned.toLowerCase();
          if (!cleaned || seenSkills.has(key) || skills.length >= SKILL_CAP) continue;
          seenSkills.add(key);
          skills.push(cleaned);
        }
      }
      const headline =
        (user.headline || '').trim() ||
        included.map((doc) => doc.headline).find(Boolean) ||
        '';
      rows.push({
        candidateId: String(user._id),
        name: user.name || '',
        headline,
        location: user.location || '',
        targetRoles,
        matchedRoles,
        skills,
      });
    }

    return rows;
  }
}

function emptyFound(): Found {
  return { userIds: new Set(), resumeIds: new Set(), sessionIds: new Set() };
}

function contains(value: string): RegExp {
  return new RegExp(escapeRegex(value), 'i');
}

function emailMatch(email: string): RegExp {
  return new RegExp(`^${escapeRegex(email)}$`, 'i');
}

/** Harness sessions keep the contact block as a `- Email: ...` line in candidateMarkdown. */
function emailLine(email: string): RegExp {
  return new RegExp(`(?:^|\\n)- Email: ${escapeRegex(email)}[ \\t]*(?:\\r?\\n|$)`, 'i');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function objectIds(ids: Set<string>): Types.ObjectId[] {
  return [...ids].filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
}

function remember(found: Found, kind: 'resumeIds' | 'sessionIds', userId: unknown, docId: unknown) {
  if (userId) found.userIds.add(String(userId));
  if (docId && Types.ObjectId.isValid(String(docId))) found[kind].add(String(docId));
}

function sameIdentity(left: Identity, right: Identity): boolean {
  return resumeMatchesAccount(
    { name: left.fullName, email: left.email, phone: left.phone, linkedin: left.linkedin },
    right,
  );
}

/** A document counts for an account only when it describes that person and is theirs or shares their email. */
function attributes(user: Account, doc: SearchDoc): boolean {
  if (!resumeMatchesAccount(user, doc.identity)) return false;
  if (doc.ownerId === String(user._id)) return true;
  const email = (doc.identity.email || '').trim().toLowerCase();
  return !!email && email === String(user.email || '').trim().toLowerCase();
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const cleaned = value.trim();
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}

function matchesQuery(name: string | undefined, docs: SearchDoc[], q: string): boolean {
  const needle = q.toLowerCase();
  if ((name || '').toLowerCase().includes(needle)) return true;
  return docs.some(
    (doc) =>
      (doc.identity.fullName || '').toLowerCase().includes(needle) ||
      (doc.headline || '').toLowerCase().includes(needle) ||
      doc.skills.some((skill) => skill.toLowerCase().includes(needle)),
  );
}
