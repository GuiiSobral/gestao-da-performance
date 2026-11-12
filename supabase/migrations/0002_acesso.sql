-- Gestão da Performance: usuários, perfis e regras de acesso por linha (RLS).
--
-- Perfis (decisão de 12/11/2026):
--   admin        Solve. Toda a carteira (inclusive o cliente interno SOL). Único que cadastra usuários e vê o histórico.
--   solve        Equipe Solve. Toda a carteira, com leitura e gravação.
--   gestor       Pessoa do cliente. Só o próprio cliente: cria e edita demandas, ações, compromissos, fóruns e deliberações.
--   colaborador  Pessoa do cliente. Vê todo o próprio cliente; nas ações e compromissos em que é responsável ou apoio,
--                conclui, inicia, muda prazo (com reprogramação) e registra acompanhamento. Não cancela nem troca responsável.
-- Registro marcado "só Solve" (compromissos e acompanhamentos) não aparece para nenhum perfil do cliente.
-- Ninguém apaga de verdade: excluir é marcar excluido_em (o histórico guarda tudo).

create table if not exists public.gp_usuarios (
  email text primary key check (email = lower(email)),
  nome text,
  perfil text not null check (perfil in ('admin', 'solve', 'gestor', 'colaborador')),
  cliente_codigo text,
  pessoa_codigo text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por text,
  alterado_em timestamptz not null default now(),
  alterado_por text,
  constraint gp_usuarios_cliente check ((perfil in ('gestor', 'colaborador')) = (cliente_codigo is not null)),
  constraint gp_usuarios_pessoa check (perfil <> 'colaborador' or pessoa_codigo is not null)
);
alter table public.gp_usuarios enable row level security;

create or replace function public.gp_usuarios_carimbo() returns trigger
language plpgsql set search_path = public as $$
begin
  new.email := lower(new.email);
  if tg_op = 'INSERT' then new.criado_em := now(); new.criado_por := gp_email();
  else new.criado_em := old.criado_em; new.criado_por := old.criado_por; end if;
  new.alterado_em := now(); new.alterado_por := gp_email();
  return new;
end $$;
create or replace trigger gp_carimbo before insert or update on public.gp_usuarios for each row execute function public.gp_usuarios_carimbo();

create or replace function public.gp_auditar_usuarios() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into gp_historico (tabela, registro_id, codigo, operacao, antes, depois, por)
  values ('gp_usuarios', 0, coalesce(new.email, old.email), tg_op,
          case when tg_op = 'INSERT' then null else to_jsonb(old) end,
          case when tg_op = 'DELETE' then null else to_jsonb(new) end, gp_email());
  return null;
end $$;
create or replace trigger gp_auditar after insert or update or delete on public.gp_usuarios for each row execute function public.gp_auditar_usuarios();

-- ---------- quem é a pessoa logada ----------
-- security definer: leem gp_usuarios sem esbarrar na própria RLS. Usuário inativo ou sem cadastro não tem perfil (não vê nada).
create or replace function public.gp_perfil() returns text
language sql stable security definer set search_path = public as $$
  select perfil from gp_usuarios where email = gp_email() and ativo
$$;
create or replace function public.gp_cliente() returns text
language sql stable security definer set search_path = public as $$
  select cliente_codigo from gp_usuarios where email = gp_email() and ativo
$$;
create or replace function public.gp_pessoa() returns text
language sql stable security definer set search_path = public as $$
  select pessoa_codigo from gp_usuarios where email = gp_email() and ativo
$$;
create or replace function public.gp_solve() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select perfil in ('admin', 'solve') from gp_usuarios where email = gp_email() and ativo), false)
$$;
create or replace function public.gp_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select perfil = 'admin' from gp_usuarios where email = gp_email() and ativo), false)
$$;
-- A ação é da pessoa logada (responsável ou apoio)?
create or replace function public.gp_acao_minha(p_codigo text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from gp_acoes a where a.codigo = p_codigo and a.excluido_em is null
                 and a.cliente_codigo = gp_cliente() and gp_pessoa() in (a.responsavel_codigo, a.apoio))
$$;
create or replace function public.gp_comp_meu(p_codigo text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from gp_compromissos c where c.codigo = p_codigo and c.excluido_em is null and not c.so_solve
                 and c.cliente_codigo = gp_cliente() and c.responsavel_codigo = gp_pessoa())
$$;

