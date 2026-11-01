-- Make gacha card images private.
-- Run this file as one transaction. The opening checks raise before any change.
-- A later error rolls the whole script back, including the private-bucket update.

do $precheck$
declare
  v_card_count bigint;
  v_object_count bigint;
begin
  if to_regclass('public.gacha_cards') is null then
    raise exception 'Migration aborted: table public.gacha_cards does not exist.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gacha_cards'
      and column_name = 'image_url'
  ) then
    raise exception 'Migration aborted: public.gacha_cards.image_url does not exist.';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gacha_cards'
      and column_name = 'image_storage_path'
  ) then
    raise exception 'Migration aborted: public.gacha_cards.image_storage_path already exists.';
  end if;

  select count(*)
  into v_card_count
  from public.gacha_cards;

  if v_card_count > 0 then
    raise exception
      'Migration aborted: public.gacha_cards still contains % card(s). Delete the old gacha cards before making images private.',
      v_card_count;
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'gacha-card-images'
  ) then
    raise exception 'Migration aborted: storage bucket gacha-card-images does not exist.';
  end if;

  select count(*)
  into v_object_count
  from storage.objects
  where bucket_id = 'gacha-card-images';

  if v_object_count > 0 then
    raise exception
      'Migration aborted: bucket gacha-card-images still contains % file(s). Delete the old files before making images private.',
      v_object_count;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'storage'
      and table_name = 'objects'
      and column_name = 'owner'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'storage'
      and table_name = 'objects'
      and column_name = 'owner_id'
  ) then
    raise exception 'Migration aborted: storage.objects is missing owner or owner_id.';
  end if;
end
$precheck$;

update storage.buckets
set public = false
where id = 'gacha-card-images';

do $bucket$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'gacha-card-images'
      and public = false
  ) then
    raise exception 'Migration aborted: bucket gacha-card-images was not switched to private.';
  end if;
end
$bucket$;

alter table public.gacha_cards
  add column image_storage_path text not null;

alter table public.gacha_cards
  add constraint gacha_cards_image_storage_path_check
  check (
    image_storage_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpe?g|webp)$'
    and split_part(image_storage_path, '/', 1)::uuid = course_id
  );

alter table public.gacha_cards
  add constraint gacha_cards_image_storage_path_key
  unique (image_storage_path);

comment on column public.gacha_cards.image_storage_path is
  'Private object path in bucket gacha-card-images: {course_id}/{file_id}.{png|jpg|jpeg|webp}.';

