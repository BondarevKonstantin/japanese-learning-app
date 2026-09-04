create or replace function public.complete_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_lesson public.lessons%rowtype;
  v_course public.courses%rowtype;
  v_config public.course_gacha_configs%rowtype;
  v_state public.user_course_gacha_state%rowtype;
  v_completion_id uuid;
  v_reward_amount integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select *
  into v_lesson
  from public.lessons
  where id = p_lesson_id
  for share;

  if v_lesson.id is null then
    raise exception 'Lesson not found';
  end if;

  select *
  into v_course
  from public.courses
  where id = v_lesson.course_id
  for share;

  if v_course.id is null then
    raise exception 'Course not found';
  end if;

  if v_lesson.status <> 'published' then
    raise exception 'Lesson must be published before completion';
  end if;

  if v_course.status <> 'published' then
    raise exception 'Course must be published before lesson completion';
  end if;

  select *
  into v_config
  from public.course_gacha_configs
  where course_id = v_lesson.course_id
  for share;

  if v_config.course_id is null or v_config.status <> 'finalized' then
    raise exception 'Course gacha must be finalized before completing lessons';
  end if;

  if v_config.pulls_per_lesson is null or v_config.pulls_per_lesson <= 0 then
    raise exception 'Finalized course gacha reward is invalid';
  end if;

  v_reward_amount := v_config.pulls_per_lesson;

  insert into public.user_completed_lessons (
    user_id,
    lesson_id,
    course_id
  )
  values (
    v_user_id,
    p_lesson_id,
    v_lesson.course_id
  )
  on conflict (user_id, lesson_id)
  do nothing
  returning id
  into v_completion_id;

  if v_completion_id is null then
    select *
    into v_state
    from public.user_course_gacha_state
    where user_id = v_user_id
      and course_id = v_lesson.course_id;

    return jsonb_build_object(
      'completed_now', false,
      'reward_amount', 0,
      'course_id', v_lesson.course_id,
      'lesson_id', p_lesson_id,
      'state', jsonb_build_object(
        'available_pulls', coalesce(v_state.available_pulls, 0),
        'used_pulls', coalesce(v_state.used_pulls, 0),
        'total_pulls_earned', coalesce(v_state.total_pulls_earned, 0)
      )
    );
  end if;

  insert into public.user_course_gacha_state (
    user_id,
    course_id,
    available_pulls,
    used_pulls,
    total_pulls_earned
  )
  values (
    v_user_id,
    v_lesson.course_id,
    v_reward_amount,
    0,
    v_reward_amount
  )
  on conflict (user_id, course_id)
  do update set
    available_pulls =
      public.user_course_gacha_state.available_pulls + excluded.available_pulls,
    total_pulls_earned =
      public.user_course_gacha_state.total_pulls_earned + excluded.total_pulls_earned,
    updated_at = now();

  select *
  into v_state
  from public.user_course_gacha_state
  where user_id = v_user_id
    and course_id = v_lesson.course_id;

  return jsonb_build_object(
    'completed_now', true,
    'reward_amount', v_reward_amount,
    'course_id', v_lesson.course_id,
    'lesson_id', p_lesson_id,
    'state', jsonb_build_object(
      'available_pulls', v_state.available_pulls,
      'used_pulls', v_state.used_pulls,
      'total_pulls_earned', v_state.total_pulls_earned
    )
  );
end;
$function$;

alter function public.complete_lesson(uuid) owner to postgres;

revoke all on function public.complete_lesson(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.complete_lesson(uuid)
to authenticated, postgres, service_role;
