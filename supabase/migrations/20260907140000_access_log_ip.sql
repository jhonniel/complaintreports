-- Store visitor IPs for the System access map. Latitude/longitude stay optional when
-- a location cannot be resolved yet, so the IP is still logged.

alter table public.access_logs
  add column if not exists ip_address text;

alter table public.access_logs
  alter column latitude drop not null;

alter table public.access_logs
  alter column longitude drop not null;

create index if not exists access_logs_ip_address_idx on public.access_logs (ip_address);