create or replace function public.spin_gacha(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_course_status text;
  v_config public.course_gacha_configs%rowtype;
  v_state public.user_course_gacha_state%rowtype;
  v_total_cards integer;
  v_unlocked_count integer;
  v_all_unseen_count integer;
  v_history_count integer;
  v_pull_number integer;
  v_current_used_drops integer;
  v_remaining_drops integer;
  v_remaining_unique_cards integer;
  v_progress numeric;
  v_guarantee_new boolean;
  v_legendary_dropped boolean := false;
  v_outcome text;
  v_selected_rarity text;
  v_card public.gacha_cards%rowtype;
  v_unlock_id uuid;
  v_was_new boolean;
  v_cards jsonb := '[]'::jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select *
  into v_state
  from public.user_course_gacha_state
  where user_id = v_user_id
    and course_id = p_course_id
  for update;

  if v_state.id is null then
    raise exception 'Gacha state not found';
  end if;

  select course.status
  into v_course_status
  from public.courses as course
  where course.id = p_course_id
  for share;

  if v_course_status is null then
    raise exception 'Course not found';
  end if;

  if v_course_status <> 'published' then
    raise exception 'Course must be published before spinning gacha';
  end if;

  select *
  into v_config
  from public.course_gacha_configs
  where course_id = p_course_id
  for share;

  if v_config.course_id is null or v_config.status <> 'finalized' then
    raise exception 'Course gacha must be finalized before spinning';
  end if;

  if v_config.cards_per_pull is null or v_config.cards_per_pull <= 0 then
    raise exception 'Finalized gacha cards_per_pull is invalid';
  end if;

  if v_config.total_drops is null or v_config.total_drops <= 0 then
    raise exception 'Finalized gacha total_drops is invalid';
  end if;

  if v_state.available_pulls <= 0 then
    raise exception 'No available pulls';
  end if;

  if v_state.used_drops + v_config.cards_per_pull > v_config.total_drops then
    raise exception 'Not enough remaining drops for a full pull';
  end if;

  select count(*)::integer
  into v_total_cards
  from public.gacha_cards
  where course_id = p_course_id;

  if v_total_cards <= 0 then
    raise exception 'This course has no gacha cards';
  end if;

  if v_config.cards_count <> v_total_cards then
    raise exception 'Finalized gacha card count is inconsistent';
  end if;

  select count(*)::integer
  into v_history_count
  from public.gacha_pull_history
  where user_id = v_user_id
    and course_id = p_course_id;

  if v_history_count <> v_state.used_drops then
    raise exception 'Gacha state and drop history are inconsistent';
  end if;

  v_pull_number := v_state.used_pulls + 1;
  v_current_used_drops := v_state.used_drops;

  for v_drop_number in 1..v_config.cards_per_pull loop
    select count(*)::integer
    into v_unlocked_count
    from public.user_unlocked_cards
    where user_id = v_user_id
      and course_id = p_course_id;

    v_all_unseen_count := v_total_cards - v_unlocked_count;
    v_remaining_drops := v_config.total_drops - v_current_used_drops;
    v_remaining_unique_cards := v_total_cards - v_unlocked_count;

    if v_remaining_drops < v_remaining_unique_cards then
      raise exception 'Gacha guarantee invariant is broken';
    end if;

    v_guarantee_new := v_remaining_drops <= v_remaining_unique_cards;
    v_progress := greatest(
      0::numeric,
      least(
        1::numeric,
        v_current_used_drops::numeric / v_config.total_drops::numeric
      )
    );

    v_card := null;
    v_unlock_id := null;
    v_was_new := false;

    if v_guarantee_new then
      v_outcome := 'new';
    elsif random() < 0.75 then
      v_outcome := 'new';
    else
      v_outcome := 'duplicate';
    end if;

    for v_outcome_attempt in 1..2 loop
      v_selected_rarity := null;

      with rarities(rarity, rarity_order) as (
        values
          ('common'::text, 1),
          ('rare'::text, 2),
          ('epic'::text, 3),
          ('legendary'::text, 4)
      ),
      rarity_stats as (
        select
          rarity.rarity,
          rarity.rarity_order,
          count(card.id)::integer as total_cards,
          count(unlocked.card_id)::integer as unlocked_cards,
          (count(card.id) - count(unlocked.card_id))::integer as unseen_cards
        from rarities as rarity
        left join public.gacha_cards as card
          on card.course_id = p_course_id
          and card.rarity = rarity.rarity
        left join public.user_unlocked_cards as unlocked
          on unlocked.user_id = v_user_id
          and unlocked.course_id = p_course_id
          and unlocked.card_id = card.id
        group by rarity.rarity, rarity.rarity_order
      ),
      rarity_factors as (
        select
          stats.*,
          app_private.gacha_base_rarity_weight(stats.rarity, v_progress) as base_weight,
          case
            when v_all_unseen_count <= 0 then 1::numeric
            else least(
              2::numeric,
              greatest(
                0.5::numeric,
                (
                  stats.unseen_cards::numeric / v_all_unseen_count::numeric
                ) / (
                  stats.total_cards::numeric / v_total_cards::numeric
                )
              )
            )
          end as balance_factor,
          app_private.gacha_target_unlocked_share(stats.rarity, v_progress)
            as target_unlocked_share,
          stats.unlocked_cards::numeric / stats.total_cards::numeric
            as actual_unlocked_share
        from rarity_stats as stats
        where stats.total_cards > 0
          and (
            (
              v_guarantee_new
              and stats.unseen_cards > 0
            )
            or
            (
              not v_guarantee_new
              and not (
                stats.rarity = 'legendary'
                and (v_progress < 0.25 or v_legendary_dropped)
              )
              and (
                (
                  v_outcome = 'new'
                  and stats.unseen_cards > 0
                  and (
                    stats.unlocked_cards::numeric / stats.total_cards::numeric
                  ) < app_private.gacha_new_unlock_cap(stats.rarity, v_progress)
                )
                or
                (
                  v_outcome = 'duplicate'
                  and stats.unlocked_cards > 0
                )
              )
            )
          )
      ),
      raw_weights as (
        select
          factors.*,
          factors.base_weight
            * factors.balance_factor
            * (
              1
              + least(
                2.5::numeric,
                2.0::numeric
                  * greatest(
                    0::numeric,
                    factors.target_unlocked_share - factors.actual_unlocked_share
                  )
                  / greatest(0.15::numeric, factors.target_unlocked_share)
              )
            ) as raw_weight
        from rarity_factors as factors
      ),
      effective_weights as (
        select
          weights.rarity,
          weights.rarity_order,
          case
            when v_guarantee_new then greatest(weights.raw_weight, 0.000001::numeric)
            else weights.raw_weight
          end as effective_weight
        from raw_weights as weights
      ),
      cumulative_weights as (
        select
          weights.*,
          sum(weights.effective_weight) over (
            order by weights.rarity_order
            rows between unbounded preceding and current row
          ) as cumulative_weight,
          sum(weights.effective_weight) over () as total_weight
        from effective_weights as weights
        where weights.effective_weight > 0
      ),
      rarity_roll as (
        select random() * coalesce(max(weights.total_weight), 0) as threshold
        from cumulative_weights as weights
      )
      select weights.rarity
      into v_selected_rarity
      from cumulative_weights as weights
      cross join rarity_roll as roll
      where weights.cumulative_weight >= roll.threshold
      order by weights.rarity_order
      limit 1;

      exit when v_selected_rarity is not null or v_guarantee_new;

      if v_outcome = 'new' then
        v_outcome := 'duplicate';
      else
        v_outcome := 'new';
      end if;
    end loop;

    if v_selected_rarity is null then
      raise exception 'No eligible gacha card for current progress';
    end if;

    if v_outcome = 'new' then
      select card.*
      into v_card
      from public.gacha_cards as card
      where card.course_id = p_course_id
        and card.rarity = v_selected_rarity
        and not exists (
          select 1
          from public.user_unlocked_cards as unlocked
          where unlocked.user_id = v_user_id
            and unlocked.course_id = p_course_id
            and unlocked.card_id = card.id
        )
      order by random()
      limit 1;

      if v_card.id is null then
        raise exception 'Gacha could not select an unseen card';
      end if;

      insert into public.user_unlocked_cards (
        user_id,
        course_id,
        card_id
      )
      values (
        v_user_id,
        p_course_id,
        v_card.id
      )
      on conflict (user_id, course_id, card_id)
      do nothing
      returning id
      into v_unlock_id;

      if v_unlock_id is null then
        raise exception 'Gacha failed to unlock a new card';
      end if;

      v_was_new := true;
    else
      select card.*
      into v_card
      from public.gacha_cards as card
      join public.user_unlocked_cards as unlocked
        on unlocked.user_id = v_user_id
        and unlocked.course_id = p_course_id
        and unlocked.card_id = card.id
      where card.course_id = p_course_id
        and card.rarity = v_selected_rarity
      order by random()
      limit 1;

      if v_card.id is null then
        raise exception 'Gacha could not select an unlocked duplicate card';
      end if;

      v_was_new := false;
    end if;

    if v_card.rarity = 'legendary' then
      v_legendary_dropped := true;
    end if;

    insert into public.gacha_pull_history (
      user_id,
      course_id,
      card_id,
      pull_number,
      drop_number,
      was_new
    )
    values (
      v_user_id,
      p_course_id,
      v_card.id,
      v_pull_number,
      v_drop_number,
      v_was_new
    );

    v_cards := v_cards || jsonb_build_array(
      jsonb_build_object(
        'id', v_card.id,
        'title', v_card.title,
        'image_storage_path', v_card.image_storage_path,
        'rarity', v_card.rarity,
        'was_new', v_was_new,
        'drop_number', v_drop_number
      )
    );

    v_current_used_drops := v_current_used_drops + 1;
  end loop;

  update public.user_course_gacha_state as state
  set
    available_pulls = state.available_pulls - 1,
    used_pulls = state.used_pulls + 1,
    used_drops = state.used_drops + v_config.cards_per_pull,
    updated_at = now()
  where state.id = v_state.id
  returning state.*
  into v_state;

  if v_state.available_pulls < 0 then
    raise exception 'Gacha state available_pulls cannot be negative';
  end if;

  if v_state.used_drops > v_config.total_drops then
    raise exception 'Gacha state used_drops exceeds finalized total_drops';
  end if;

  select count(*)::integer
  into v_unlocked_count
  from public.user_unlocked_cards
  where user_id = v_user_id
    and course_id = p_course_id;

  return jsonb_build_object(
    'pull_number', v_pull_number,
    'cards', v_cards,
    'state', jsonb_build_object(
      'available_pulls', v_state.available_pulls,
      'used_pulls', v_state.used_pulls,
      'used_drops', v_state.used_drops,
      'total_pulls_earned', v_state.total_pulls_earned
    ),
    'collection', jsonb_build_object(
      'unlocked_count', v_unlocked_count,
      'total_count', v_total_cards,
      'completed', v_unlocked_count >= v_total_cards
    )
  );
end;
$function$;

alter function public.spin_gacha(uuid) owner to postgres;

revoke all on function public.spin_gacha(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.spin_gacha(uuid)
to authenticated, postgres, service_role;

do $dependencies$
declare
  v_functions text;
  v_dependencies text;
  v_policies text;
  v_views text;
begin
  select string_agg(
    format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)),
    ', '
  )
  into v_functions
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname in ('public', 'app_private')
    and p.prokind = 'f'
    and pg_get_functiondef(p.oid) ilike '%gacha_cards%'
    and pg_get_functiondef(p.oid) ilike '%image_url%';

  if v_functions is not null then
    raise exception
      'Migration aborted: functions still reference gacha card image_url: %',
      v_functions;
  end if;

  select string_agg(pg_describe_object(dep.classid, dep.objid, dep.objsubid), '; ')
  into v_dependencies
  from pg_depend as dep
  join pg_attribute as attr
    on attr.attrelid = dep.refobjid
   and attr.attnum = dep.refobjsubid
   and not attr.attisdropped
  where dep.refobjid = 'public.gacha_cards'::regclass
    and attr.attname = 'image_url'
    and dep.deptype = 'n';

  if v_dependencies is not null then
    raise exception
      'Migration aborted: public.gacha_cards.image_url still has SQL dependencies: %',
      v_dependencies;
  end if;

  select string_agg(format('%I.%I', policy.schemaname, policy.policyname), ', ')
  into v_policies
  from pg_catalog.pg_policies as policy
  where policy.schemaname = 'public'
    and policy.tablename = 'gacha_cards'
    and (
      coalesce(policy.qual, '') ilike '%image_url%'
      or coalesce(policy.with_check, '') ilike '%image_url%'
    );

  if v_policies is not null then
    raise exception
      'Migration aborted: gacha_cards policies still reference image_url: %',
      v_policies;
  end if;

  select string_agg(format('%I.%I', n.nspname, c.relname), ', ')
  into v_views
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where c.relkind in ('v', 'm')
    and n.nspname in ('public', 'app_private')
    and pg_get_viewdef(c.oid) ilike '%gacha_cards%'
    and pg_get_viewdef(c.oid) ilike '%image_url%';

  if v_views is not null then
    raise exception
      'Migration aborted: views still reference gacha card image_url: %',
      v_views;
  end if;