-- Códigos já usados numa tabela (para o app gerar o próximo sem repetir). Inclui os registros "só Solve",
-- que o cliente não enxerga, para o código novo dele não colidir. Devolve só códigos, nada do conteúdo.
create or replace function public.gp_codigos(p_lista text) returns setof text
language plpgsql stable security definer set search_path = public as $$
declare t text;
begin
  t := case p_lista
    when 'GP_Clientes' then 'gp_clientes' when 'GP_Pessoas' then 'gp_pessoas' when 'GP_Frentes' then 'gp_frentes'
    when 'GP_Demandas' then 'gp_demandas' when 'GP_Acoes' then 'gp_acoes' when 'GP_Reprogramacoes' then 'gp_reprogramacoes'
    when 'GP_Foruns' then 'gp_foruns' when 'GP_Pauta' then 'gp_pauta' when 'GP_Deliberacoes' then 'gp_deliberacoes'
    when 'GP_Indicadores' then 'gp_indicadores' when 'GP_Medicoes' then 'gp_medicoes' when 'GP_Compromissos' then 'gp_compromissos'
    when 'GP_Acompanhamentos' then 'gp_acompanhamentos' end;
  if t is null then raise exception 'Lista desconhecida: %', p_lista; end if;
  if gp_perfil() is null then return; end if;
  if gp_solve() then
    return query execute format('select codigo from %I where excluido_em is null', t);
  elsif t = 'gp_clientes' then
    return query select codigo from gp_clientes where excluido_em is null and codigo = gp_cliente();
  else
    return query execute format('select codigo from %I where excluido_em is null and cliente_codigo = $1', t) using gp_cliente();
  end if;
end $$;

-- ---------- privilégios ----------
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon, public;
grant select, insert, update on all tables in schema public to authenticated;
revoke delete on all tables in schema public from authenticated;
revoke insert, update on public.gp_historico from authenticated;
grant execute on function public.gp_email(), public.gp_perfil(), public.gp_cliente(), public.gp_pessoa(), public.gp_solve(),
  public.gp_admin(), public.gp_acao_minha(text), public.gp_comp_meu(text), public.gp_codigos(text) to authenticated;
-- Funções de gatilho rodam com os privilégios do gatilho; ninguém precisa chamá-las direto.

-- ---------- regras por linha ----------
-- Usuários e histórico: cada pessoa vê o próprio cadastro; só o admin vê todos, cadastra e vê o histórico.
create policy usuarios_ver on public.gp_usuarios for select to authenticated using (email = gp_email() or (select gp_admin()));
create policy usuarios_incluir on public.gp_usuarios for insert to authenticated with check ((select gp_admin()));
create policy usuarios_alterar on public.gp_usuarios for update to authenticated using ((select gp_admin())) with check ((select gp_admin()));
create policy historico_ver on public.gp_historico for select to authenticated using ((select gp_admin()));

-- Clientes: o cliente vê só o próprio cadastro; só a Solve grava.
create policy clientes_ver on public.gp_clientes for select to authenticated
  using ((select gp_solve()) or codigo = (select gp_cliente()));
create policy clientes_incluir on public.gp_clientes for insert to authenticated with check ((select gp_solve()));
create policy clientes_alterar on public.gp_clientes for update to authenticated using ((select gp_solve())) with check ((select gp_solve()));

-- Pessoas: o cliente vê as pessoas dele e as da Solve (responsáveis e convocados); o gestor cadastra pessoas do próprio cliente.
create policy pessoas_ver on public.gp_pessoas for select to authenticated
  using ((select gp_solve()) or ((select gp_cliente()) is not null and (cliente_codigo = (select gp_cliente()) or empresa = 'Solve')));
create policy pessoas_incluir on public.gp_pessoas for insert to authenticated
  with check ((select gp_solve()) or ((select gp_perfil()) = 'gestor' and cliente_codigo = (select gp_cliente()) and empresa = 'Cliente'));
create policy pessoas_alterar on public.gp_pessoas for update to authenticated
  using ((select gp_solve()) or ((select gp_perfil()) = 'gestor' and cliente_codigo = (select gp_cliente()) and empresa = 'Cliente'))
  with check ((select gp_solve()) or ((select gp_perfil()) = 'gestor' and cliente_codigo = (select gp_cliente()) and empresa = 'Cliente'));

