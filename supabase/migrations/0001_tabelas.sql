-- Gestão da Performance: tabelas (gerado por supabase/gerar-sql.mjs a partir de src/esquema.js; não editar à mão).
-- Cada tabela corresponde a uma Lista GP_* do SharePoint. Colunas comuns:
--   id (chave interna), versao (controle de gravação simultânea, faz o papel do eTag), criado/alterado em e por,
--   excluido_em/por (exclusão lógica: nada é apagado de verdade), sp_id (id do item no SharePoint, só para a migração).

create extension if not exists pgcrypto;

-- E-mail de quem está gravando (do login do Supabase). Fora do app (migração, scripts), fica o usuário do banco.
create or replace function public.gp_email() returns text
language sql stable set search_path = public as $$
  select lower(coalesce(nullif(auth.jwt() ->> 'email', ''), current_user))
$$;

-- Histórico de versões: quem, quando, antes e depois de cada gravação (substitui o histórico de versões das listas).
create table if not exists public.gp_historico (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id bigint not null,
  codigo text,
  operacao text not null,
  antes jsonb,
  depois jsonb,
  por text not null,
  em timestamptz not null default now()
);
create index if not exists gp_historico_registro on public.gp_historico (tabela, registro_id);
create index if not exists gp_historico_codigo on public.gp_historico (codigo);
create index if not exists gp_historico_em on public.gp_historico (em);
alter table public.gp_historico enable row level security;

-- Carimbo: versão, quem criou, quem alterou e quem excluiu. O cliente não consegue forjar esses campos.
create or replace function public.gp_carimbo() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.versao := 1;
    new.criado_em := now(); new.criado_por := gp_email();
    new.alterado_em := now(); new.alterado_por := gp_email();
    if new.excluido_em is not null then new.excluido_por := gp_email(); end if;
  else
    new.versao := old.versao + 1;
    new.criado_em := old.criado_em; new.criado_por := old.criado_por;
    new.alterado_em := now(); new.alterado_por := gp_email();
    new.sp_id := old.sp_id;
    if new.excluido_em is not null and old.excluido_em is null then new.excluido_por := gp_email();
    elsif new.excluido_em is null then new.excluido_por := null;
    else new.excluido_por := old.excluido_por; end if;
  end if;
  return new;
end $$;

create or replace function public.gp_auditar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into gp_historico (tabela, registro_id, codigo, operacao, antes, depois, por)
  values (tg_table_name, coalesce(new.id, old.id), coalesce(new.codigo, old.codigo),
          case when tg_op = 'UPDATE' and new.excluido_em is not null and old.excluido_em is null then 'EXCLUSAO'
               when tg_op = 'UPDATE' and new.excluido_em is null and old.excluido_em is not null then 'RESTAURACAO'
               else tg_op end,
          case when tg_op = 'INSERT' then null else to_jsonb(old) end,
          case when tg_op = 'DELETE' then null else to_jsonb(new) end,
          gp_email());
  return null;
end $$;

-- GP_Clientes
create table if not exists public.gp_clientes (
  id bigint generated always as identity primary key,
  codigo text not null,
  nome text,
  consultor_codigo text,
  supervisor_codigo text,
  situacao text,
  na_nova_base boolean,
  pasta_sharepoint text,
  arquivo_origem text,
  interno boolean,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  criado_por text,
  alterado_em timestamptz not null default now(),
  alterado_por text,
  excluido_em timestamptz,
  excluido_por text,
  sp_id text
);
-- Código único entre os registros não excluídos (o Desfazer de uma exclusão recria com o mesmo código).
create unique index if not exists gp_clientes_codigo on public.gp_clientes (codigo) where excluido_em is null;
create unique index if not exists gp_clientes_sp_id on public.gp_clientes (sp_id) where sp_id is not null;
create index if not exists gp_clientes_situacao on public.gp_clientes (situacao);
alter table public.gp_clientes enable row level security;
create or replace trigger gp_carimbo before insert or update on public.gp_clientes for each row execute function public.gp_carimbo();
create or replace trigger gp_auditar after insert or update or delete on public.gp_clientes for each row execute function public.gp_auditar();

