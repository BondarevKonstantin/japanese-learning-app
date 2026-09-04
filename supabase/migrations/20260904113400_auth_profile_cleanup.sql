create or replace function app_private.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.email is null then
    raise exception 'Email is required to create a profile';
  end if;

  insert into public.profiles (
    id,
    email,
    role,
    display_name
  )
  values (
    new.id,
    new.email,
    'student',
    new.raw_user_meta_data ->> 'display_name'
  );

  return new;
end;
$function$;

alter function app_private.create_profile_for_new_auth_user() owner to postgres;

revoke all on function app_private.create_profile_for_new_auth_user()
from public, anon, authenticated, service_role;

create trigger create_profile_after_auth_user_insert
after insert on auth.users
for each row execute function app_private.create_profile_for_new_auth_user();

insert into public.profiles (
  id,
  email,
  role,
  display_name
)
select
  auth_user.id,
  auth_user.email,
  'student',
  auth_user.raw_user_meta_data ->> 'display_name'
from auth.users as auth_user
where auth_user.email is not null
  and not exists (
    select 1
    from public.profiles as profile
    where profile.id = auth_user.id
  );

drop policy "Users can insert own profile" on public.profiles;
drop policy "Users can update own profile" on public.profiles;

revoke insert, update on table public.profiles
from public, anon, authenticated;

grant update (display_name) on table public.profiles
to authenticated;

create policy "Users can update own display name"
on public.profiles
as permissive
for update
to authenticated
using (
  ((select auth.uid() as uid) = id)
)
with check (
  ((select auth.uid() as uid) = id)
);
