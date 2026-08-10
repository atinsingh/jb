import { ParsedJob } from './adapter.interface';

/** Safe dot-path getter: pick(obj, 'company.name'). Returns undefined if absent. */
export function pick(obj: unknown, path: string): unknown {
  if (!obj || !path) return undefined;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (
      acc &&
      typeof acc === 'object' &&
      key in (acc as Record<string, unknown>)
    ) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function asString(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

function asStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v))
    return v.map((x) => asString(x)).filter((x): x is string => !!x);
  const s = asString(v);
  if (s)
    return s
      .split(/[;,\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
  return undefined;
}

/**
 * The field mapping stored in IngestionSource.parseConfig.fieldMap. Each value is
 * a dot-path into a feed item. Only sourceJobKey is conceptually required; the
 * adapters fall back to sensible defaults / synthesized keys when absent.
 */
export type FieldMap = Partial<Record<keyof ParsedJob, string>>;

/**
 * Apply a field map to one raw feed item, producing a ParsedJob. Keeps the
 * original item under `raw` for provenance/debug.
 */
export function applyFieldMap(
  item: Record<string, unknown>,
  fieldMap: FieldMap,
): ParsedJob {
  const get = (field: keyof ParsedJob): unknown => {
    const path = fieldMap[field];
    return path ? pick(item, path) : undefined;
  };

  const job: ParsedJob = {
    sourceJobKey: asString(get('sourceJobKey')) || '',
    title: asString(get('title')),
    company: asString(get('company')),
    companyDomain: asString(get('companyDomain')),
    location: asString(get('location')),
    descriptionHtml: asString(get('descriptionHtml')),
    applyUrl: asString(get('applyUrl')),
    sourceUrl: asString(get('sourceUrl')),
    postedAt: asString(get('postedAt')),
    expiresAt: asString(get('expiresAt')),
    employmentType: asString(get('employmentType')),
    workplaceType: asString(get('workplaceType')),
    remote:
      get('remote') === true ||
      asString(get('remote'))?.toLowerCase() === 'true' ||
      asString(get('remote'))?.toLowerCase() === 'remote',
    seniority: asString(get('seniority')),
    salaryText: asString(get('salaryText')),
    salaryMin: numberOrUndef(get('salaryMin')),
    salaryMax: numberOrUndef(get('salaryMax')),
    salaryCurrency: asString(get('salaryCurrency')),
    salaryPeriod: asString(get('salaryPeriod')),
    skills: asStringArray(get('skills')),
    requirements: asStringArray(get('requirements')),
    language: asString(get('language')),
    raw: item,
  };
  return job;
}

function numberOrUndef(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n =
    typeof v === 'number' ? v : Number(String(v).replace(/[,$\s]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/** Locate the array of items in a JSON feed given an optional dot-path. */
export function locateItems(
  root: unknown,
  itemsPath?: string,
): Record<string, unknown>[] {
  if (itemsPath) {
    const at = pick(root, itemsPath);
    if (Array.isArray(at)) return at as Record<string, unknown>[];
    return [];
  }
  if (Array.isArray(root)) return root as Record<string, unknown>[];
  // Common wrapper keys.
  for (const key of [
    'jobs',
    'data',
    'results',
    'items',
    'postings',
    'listings',
  ]) {
    const at = pick(root, key);
    if (Array.isArray(at)) return at as Record<string, unknown>[];
  }
  return [];
}
