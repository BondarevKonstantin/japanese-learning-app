create table public.course_gacha_configs (
  course_id uuid primary key references public.courses (id) on delete cascade,
  status text not null default 'draft',
  cards_count integer,
  reward_lessons_count integer,
  pulls_per_lesson integer,
  cards_per_pull integer,
  total_pulls integer,
  total_drops integer,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_gacha_configs_status_check
    check (status in ('draft', 'finalized')),
  constraint course_gacha_configs_snapshot_check
    check (
      (
        status = 'draft'
        and cards_count is null
        and reward_lessons_count is null
        and pulls_per_lesson is null
        and cards_per_pull is null
        and total_pulls is null
        and total_drops is null
        and finalized_at is null
      )
      or
      (
        status = 'finalized'
        and cards_count is not null
        and reward_lessons_count is not null
        and pulls_per_lesson is not null
        and cards_per_pull is not null
        and total_pulls is not null
        and total_drops is not null
        and cards_count >= 1
        and reward_lessons_count >= 1
        and pulls_per_lesson between 1 and 4
        and cards_per_pull >= 1
        and total_pulls >= 1
        and total_drops >= 1
        and finalized_at is not null
        and total_pulls::bigint =
          reward_lessons_count::bigint * pulls_per_lesson::bigint
        and total_drops::bigint =
          total_pulls::bigint * cards_per_pull::bigint
        and total_drops::numeric >= ceil(cards_count::numeric * 1.35)
      )
    )
);

create trigger set_course_gacha_configs_updated_at
before update on public.course_gacha_configs
for each row execute function public.set_updated_at();

alter table public.course_gacha_configs enable row level security;

create policy "Owners and published course users can view gacha config"
on public.course_gacha_configs
as permissive
for select
to authenticated
using (
  (select app_private.can_manage_course(course_gacha_configs.course_id))
  or (
    course_gacha_configs.status = 'finalized'
    and (select app_private.is_published_course(course_gacha_configs.course_id))
  )
);

revoke all on table public.course_gacha_configs
from public, anon, authenticated;

grant select on table public.course_gacha_configs
to authenticated;

grant all privileges on table public.course_gacha_configs
to service_role;

create or replace function app_private.protect_finalized_gacha_structure()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_course_id uuid;
begin
  if tg_op = 'INSERT' then
    v_course_id := new.course_id;
  else
    v_course_id := old.course_id;
  end if;

  perform 1
  from public.courses as course
  where course.id = v_course_id
  for update;

  if not found then
    if tg_op = 'DELETE' then
      return old;
    end if;

    raise exception 'Course not found';
  end if;

  if exists (
    select 1
    from public.course_gacha_configs as config
    where config.course_id = v_course_id
      and config.status = 'finalized'
  ) then
    raise exception 'Finalized gacha structure cannot be changed';
  end if;

  if tg_op = 'INSERT' then
    return new;
  end if;

  return old;
end;
$function$;

create or replace function app_private.protect_finalized_gacha_card_update()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.course_id is not distinct from old.course_id
    and new.rarity is not distinct from old.rarity then
    return new;
  end if;

  perform course.id
  from public.courses as course
  where course.id in (old.course_id, new.course_id)
  order by course.id
  for update;

  if exists (
    select 1
    from public.course_gacha_configs as config
    where config.course_id in (old.course_id, new.course_id)
      and config.status = 'finalized'
  ) then
    raise exception 'Finalized gacha card rarity or course cannot be changed';
  end if;

  return new;
end;
$function$;

create or replace function app_private.protect_finalized_lesson_course_update()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.course_id is not distinct from old.course_id then
    return new;
  end if;

  perform course.id
  from public.courses as course
  where course.id in (old.course_id, new.course_id)
  order by course.id
  for update;

  if exists (
    select 1
    from public.course_gacha_configs as config
    where config.course_id in (old.course_id, new.course_id)
      and config.status = 'finalized'
  ) then
    raise exception 'Finalized gacha lesson membership cannot be changed';
  end if;

  return new;
end;
$function$;

create or replace function app_private.prepare_gacha_course_cascade()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  delete from public.course_gacha_configs
  where course_id = old.id;

  delete from public.gacha_cards
  where course_id = old.id;

  return old;
end;
$function$;

alter function app_private.protect_finalized_gacha_structure() owner to postgres;
alter function app_private.protect_finalized_gacha_card_update() owner to postgres;
alter function app_private.protect_finalized_lesson_course_update() owner to postgres;
alter function app_private.prepare_gacha_course_cascade() owner to postgres;

revoke all on function app_private.protect_finalized_gacha_structure()
from public, anon, authenticated, service_role;

