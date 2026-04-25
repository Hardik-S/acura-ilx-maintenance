# Supabase Environment and Admin Bootstrap

## Required Environment Variables

Set these in local `.env.local` and in your deploy target:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=...
GITHUB_REPO=Hardik-S/acura-ilx-maintenance
GITHUB_ISSUE_TOKEN=...
```

## Apply Migration

From repo root:

```bash
supabase db push
```

This creates:

- `profiles` and `user_roles`
- maintenance tables (`vehicles`, `service_events`, `service_items`, `torque_specs`, `import_batches`, `source_rows`)
- `codex_issue_requests`
- RLS + policies across all new tables
- seed Acura maintenance data

## Supabase Auth Redirects

Allow these redirect URLs in Supabase Auth settings:

- `http://localhost:3000/auth/callback/`
- `https://<netlify-site>.netlify.app/auth/callback/`
- `https://<production-domain>/auth/callback/`

## Admin Bootstrap (Temporary Password)

Create these auth users with the bootstrap script:

```bash
npm run bootstrap:admins
```

The script creates or updates:

- `kabir.sethi113@gmail.com`
- `batb4016@gmail.com`

Default temporary password is `pass123`; override with `ADMIN_TEMP_PASSWORD` if needed.

If you need to do this manually, create both users with confirmed email, then run:

```sql
update public.profiles
set force_password_change = true,
    updated_at = now()
where email in ('kabir.sethi113@gmail.com', 'batb4016@gmail.com');

insert into public.user_roles (user_id, role, granted_by)
select p.id, 'admin', null
from public.profiles p
where p.email in ('kabir.sethi113@gmail.com', 'batb4016@gmail.com')
on conflict (user_id, role) do nothing;
```

Operational expectation:

1. Temporary password `pass123` is for first login only.
2. App blocks normal workflow while `force_password_change = true`.
3. After successful password reset, app clears `force_password_change` for that user.

## GitHub Issue Token

Use a fine-grained GitHub token or GitHub App credential with Issues read/write access for only `Hardik-S/acura-ilx-maintenance`. Store it as `GITHUB_ISSUE_TOKEN` in Netlify. Do not expose it with a `NEXT_PUBLIC_` prefix.
