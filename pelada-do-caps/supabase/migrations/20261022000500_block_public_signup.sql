-- Bloqueia cadastros pela API pública de login (que grava como
-- supabase_auth_admin). Administradores são criados pela organização via
-- SQL (veja docs/GUIA.md). Reforça a opção "Allow new users to sign up".
create or replace function public.block_public_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user = 'supabase_auth_admin' then
    raise exception 'Cadastro público desativado' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.block_public_signup() from public, anon, authenticated;
create trigger block_public_signup before insert on auth.users
  for each row execute function public.block_public_signup();
