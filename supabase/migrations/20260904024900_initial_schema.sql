-- Baseline of the existing live application schema.
-- This migration intentionally reproduces the audited state without hardening it.

create schema if not exists app_private authorization postgres;

create table public.profiles (
  id uuid primary key references auth.users (id),
  email text not null unique,
  role text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'draft',
  order_index integer not null default 0,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  theory_markdown text not null default '',
  status text not null default 'draft',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_practice_items (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  type text not null,
  question text not null,
  options jsonb,
  correct_answer jsonb not null,
  explanation text,
  order_index integer not null default 0,
  created_at timestamptz default now(),
  image_url text,
  constraint lesson_practice_items_type_check
    check (type in ('multiple_choice', 'input', 'textarea'))
);

create table public.lesson_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  status text not null default 'submitted',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_submissions_status_check
    check (status in ('submitted', 'reviewed')),
  constraint lesson_submissions_user_id_lesson_id_key unique (user_id, lesson_id)
);

create table public.lesson_submission_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.lesson_submissions (id) on delete cascade,
  practice_item_id uuid not null references public.lesson_practice_items (id) on delete cascade,
  answer_text text,
  is_auto_correct boolean,
  teacher_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_submission_answers_submission_id_practice_item_id_key
    unique (submission_id, practice_item_id)
);

create table public.gacha_cards (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id),
  title text not null,
  image_url text not null,
  rarity text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gacha_pull_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  card_id uuid not null references public.gacha_cards (id) on delete cascade,
  pull_number integer not null,
  created_at timestamptz not null default now()
);

create table public.user_completed_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  completed_at timestamptz not null default now(),
  constraint user_completed_lessons_user_id_lesson_id_key unique (user_id, lesson_id)
);

create table public.user_course_gacha_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  available_pulls integer not null default 0,
  used_pulls integer not null default 0,
  total_pulls_earned integer not null default 0,
  plan_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_course_gacha_state_user_id_course_id_key unique (user_id, course_id)
);

create table public.user_unlocked_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  card_id uuid not null references public.gacha_cards (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  constraint user_unlocked_cards_user_id_course_id_card_id_key
    unique (user_id, course_id, card_id)
);

create index courses_created_by_idx
  on public.courses (created_by);

create index gacha_cards_course_id_idx
  on public.gacha_cards (course_id);

create index gacha_cards_course_id_rarity_idx
  on public.gacha_cards (course_id, rarity);

create index gacha_pull_history_card_id_idx
  on public.gacha_pull_history (card_id);

create index gacha_pull_history_user_id_course_id_idx
  on public.gacha_pull_history (user_id, course_id);

create index lesson_practice_items_lesson_id_idx
  on public.lesson_practice_items (lesson_id);

create index lesson_submission_answers_practice_item_id_idx
  on public.lesson_submission_answers (practice_item_id);

create index lesson_submission_answers_submission_id_idx
  on public.lesson_submission_answers (submission_id);

create index lesson_submissions_course_id_idx
  on public.lesson_submissions (course_id);

create index lesson_submissions_lesson_id_idx
  on public.lesson_submissions (lesson_id);

create index lesson_submissions_status_idx
  on public.lesson_submissions (status);

create index lesson_submissions_user_id_idx
  on public.lesson_submissions (user_id);

create index lessons_course_id_idx
  on public.lessons (course_id);

create index user_completed_lessons_course_id_idx
  on public.user_completed_lessons (course_id);

create index user_completed_lessons_user_id_idx
  on public.user_completed_lessons (user_id);

create index user_completed_lessons_user_id_course_id_idx
  on public.user_completed_lessons (user_id, course_id);

create index user_course_gacha_state_user_id_idx
  on public.user_course_gacha_state (user_id);

create index user_unlocked_cards_user_id_course_id_idx
  on public.user_unlocked_cards (user_id, course_id);

create or replace function app_private.can_manage_course(p_course_id uuid)
returns boolean
language sql
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.courses c
    where c.id = p_course_id
      and c.created_by = (select auth.uid())
  );
$function$;

create or replace function app_private.can_manage_lesson(p_lesson_id uuid)
returns boolean
language sql
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = p_lesson_id
      and c.created_by = (select auth.uid())
  );
$function$;

create or replace function app_private.can_view_lesson(p_lesson_id uuid)
returns boolean
language sql
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = p_lesson_id
      and (
        c.created_by = (select auth.uid())
        or (l.status = 'published' and c.status = 'published')
      )
  );