-- GP_Pessoas
create table if not exists public.gp_pessoas (
  id bigint generated always as identity primary key,
  codigo text not null,
  nome text,
  cliente_codigo text,
  empresa text,
  nominal boolean,
  email text,
  whatsapp text,
  ativo boolean,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  criado_por text,
  alterado_em timestamptz not null default now(),
  alterado_por text,
  excluido_em timestamptz,
  excluido_por text,
  sp_id text
);
-- Código único entre os registros não excluídos (o Desfazer de uma exclusão recria com o mesmo código).
create unique index if not exists gp_pessoas_codigo on public.gp_pessoas (codigo) where excluido_em is null;
create unique index if not exists gp_pessoas_sp_id on public.gp_pessoas (sp_id) where sp_id is not null;
create index if not exists gp_pessoas_cliente_codigo on public.gp_pessoas (cliente_codigo);
alter table public.gp_pessoas enable row level security;
create or replace trigger gp_carimbo before insert or update on public.gp_pessoas for each row execute function public.gp_carimbo();
create or replace trigger gp_auditar after insert or update or delete on public.gp_pessoas for each row execute function public.gp_auditar();

-- GP_Frentes
create table if not exists public.gp_frentes (
  id bigint generated always as identity primary key,
  codigo text not null,
  cliente_codigo text,
  nome text,
  area text,
  dono_codigo text,
  apoio text,
  inicio date,
  fim_previsto date,
  encerrada boolean,
  data_encerramento date,
  status_origem text,
  nota_migracao text,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  criado_por text,
  alterado_em timestamptz not null default now(),
  alterado_por text,
  excluido_em timestamptz,
  excluido_por text,
  sp_id text
);
-- Código único entre os registros não excluídos (o Desfazer de uma exclusão recria com o mesmo código).
create unique index if not exists gp_frentes_codigo on public.gp_frentes (codigo) where excluido_em is null;
create unique index if not exists gp_frentes_sp_id on public.gp_frentes (sp_id) where sp_id is not null;
create index if not exists gp_frentes_cliente_codigo on public.gp_frentes (cliente_codigo);
create index if not exists gp_frentes_encerrada on public.gp_frentes (encerrada);
alter table public.gp_frentes enable row level security;
create or replace trigger gp_carimbo before insert or update on public.gp_frentes for each row execute function public.gp_carimbo();
create or replace trigger gp_auditar after insert or update or delete on public.gp_frentes for each row execute function public.gp_auditar();

-- GP_Demandas
create table if not exists public.gp_demandas (
  id bigint generated always as identity primary key,
  codigo text not null,
  cliente_codigo text,
  assunto text,
  tipo text,
  frente_codigo text,
  prioridade numeric,
  responsavel_codigo text,
  area text,
  prazo_demanda date,
  encerrada boolean,
  data_encerramento date,
  origem text,
  status_origem text,
  nota_migracao text,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  criado_por text,
  alterado_em timestamptz not null default now(),
  alterado_por text,
  excluido_em timestamptz,
  excluido_por text,
  sp_id text
);
-- Código único entre os registros não excluídos (o Desfazer de uma exclusão recria com o mesmo código).
create unique index if not exists gp_demandas_codigo on public.gp_demandas (codigo) where excluido_em is null;
create unique index if not exists gp_demandas_sp_id on public.gp_demandas (sp_id) where sp_id is not null;
create index if not exists gp_demandas_cliente_codigo on public.gp_demandas (cliente_codigo);
create index if not exists gp_demandas_tipo on public.gp_demandas (tipo);
create index if not exists gp_demandas_frente_codigo on public.gp_demandas (frente_codigo);
create index if not exists gp_demandas_responsavel_codigo on public.gp_demandas (responsavel_codigo);
create index if not exists gp_demandas_encerrada on public.gp_demandas (encerrada);
alter table public.gp_demandas enable row level security;
create or replace trigger gp_carimbo before insert or update on public.gp_demandas for each row execute function public.gp_carimbo();
create or replace trigger gp_auditar after insert or update or delete on public.gp_demandas for each row execute function public.gp_auditar();

