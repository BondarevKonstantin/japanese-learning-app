create or replace function app_private.require_finalized_gacha_before_course_publish()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_is_entering_published boolean := false;
begin
  if tg_op = 'INSERT' then
    v_is_entering_published := new.status = 'published';
  elsif tg_op = 'UPDATE' then
    v_is_entering_published :=
      new.status = 'published'
      and old.status is distinct from 'published';
  end if;

  if v_is_entering_published
    and not exists (
      select 1
      from public.course_gacha_configs as config
      where config.course_id = new.id
        and config.status = 'finalized'
    ) then
    raise exception 'Course gacha must be finalized before publishing';
  end if;

  return new;
end;
$function$;

alter function app_private.require_finalized_gacha_before_course_publish()
owner to postgres;

revoke all on function app_private.require_finalized_gacha_before_course_publish()
from public, anon, authenticated, service_role;

create trigger require_finalized_gacha_before_course_publish
before insert or update of status on public.courses
for each row
execute function app_private.require_finalized_gacha_before_course_publish();
