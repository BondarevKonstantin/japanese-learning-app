-- Stores the original gacha illustration and a separate cover placement.
-- scale is relative to the initial object-cover size. offsetX and offsetY are
-- fractions of the 2:3 canvas width and height. NULL keeps the legacy centered cover.

alter table public.gacha_cards
  add column image_transform jsonb null;

alter table public.gacha_cards
  add constraint gacha_cards_image_transform_check
  check (
    image_transform is null
    or (
      jsonb_typeof(image_transform) = 'object'
      and image_transform ? 'scale'
      and image_transform ? 'offsetX'
      and image_transform ? 'offsetY'
      and (image_transform - 'scale' - 'offsetX' - 'offsetY') = '{}'::jsonb
      and jsonb_typeof(image_transform -> 'scale') = 'number'
      and jsonb_typeof(image_transform -> 'offsetX') = 'number'
      and jsonb_typeof(image_transform -> 'offsetY') = 'number'
      and (image_transform ->> 'scale')::numeric between 1 and 3
      and (image_transform ->> 'offsetX')::numeric between -5 and 5
      and (image_transform ->> 'offsetY')::numeric between -5 and 5
    )
  );

comment on column public.gacha_cards.image_transform is
  'Optional cover placement: scale 1..3 relative to object-cover, offsets normalized to the 2:3 canvas.';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'gacha-card-images',
  'gacha-card-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
);

create or replace function app_private.gacha_card_image_course_id(object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when object_name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpe?g|webp)$'
    then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

create or replace function app_private.can_read_gacha_card_image(object_name text)
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
  );
$$;

-- Upload and delete stay closed after finalization. Select stays available so
-- storage.objects delete().select() used by Storage .remove() can see the row
-- when a delete is still allowed.
create or replace function app_private.can_change_gacha_card_image(object_name text)
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
        from public.course_gacha_configs as config
        where config.course_id = parsed.course_id
          and config.status = 'finalized'
      )
  );
$$;

alter function app_private.gacha_card_image_course_id(text) owner to postgres;
alter function app_private.can_read_gacha_card_image(text) owner to postgres;
alter function app_private.can_change_gacha_card_image(text) owner to postgres;

revoke all on function app_private.gacha_card_image_course_id(text) from public;
revoke all on function app_private.can_read_gacha_card_image(text) from public;
revoke all on function app_private.can_change_gacha_card_image(text) from public;

grant execute on function app_private.gacha_card_image_course_id(text) to authenticated;
grant execute on function app_private.can_read_gacha_card_image(text) to authenticated;
grant execute on function app_private.can_change_gacha_card_image(text) to authenticated;

create policy "gacha_card_images_teacher_select"
on storage.objects
as permissive
for select
to authenticated
using (
  bucket_id = 'gacha-card-images'
  and (select app_private.can_read_gacha_card_image(name))
);

create policy "gacha_card_images_teacher_insert"
on storage.objects
as permissive
for insert
to authenticated
with check (
  bucket_id = 'gacha-card-images'
  and (select app_private.can_change_gacha_card_image(name))
);

create policy "gacha_card_images_teacher_delete"
on storage.objects
as permissive
for delete
to authenticated
using (
  bucket_id = 'gacha-card-images'
  and (select app_private.can_change_gacha_card_image(name))
);