-- GP_Acoes
create table if not exists public.gp_acoes (
  id bigint generated always as identity primary key,
  codigo text not null,
  cliente_codigo text,
  demanda_codigo text,
  o_que text,
  problema text,
  causa text,
  responsavel_codigo text,
  apoio text,
  area text,
  como text,
  quanto numeric,
  inicio date,
  prazo_original date,
  prazo date,
  status text,
  data_conclusao date,
  motivo_cancelamento text,
  origem text,
  registro date,
  linha_origem integer,
  arquivo_origem text,
  status_origem text,
  responsavel_origem text,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  criado_por text,
  alterado_em timestamptz not null default now(),
  alterado_por text,
  excluido_em timestamptz,
  excluido_por text,
  sp_id text
);
-- Código único entre os registros não excluídos (o Desfazer de uma exclusão recria com o mesmo código).
create unique index if not exists gp_acoes_codigo on public.gp_acoes (codigo) where excluido_em is null;
create unique index if not exists gp_acoes_sp_id on public.gp_acoes (sp_id) where sp_id is not null;
create index if not exists gp_acoes_cliente_codigo on public.gp_acoes (cliente_codigo);
create index if not exists gp_acoes_demanda_codigo on public.gp_acoes (demanda_codigo);
create index if not exists gp_acoes_responsavel_codigo on public.gp_acoes (responsavel_codigo);
create index if not exists gp_acoes_prazo on public.gp_acoes (prazo);
create index if not exists gp_acoes_status on public.gp_acoes (status);
alter table public.gp_acoes enable row level security;
create or replace trigger gp_carimbo before insert or update on public.gp_acoes for each row execute function public.gp_carimbo();
create or replace trigger gp_auditar after insert or update or delete on public.gp_acoes for each row execute function public.gp_auditar();

-- GP_Reprogramacoes
create table if not exists public.gp_reprogramacoes (
  id bigint generated always as identity primary key,
  codigo text not null,
  acao_codigo text,
  cliente_codigo text,
  prazo_anterior date,
  prazo_novo date,
  motivo text,
  registrado_em date,
  registrado_por text,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  criado_por text,
  alterado_em timestamptz not null default now(),
  alterado_por text,
  excluido_em timestamptz,
  excluido_por text,
  sp_id text
);
-- Código único entre os registros não excluídos (o Desfazer de uma exclusão recria com o mesmo código).
create unique index if not exists gp_reprogramacoes_codigo on public.gp_reprogramacoes (codigo) where excluido_em is null;
create unique index if not exists gp_reprogramacoes_sp_id on public.gp_reprogramacoes (sp_id) where sp_id is not null;
create index if not exists gp_reprogramacoes_acao_codigo on public.gp_reprogramacoes (acao_codigo);
create index if not exists gp_reprogramacoes_cliente_codigo on public.gp_reprogramacoes (cliente_codigo);
alter table public.gp_reprogramacoes enable row level security;
create or replace trigger gp_carimbo before insert or update on public.gp_reprogramacoes for each row execute function public.gp_carimbo();
create or replace trigger gp_auditar after insert or update or delete on public.gp_reprogramacoes for each row execute function public.gp_auditar();

-- GP_Foruns
create table if not exists public.gp_foruns (
  id bigint generated always as identity primary key,
  codigo text not null,
  cliente_codigo text,
  data date,
  hora text,
  local text,
  situacao text,
  convocados text,
  presentes text,
  conduzido_por text,
  participantes text,
  ata text,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  criado_por text,
  alterado_em timestamptz not null default now(),
  alterado_por text,
  excluido_em timestamptz,
  excluido_por text,
  sp_id text
);
-- Código único entre os registros não excluídos (o Desfazer de uma exclusão recria com o mesmo código).
create unique index if not exists gp_foruns_codigo on public.gp_foruns (codigo) where excluido_em is null;
create unique index if not exists gp_foruns_sp_id on public.gp_foruns (sp_id) where sp_id is not null;
create index if not exists gp_foruns_cliente_codigo on public.gp_foruns (cliente_codigo);
create index if not exists gp_foruns_data on public.gp_foruns (data);
create index if not exists gp_foruns_situacao on public.gp_foruns (situacao);
alter table public.gp_foruns enable row level security;
create or replace trigger gp_carimbo before insert or update on public.gp_foruns for each row execute function public.gp_carimbo();
create or replace trigger gp_auditar after insert or update or delete on public.gp_foruns for each row execute function public.gp_auditar();

