/**
 * Migrate string-valued reference ids to real ObjectIds.
 *
 * WHY THIS EXISTS
 * Every schema used to declare references as `@Prop({ type: Types.ObjectId })`,
 * passing mongoose's BSON ObjectId *class*. Under @nestjs/mongoose's
 * SchemaFactory that silently produces a **Mixed** path instead of an ObjectId
 * one, so mongoose never cast anything: whatever a caller passed is what got
 * stored. Code that wrote `new Types.ObjectId(id)` stored ObjectIds, code that
 * wrote a plain string stored strings, and a query using the other form matched
 * nothing. (That is exactly how the employer pipeline ended up permanently
 * empty: the apply-bridge wrote ObjectIds, the list query passed a string.)
 *
 * The schemas now use `Schema.Types.ObjectId`, so mongoose casts on both read
 * and write. New data is consistent — but rows written *before* the fix may
 * still hold strings, and those no longer match a cast query. This script
 * rewrites them.
 *
 * USAGE
 *   npm run db:migrate-objectid            # dry run — reports, changes nothing
 *   npm run db:migrate-objectid -- --apply # perform the migration
 *
 * Reads MONGODB_URI (via .env) like the rest of the app. Safe to re-run: rows
 * already holding ObjectIds are not selected.
 */
import * as fs from 'fs';
import * as path from 'path';
import mongoose, { Types } from 'mongoose';
import '../load-env';

const APPLY = process.argv.includes('--apply');
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

interface Target {
  collection: string;
  field: string;
}

/** Every `*.schema.ts` under src/, so this stays correct as schemas are added. */
function schemaFiles(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) schemaFiles(p, found);
    else if (entry.name.endsWith('.schema.ts')) found.push(p);
  }
  return found;
}

/**
 * Collect (collection, field) pairs for every ObjectId-typed reference path.
 *
 * The collection name comes from registering the schema under its class name,
 * which is what `MongooseModule.forFeature({ name: X.name })` does — so the
 * pluralisation matches the running app rather than being guessed.
 */
function collectTargets(): Target[] {
  const targets: Target[] = [];
  const skipped: string[] = [];

  for (const file of schemaFiles(path.join(__dirname, '..'))) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(file);
    for (const exportName of Object.keys(mod)) {
      const schema = mod[exportName];
      if (!schema || typeof schema.eachPath !== 'function') continue;

      const modelName = exportName.replace(/Schema$/, '');
      if (!mod[modelName]) continue;

      const model = mongoose.models[modelName]
        ? mongoose.model(modelName)
        : mongoose.model(modelName, schema);

      schema.eachPath((name: string, type: any) => {
        if (type.instance !== 'ObjectId' || !type.options?.ref) return;
        if (name.includes('.')) {
          // Nested/array paths need a positional update; report instead of
          // silently doing nothing.
          skipped.push(`${model.collection.name}.${name}`);
          return;
        }
        targets.push({ collection: model.collection.name, field: name });
      });
    }
  }

  if (skipped.length) {
    console.log(
      `\n⚠️  ${skipped.length} nested reference path(s) not handled (convert manually if used):`,
    );
    skipped.forEach((s) => console.log(`   - ${s}`));
  }

  return targets;
}

async function main(): Promise<void> {
  const uri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/jobocate';
  console.log(`${APPLY ? '🔧 APPLYING' : '🔍 DRY RUN'} — ${uri}\n`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const targets = collectTargets();
  console.log(`Scanning ${targets.length} reference fields...\n`);

  let totalConverted = 0;
  let totalInvalid = 0;
  let totalConflicts = 0;

  for (const { collection, field } of targets) {
    const col = db.collection(collection);
    const docs = await col
      .find({ [field]: { $type: 'string' } }, { projection: { [field]: 1 } })
      .toArray();
    if (!docs.length) continue;

    const ops: any[] = [];
    let invalid = 0;
    for (const doc of docs) {
      const value = String((doc as any)[field]);
      if (!OBJECT_ID_RE.test(value)) {
        invalid++;
        continue;
      }
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { [field]: new Types.ObjectId(value) } },
        },
      });
    }

    let conflicts = 0;
    if (APPLY && ops.length) {
      try {
        // Unordered: one conflicting row must not abandon the rest of the batch.
        await col.bulkWrite(ops, { ordered: false });
      } catch (err: any) {
        // E11000 means the collection holds BOTH a string-keyed and an
        // ObjectId-keyed row for the same owner under a unique index — real
        // duplicate data. Report it; merging is a judgement call, not something
        // a migration should silently decide.
        const writeErrors = err?.writeErrors ?? [];
        conflicts = writeErrors.length;
        if (!conflicts || err?.code !== 11000) throw err;
        totalConflicts += conflicts;
        writeErrors.slice(0, 5).forEach((e: any) =>
          console.log(`     ↳ conflict: ${e.err?.errmsg ?? e.errmsg}`),
        );
      }
    }

    totalConverted += ops.length - conflicts;
    totalInvalid += invalid;
    console.log(
      `  ${collection}.${field}: ${ops.length - conflicts} converted` +
        (invalid ? `, ${invalid} NOT a valid ObjectId (left as-is)` : '') +
        (conflicts ? `, ${conflicts} BLOCKED by a unique-index conflict` : ''),
    );
  }

  console.log(
    `\n${APPLY ? '✅ Converted' : 'Would convert'} ${totalConverted} value(s)` +
      (totalInvalid ? `; ${totalInvalid} left untouched (not ObjectId-shaped)` : ''),
  );
  if (totalConflicts) {
    console.log(
      `⚠️  ${totalConflicts} value(s) blocked by unique-index conflicts — the collection holds ` +
        'duplicate rows for the same owner (one string-keyed, one ObjectId-keyed). Resolve those ' +
        'documents, then re-run.',
    );
  }
  if (!APPLY && totalConverted > 0) {
    console.log('Re-run with --apply to perform the migration.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
