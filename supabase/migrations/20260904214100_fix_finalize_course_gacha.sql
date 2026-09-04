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
  v_candidate_pulls integer;
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

  for v_candidate_pulls in 1..4 loop
    v_cards_per_pull := ceil(
      v_target_drops::numeric / (v_lessons_count * v_candidate_pulls)
    )::integer;

    if v_cards_per_pull <= 5 or v_candidate_pulls = 4 then
      v_pulls_per_lesson := v_candidate_pulls;
      exit;
    end if;
  end loop;

  if v_pulls_per_lesson is null then
    raise exception 'Failed to calculate gacha economy';
  end if;

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
