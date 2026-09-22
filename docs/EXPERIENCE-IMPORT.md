# Importing Work — Experience into Sanity

`scripts/import-experience.mjs` syncs experience entries from a JSON file into
Sanity, so roles can be updated in bulk instead of typed into the Studio one at
a time. `scripts/experience.json` holds the entries derived from the CV.

## One-time setup

1. In [sanity.io/manage](https://www.sanity.io/manage) → your project → **API** →
   **Tokens**, create a token with **Editor** permission. `Viewer` is read-only
   and cannot write.
2. Add it to `.env.local` (git-ignored) on its own line, no quotes, no spaces
   around the `=`:

   ```
   SANITY_API_WRITE_TOKEN=sk...
   ```

   `>>` will append onto the previous line if the file doesn't end in a
   newline — use `printf '\nSANITY_API_WRITE_TOKEN=sk...\n' >> .env.local`.
   Check the result with `cut -d= -f1 .env.local`, which prints key names only.
3. Revoke the token when you're done. It can modify or delete everything in the
   dataset, not just experience entries.

## Running it

```bash
node --env-file=.env.local scripts/import-experience.mjs --list                            # read-only: what's in the dataset
node --env-file=.env.local scripts/import-experience.mjs scripts/experience.json           # dry run, writes nothing
node --env-file=.env.local scripts/import-experience.mjs scripts/experience.json --apply   # commit the changes
node --env-file=.env.local scripts/import-experience.mjs scripts/experience.json --apply --prune   # also delete entries absent from the file
```

Run `--list` first. Entries are matched to existing documents by `_id` when the
JSON provides one, otherwise by company + job title — so a role already in Sanity
under a different title produces a duplicate rather than an update. The dry run
prints exactly what would be created, updated, or flagged stale.

Requires Node 20.6+ for `--env-file`. On older versions,
`export $(grep -v '^#' .env.local | xargs)` first and drop the flag.

## Caveats

- **The JSON is a one-time seed, not a source of truth.** Once entries are
  edited in the Studio, re-running with `--apply` overwrites those edits — it
  `set`s every field, including the achievement bullets. After the first import,
  treat Sanity as authoritative and expect the JSON to drift.
- **Validation runs before anything is sent**: required fields, `YYYY-MM` dates,
  and the schema's 280-character cap on `summary`.
- **A role with no `endDate` renders as "Present"** on the site. Only the current
  role should omit it.
- **Achievement bullets become Portable Text** bullet lists; `summary` is plain
  text shown above them.

## Related: instant refresh after editing

`/api/revalidate` refreshes `/work` when an `experience` document changes, but
only if the Sanity webhook actually sends that type. The filter must be:

```
_type in ["post","tag","project","siteSettings","experience","book"]
```

Any type left out never reaches the route, so edits to it appear on the next
60-second revalidate instead of immediately. See `docs/DEPLOY.md`.
