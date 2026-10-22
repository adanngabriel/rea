-- =====================================================================
-- Primeiro acesso do administrador sem trafegar senha: um código de uso
-- único (guardado apenas como hash) permite que o próprio administrador
-- defina a senha em /admin/primeiro-acesso.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

create table public.admin_setup_tokens (
  token_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.admin_setup_tokens enable row level security;
alter table public.admin_setup_tokens force row level security;
-- Sem policies: ninguém lê ou escreve pela API; só a função abaixo.
revoke all on public.admin_setup_tokens from anon, authenticated;

create or replace function public.claim_admin_setup(token text, new_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.admin_setup_tokens;
  user_email text;
begin
  if length(coalesce(new_password, '')) < 10 then
    raise exception 'A senha precisa ter pelo menos 10 caracteres' using errcode = '22023';
  end if;
  select * into t from public.admin_setup_tokens
    where token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
    for update;
  if t is null or t.used_at is not null or t.expires_at < now() then
    raise exception 'Link de primeiro acesso inválido ou expirado' using errcode = '22023';
  end if;
  update auth.users
    set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = t.user_id
    returning email into user_email;
  update public.admin_setup_tokens set used_at = now() where token_hash = t.token_hash;
  return user_email;
end;
$$;

revoke all on function public.claim_admin_setup(text, text) from public;
grant execute on function public.claim_admin_setup(text, text) to anon, authenticated;
