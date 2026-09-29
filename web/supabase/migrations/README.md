# Migrations

The full schema of a fresh install lives in [`../kurulum/schema.sql`](../kurulum/schema.sql) (applied by `npm run kur`). It replaces the original 358 migrations.

New schema changes should be added here as numbered, **additive** files (`0001_name.sql`, …) and applied to your project after the baseline.
