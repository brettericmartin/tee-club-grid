-- Create a compatibility view so existing code stops crashing
-- This view maps profiles with is_admin=true to the expected admins table structure

create or replace view public.admins
security invoker
as
select id as user_id
from public.profiles
where coalesce(is_admin, false) = true;

-- Grant access to the view
grant select on public.admins to anon;
grant select on public.admins to authenticated;

-- Test the view (optional - uncomment to test)
-- select * from public.admins;