end
$dependencies$;

alter table public.gacha_cards
  drop column image_url;

do $dropped$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gacha_cards'
      and column_name = 'image_url'
  ) then
    raise exception 'Migration aborted: public.gacha_cards.image_url was not dropped.';
  end if;
end
$dropped$;

-- Students can read one object only when its name is the image_storage_path of a
-- card that this auth.uid() has unlocked. The path alone is not enough.
create or replace function app_private.can_student_read_unlocked_gacha_card_image(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.gacha_cards as card
    join public.user_unlocked_cards as unlocked
      on unlocked.card_id = card.id
     and unlocked.course_id = card.course_id
     and unlocked.user_id = (select auth.uid())
    where card.image_storage_path = object_name
      and card.course_id = app_private.gacha_card_image_course_id(object_name)
  );
$$;

-- Own uploaded object that no gacha card references. Finalization does not matter.
-- A path stored on a card, including a finalized one, does not match.
create or replace function app_private.can_delete_orphan_gacha_card_image(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from (select app_private.gacha_card_image_course_id(object_name) as course_id) as parsed
    where parsed.course_id is not null
      and (select app_private.is_teacher())
      and (select app_private.can_manage_course(parsed.course_id))
      and not exists (
        select 1
        from public.gacha_cards as card
        where card.image_storage_path = object_name
      )
  );
