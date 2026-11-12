-- Simula, num Postgres comum, o que o Supabase já traz: papéis anon/authenticated/service_role e auth.jwt().
-- Usado só nos testes locais (supabase/testes/rodar.sh). No Supabase de verdade isto já existe.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;
-- Como no Supabase: privilégios padrão amplos em public; quem protege os dados é a RLS (e a migração 0002 corta o que sobra).
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
