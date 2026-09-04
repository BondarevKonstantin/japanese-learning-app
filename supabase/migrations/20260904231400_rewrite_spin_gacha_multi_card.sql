create or replace function app_private.gacha_base_rarity_weight(
  p_rarity text,
  p_progress numeric
)
returns numeric
language sql
immutable
strict
set search_path to ''
as $function$
  with normalized as (
    select greatest(0::numeric, least(1::numeric, p_progress)) as progress
  )
  select
    case
      when normalized.progress < 0.25 then
        case p_rarity
          when 'common' then 70
          when 'rare' then 25
          when 'epic' then 5
          when 'legendary' then 0
          else 0
        end
      when normalized.progress < 0.60 then
        case p_rarity
          when 'common' then 50
          when 'rare' then 30
          when 'epic' then 17
          when 'legendary' then 3
          else 0
        end
      when normalized.progress < 0.85 then
        case p_rarity
          when 'common' then 35
          when 'rare' then 30
          when 'epic' then 25
          when 'legendary' then 10
          else 0
        end
      else
        case p_rarity
          when 'common' then 25
          when 'rare' then 25
          when 'epic' then 30
          when 'legendary' then 20
          else 0
        end
    end
  from normalized;
$function$;

create or replace function app_private.gacha_new_unlock_cap(
  p_rarity text,
  p_progress numeric
)
returns numeric
language sql
immutable
strict
set search_path to ''
as $function$
  with normalized as (
    select greatest(0::numeric, least(1::numeric, p_progress)) as progress
  )
  select
    case
      when normalized.progress <= 0.25 then
        case p_rarity
          when 'common' then 0.50
          when 'rare' then 0.35
          when 'epic' then 0.20
          when 'legendary' then 0
          else 0
        end
      when normalized.progress <= 0.50 then
        case p_rarity
          when 'common' then 0.80
          when 'rare' then 0.65
          when 'epic' then 0.45
          when 'legendary' then 0.20
          else 0
        end
      when normalized.progress <= 0.75 then
        case p_rarity
          when 'common' then 0.95
          when 'rare' then 0.90
          when 'epic' then 0.75
          when 'legendary' then 0.55
          else 0
        end
      else
        1
    end
  from normalized;
$function$;

create or replace function app_private.gacha_target_unlocked_share(
  p_rarity text,
  p_progress numeric
)
returns numeric
language plpgsql
immutable
strict
set search_path to ''
as $function$
declare
  v_progress numeric;
  v_target_25 numeric;
  v_target_50 numeric;
  v_target_75 numeric;
  v_target_90 numeric;
begin
  v_progress := greatest(0::numeric, least(1::numeric, p_progress));

  case p_rarity
    when 'common' then
      v_target_25 := 0.45;
      v_target_50 := 0.72;
      v_target_75 := 0.90;
      v_target_90 := 0.98;
    when 'rare' then
      v_target_25 := 0.25;
      v_target_50 := 0.55;
      v_target_75 := 0.82;
      v_target_90 := 0.95;
    when 'epic' then
      v_target_25 := 0.08;
      v_target_50 := 0.35;
      v_target_75 := 0.68;
      v_target_90 := 0.90;
    when 'legendary' then
      v_target_25 := 0;
      v_target_50 := 0.20;
      v_target_75 := 0.50;
      v_target_90 := 0.80;
    else
      return 0;
  end case;

  if v_progress <= 0.25 then
    return v_target_25 * (v_progress / 0.25);
  elsif v_progress <= 0.50 then
    return v_target_25
      + (v_target_50 - v_target_25) * ((v_progress - 0.25) / 0.25);
  elsif v_progress <= 0.75 then
    return v_target_50
      + (v_target_75 - v_target_50) * ((v_progress - 0.50) / 0.25);
  elsif v_progress <= 0.90 then
    return v_target_75
      + (v_target_90 - v_target_75) * ((v_progress - 0.75) / 0.15);
  end if;

  return v_target_90
    + (1 - v_target_90) * ((v_progress - 0.90) / 0.10);
end;
$function$;

alter function app_private.gacha_base_rarity_weight(text, numeric) owner to postgres;
alter function app_private.gacha_new_unlock_cap(text, numeric) owner to postgres;
alter function app_private.gacha_target_unlocked_share(text, numeric) owner to postgres;

revoke all on function app_private.gacha_base_rarity_weight(text, numeric)
from public, anon, authenticated, service_role;

revoke all on function app_private.gacha_new_unlock_cap(text, numeric)
from public, anon, authenticated, service_role;

revoke all on function app_private.gacha_target_unlocked_share(text, numeric)
from public, anon, authenticated, service_role;

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
        'image_url', v_card.image_url,
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