$$;

-- True only after the course row is gone. Finalized courses cannot be deleted,
-- so this does not open images of a live or finalized course.
create or replace function app_private.can_cleanup_deleted_course_gacha_image(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from (select app_private.gacha_card_image_course_id(object_name) as course_id) as parsed
    where parsed.course_id is not null
      and (select app_private.is_teacher())
      and not exists (
        select 1
        from public.courses as course
        where course.id = parsed.course_id
      )
  );
$$;

alter function app_private.can_student_read_unlocked_gacha_card_image(text) owner to postgres;
alter function app_private.can_delete_orphan_gacha_card_image(text) owner to postgres;
alter function app_private.can_cleanup_deleted_course_gacha_image(text) owner to postgres;

revoke all on function app_private.can_student_read_unlocked_gacha_card_image(text) from public;
revoke all on function app_private.can_delete_orphan_gacha_card_image(text) from public;
revoke all on function app_private.can_cleanup_deleted_course_gacha_image(text) from public;

grant execute on function app_private.can_student_read_unlocked_gacha_card_image(text) to authenticated;
grant execute on function app_private.can_delete_orphan_gacha_card_image(text) to authenticated;
grant execute on function app_private.can_cleanup_deleted_course_gacha_image(text) to authenticated;

comment on function app_private.can_student_read_unlocked_gacha_card_image(text) is
  'Storage SELECT for a student: object name must equal the unlocked card image_storage_path.';

