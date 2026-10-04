# Changelog

All notable PFMS changes are documented here. Versions follow Semantic Versioning while the product remains in Alpha.

## [0.2.2 Patch 4] - 2026-08-02

### Fixed

- Converted quarterly beginning-balance overrides into dated quarter baselines instead of permanent fund values.
- Monthly reports now carry the prior month's calculated ending balance forward after a mid-quarter startup baseline.
- Changing the selected audit quarter loads only that quarter's saved baseline.
- Clearing or blanking a quarter baseline now removes it instead of allowing stale values to keep affecting reports.
- Added migration for Patch 3 and earlier backups containing the legacy permanent opening-balance map.

### Verification

- Added regression coverage for mid-quarter startup, month-to-month carry-forward, later-quarter supersession, legacy migration, and the complete UI workflow.

## [0.2.2 Patch 3] - 2026-08-02

### Changed

- Monthly report receipts and disbursements now use matching full-width tables.
- Disbursements appear directly below receipts instead of being compressed into a side-by-side column.
- Monthly report pagination now counts the stacked receipt and disbursement rows vertically and continues reserving space for the Statement of Funds.

## [0.2.2 Patch 2] - 2026-08-02

### Fixed

- Replaced the incomplete generic Transfer transaction with a dedicated From Category to To Category workflow.
- Category transfers now create one durable, two-sided ledger record and cannot use the same source and destination.
- Fund balances, monthly reports, Trustee Quarterly Audits, backups, restores, and ledger CSV exports recognize both sides while leaving the bank total unchanged.
- Repeated Save Transfer clicks cannot create duplicate transfer records.

## [0.2.2 Patch 1] - 2026-07-30

### Fixed

- Meeting Approvals, reimbursements, stipends, and utilities now leave their pending lists immediately after payment.
- Repeated payment clicks cannot create duplicate ledger entries for the same workflow record.
- Paid records retain the check number, paid date, and linked ledger transaction ID for audit traceability.

## [0.2.2] - 2026-07-25

### Added

- Editable Demo Mode using the production database and normal financial workflows.
- Unlimited managed categories, subcategories, and vendors.
- Annual and monthly allocation-aware budgets with variance, percentage used, remaining balance, and configurable status indicators.
- Eight built-in themes and a custom builder with live HEX/RGB preview, save, duplicate, delete, export, and import.
- Expanded settings and optional offline local login with Remember Me.
- Realistic VFW demonstration transactions, split deposit, workflows, vendors, budgets, and sales.

### Changed

- Extended allocations, migrations, backups, and restores for subcategories and all Alpha 0.2.2 data.
- Expanded automated coverage for Demo Mode, budgets, themes, and complete data round trips.

## [Unreleased]

### Planning

- Established PFMS Alpha 0.2.2 Demo Edition as the active release target.
- Defined the fully functional release gate for budgets, managed categories and
  subcategories, vendors, themes, editable demo data, settings, local login,
  migrations, reports, and complete backup/restore.
- Confirmed that Demo Edition uses the production data model and workflows and
  is not a separate read-only or disposable application.

### Documentation

- Established Alpha 0.3.0 as the Organization Profiles and Report Template Engine release.
- Established VFW and Generic Nonprofit as the foundational organization profiles.
- Established Alpha 0.4.0 as the multiple-organization workspace release.

## [0.2.1] - 2026-07-21

### Added

- Balanced split allocations for payments and deposits spanning multiple funds or accounts.
- Split-aware fund balances, Trustee Quarterly Audit totals, monthly reports, and ledger CSV exports.
- Automatic migration of Alpha 0.2.0 and earlier transactions to the split-capable schema.

### Safety

- PFMS refuses to save a split transaction until all allocation lines equal the bank transaction total.
- The ledger preserves one bank transaction while reports assign each allocation to the correct fund.

## [0.2.0] - 2026-07-14

### Added

- Meeting Copy and Audit Copy monthly-report profiles.
- Smart grouping for like transactions while preserving source transaction drill-down.
- Consolidation of merchant deposits by destination financial account.
- Vendor normalization with built-in and organization-defined aliases.
- Automatic report pagination and one-page optimization.
- Versioned backup metadata and schema migration support.
- Automated reporting, pagination, normalization, and backup-compatibility tests.
- Reproducible local build and release packaging.

### Changed

- Monthly report generation now uses a pure reporting engine shared by the application and tests.
- Restored databases are merged with current defaults so new fields do not break older backups.

### Compatibility

- Alpha 0.1.8 raw JSON backups remain restorable.
- Legacy PFMS v2.6 migration remains supported.
- Cloud synchronization and multi-user access remain deferred.

## [0.1.8] - 2026-07-13

### Added

- Recovered tested Alpha 0.1.8 application baseline.
- Editable ledger, funds, and financial accounts.
- CSV import and duplicate detection.
- Utilities, stipends, meeting approvals, reimbursements, sales analytics, monthly reports, quarterly audits, and JSON backup/restore.
