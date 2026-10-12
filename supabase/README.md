# Supabase

The shared backend for web and iOS: SQL migrations (tables, constraints, row-level security, functions), seed data and database tests. The schema is the contract between the two apps.

Schema, RLS and seed land in #12. Until then this holds only the folder layout; `supabase init` (which creates `config.toml` for the local stack) runs as part of #12.

```
migrations/   timestamped SQL migrations
seed.sql      venues + starter shows (#12)
tests/        pgTAP privacy tests (#12)
```
