/**
 * Live selector validation — prepares against real postings and NEVER submits.
 *
 * This script is what promotes the adapters from "believed correct" to
 * "measured". Every selector in greenhouse/lever/ashby was written by reading
 * markup, not by driving a live form, and the alpha runbook has flagged that
 * gap as the thing blocking AUTO_APPLICATION_ENABLED for months.
 *
 * It answers one question per ATS: on real postings, what fraction of the
 * fields we need can we actually find and fill?
 *
 * SAFETY: `submit()` is never called. The script drives introspect + fill only,
 * so it cannot send an application even by accident, and it refuses to run at
 * all if AUTO_APPLICATION_ENABLED is on — a dry run against a live-submitting
 * configuration is exactly the mistake this is meant to prevent.
 *
 *   npx ts-node src/scripts/apply-dry-run.ts --ats greenhouse --urls a,b,c
 *   npx ts-node src/scripts/apply-dry-run.ts --ats lever --file urls.txt
 *
 * Exits non-zero when mean coverage is below the bar, so CI can gate on it.
 */
import { promises as fs } from 'fs';
import { AtsAdapterRegistry } from '../apply-runner/ats/ats-adapter.registry';
import { computeFormFingerprint } from '../apply-runner/ats/form-fingerprint';
import type { FormField } from '../answers/form-schema.types';

/** The bar from the design spec: 95% of required fields, 20 postings per ATS. */
const COVERAGE_BAR = Number(process.env.DRY_RUN_COVERAGE_BAR || 0.95);
const RECOMMENDED_SAMPLE = 20;

interface Args {
  ats?: string;
  urls: string[];
  bar: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { urls: [], bar: COVERAGE_BAR };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--ats') args.ats = value;
    if (flag === '--urls') args.urls = (value || '').split(',').map((u) => u.trim()).filter(Boolean);
    if (flag === '--bar') args.bar = Number(value);
    if (flag === '--file') args.urls = ['@' + value];
  }
  return args;
}

async function resolveUrls(urls: string[]): Promise<string[]> {
  if (urls.length === 1 && urls[0].startsWith('@')) {
    const contents = await fs.readFile(urls[0].slice(1), 'utf8');
    return contents.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  }
  return urls;
}

interface Result {
  url: string;
  ok: boolean;
  atsType?: string;
  fieldCount?: number;
  requiredCount?: number;
  coverage?: number;
  fingerprint?: string;
  unfilled?: string[];
  error?: string;
}

/**
 * Synthetic answers for every field the form asks for.
 *
 * The point is to measure whether the adapter can FIND and SET each control,
 * not whether our answers are correct — so every field gets a plausible value
 * of the right shape. Real answer resolution is tested separately.
 */
function syntheticAnswers(fields: FormField[]): Record<string, any> {
  const answers: Record<string, any> = {};
  for (const f of fields) {
    if (f.type === 'file') continue;
    if (f.options && f.options.length) {
      answers[f.name] = f.options[0].value;
    } else if (f.type === 'checkbox') {
      answers[f.name] = true;
    } else if (f.type === 'number') {
      answers[f.name] = 1;
    } else if (f.type === 'date') {
      answers[f.name] = '2026-01-01';
    } else {
      answers[f.name] = 'Jobocate dry run';
    }
  }
  return answers;
}

