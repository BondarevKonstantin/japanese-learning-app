do $migration$
begin
  if exists (
    select 1
    from public.gacha_pull_history as history
    where history.pull_number <= 0
  ) then
    raise exception 'Cannot migrate gacha history with non-positive pull numbers';
  end if;

  if exists (
    select 1
    from public.gacha_pull_history as history
    join public.gacha_cards as card on card.id = history.card_id
    where card.course_id <> history.course_id
  ) then
    raise exception 'Cannot migrate gacha history with cards from another course';
  end if;

  if exists (
    select 1
    from public.gacha_pull_history as history
    where not exists (
      select 1
      from public.user_unlocked_cards as unlocked
      where unlocked.user_id = history.user_id
        and unlocked.course_id = history.course_id
        and unlocked.card_id = history.card_id
    )
  ) then
    raise exception 'Cannot migrate gacha history without matching unlocked cards';
  end if;

  if exists (
    select 1
    from public.gacha_pull_history as history
    group by history.user_id, history.course_id, history.card_id
    having count(*) > 1
  ) then
    raise exception 'Cannot mark repeated historical cards as new';
  end if;

  if exists (
    select 1
    from public.gacha_pull_history as history
    group by history.user_id, history.course_id, history.pull_number
    having count(*) > 1
  ) then
    raise exception 'Cannot migrate multiple historical rows for one old pull';
  end if;

  if exists (
    select 1
    from public.gacha_pull_history as history
    where not exists (
      select 1
      from public.user_course_gacha_state as state
      where state.user_id = history.user_id
        and state.course_id = history.course_id
    )
  ) then
    raise exception 'Cannot migrate gacha history without matching state';
  end if;

  if exists (
    select 1
    from public.user_course_gacha_state as state
    left join public.gacha_pull_history as history
      on history.user_id = state.user_id
      and history.course_id = state.course_id
    group by state.id
    having state.used_pulls <> count(history.id)
  ) then
    raise exception 'Cannot backfill used_drops: used_pulls and history count differ';
  end if;

  if exists (
    select 1
    from public.gacha_pull_history as history
    group by history.user_id, history.course_id
    having min(history.pull_number) <> 1
      or max(history.pull_number) <> count(*)
  ) then
    raise exception 'Cannot migrate non-sequential historical pull numbers';
  end if;
end;
$migration$;

alter table public.user_course_gacha_state
add column used_drops integer not null default 0;

update public.user_course_gacha_state as state
set used_drops = (
  select count(*)::integer
  from public.gacha_pull_history as history
  where history.user_id = state.user_id
    and history.course_id = state.course_id
);

alter table public.user_course_gacha_state
add constraint user_course_gacha_state_used_drops_check
check (used_drops >= 0);

alter table public.gacha_pull_history
add column drop_number integer not null default 1,
add column was_new boolean not null default true;

alter table public.gacha_pull_history
add constraint gacha_pull_history_pull_number_check
check (pull_number > 0),
add constraint gacha_pull_history_drop_number_check
check (drop_number > 0),
add constraint gacha_pull_history_user_course_pull_drop_key
unique (user_id, course_id, pull_number, drop_number);
