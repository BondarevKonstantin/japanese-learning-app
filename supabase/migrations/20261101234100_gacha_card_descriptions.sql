-- Private gacha card descriptions.
-- One row per card. Existing cards may have no row yet.
-- Run this file as one transaction. Do not edit earlier migrations.

create table public.gacha_card_descriptions (
  card_id uuid primary key references public.gacha_cards (id) on delete cascade,
  description text not null,
  constraint gacha_card_descriptions_description_check
    check (description ~ '[^[:space:]]')
);

comment on table public.gacha_card_descriptions is
  'Private text for one gacha card. The course owner can read and write it. An authenticated user can read it only after unlocking that card.';

comment on column public.gacha_card_descriptions.description is
  'Non-blank description shown to a student after the card is unlocked.';

alter table public.gacha_card_descriptions enable row level security;

create policy "Teachers select own gacha card descriptions"
on public.gacha_card_descriptions
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.gacha_cards as card
    where card.id = gacha_card_descriptions.card_id
      and (select app_private.is_teacher())
      and (select app_private.can_manage_course(card.course_id))
  )
);

create policy "Users select unlocked gacha card descriptions"
on public.gacha_card_descriptions
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.gacha_cards as card
    join public.user_unlocked_cards as unlocked
      on unlocked.card_id = card.id
     and unlocked.course_id = card.course_id
     and unlocked.user_id = (select auth.uid())
    where card.id = gacha_card_descriptions.card_id
  )
);

create policy "Teachers insert own gacha card descriptions"
on public.gacha_card_descriptions
as permissive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.gacha_cards as card
    where card.id = gacha_card_descriptions.card_id
      and (select app_private.is_teacher())
      and (select app_private.can_manage_course(card.course_id))
  )
);

create policy "Teachers update own gacha card descriptions"
on public.gacha_card_descriptions
as permissive
for update
to authenticated
using (
  exists (
    select 1
    from public.gacha_cards as card
    where card.id = gacha_card_descriptions.card_id
      and (select app_private.is_teacher())
      and (select app_private.can_manage_course(card.course_id))
  )
)
with check (
  exists (
    select 1
    from public.gacha_cards as card
    where card.id = gacha_card_descriptions.card_id
      and (select app_private.is_teacher())
      and (select app_private.can_manage_course(card.course_id))
  )
);

revoke all on table public.gacha_card_descriptions
from public, anon, authenticated;

grant select, insert, update on table public.gacha_card_descriptions
to authenticated;

grant all privileges on table public.gacha_card_descriptions
to service_role;

-- card_id is the primary key. Updating it would move the only description
-- off a card, including after finalization. Deletes stay closed for
-- authenticated users; removing the card cascades this row.
create or replace function app_private.protect_gacha_card_description_identity()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.card_id is distinct from old.card_id then
    raise exception 'Gacha card description cannot be moved to another card';
  end if;

  return new;
end;
$function$;

alter function app_private.protect_gacha_card_description_identity() owner to postgres;

revoke all on function app_private.protect_gacha_card_description_identity()
from public, anon, authenticated, service_role;

create trigger protect_gacha_card_description_identity
before update on public.gacha_card_descriptions
for each row execute function app_private.protect_gacha_card_description_identity();

