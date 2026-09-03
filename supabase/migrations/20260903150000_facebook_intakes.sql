-- Admin Facebook intake: public Page posts and comments imported through Graph API.
-- Private Messenger threads are not stored. Run in the Supabase SQL editor.

create table if not exists public.facebook_intakes (
  id uuid primary key default gen_random_uuid(),
  facebook_post_id text not null,
  facebook_comment_id text,
  permalink text not null,
  author_name text not null,
  message text not null,
  posted_at timestamptz,
  kind text not null default 'post',
  status text not null default 'new',
  report_id uuid references public.reports (id) on delete set null,
  ticket_number text,
  imported_by uuid,
  imported_by_name text not null,
  created_at timestamptz not null default now(),
  constraint facebook_intakes_kind_check check (kind in ('post', 'comment')),
  constraint facebook_intakes_status_check check (status in ('new', 'converted', 'dismissed'))
);

create unique index if not exists facebook_intakes_post_comment_idx
  on public.facebook_intakes (facebook_post_id, coalesce(facebook_comment_id, ''));
create index if not exists facebook_intakes_status_idx on public.facebook_intakes (status);
create index if not exists facebook_intakes_created_at_idx on public.facebook_intakes (created_at desc);

alter table public.facebook_intakes enable row level security;
alter table public.facebook_intakes force row level security;

revoke all on table public.facebook_intakes from anon, authenticated;
grant all on table public.facebook_intakes to service_role;
