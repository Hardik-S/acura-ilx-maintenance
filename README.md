# 2015 Acura ILX Maintenance

A local-first maintenance history web app for a 2015 Acura ILX. The app imports the original spreadsheet semantics into grouped service events, keeps each spreadsheet service row as a line item, and stores data in the browser with IndexedDB.

## Features

- Dashboard with latest odometer, recent service, and counts.
- Maintenance history with search, date filters, odometer filters, and grouped service detail.
- Add/edit service events with multiple line items.
- Torque spec reference with add/edit support.
- Browser-side `.xlsx` import using a real workbook parser.
- JSON and CSV export.
- Static Next.js export for GitHub Pages.

## Spreadsheet Semantics

- `A:D` are interpreted as `Date`, `Service Item`, `Odometer`, and `Notes`.
- Blank-date rows are attached to the latest dated event above them.
- Torque specs in `F:G` are imported as separate reference entries.
- Raw source row values and parser warnings are retained for auditability.

## Data Storage and Backups

- Maintenance data is written only to the current browser's IndexedDB database.
- Export JSON before clearing site data, switching browsers or devices, or importing experimental workbook changes.
- Keep a JSON export as the restore point before using the reset-to-seed action.

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## GitHub Pages

The workflow in `.github/workflows/pages.yml` builds with `GITHUB_PAGES=true`, exports static files to `out`, uploads the artifact, and deploys it with GitHub Pages.

Expected hosted URL:

```text
https://hardik-s.github.io/acura-ilx-maintenance/
```
