-- Allocate a random unique 6-digit serial so tickets cannot be guessed by counting up.

create or replace function public.next_ticket_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_year integer := extract(year from timezone('Asia/Manila', now()))::integer;
  entropy bytea;
  serial integer;
  ticket text;
  attempts integer := 0;
begin
  loop
    attempts := attempts + 1;
    if attempts > 40 then
      raise exception 'Unable to allocate a ticket number';
    end if;

    entropy := gen_random_bytes(4);
    serial := 1 + (
      (
        get_byte(entropy, 0)::bigint * 16777216
        + get_byte(entropy, 1)::bigint * 65536
        + get_byte(entropy, 2)::bigint * 256
        + get_byte(entropy, 3)::bigint
      ) % 999999
    )::integer;

    ticket := 'TP-' || current_year::text || '-' || lpad(serial::text, 6, '0');
    exit when not exists (
      select 1 from public.reports where ticket_number = ticket
    );
  end loop;

  return ticket;
end;
$$;
