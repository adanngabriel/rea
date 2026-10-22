-- Testes de segurança e integridade. Cada bloco levanta exceção se a
-- expectativa falhar. Executado dentro de uma transação desfeita no fim.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'curioso@example.com');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-00000000000a');

create function pg_temp.expect_denied(sql text, label text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when insufficient_privilege or check_violation then
    return;
  end;
  raise exception 'esperava bloqueio: %', label;
end;
$$;

create function pg_temp.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    return;
  end;
  raise exception 'esperava erro: %', label;
end;
$$;

-- Dados iniciais presentes.
do $$
begin
  if (select count(*) from public.teams) <> 4 then raise exception 'esperava 4 times'; end if;
  if (select count(*) from public.rounds) <> 4 then raise exception 'esperava 4 rodadas'; end if;
  if (select count(*) from public.editions where is_current) <> 1 then raise exception 'edição atual'; end if;
end $$;

insert into public.news (slug, title, status) values ('rascunho', 'Rascunho', 'draft'), ('publicada', 'Publicada', 'published');

-- ---------------- Público (anon) ----------------
set local role anon;
do $$
begin
  if (select count(*) from public.teams) <> 4 then raise exception 'anon deve ler times'; end if;
  if (select count(*) from public.news) <> 1 then raise exception 'anon só vê notícia publicada'; end if;
  if (select count(*) from public.audit_logs) <> 0 then raise exception 'anon não lê auditoria'; end if;
  if (select count(*) from public.admins) <> 0 then raise exception 'anon não lê admins'; end if;
end $$;
select pg_temp.expect_denied($$insert into public.players (name, slug) values ('X', 'x')$$, 'anon insere jogador');
select pg_temp.expect_denied($$update public.matches set status = 'finished'$$, 'anon altera partida');
select pg_temp.expect_denied($$delete from public.teams$$, 'anon apaga time');
select pg_temp.expect_denied($$insert into storage.objects (bucket_id, name) values ('media', 'x.png')$$, 'anon faz upload');
reset role;

-- ---------------- Autenticado sem ser admin ----------------
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect_denied($$insert into public.players (name, slug) values ('X', 'x')$$, 'usuário comum insere');
select pg_temp.expect_denied($$insert into public.admins (user_id) values ('00000000-0000-0000-0000-00000000000b')$$, 'auto promoção');
select pg_temp.expect_denied($$insert into storage.objects (bucket_id, name) values ('media', 'x.png')$$, 'usuário comum faz upload');
do $$
begin
  update public.teams set name = 'Hackeado';
  if exists (select 1 from public.teams where name = 'Hackeado') then
    raise exception 'usuário comum alterou time';
  end if;
end $$;
reset role;

-- ---------------- Administrador ----------------
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into public.players (name, slug) values ('João Silva', 'joao-silva'), ('Pedro', 'pedro');
insert into storage.objects (bucket_id, name) values ('media', 'teams/escudo.png');
select pg_temp.expect_denied($$insert into storage.objects (bucket_id, name) values ('outro', 'x.png')$$, 'bucket desconhecido');

do $$
declare
  ed uuid := (select id from public.editions where is_current);
  t1 uuid := (select id from public.teams where slug = 'time-1');
  t2 uuid := (select id from public.teams where slug = 'time-2');
  t3 uuid := (select id from public.teams where slug = 'time-3');
  joao uuid := (select id from public.players where slug = 'joao-silva');
  pedro uuid := (select id from public.players where slug = 'pedro');
  m uuid;
begin
  insert into public.registrations (edition_id, player_id, team_id, is_captain) values (ed, joao, t1, true);
  insert into public.registrations (edition_id, player_id) values (ed, pedro);

  -- Duas braçadeiras no mesmo time não são aceitas.
  begin
    update public.registrations set team_id = t1, is_captain = true where player_id = pedro;
    raise exception 'esperava erro: dois capitães';
  exception when unique_violation then null;
  end;

  -- Trocar de time remove a braçadeira.
  update public.registrations set team_id = t2 where player_id = joao;
  if (select is_captain from public.registrations where player_id = joao) then
    raise exception 'capitão deveria ser removido ao trocar de time';
  end if;

  insert into public.matches (edition_id, home_team_id, away_team_id) values (ed, t1, t2) returning id into m;

  -- Evento com time que não está na partida.
  begin
    insert into public.match_events (match_id, type, team_id, player_id) values (m, 'goal', t3, joao);
    raise exception 'esperava erro: time fora da partida';
  exception when check_violation then null;
  end;

  insert into public.match_events (match_id, type, team_id, player_id) values (m, 'mvp', t2, joao);
  begin
    insert into public.match_events (match_id, type, team_id, player_id) values (m, 'mvp', t1, pedro);
    raise exception 'esperava erro: dois MVPs';
  exception when unique_violation then null;
  end;

  update public.matches set status = 'finished' where id = m;
  if (select finished_at from public.matches where id = m) is null then
    raise exception 'finished_at deveria ser preenchido';
  end if;
  update public.matches set status = 'live' where id = m;
  if (select finished_at from public.matches where id = m) is not null then
    raise exception 'finished_at deveria ser limpo ao reabrir';
  end if;

  -- Excluir o time não apaga a partida; o lado fica "a definir".
  delete from public.match_events where match_id = m;
  delete from public.teams where id = t1;
  if (select home_team_id from public.matches where id = m) is not null then
    raise exception 'partida deveria ficar com mandante indefinido';
  end if;
end $$;
reset role;

rollback;