-- Tabelas da gestão sem marcação "só Solve": Solve tudo; gestor só o próprio cliente; colaborador só lê
-- (as exceções do colaborador estão mais abaixo).
do $$
declare t text;
begin
  foreach t in array array['gp_frentes', 'gp_demandas', 'gp_acoes', 'gp_reprogramacoes', 'gp_foruns', 'gp_pauta',
                           'gp_deliberacoes', 'gp_indicadores', 'gp_medicoes'] loop
    execute format('create policy ver on public.%I for select to authenticated
      using ((select gp_solve()) or cliente_codigo = (select gp_cliente()))', t);
    execute format('create policy incluir on public.%I for insert to authenticated
      with check ((select gp_solve()) or ((select gp_perfil()) = ''gestor'' and cliente_codigo = (select gp_cliente())))', t);
    execute format('create policy alterar on public.%I for update to authenticated
      using ((select gp_solve()) or ((select gp_perfil()) = ''gestor'' and cliente_codigo = (select gp_cliente())))
      with check ((select gp_solve()) or ((select gp_perfil()) = ''gestor'' and cliente_codigo = (select gp_cliente())))', t);
  end loop;
end $$;

-- Compromissos e acompanhamentos: como acima, mas o cliente nunca vê nem grava registro "só Solve".
do $$
declare t text;
begin
  foreach t in array array['gp_compromissos', 'gp_acompanhamentos'] loop
    execute format('create policy ver on public.%I for select to authenticated
      using ((select gp_solve()) or (cliente_codigo = (select gp_cliente()) and not so_solve))', t);
    execute format('create policy incluir on public.%I for insert to authenticated
      with check ((select gp_solve()) or ((select gp_perfil()) = ''gestor'' and cliente_codigo = (select gp_cliente()) and not so_solve))', t);
  end loop;
end $$;
create policy alterar on public.gp_compromissos for update to authenticated
  using ((select gp_solve()) or ((select gp_perfil()) = 'gestor' and cliente_codigo = (select gp_cliente()) and not so_solve))
  with check ((select gp_solve()) or ((select gp_perfil()) = 'gestor' and cliente_codigo = (select gp_cliente()) and not so_solve));
-- Acompanhamento: cada pessoa do cliente edita e exclui só o que ela mesma registrou.
-- A Solve pode alterar os de outras pessoas porque "Trocar cliente" leva os andamentos junto (a tela só deixa editar os próprios).
create policy alterar on public.gp_acompanhamentos for update to authenticated
  using ((select gp_solve()) or (criado_por = (select gp_email()) and cliente_codigo = (select gp_cliente()) and not so_solve))
  with check ((select gp_solve()) or (criado_por = (select gp_email()) and cliente_codigo = (select gp_cliente()) and not so_solve));

-- ---------- exceções do colaborador ----------
-- Ação dele (responsável ou apoio): pode alterar; a guarda abaixo limita quais campos.
create policy colaborador_alterar on public.gp_acoes for update to authenticated
  using ((select gp_perfil()) = 'colaborador' and cliente_codigo = (select gp_cliente()) and (select gp_pessoa()) in (responsavel_codigo, apoio))
  with check ((select gp_perfil()) = 'colaborador' and cliente_codigo = (select gp_cliente()) and (select gp_pessoa()) in (responsavel_codigo, apoio));
-- Novo prazo da ação dele gera a reprogramação.
create policy colaborador_incluir on public.gp_reprogramacoes for insert to authenticated
  with check ((select gp_perfil()) = 'colaborador' and cliente_codigo = (select gp_cliente()) and gp_acao_minha(acao_codigo));
-- Compromisso dele: cria para si, marca feito, remarca, registra resultado.
create policy colaborador_incluir on public.gp_compromissos for insert to authenticated
  with check ((select gp_perfil()) = 'colaborador' and cliente_codigo = (select gp_cliente()) and not so_solve
              and responsavel_codigo = (select gp_pessoa()));
create policy colaborador_alterar on public.gp_compromissos for update to authenticated
  using ((select gp_perfil()) = 'colaborador' and cliente_codigo = (select gp_cliente()) and not so_solve
         and responsavel_codigo = (select gp_pessoa()))
  with check ((select gp_perfil()) = 'colaborador' and cliente_codigo = (select gp_cliente()) and not so_solve
              and responsavel_codigo = (select gp_pessoa()));
-- Acompanhamento só nas ações e compromissos dele.
create policy colaborador_incluir on public.gp_acompanhamentos for insert to authenticated
  with check ((select gp_perfil()) = 'colaborador' and cliente_codigo = (select gp_cliente()) and not so_solve
              and case registro_tipo when 'Ação' then gp_acao_minha(registro_codigo)
                                     when 'Compromisso' then gp_comp_meu(registro_codigo) else false end);

-- Guarda de campos: na ação, o colaborador só mexe em status (sem cancelar), data de conclusão e prazo.
-- O prazo original só pode ser preenchido quando a ação ainda não tinha prazo.
create or replace function public.gp_guarda_colaborador_acao() returns trigger
language plpgsql set search_path = public as $$
declare
  livres text[] := array['status', 'data_conclusao', 'prazo', 'prazo_original',
                         'versao', 'alterado_em', 'alterado_por', 'criado_em', 'criado_por', 'excluido_por'];
begin
  if gp_perfil() is distinct from 'colaborador' then return new; end if;
  if (to_jsonb(new) - livres) is distinct from (to_jsonb(old) - livres) then
    raise exception 'Colaborador só pode concluir, iniciar ou mudar o prazo da ação' using errcode = '42501';
  end if;
  if new.status = 'Cancelada' and old.status is distinct from 'Cancelada' then
    raise exception 'Só o gestor ou a Solve cancela uma ação' using errcode = '42501';
  end if;
  if new.prazo_original is distinct from old.prazo_original and old.prazo_original is not null then
    raise exception 'O prazo original não muda; o novo prazo vira reprogramação' using errcode = '42501';
  end if;
  return new;
end $$;
create or replace trigger gp_guarda_colaborador before update on public.gp_acoes
  for each row execute function public.gp_guarda_colaborador_acao();