-- GP_Pauta
create table if not exists public.gp_pauta (
  id bigint generated always as identity primary key,
  codigo text not null,
  forum_codigo text,
  cliente_codigo text,
  ordem integer,
  tipo text,
  registro_codigo text,
  assunto text,
  responsavel_codigo text,
  origem text,
  item_anterior text,
  tratamento text,
  desdobramentos text,
  anotacao text,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  criado_por text,
  alterado_em timestamptz not null default now(),
  alterado_por text,
  excluido_em timestamptz,
  excluido_por text,
  sp_id text
);
-- Código único entre os registros não excluídos (o Desfazer de uma exclusão recria com o mesmo código).
create unique index if not exists gp_pauta_codigo on public.gp_pauta (codigo) where excluido_em is null;
create unique index if not exists gp_pauta_sp_id on public.gp_pauta (sp_id) where sp_id is not null;
create index if not exists gp_pauta_forum_codigo on public.gp_pauta (forum_codigo);
create index if not exists gp_pauta_cliente_codigo on public.gp_pauta (cliente_codigo);
create index if not exists gp_pauta_tipo on public.gp_pauta (tipo);
create index if not exists gp_pauta_registro_codigo on public.gp_pauta (registro_codigo);
create index if not exists gp_pauta_responsavel_codigo on public.gp_pauta (responsavel_codigo);
alter table public.gp_pauta enable row level security;
create or replace trigger gp_carimbo before insert or update on public.gp_pauta for each row execute function public.gp_carimbo();
create or replace trigger gp_auditar after insert or update or delete on public.gp_pauta for each row execute function public.gp_auditar();

-- GP_Deliberacoes
create table if not exists public.gp_deliberacoes (
  id bigint generated always as identity primary key,
  codigo text not null,
  cliente_codigo text,
  forum_codigo text,
  texto text,
  tipo text,
  responsavel_codigo text,
  demanda_codigo text,
  acao_codigo text,
  data date,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  criado_por text,
  alterado_em timestamptz not null default now(),
  alterado_por text,
  excluido_em timestamptz,
  excluido_por text,
  sp_id text
);
-- Código único entre os registros não excluídos (o Desfazer de uma exclusão recria com o mesmo código).
create unique index if not exists gp_deliberacoes_codigo on public.gp_deliberacoes (codigo) where excluido_em is null;
create unique index if not exists gp_deliberacoes_sp_id on public.gp_deliberacoes (sp_id) where sp_id is not null;
create index if not exists gp_deliberacoes_cliente_codigo on public.gp_deliberacoes (cliente_codigo);
create index if not exists gp_deliberacoes_forum_codigo on public.gp_deliberacoes (forum_codigo);
create index if not exists gp_deliberacoes_tipo on public.gp_deliberacoes (tipo);
create index if not exists gp_deliberacoes_responsavel_codigo on public.gp_deliberacoes (responsavel_codigo);
create index if not exists gp_deliberacoes_demanda_codigo on public.gp_deliberacoes (demanda_codigo);
create index if not exists gp_deliberacoes_acao_codigo on public.gp_deliberacoes (acao_codigo);
create index if not exists gp_deliberacoes_data on public.gp_deliberacoes (data);
alter table public.gp_deliberacoes enable row level security;
create or replace trigger gp_carimbo before insert or update on public.gp_deliberacoes for each row execute function public.gp_carimbo();
create or replace trigger gp_auditar after insert or update or delete on public.gp_deliberacoes for each row execute function public.gp_auditar();

-- GP_Indicadores
create table if not exists public.gp_indicadores (
  id bigint generated always as identity primary key,
  codigo text not null,
  cliente_codigo text,
  area text,
  nome text,
  formula text,
  unidade text,
  polaridade text,
  frequencia text,
  responsavel_codigo text,
  situacao text,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  criado_por text,
  alterado_em timestamptz not null default now(),
  alterado_por text,
  excluido_em timestamptz,
  excluido_por text,
  sp_id text
);
-- Código único entre os registros não excluídos (o Desfazer de uma exclusão recria com o mesmo código).
create unique index if not exists gp_indicadores_codigo on public.gp_indicadores (codigo) where excluido_em is null;
create unique index if not exists gp_indicadores_sp_id on public.gp_indicadores (sp_id) where sp_id is not null;
create index if not exists gp_indicadores_cliente_codigo on public.gp_indicadores (cliente_codigo);
create index if not exists gp_indicadores_responsavel_codigo on public.gp_indicadores (responsavel_codigo);
create index if not exists gp_indicadores_situacao on public.gp_indicadores (situacao);
alter table public.gp_indicadores enable row level security;
create or replace trigger gp_carimbo before insert or update on public.gp_indicadores for each row execute function public.gp_carimbo();
create or replace trigger gp_auditar after insert or update or delete on public.gp_indicadores for each row execute function public.gp_auditar();

