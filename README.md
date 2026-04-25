# 2015 Acura ILX Maintenance

A Supabase-backed maintenance history web app for a 2015 Acura ILX. The app imports the original spreadsheet semantics into grouped service events, keeps each spreadsheet service row as a line item, and protects the shared data behind admin accounts.

## Features

- Dashboard with latest odometer, recent service, and counts.
- Maintenance history with search, date filters, odometer filters, and grouped service detail.
- Add/edit service events with multiple line items.
- Torque spec reference with add/edit support.
- Browser-side `.xlsx` import using a real workbook parser, saved to Supabase.
- JSON and CSV export.
- Supabase Auth with email password reset and forced first-login password changes.
- Profile menu with logout, preferences, dark mode, password changes, and Talk to Codex.
- Deterministic Talk to Codex flow that creates GitHub issues through a server route.

## Spreadsheet Semantics

- `A:D` are interpreted as `Date`, `Service Item`, `Odometer`, and `Notes`.
- Blank-date rows are attached to the latest dated event above them.
- Torque specs in `F:G` are imported as separate reference entries.
- Raw source row values and parser warnings are retained for auditability.

## Local Development

```bash
npm install
npm run dev
```

Create `.env.local` with the variables in `docs/supabase-env-setup.md`.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Netlify

This app now needs a server-capable Next.js host for auth callbacks and GitHub issue creation. `netlify.toml` builds with `npm run build` and publishes `.next`.
