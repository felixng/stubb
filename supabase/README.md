# Supabase

The shared backend for web and iOS: SQL migrations (tables, constraints, row-level security, functions) and database tests. The schema is the contract between the two apps.

The `waitlist` table (#10) is the first migration. The main schema and RLS land in #12, along with `supabase init` (which creates `config.toml` for the local stack and lets `supabase test db` run the tests).

```
migrations/   timestamped SQL migrations
tests/        pgTAP privacy tests
```