comment on function app_private.can_delete_orphan_gacha_card_image(text) is
  'Teacher may delete an own-course object that no gacha card references, including after finalization.';

comment on function app_private.can_cleanup_deleted_course_gacha_image(text) is
  'Storage cleanup after the course row is gone. Does not grant access while the course exists.';

-- Teacher SELECT stays gacha_card_images_teacher_select. It authorizes the course
-- folder and does not require a gacha_cards row, including after finalization.
-- That SELECT is what lets Storage .remove() see an orphan. Teacher INSERT stays
-- closed after finalization. Teacher DELETE stays closed after finalization except
-- for the orphan policy below. Students receive no INSERT, UPDATE, or DELETE.

create policy "gacha_card_images_student_select"
on storage.objects
as permissive
for select
to authenticated
using (
  bucket_id = 'gacha-card-images'
  and (select app_private.can_student_read_unlocked_gacha_card_image(name))
);

-- .remove() needs both SELECT and DELETE. After the course row is gone the
-- teacher policies stop matching, so the uploader can still finish cleanup.
create policy "gacha_card_images_deleted_course_cleanup_select"
on storage.objects
as permissive
for select
to authenticated
using (
  bucket_id = 'gacha-card-images'
  and (
    lower(owner_id) = lower((select auth.uid())::text)
    or owner = (select auth.uid())
  )
  and (select app_private.can_cleanup_deleted_course_gacha_image(name))
);

-- .remove() also needs teacher SELECT, which already matches this course folder
-- after finalization. Objects referenced by gacha_cards stay protected.
create policy "gacha_card_images_orphan_delete"
on storage.objects
as permissive
for delete
to authenticated
using (
  bucket_id = 'gacha-card-images'
  and (
    lower(owner_id) = lower((select auth.uid())::text)
    or owner = (select auth.uid())
  )
  and (select app_private.can_delete_orphan_gacha_card_image(name))
);

create policy "gacha_card_images_deleted_course_cleanup_delete"
on storage.objects
as permissive
for delete
to authenticated
using (
  bucket_id = 'gacha-card-images'
  and (
    lower(owner_id) = lower((select auth.uid())::text)
    or owner = (select auth.uid())
  )
  and (select app_private.can_cleanup_deleted_course_gacha_image(name))
);

create or replace function app_private.prepare_gacha_course_cascade()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  -- Must run before the config delete. Otherwise protect_finalized_gacha_structure
  -- no longer sees status = 'finalized' and the card delete is allowed.
  if exists (
    select 1
    from public.course_gacha_configs as config
    where config.course_id = old.id
      and config.status = 'finalized'
  ) then
    raise exception 'Finalized gacha structure cannot be changed';
  end if;

  delete from public.course_gacha_configs
  where course_id = old.id;

  delete from public.gacha_cards
  where course_id = old.id;

  -- Do not delete storage.objects here. A SQL delete leaves the binary in the
  -- bucket. Refuse the course delete until those objects are gone so a committed
  -- delete cannot keep gacha images.
  if exists (
    select 1
    from storage.objects as object
    where object.bucket_id = 'gacha-card-images'
      and app_private.gacha_card_image_course_id(object.name) = old.id
  ) then
    raise exception 'Cannot delete course while gacha card images remain in storage';
  end if;

  return old;
end;
$function$;

alter function app_private.prepare_gacha_course_cascade() owner to postgres;

revoke all on function app_private.prepare_gacha_course_cascade()
from public, anon, authenticated, service_role;
