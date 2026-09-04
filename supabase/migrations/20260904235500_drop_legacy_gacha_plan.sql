drop function if exists public.add_test_pulls(uuid, integer);
drop function if exists public.generate_gacha_plan();

alter table public.user_course_gacha_state
drop column if exists plan_json;