-- Inserts the card and its description in the caller's transaction.
-- SECURITY INVOKER keeps the gacha_cards RLS, created_by check, and the
-- finalized-structure trigger in force. Author is always auth.uid().
create or replace function public.create_gacha_card(
  p_course_id uuid,
  p_title text,
  p_description text,
  p_image_storage_path text,
  p_image_transform jsonb,
  p_rarity text
)
returns uuid
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_card_id uuid;
  v_title text;
  v_description text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_course_id is null then
    raise exception 'Course not found';
  end if;

  if p_title is null then
    raise exception 'Card title is required';
  end if;

  if p_description is null then
    raise exception 'Card description is required';
  end if;

  v_title := regexp_replace(p_title, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  v_description := regexp_replace(p_description, '^[[:space:]]+|[[:space:]]+$', '', 'g');

  if v_title !~ '[^[:space:]]' then
    raise exception 'Card title is required';
  end if;

  if v_description !~ '[^[:space:]]' then
    raise exception 'Card description is required';
  end if;

  if p_rarity is null or p_rarity not in ('common', 'rare', 'epic', 'legendary') then
    raise exception 'Unsupported gacha card rarity';
  end if;

  if p_image_storage_path is null or btrim(p_image_storage_path) = '' then
    raise exception 'Card image is required';
  end if;

  insert into public.gacha_cards (
    course_id,
    title,
    image_storage_path,
    image_transform,
    rarity,
    created_by
  )
  values (
    p_course_id,
    v_title,
    p_image_storage_path,
    p_image_transform,
    p_rarity,
    v_user_id
  )
  returning id into v_card_id;

  if v_card_id is null then
    raise exception 'Failed to create gacha card';
  end if;

  insert into public.gacha_card_descriptions (
    card_id,
    description
  )
  values (
    v_card_id,
    v_description
  );

  return v_card_id;
end;
$function$;

alter function public.create_gacha_card(uuid, text, text, text, jsonb, text) owner to postgres;

revoke all on function public.create_gacha_card(uuid, text, text, text, jsonb, text)
from public, anon, authenticated, service_role;

grant execute on function public.create_gacha_card(uuid, text, text, text, jsonb, text)
to authenticated, postgres, service_role;

comment on function public.create_gacha_card(uuid, text, text, text, jsonb, text) is
  'Creates a gacha card and its description atomically as auth.uid(). RLS and finalization locks still apply.';

-- Separate from finalize_course_gacha so the economy formula stays untouched.
-- Already-finalized rows are not rechecked: the trigger ignores updates whose
-- previous status is already finalized, and this migration does not rewrite them.
create or replace function app_private.require_gacha_card_descriptions_before_finalize()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.status is distinct from 'finalized' then
    return new;
  end if;

  -- OLD is unassigned on INSERT. Keep this branch separate so a new
  -- finalized row is checked, while an already finalized row is not.
  if tg_op = 'UPDATE' then
    if old.status = 'finalized' then
      return new;
    end if;
  end if;

  perform 1
  from public.courses as course
  where course.id = new.course_id
  for update;

  if not found then
    raise exception 'Course not found';
  end if;

  -- Card inserts take the same course lock, then this card lock.
  -- Description writes take the description lock after the card lock.
  perform card.id
  from public.gacha_cards as card
  where card.course_id = new.course_id
  order by card.id
  for update;

  perform description.card_id
  from public.gacha_card_descriptions as description
  join public.gacha_cards as card
    on card.id = description.card_id
  where card.course_id = new.course_id
  order by description.card_id
  for update of description;

  if exists (
    select 1
    from public.gacha_cards as card
    where card.course_id = new.course_id
      and not exists (
        select 1
        from public.gacha_card_descriptions as description
        where description.card_id = card.id
          and description.description ~ '[^[:space:]]'
      )
  ) then
    raise exception 'Every gacha card must have a non-empty description before finalization';
  end if;

  return new;
end;
$function$;

alter function app_private.require_gacha_card_descriptions_before_finalize() owner to postgres;

revoke all on function app_private.require_gacha_card_descriptions_before_finalize()
from public, anon, authenticated, service_role;

create trigger require_gacha_card_descriptions_before_finalize
before insert or update of status on public.course_gacha_configs
for each row execute function app_private.require_gacha_card_descriptions_before_finalize();

-- The earlier trigger only watched course_id and rarity, so title and image
-- updates never reached the function. Ownership and privileges stay as set
-- when the function was created. Description text lives in another table.
create or replace function app_private.protect_finalized_gacha_card_update()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.id is not distinct from old.id
    and new.course_id is not distinct from old.course_id
    and new.title is not distinct from old.title
    and new.image_storage_path is not distinct from old.image_storage_path
    and new.image_transform is not distinct from old.image_transform
    and new.rarity is not distinct from old.rarity
    and new.created_by is not distinct from old.created_by
    and new.created_at is not distinct from old.created_at then
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
    raise exception 'Finalized gacha card content cannot be changed';
  end if;

  return new;
end;
$function$;

drop trigger protect_finalized_gacha_cards_economy_update on public.gacha_cards;

create trigger protect_finalized_gacha_cards_economy_update
before update of id, course_id, title, image_storage_path, image_transform, rarity, created_by, created_at
on public.gacha_cards
for each row execute function app_private.protect_finalized_gacha_card_update();