$function$;

create or replace function app_private.is_published_course(p_course_id uuid)
returns boolean
language sql
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.courses c
    where c.id = p_course_id
      and c.status = 'published'
  );
$function$;

create or replace function app_private.is_teacher()
returns boolean
language sql
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'teacher'
  );
$function$;

create or replace function public.generate_gacha_plan()
returns jsonb
language plpgsql
as $function$
declare
  phase1 text[];
  phase2 text[];
  phase3 text[];
  result text[];
begin
  phase1 :=
    array_fill('common'::text, array[11]) ||
    array_fill('rare'::text, array[6]) ||
    array_fill('epic'::text, array[2]) ||
    array_fill('legendary'::text, array[1]);

  phase2 :=
    array_fill('common'::text, array[9]) ||
    array_fill('rare'::text, array[8]) ||
    array_fill('epic'::text, array[7]) ||
    array_fill('legendary'::text, array[1]);

  phase3 :=
    array_fill('common'::text, array[10]) ||
    array_fill('rare'::text, array[5]) ||
    array_fill('epic'::text, array[7]) ||
    array_fill('legendary'::text, array[13]);

  select array_agg(value order by random())
  into phase1
  from unnest(phase1) as value;

  select array_agg(value order by random())
  into phase2
  from unnest(phase2) as value;

  select array_agg(value order by random())
  into phase3
  from unnest(phase3) as value;

  result := phase1 || phase2 || phase3;

  return to_jsonb(result);