revoke all on function app_private.protect_finalized_gacha_card_update()
from public, anon, authenticated, service_role;

revoke all on function app_private.protect_finalized_lesson_course_update()
from public, anon, authenticated, service_role;

revoke all on function app_private.prepare_gacha_course_cascade()
from public, anon, authenticated, service_role;

create trigger prepare_gacha_course_cascade_delete
before delete on public.courses
for each row execute function app_private.prepare_gacha_course_cascade();

create trigger protect_finalized_gacha_cards_insert
before insert on public.gacha_cards
for each row execute function app_private.protect_finalized_gacha_structure();

create trigger protect_finalized_gacha_cards_delete
before delete on public.gacha_cards
for each row execute function app_private.protect_finalized_gacha_structure();

create trigger protect_finalized_gacha_cards_economy_update
before update of course_id, rarity on public.gacha_cards
for each row execute function app_private.protect_finalized_gacha_card_update();

create trigger protect_finalized_lessons_insert
before insert on public.lessons
for each row execute function app_private.protect_finalized_gacha_structure();

create trigger protect_finalized_lessons_delete
before delete on public.lessons
for each row execute function app_private.protect_finalized_gacha_structure();

create trigger protect_finalized_lessons_course_update
before update of course_id on public.lessons
for each row execute function app_private.protect_finalized_lesson_course_update();

create or replace function public.finalize_course_gacha(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_course_owner_id uuid;
  v_existing_status text;
  v_cards_count integer;
  v_lessons_count integer;
  v_target_drops integer;
  v_pulls_per_lesson integer;
  v_cards_per_pull integer;
  v_total_pulls integer;
  v_total_drops integer;
  v_config public.course_gacha_configs%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select course.created_by
  into v_course_owner_id
  from public.courses as course
  where course.id = p_course_id
  for update;

  if not found then
    raise exception 'Course not found';
  end if;

  if v_course_owner_id <> v_user_id then
    raise exception 'Forbidden';
  end if;

  select config.status
  into v_existing_status
  from public.course_gacha_configs as config
  where config.course_id = p_course_id
  for update;

  if v_existing_status = 'finalized' then
    raise exception 'Course gacha is already finalized';
  end if;

  select count(*)::integer
  into v_cards_count
  from public.gacha_cards as card
  where card.course_id = p_course_id;

  if v_cards_count < 1 then
    raise exception 'At least one gacha card is required';
  end if;

  select count(*)::integer
  into v_lessons_count
  from public.lessons as lesson
  where lesson.course_id = p_course_id;

  if v_lessons_count < 1 then
    raise exception 'At least one lesson is required';
  end if;

  if exists (
    select 1
    from public.gacha_cards as card
    where card.course_id = p_course_id
      and card.rarity not in ('common', 'rare', 'epic', 'legendary')
  ) then
    raise exception 'All gacha cards must have a supported rarity';
  end if;

  v_target_drops := ceil(v_cards_count::numeric * 1.35)::integer;

  for v_pulls_per_lesson in 1..4 loop
    v_cards_per_pull := ceil(
      v_target_drops::numeric / (v_lessons_count * v_pulls_per_lesson)
    )::integer;

    exit when v_cards_per_pull <= 5 or v_pulls_per_lesson = 4;
  end loop;

  v_total_pulls := v_lessons_count * v_pulls_per_lesson;
  v_total_drops := v_total_pulls * v_cards_per_pull;

  insert into public.course_gacha_configs (
    course_id,
    status,
    cards_count,
    reward_lessons_count,
    pulls_per_lesson,
    cards_per_pull,
    total_pulls,
    total_drops,
    finalized_at
  )
  values (
    p_course_id,
    'finalized',
    v_cards_count,
    v_lessons_count,
    v_pulls_per_lesson,
    v_cards_per_pull,
    v_total_pulls,
    v_total_drops,
    now()
  )
  on conflict (course_id)
  do update set
    status = excluded.status,
    cards_count = excluded.cards_count,
    reward_lessons_count = excluded.reward_lessons_count,
    pulls_per_lesson = excluded.pulls_per_lesson,
    cards_per_pull = excluded.cards_per_pull,
    total_pulls = excluded.total_pulls,
    total_drops = excluded.total_drops,
    finalized_at = excluded.finalized_at,
    updated_at = now()
  where course_gacha_configs.status = 'draft'
  returning *
  into v_config;

  if v_config.course_id is null then
    raise exception 'Course gacha is already finalized';
  end if;

  return to_jsonb(v_config);
end;
$function$;

alter function public.finalize_course_gacha(uuid) owner to postgres;

revoke all on function public.finalize_course_gacha(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.finalize_course_gacha(uuid)
to authenticated, postgres, service_role;