-- GP_Medicoes
create table if not exists public.gp_medicoes (
  id bigint generated always as identity primary key,
  codigo text not null,
  indicador_codigo text,
  cliente_codigo text,
  mes date,
  meta numeric,
  realizado numeric,
  comentario text,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  criado_por text,
  alterado_em timestamptz not null default now(),
  alterado_por text,
  excluido_em timestamptz,
  excluido_por text,
  sp_id text
);
-- Código único entre os registros não excluídos (o Desfazer de uma exclusão recria com o mesmo código).
create unique index if not exists gp_medicoes_codigo on public.gp_medicoes (codigo) where excluido_em is null;
create unique index if not exists gp_medicoes_sp_id on public.gp_medicoes (sp_id) where sp_id is not null;
create index if not exists gp_medicoes_indicador_codigo on public.gp_medicoes (indicador_codigo);
create index if not exists gp_medicoes_cliente_codigo on public.gp_medicoes (cliente_codigo);
alter table public.gp_medicoes enable row level security;
create or replace trigger gp_carimbo before insert or update on public.gp_medicoes for each row execute function public.gp_carimbo();
create or replace trigger gp_auditar after insert or update or delete on public.gp_medicoes for each row execute function public.gp_auditar();

-- GP_Compromissos
create table if not exists public.gp_compromissos (
  id bigint generated always as identity primary key,
  codigo text not null,
  cliente_codigo text,
  o_que text,
  tipo text,
  responsavel_codigo text,
  contraparte_codigo text,
  data date,
  data_original date,
  hora text,
  recorrencia text,
  status text,
  data_realizacao date,
  resultado text,
  serie_codigo text,
  demanda_codigo text,
  registro date,
  registrado_por text,
  so_solve boolean not null default false,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  criado_por text,
  alterado_em timestamptz not null default now(),
  alterado_por text,
  excluido_em timestamptz,
  excluido_por text,
  sp_id text
);
-- Código único entre os registros não excluídos (o Desfazer de uma exclusão recria com o mesmo código).
create unique index if not exists gp_compromissos_codigo on public.gp_compromissos (codigo) where excluido_em is null;
create unique index if not exists gp_compromissos_sp_id on public.gp_compromissos (sp_id) where sp_id is not null;
create index if not exists gp_compromissos_cliente_codigo on public.gp_compromissos (cliente_codigo);
create index if not exists gp_compromissos_tipo on public.gp_compromissos (tipo);
create index if not exists gp_compromissos_responsavel_codigo on public.gp_compromissos (responsavel_codigo);
create index if not exists gp_compromissos_data on public.gp_compromissos (data);
create index if not exists gp_compromissos_status on public.gp_compromissos (status);
create index if not exists gp_compromissos_serie_codigo on public.gp_compromissos (serie_codigo);
create index if not exists gp_compromissos_demanda_codigo on public.gp_compromissos (demanda_codigo);
alter table public.gp_compromissos enable row level security;
create or replace trigger gp_carimbo before insert or update on public.gp_compromissos for each row execute function public.gp_carimbo();
create or replace trigger gp_auditar after insert or update or delete on public.gp_compromissos for each row execute function public.gp_auditar();

-- GP_Acompanhamentos
create table if not exists public.gp_acompanhamentos (
  id bigint generated always as identity primary key,
  codigo text not null,
  cliente_codigo text,
  registro_tipo text,
  registro_codigo text,
  texto text,
  registrado_em timestamptz,
  registrado_por text,
  so_solve boolean not null default false,
  versao integer not null default 1,
  criado_em timestamptz not null default now(),
  criado_por text,
  alterado_em timestamptz not null default now(),
  alterado_por text,
  excluido_em timestamptz,
  excluido_por text,
  sp_id text
);
-- Código único entre os registros não excluídos (o Desfazer de uma exclusão recria com o mesmo código).
create unique index if not exists gp_acompanhamentos_codigo on public.gp_acompanhamentos (codigo) where excluido_em is null;
create unique index if not exists gp_acompanhamentos_sp_id on public.gp_acompanhamentos (sp_id) where sp_id is not null;
create index if not exists gp_acompanhamentos_cliente_codigo on public.gp_acompanhamentos (cliente_codigo);
create index if not exists gp_acompanhamentos_registro_codigo on public.gp_acompanhamentos (registro_codigo);
alter table public.gp_acompanhamentos enable row level security;
create or replace trigger gp_carimbo before insert or update on public.gp_acompanhamentos for each row execute function public.gp_carimbo();
create or replace trigger gp_auditar after insert or update or delete on public.gp_acompanhamentos for each row execute function public.gp_auditar();