end;
$function$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.add_test_pulls(p_course_id uuid, p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_state public.user_course_gacha_state%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  insert into public.user_course_gacha_state (
    user_id,
    course_id,
    available_pulls,
    used_pulls,
    total_pulls_earned,
    plan_json
  )
  values (
    v_user_id,
    p_course_id,
    p_amount,
    0,
    p_amount,
    public.generate_gacha_plan()
  )
  on conflict (user_id, course_id)
  do update set
    available_pulls = public.user_course_gacha_state.available_pulls + excluded.available_pulls,
    total_pulls_earned =
      public.user_course_gacha_state.total_pulls_earned + excluded.total_pulls_earned,
    updated_at = now();

  select *
  into v_state
  from public.user_course_gacha_state
  where user_id = v_user_id
    and course_id = p_course_id;

  return jsonb_build_object(
    'available_pulls', v_state.available_pulls,
    'used_pulls', v_state.used_pulls,
    'total_pulls_earned', v_state.total_pulls_earned
  );
end;
$function$;

create or replace function public.complete_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_lesson public.lessons%rowtype;
  v_state public.user_course_gacha_state%rowtype;
  v_already_completed boolean;
  v_reward_amount int := 10;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select *
  into v_lesson
  from public.lessons
  where id = p_lesson_id;

  if v_lesson.id is null then
    raise exception 'Lesson not found';
  end if;

  select exists (
    select 1
    from public.user_completed_lessons
    where user_id = v_user_id
      and lesson_id = p_lesson_id
  )
  into v_already_completed;

  if v_already_completed then
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

  insert into public.user_completed_lessons (
    user_id,
    lesson_id,
    course_id
  )
  values (
    v_user_id,
    p_lesson_id,
    v_lesson.course_id
  );

  insert into public.user_course_gacha_state (
    user_id,
    course_id,
    available_pulls,
    used_pulls,
    total_pulls_earned,
    plan_json
  )
  values (
    v_user_id,
    v_lesson.course_id,
    v_reward_amount,
    0,
    v_reward_amount,
    public.generate_gacha_plan()
  )
  on conflict (user_id, course_id)
  do update set
    available_pulls = public.user_course_gacha_state.available_pulls + v_reward_amount,
    total_pulls_earned = public.user_course_gacha_state.total_pulls_earned + v_reward_amount,
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

create or replace function public.get_my_lesson_results(p_lesson_id uuid)
returns table(
  submission_id uuid,
  submission_status text,
  submitted_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  practice_item_id uuid,
  practice_item_type text,
  question text,
  correct_answer jsonb,
  explanation text,
  image_url text,
  answer_id uuid,
  answer_text text,
  is_auto_correct boolean,
  teacher_comment text
)
language sql
security definer
set search_path to ''
as $function$
  select
    s.id as submission_id,
    s.status as submission_status,
    s.submitted_at,
    s.reviewed_at,
    i.id as practice_item_id,
    i.type as practice_item_type,
    i.question,
    i.correct_answer,
    i.explanation,
    i.image_url,
    a.id as answer_id,
    a.answer_text,
    a.is_auto_correct,
    a.teacher_comment
  from public.lesson_submissions s
  join public.lesson_submission_answers a on a.submission_id = s.id
  join public.lesson_practice_items i on i.id = a.practice_item_id
  where s.user_id = auth.uid()
    and s.lesson_id = p_lesson_id
  order by i.order_index, i.created_at;
$function$;

create or replace function public.review_lesson_submission(
  p_submission_id uuid,
  p_answers jsonb
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_teacher_id uuid;
  v_course_owner_id uuid;
  v_submission_status text;
  v_item jsonb;
  v_answer_id uuid;
  v_teacher_comment text;
  v_expected_answers_count integer;
  v_received_answers_count integer;
  v_distinct_answers_count integer;
begin
  v_teacher_id := auth.uid();

  if v_teacher_id is null then
    raise exception 'Unauthorized';
  end if;

  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Answers must be a JSON array';
  end if;

  select
    c.created_by,
    s.status
  into
    v_course_owner_id,
    v_submission_status
  from public.lesson_submissions s
  join public.lessons l on l.id = s.lesson_id
  join public.courses c on c.id = l.course_id
  where s.id = p_submission_id
  for update of s;

  if v_course_owner_id is null then
    raise exception 'Submission not found';
  end if;

  if v_course_owner_id <> v_teacher_id then
    raise exception 'Forbidden';
  end if;

  if v_submission_status <> 'submitted' then
    raise exception 'Only submitted work can be reviewed';
  end if;

  select count(*)
  into v_expected_answers_count
  from public.lesson_submission_answers a
  where a.submission_id = p_submission_id;

  select jsonb_array_length(p_answers)
  into v_received_answers_count;

  select count(distinct (value ->> 'answerId'))
  into v_distinct_answers_count
  from jsonb_array_elements(p_answers);

  if v_received_answers_count <> v_expected_answers_count then
    raise exception 'All submission answers must be provided';
  end if;

  if v_distinct_answers_count <> v_expected_answers_count then
    raise exception 'Duplicate or missing answer ids';
  end if;

  for v_item in
    select *
    from jsonb_array_elements(p_answers)
  loop
    if nullif(trim(v_item ->> 'answerId'), '') is null then
      raise exception 'answerId is required';
    end if;

    v_answer_id := (v_item ->> 'answerId')::uuid;
    v_teacher_comment := v_item ->> 'teacherComment';

    if not exists (
      select 1
      from public.lesson_submission_answers a
      where a.id = v_answer_id
        and a.submission_id = p_submission_id
    ) then
      raise exception 'Answer does not belong to submission';
    end if;
  end loop;

  for v_item in
    select *
    from jsonb_array_elements(p_answers)
  loop
    v_answer_id := (v_item ->> 'answerId')::uuid;
    v_teacher_comment := v_item ->> 'teacherComment';

    update public.lesson_submission_answers
    set
      teacher_comment = v_teacher_comment,
      updated_at = now()
    where id = v_answer_id
      and submission_id = p_submission_id;
  end loop;

  update public.lesson_submissions
  set
    status = 'reviewed',
    reviewed_at = now(),
    reviewed_by = v_teacher_id,
    updated_at = now()
  where id = p_submission_id;
end;
$function$;

create or replace function public.spin_gacha(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_state public.user_course_gacha_state%rowtype;
  v_total_cards int;
  v_unlocked_count int;
  v_pull_number int;
  v_target_rarity text;
  v_card public.gacha_cards%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if not exists (
    select 1
    from public.courses
    where id = p_course_id
  ) then
    raise exception 'Course not found';
  end if;

  if not exists (
    select 1
    from public.gacha_cards
    where course_id = p_course_id
  ) then
    raise exception 'This course has no gacha';
  end if;

  insert into public.user_course_gacha_state (
    user_id,
    course_id,
    available_pulls,
    used_pulls,
    total_pulls_earned,
    plan_json
  )
  values (
    v_user_id,
    p_course_id,
    0,
    0,
    0,
    public.generate_gacha_plan()
  )
  on conflict (user_id, course_id) do nothing;

  select *
  into v_state
  from public.user_course_gacha_state
  where user_id = v_user_id
    and course_id = p_course_id
  for update;

  if v_state.available_pulls <= 0 then
    raise exception 'No available pulls';
  end if;

  select count(*)
  into v_total_cards
  from public.gacha_cards
  where course_id = p_course_id;

  select count(*)
  into v_unlocked_count
  from public.user_unlocked_cards
  where user_id = v_user_id
    and course_id = p_course_id;

  if v_unlocked_count >= v_total_cards then
    raise exception 'Collection already completed';
  end if;

  v_pull_number := v_state.used_pulls + 1;

  v_target_rarity := v_state.plan_json ->> v_state.used_pulls;

  if v_target_rarity is null then
    raise exception 'Gacha plan is invalid';
  end if;

  select gc.*
  into v_card
  from public.gacha_cards gc
  where gc.course_id = p_course_id
    and gc.rarity = v_target_rarity
    and not exists (
      select 1
      from public.user_unlocked_cards uuc
      where uuc.user_id = v_user_id
        and uuc.course_id = p_course_id
        and uuc.card_id = gc.id
    )
  order by random()
  limit 1;

  if v_card.id is null then
    select gc.*
    into v_card
    from public.gacha_cards gc
    where gc.course_id = p_course_id
      and not exists (
        select 1
        from public.user_unlocked_cards uuc
        where uuc.user_id = v_user_id
          and uuc.course_id = p_course_id
          and uuc.card_id = gc.id
      )
    order by random()
    limit 1;
  end if;

  if v_card.id is null then
    raise exception 'No available cards to unlock';
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
  );

  insert into public.gacha_pull_history (
    user_id,
    course_id,
    card_id,
    pull_number
  )
  values (
    v_user_id,
    p_course_id,
    v_card.id,
    v_pull_number
  );

  update public.user_course_gacha_state
  set
    available_pulls = available_pulls - 1,
    used_pulls = used_pulls + 1,
    updated_at = now()
  where id = v_state.id;

  v_unlocked_count := v_unlocked_count + 1;

  return jsonb_build_object(
    'card', jsonb_build_object(
      'id', v_card.id,
      'course_id', v_card.course_id,
      'title', v_card.title,
      'image_url', v_card.image_url,
      'rarity', v_card.rarity,
      'created_by', v_card.created_by,
      'created_at', v_card.created_at,
      'updated_at', v_card.updated_at
    ),
    'progress', jsonb_build_object(
      'unlocked', v_unlocked_count,
      'total', v_total_cards,
      'remaining', v_total_cards - v_unlocked_count,
      'completed', v_unlocked_count >= v_total_cards
    ),
    'state', jsonb_build_object(
      'available_pulls', v_state.available_pulls - 1,
      'used_pulls', v_state.used_pulls + 1,
      'total_pulls_earned', v_state.total_pulls_earned
    ),
    'meta', jsonb_build_object(
      'pull_number', v_pull_number,
      'target_rarity', v_target_rarity,
      'actual_rarity', v_card.rarity
    )
  );
end;
$function$;

create or replace function public.submit_lesson_answers(
  p_lesson_id uuid,
  p_answers jsonb
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_course_id uuid;
  v_submission_id uuid;
  v_existing_status text;
  v_item jsonb;
  v_practice_item_id uuid;
  v_answer_text text;
  v_item_type text;
  v_correct_answer jsonb;
  v_is_auto_correct boolean;
  v_expected_items_count integer;
  v_received_items_count integer;
  v_distinct_items_count integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Answers must be a JSON array';
  end if;

  select l.course_id
  into v_course_id
  from public.lessons l
  join public.courses c on c.id = l.course_id
  where l.id = p_lesson_id
    and l.status = 'published'
    and c.status = 'published';

  if v_course_id is null then
    raise exception 'Lesson not found or not available';
  end if;

  select s.id, s.status
  into v_submission_id, v_existing_status
  from public.lesson_submissions s
  where s.user_id = v_user_id
    and s.lesson_id = p_lesson_id
  for update;

  if v_submission_id is not null and v_existing_status = 'reviewed' then
    raise exception 'Reviewed submission cannot be submitted again';
  end if;

  select count(*)
  into v_expected_items_count
  from public.lesson_practice_items i
  where i.lesson_id = p_lesson_id;

  select jsonb_array_length(p_answers)
  into v_received_items_count;

  select count(distinct (value ->> 'practiceItemId'))
  into v_distinct_items_count
  from jsonb_array_elements(p_answers);

  if v_received_items_count <> v_expected_items_count then
    raise exception 'All practice items must be answered';
  end if;

  if v_distinct_items_count <> v_expected_items_count then
    raise exception 'Duplicate or missing practice items';
  end if;

  for v_item in
    select *
    from jsonb_array_elements(p_answers)
  loop
    if nullif(trim(v_item ->> 'practiceItemId'), '') is null then
      raise exception 'practiceItemId is required';
    end if;

    v_practice_item_id := (v_item ->> 'practiceItemId')::uuid;
    v_answer_text := coalesce(v_item ->> 'answerText', '');

    if trim(v_answer_text) = '' then
      raise exception 'All answers must be non-empty';
    end if;

    select i.type, i.correct_answer
    into v_item_type, v_correct_answer
    from public.lesson_practice_items i
    where i.id = v_practice_item_id
      and i.lesson_id = p_lesson_id;

    if v_item_type is null then
      raise exception 'Practice item not found in lesson';
    end if;
  end loop;

  if v_submission_id is null then
    insert into public.lesson_submissions (
      user_id,
      lesson_id,
      course_id,
      status,
      submitted_at
    )
    values (
      v_user_id,
      p_lesson_id,
      v_course_id,
      'submitted',
      now()
    )
    returning id into v_submission_id;
  else
    update public.lesson_submissions
    set
      status = 'submitted',
      submitted_at = now(),
      updated_at = now()
    where id = v_submission_id;
  end if;

  delete from public.lesson_submission_answers
  where submission_id = v_submission_id;

  for v_item in
    select *
    from jsonb_array_elements(p_answers)
  loop
    v_practice_item_id := (v_item ->> 'practiceItemId')::uuid;
    v_answer_text := regexp_replace(
      lower(trim(coalesce(v_item ->> 'answerText', ''))),
      '\s+',
      ' ',
      'g'
    );

    select i.type, i.correct_answer
    into v_item_type, v_correct_answer
    from public.lesson_practice_items i
    where i.id = v_practice_item_id
      and i.lesson_id = p_lesson_id;

    if v_item_type = 'textarea' then
      v_is_auto_correct := null;

    elsif v_item_type = 'multiple_choice' then
      v_is_auto_correct :=
        regexp_replace(
          lower(trim(coalesce(v_correct_answer #>> '{}', ''))),
          '\s+',
          ' ',
          'g'
        ) = v_answer_text;

    elsif v_item_type = 'input' then
      if jsonb_typeof(v_correct_answer) = 'array' then
        v_is_auto_correct := exists (
          select 1
          from jsonb_array_elements_text(v_correct_answer) as answer_value
          where regexp_replace(
            lower(trim(answer_value)),
            '\s+',
            ' ',
            'g'
          ) = v_answer_text
        );
      else
        v_is_auto_correct := exists (
          select 1
          from regexp_split_to_table(
            coalesce(v_correct_answer #>> '{}', ''),
            '[;；]'
          ) as answer_value
          where regexp_replace(
            lower(trim(answer_value)),
            '\s+',
            ' ',
            'g'
          ) = v_answer_text
        );
      end if;

    else
      raise exception 'Unsupported practice item type';
    end if;

    insert into public.lesson_submission_answers (
      submission_id,
      practice_item_id,
      answer_text,
      is_auto_correct,
      teacher_comment
    )
    values (
      v_submission_id,
      v_practice_item_id,
      coalesce(v_item ->> 'answerText', ''),
      v_is_auto_correct,
      null
    );
  end loop;

  return v_submission_id;
end;
$function$;

alter function app_private.can_manage_course(uuid) owner to postgres;
alter function app_private.can_manage_lesson(uuid) owner to postgres;
alter function app_private.can_view_lesson(uuid) owner to postgres;
alter function app_private.is_published_course(uuid) owner to postgres;
alter function app_private.is_teacher() owner to postgres;
alter function public.add_test_pulls(uuid, integer) owner to postgres;
alter function public.complete_lesson(uuid) owner to postgres;
alter function public.generate_gacha_plan() owner to postgres;
alter function public.get_my_lesson_results(uuid) owner to postgres;
alter function public.review_lesson_submission(uuid, jsonb) owner to postgres;
alter function public.set_updated_at() owner to postgres;
alter function public.spin_gacha(uuid) owner to postgres;
alter function public.submit_lesson_answers(uuid, jsonb) owner to postgres;

create trigger set_lesson_submission_answers_updated_at
before update on public.lesson_submission_answers
for each row execute function public.set_updated_at();

create trigger set_lesson_submissions_updated_at
before update on public.lesson_submissions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_practice_items enable row level security;
alter table public.lesson_submissions enable row level security;
alter table public.lesson_submission_answers enable row level security;
alter table public.gacha_cards enable row level security;
alter table public.gacha_pull_history enable row level security;
alter table public.user_completed_lessons enable row level security;
alter table public.user_course_gacha_state enable row level security;
alter table public.user_unlocked_cards enable row level security;

create policy "Teachers can delete own courses"
on public.courses
as permissive
for delete
to authenticated
using (
  ((select app_private.is_teacher() as is_teacher)
    and (created_by = (select auth.uid() as uid)))
);

create policy "Teachers can insert own courses"
on public.courses
as permissive
for insert
to authenticated
with check (
  ((select app_private.is_teacher() as is_teacher)
    and (created_by = (select auth.uid() as uid)))
);

create policy "Teachers can update own courses"
on public.courses
as permissive
for update
to authenticated
using (
  ((select app_private.is_teacher() as is_teacher)
    and (created_by = (select auth.uid() as uid)))
)
with check (
  ((select app_private.is_teacher() as is_teacher)
    and (created_by = (select auth.uid() as uid)))
);

create policy "Teachers manage own courses and users read published courses"
on public.courses
as permissive
for select
to authenticated
using (
  ((status = 'published'::text)
    or (created_by = (select auth.uid() as uid)))
);

create policy "Teachers can delete own gacha cards"
on public.gacha_cards
as permissive
for delete
to authenticated
using (
  ((select app_private.is_teacher() as is_teacher)
    and (select app_private.can_manage_course(gacha_cards.course_id) as can_manage_course))
);

create policy "Teachers can insert gacha cards into own courses"
on public.gacha_cards
as permissive
for insert
to authenticated
with check (
  ((select app_private.is_teacher() as is_teacher)
    and (created_by = (select auth.uid() as uid))
    and (select app_private.can_manage_course(gacha_cards.course_id) as can_manage_course))
);

create policy "Teachers can update own gacha cards"
on public.gacha_cards
as permissive
for update
to authenticated
using (
  ((select app_private.is_teacher() as is_teacher)
    and (select app_private.can_manage_course(gacha_cards.course_id) as can_manage_course))
)
with check (
  ((select app_private.is_teacher() as is_teacher)
    and (created_by = (select auth.uid() as uid))
    and (select app_private.can_manage_course(gacha_cards.course_id) as can_manage_course))
);

create policy "Users view published course gacha cards and teachers view own c"
on public.gacha_cards
as permissive
for select
to authenticated
using (
  ((select app_private.can_manage_course(gacha_cards.course_id) as can_manage_course)
    or (select app_private.is_published_course(gacha_cards.course_id) as is_published_course))
);

create policy "Users can view own gacha pull history"
on public.gacha_pull_history
as permissive
for select
to authenticated
using (
  (user_id = (select auth.uid() as uid))
);

create policy "Teachers can delete practice in own lessons"
on public.lesson_practice_items
as permissive
for delete
to authenticated
using (
  ((select app_private.is_teacher() as is_teacher)
    and (select app_private.can_manage_lesson(lesson_practice_items.lesson_id) as can_manage_lesson))
);

create policy "Teachers can insert practice into own lessons"
on public.lesson_practice_items
as permissive
for insert
to authenticated
with check (
  ((select app_private.is_teacher() as is_teacher)
    and (select app_private.can_manage_lesson(lesson_practice_items.lesson_id) as can_manage_lesson))
);

create policy "Teachers can update practice in own lessons"
on public.lesson_practice_items
as permissive
for update
to authenticated
using (
  ((select app_private.is_teacher() as is_teacher)
    and (select app_private.can_manage_lesson(lesson_practice_items.lesson_id) as can_manage_lesson))
)
with check (
  ((select app_private.is_teacher() as is_teacher)
    and (select app_private.can_manage_lesson(lesson_practice_items.lesson_id) as can_manage_lesson))
);

create policy "Users view practice for viewable lessons"
on public.lesson_practice_items
as permissive
for select
to authenticated
using (
  (select app_private.can_view_lesson(lesson_practice_items.lesson_id) as can_view_lesson)
);

create policy "Students can insert own submission answers"
on public.lesson_submission_answers
as permissive
for insert
to authenticated
with check (
  ((exists (
    select 1
    from lesson_submissions s
    where s.id = lesson_submission_answers.submission_id
      and s.user_id = auth.uid()
      and s.status = 'submitted'::text
  ))
  and (exists (
    select 1
    from lesson_practice_items i
    where i.id = lesson_submission_answers.practice_item_id
      and i.lesson_id = (
        select s.lesson_id
        from lesson_submissions s
        where s.id = lesson_submission_answers.submission_id
      )
  )))
);

create policy "Students can update own submission answers before review"
on public.lesson_submission_answers
as permissive
for update
to authenticated
using (
  (exists (
    select 1
    from lesson_submissions s
    where s.id = lesson_submission_answers.submission_id
      and s.user_id = auth.uid()
      and s.status = 'submitted'::text
  ))
)
with check (
  (exists (
    select 1
    from lesson_submissions s
    where s.id = lesson_submission_answers.submission_id
      and s.user_id = auth.uid()
      and s.status = 'submitted'::text
  ))
);

create policy "Teachers can update comments for answers in own lessons"
on public.lesson_submission_answers
as permissive
for update
to authenticated
using (
  (exists (
    select 1
    from lesson_submissions s
    join lessons l on l.id = s.lesson_id
    join courses c on c.id = l.course_id
    where s.id = lesson_submission_answers.submission_id
      and c.created_by = auth.uid()
  ))
)
with check (
  (exists (
    select 1
    from lesson_submissions s
    join lessons l on l.id = s.lesson_id
    join courses c on c.id = l.course_id
    where s.id = lesson_submission_answers.submission_id
      and c.created_by = auth.uid()
  ))
);

create policy "Users can view own submission answers and teachers can view ans"
on public.lesson_submission_answers
as permissive
for select
to authenticated
using (
  (exists (
    select 1
    from lesson_submissions s
    where s.id = lesson_submission_answers.submission_id
      and (
        s.user_id = auth.uid()
        or (exists (
          select 1
          from lessons l
          join courses c on c.id = l.course_id
          where l.id = s.lesson_id
            and c.created_by = auth.uid()
        ))
      )
  ))
);

create policy "Students can insert own lesson submissions"
on public.lesson_submissions
as permissive
for insert
to authenticated
with check (
  ((user_id = auth.uid())
    and (exists (
      select 1
      from lessons l
      join courses c on c.id = l.course_id
      where l.id = lesson_submissions.lesson_id
        and c.id = lesson_submissions.course_id
        and l.status = 'published'::text
        and c.status = 'published'::text
    )))
);

create policy "Students can update own submitted lesson submissions"
on public.lesson_submissions
as permissive
for update
to authenticated
using (
  ((user_id = auth.uid()) and (status = 'submitted'::text))
)
with check (
  ((user_id = auth.uid()) and (status = 'submitted'::text))
);

create policy "Teachers can review submissions for own lessons"
on public.lesson_submissions
as permissive
for update
to authenticated
using (
  (exists (
    select 1
    from lessons l
    join courses c on c.id = l.course_id
    where l.id = lesson_submissions.lesson_id
      and c.created_by = auth.uid()
  ))
)
with check (
  (exists (
    select 1
    from lessons l
    join courses c on c.id = l.course_id
    where l.id = lesson_submissions.lesson_id
      and c.created_by = auth.uid()
  ))
);

create policy "Users can view own lesson submissions and teachers can view sub"
on public.lesson_submissions
as permissive
for select
to authenticated
using (
  ((user_id = auth.uid())
    or (exists (
      select 1
      from lessons l
      join courses c on c.id = l.course_id
      where l.id = lesson_submissions.lesson_id
        and c.created_by = auth.uid()
    )))
);

create policy "Teachers can delete own lessons"
on public.lessons
as permissive
for delete
to authenticated
using (
  ((select app_private.is_teacher() as is_teacher)
    and (select app_private.can_manage_course(lessons.course_id) as can_manage_course))
);

create policy "Teachers can insert lessons into own courses"
on public.lessons
as permissive
for insert
to authenticated
with check (
  ((select app_private.is_teacher() as is_teacher)
    and (select app_private.can_manage_course(lessons.course_id) as can_manage_course))
);

create policy "Teachers can update own lessons"
on public.lessons
as permissive
for update
to authenticated
using (
  ((select app_private.is_teacher() as is_teacher)
    and (select app_private.can_manage_course(lessons.course_id) as can_manage_course))
)
with check (
  ((select app_private.is_teacher() as is_teacher)
    and (select app_private.can_manage_course(lessons.course_id) as can_manage_course))
);

create policy "Users view published lessons and teachers view own lessons"
on public.lessons
as permissive
for select
to authenticated
using (
  ((select app_private.can_manage_course(lessons.course_id) as can_manage_course)
    or (
      (status = 'published'::text)
      and (select app_private.is_published_course(lessons.course_id) as is_published_course)
    ))
);

create policy "Users can insert own profile"
on public.profiles
as permissive
for insert
to authenticated
with check (
  (((select auth.uid() as uid) = id)
    and (role = any (array['teacher'::text, 'student'::text])))
);

create policy "Users can update own profile"
on public.profiles
as permissive
for update
to authenticated
using (
  ((select auth.uid() as uid) = id)
)
with check (
  (((select auth.uid() as uid) = id)
    and (role = any (array['teacher'::text, 'student'::text])))
);

create policy "Users can view own profile"
on public.profiles
as permissive
for select
to authenticated
using (
  ((select auth.uid() as uid) = id)
);

create policy "Users can view own completed lessons"
on public.user_completed_lessons
as permissive
for select
to authenticated
using (
  (user_id = (select auth.uid() as uid))
);

create policy "Users can view own gacha state"
on public.user_course_gacha_state
as permissive
for select
to authenticated
using (
  (user_id = (select auth.uid() as uid))
);

create policy "Users can view own unlocked cards"
on public.user_unlocked_cards
as permissive
for select
to authenticated
using (
  (user_id = (select auth.uid() as uid))
);

revoke all on schema app_private from public;
revoke all on schema app_private from anon;
revoke all on schema app_private from authenticated;
revoke all on schema app_private from service_role;
grant usage on schema app_private to authenticated;
grant usage, create on schema app_private to postgres;

grant usage on schema public to anon, authenticated, service_role;

grant all privileges on table
  public.profiles,
  public.courses,
  public.lessons,
  public.lesson_practice_items,
  public.lesson_submissions,
  public.lesson_submission_answers,
  public.gacha_cards,
  public.gacha_pull_history,
  public.user_completed_lessons,
  public.user_course_gacha_state,
  public.user_unlocked_cards
to anon, authenticated, service_role;

grant execute on function public.add_test_pulls(uuid, integer)
to public, anon, authenticated, service_role;

grant execute on function public.complete_lesson(uuid)
to public, anon, authenticated, service_role;

grant execute on function public.generate_gacha_plan()
to public, anon, authenticated, service_role;

grant execute on function public.get_my_lesson_results(uuid)
to public, anon, authenticated, service_role;

grant execute on function public.set_updated_at()
to public, anon, authenticated, service_role;

grant execute on function public.spin_gacha(uuid)
to public, anon, authenticated, service_role;

revoke all on function public.submit_lesson_answers(uuid, jsonb) from public;
revoke all on function public.submit_lesson_answers(uuid, jsonb) from anon;
revoke all on function public.submit_lesson_answers(uuid, jsonb) from authenticated;
revoke all on function public.submit_lesson_answers(uuid, jsonb) from service_role;
grant execute on function public.submit_lesson_answers(uuid, jsonb)
to authenticated, postgres, service_role;

revoke all on function public.review_lesson_submission(uuid, jsonb) from public;
revoke all on function public.review_lesson_submission(uuid, jsonb) from anon;
revoke all on function public.review_lesson_submission(uuid, jsonb) from authenticated;
revoke all on function public.review_lesson_submission(uuid, jsonb) from service_role;
grant execute on function public.review_lesson_submission(uuid, jsonb)
to authenticated, postgres, service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  ('lesson-images', 'lesson-images', true, null, null),
  ('practice-item-images', 'practice-item-images', true, null, null)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users can upload lesson images"
on storage.objects
as permissive
for insert
to authenticated
with check (
  (bucket_id = 'lesson-images'::text)
);

create policy "Authenticated users can upload practice item images"
on storage.objects
as permissive
for insert
to authenticated
with check (
  (bucket_id = 'practice-item-images'::text)
);

create policy "Authenticated users can update practice item images"
on storage.objects
as permissive
for update
to authenticated
using (
  (bucket_id = 'practice-item-images'::text)
)
with check (
  (bucket_id = 'practice-item-images'::text)
);

create policy "Authenticated users can delete practice item images"
on storage.objects
as permissive
for delete
to authenticated
using (
  (bucket_id = 'practice-item-images'::text)
);