async function run(): Promise<void> {
  if (process.env.AUTO_APPLICATION_ENABLED === 'true') {
    console.error(
      'Refusing to run: AUTO_APPLICATION_ENABLED is true. Run the dry run with submission disabled.',
    );
    process.exit(2);
  }

  const args = parseArgs(process.argv.slice(2));
  const urls = await resolveUrls(args.urls);

  if (!urls.length) {
    console.error('No URLs given. Use --urls a,b,c or --file urls.txt');
    process.exit(2);
  }

  const registry = new AtsAdapterRegistry();
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });

  const results: Result[] = [];

  try {
    for (const url of urls) {
      const adapter = registry.resolve(url);

      if (!adapter) {
        results.push({ url, ok: false, error: 'no adapter matches this URL' });
        continue;
      }
      if (!adapter.capabilities.headlessPrepare) {
        results.push({ url, ok: false, atsType: adapter.atsType, error: 'consent handoff only' });
        continue;
      }
      if (args.ats && adapter.atsType !== args.ats) continue;

      const page = await browser.newPage();
      try {
        const schema = await adapter.introspect({ page, applyUrl: url });

        // A form with no fields is a TOTAL introspection failure, not a perfect
        // score. `fill` divides by the number of fields it was asked to fill, so
        // zero fields yields coverage 1.0 — which once made this harness report
        // PASS on pages where it had found nothing at all. A gate that cannot
        // fail is worse than no gate: it manufactures the evidence used to turn
        // real submissions on.
        if (schema.fields.length === 0) {
          results.push({
            url,
            ok: false,
            atsType: adapter.atsType,
            error: 'no form fields found — the page did not render a form we can read',
          });
          continue;
        }

        const answers = syntheticAnswers(schema.fields);
        const report = await adapter.fill({ page, applyUrl: url }, answers, {});

        results.push({
          url,
          ok: true,
          atsType: adapter.atsType,
          fieldCount: schema.fields.length,
          requiredCount: schema.fields.filter((f) => f.required).length,
          coverage: report.coverage,
          fingerprint: computeFormFingerprint(schema.fields),
          unfilled: report.skipped.map((s) => `${s.name}: ${s.reason}`),
        });
      } catch (err) {
        results.push({
          url,
          ok: false,
          atsType: adapter.atsType,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        await page.close().catch(() => undefined);
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
  }

  report(results, args.bar);
}

function report(results: Result[], bar: number): void {
  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  console.log('\n=== Jobocate apply dry run — NOTHING WAS SUBMITTED ===\n');

  for (const r of results) {
    if (!r.ok) {
      console.log(`  ✗ ${r.url}\n      ${r.error}`);
      continue;
    }
    const pct = Math.round((r.coverage || 0) * 100);
    const mark = (r.coverage || 0) >= bar ? '✓' : '✗';
    console.log(
      `  ${mark} [${r.atsType}] ${pct}% coverage · ${r.fieldCount} fields (${r.requiredCount} required) · ${r.url}`,
    );
    for (const u of (r.unfilled || []).slice(0, 5)) console.log(`        unfilled: ${u}`);
  }

  const byAts = new Map<string, Result[]>();
  for (const r of succeeded) {
    const key = r.atsType || 'unknown';
    byAts.set(key, [...(byAts.get(key) || []), r]);
  }

  console.log('\n--- summary ---');
  let passes = true;

  for (const [ats, rows] of byAts) {
    const mean = rows.reduce((a, r) => a + (r.coverage || 0), 0) / rows.length;
    const ok = mean >= bar;
    if (!ok) passes = false;

    console.log(
      `  ${ok ? 'PASS' : 'FAIL'} ${ats}: mean coverage ${Math.round(mean * 100)}% ` +
        `over ${rows.length} posting(s) (bar ${Math.round(bar * 100)}%)`,
    );

    if (rows.length < RECOMMENDED_SAMPLE) {
      console.log(
        `       note: ${rows.length} posting(s) is below the recommended sample of ${RECOMMENDED_SAMPLE}; ` +
          'the result is indicative, not sufficient to enable submission.',
      );
    }
  }

  if (failed.length) {
    console.log(`  ${failed.length} URL(s) could not be prepared at all.`);
    passes = false;
  }

  console.log(
    passes
      ? '\nCoverage bar met. This is one input to enabling AUTO_APPLICATION_ENABLED, not a substitute for the rest of the go-live checklist.\n'
      : '\nCoverage bar NOT met. Do not enable AUTO_APPLICATION_ENABLED.\n',
  );

  process.exit(passes ? 0 : 1);
}

run().catch((err) => {
  console.error('Dry run crashed:', err);
  process.exit(3);
});
