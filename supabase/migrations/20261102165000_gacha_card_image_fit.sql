-- The original image_transform check accepts only scale, offsetX and offsetY,
-- and requires scale between 1 and 3. Contain needs an extra fit value and a
-- scale below 1: that scale is still relative to object-cover, and its real
-- minimum depends on the source aspect and the frame window, so it can be
-- arbitrarily small. Existing rows have no fit key and stay valid cover
-- placements; this migration does not rewrite them.

alter table public.gacha_cards
  drop constraint gacha_cards_image_transform_check;

alter table public.gacha_cards
  add constraint gacha_cards_image_transform_check
  check (
    image_transform is null
    or (
      jsonb_typeof(image_transform) = 'object'
      and image_transform ? 'scale'
      and image_transform ? 'offsetX'
      and image_transform ? 'offsetY'
      and jsonb_typeof(image_transform -> 'scale') = 'number'
      and jsonb_typeof(image_transform -> 'offsetX') = 'number'
      and jsonb_typeof(image_transform -> 'offsetY') = 'number'
      and (image_transform ->> 'offsetX')::numeric between -5 and 5
      and (image_transform ->> 'offsetY')::numeric between -5 and 5
      and (
        (
          (image_transform - 'scale' - 'offsetX' - 'offsetY') = '{}'::jsonb
          and (image_transform ->> 'scale')::numeric between 1 and 3
        )
        or (
          (image_transform - 'scale' - 'offsetX' - 'offsetY' - 'fit') = '{}'::jsonb
          and image_transform ? 'fit'
          and jsonb_typeof(image_transform -> 'fit') = 'string'
          and image_transform ->> 'fit' in ('cover', 'contain')
          and (
            (
              image_transform ->> 'fit' = 'cover'
              and (image_transform ->> 'scale')::numeric between 1 and 3
            )
            or (
              image_transform ->> 'fit' = 'contain'
              and (image_transform ->> 'scale')::numeric > 0
              and (image_transform ->> 'scale')::numeric <= 3
            )
          )
        )
      )
    )
  );

comment on column public.gacha_cards.image_transform is
  'Placement relative to object-cover. Without fit, or with fit cover, scale stays 1..3. fit contain may use scale below 1 so the whole source fits in the frame window, and never above 3. offsetX and offsetY are fractions of the 2:3 canvas.';
