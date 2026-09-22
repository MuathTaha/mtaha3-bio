#!/usr/bin/env node
/**
 * Sync Work — Experience entries into Sanity from a JSON file.
 *
 *   node scripts/import-experience.mjs --list
 *   node scripts/import-experience.mjs scripts/experience.json           # dry run
 *   node scripts/import-experience.mjs scripts/experience.json --apply
 *   node scripts/import-experience.mjs scripts/experience.json --apply --prune
 *
 * Needs NEXT_PUBLIC_SANITY_PROJECT_ID and a token in SANITY_API_WRITE_TOKEN
 * (an Editor token). Writing is opt-in: without --apply nothing is sent.
 *
 * Entries are matched to existing documents by `_id` when given, otherwise by
 * company + job title, so re-running updates in place instead of duplicating.
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const dataPath = args.find((a) => !a.startsWith('--'));
const APPLY = flags.has('--apply');
const PRUNE = flags.has('--prune');
const LIST = flags.has('--list');

const key = () => randomUUID().replace(/-/g, '').slice(0, 12);

/** Turn plain bullet strings into Portable Text blocks for the `body` field. */
export function toPortableText(achievements = []) {
  return achievements.map((text) => ({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    markDefs: [],
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
  }));
}

const DATE_RE = /^\d{4}-\d{2}(-\d{2})?$/;

/** Validate one entry against the Sanity schema's rules. Returns error strings. */
export function validate(entry, i) {
  const errs = [];
  const at = `entry ${i + 1} (${entry.title ?? '?'} · ${entry.company ?? '?'})`;
  if (!entry.title) errs.push(`${at}: "title" is required`);
  if (!entry.company) errs.push(`${at}: "company" is required`);
  if (!entry.startDate) errs.push(`${at}: "startDate" is required`);
  for (const f of ['startDate', 'endDate']) {
    if (entry[f] && !DATE_RE.test(entry[f])) {
      errs.push(`${at}: "${f}" must be YYYY-MM or YYYY-MM-DD, got "${entry[f]}"`);
    }
  }
  if (entry.summary && entry.summary.length > 280) {
    errs.push(`${at}: "summary" is ${entry.summary.length} chars, max is 280`);
  }
  return errs;
}

/** Map an entry to the Sanity document fields. */
export function buildFields(entry) {
  const fields = {
    title: entry.title,
    company: entry.company,
    startDate: entry.startDate,
  };
  for (const f of ['companyUrl', 'location', 'summary', 'endDate', 'order']) {
    if (entry[f] !== undefined && entry[f] !== null && entry[f] !== '') fields[f] = entry[f];
  }
  if (entry.achievements?.length) fields.body = toPortableText(entry.achievements);
  return fields;
}

const norm = (s) => (s ?? '').trim().toLowerCase();
const matches = (entry, doc) =>
  entry._id ? entry._id === doc._id : norm(entry.company) === norm(doc.company) && norm(entry.title) === norm(doc.title);

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-04-25';
  const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN;

  if (!projectId) throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is not set.');
  if (!token) throw new Error('No token: set SANITY_API_WRITE_TOKEN (Editor) to write.');
  if (APPLY && !process.env.SANITY_API_WRITE_TOKEN) {
    throw new Error('--apply needs SANITY_API_WRITE_TOKEN; a read token cannot write.');
  }

  const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

  const existing = await client.fetch(
    `*[_type == "experience"] | order(startDate desc) {
       _id, title, company, companyUrl, location, startDate, endDate, summary, order
     }`
  );

  if (LIST || !dataPath) {
    console.log(`\n${existing.length} experience document(s) in ${projectId}/${dataset}:\n`);
    for (const d of existing) {
      console.log(`  ${d._id}`);
      console.log(`    ${d.title} · ${d.company}`);
      console.log(`    ${d.startDate ?? '?'} → ${d.endDate ?? 'Present'}${d.location ? ` · ${d.location}` : ''}`);
      if (d.summary) console.log(`    "${d.summary.slice(0, 80)}${d.summary.length > 80 ? '…' : ''}"`);
      console.log('');
    }
    if (!dataPath) console.log('Pass a JSON file to sync. Nothing was changed.\n');
    if (!dataPath) return;
  }

  const entries = JSON.parse(readFileSync(dataPath, 'utf8'));
  if (!Array.isArray(entries)) throw new Error(`${dataPath} must contain a JSON array.`);

  const errors = entries.flatMap(validate);
  if (errors.length) {
    console.error('\nValidation failed:\n' + errors.map((e) => `  - ${e}`).join('\n') + '\n');
    process.exitCode = 1;
    return;
  }

  const plan = entries.map((entry) => {
    const doc = existing.find((d) => matches(entry, d));
    return { entry, doc, action: doc ? 'update' : 'create', fields: buildFields(entry) };
  });
  const stale = existing.filter((d) => !entries.some((e) => matches(e, d)));

  console.log(`\n${APPLY ? 'Applying' : 'Dry run'} — ${projectId}/${dataset}\n`);
  for (const p of plan) {
    console.log(`  ${p.action.toUpperCase().padEnd(6)} ${p.entry.title} · ${p.entry.company}`);
    console.log(`         ${p.fields.startDate} → ${p.fields.endDate ?? 'Present'}`);
    if (p.doc) console.log(`         (${p.doc._id})`);
  }
  for (const d of stale) {
    console.log(`  ${PRUNE ? 'DELETE' : 'STALE '} ${d.title} · ${d.company}  (${d._id})`);
  }
  if (stale.length && !PRUNE) {
    console.log('\n  Entries marked STALE are not in your JSON. Re-run with --prune to delete them.');
  }

  if (!APPLY) {
    console.log('\nDry run only — nothing was written. Re-run with --apply to commit.\n');
    return;
  }

  const tx = client.transaction();
  for (const p of plan) {
    if (p.doc) {
      // Clear endDate explicitly so a role that became current renders "Present".
      const unset = p.fields.endDate ? [] : ['endDate'];
      tx.patch(p.doc._id, (patch) => (unset.length ? patch.set(p.fields).unset(unset) : patch.set(p.fields)));
    } else {
      tx.create({ _type: 'experience', ...p.fields });
    }
  }
  if (PRUNE) for (const d of stale) tx.delete(d._id);

  await tx.commit();
  console.log(`\nDone: ${plan.filter((p) => p.action === 'create').length} created, ` +
    `${plan.filter((p) => p.action === 'update').length} updated` +
    `${PRUNE ? `, ${stale.length} deleted` : ''}.\n`);
}

// Only run when executed directly, so the helpers above stay importable.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(`\n${err.message}\n`);
    process.exitCode = 1;
  });
}
