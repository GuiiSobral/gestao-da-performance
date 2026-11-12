// Gera supabase/migrations/0001_tabelas.sql a partir de src/esquema.js (fonte única dos campos).
// Uso: node supabase/gerar-sql.mjs
import { writeFileSync } from 'node:fs';
import { ESQUEMA } from '../src/esquema.js';

const TIPO = { texto: 'text', data: 'date', datahora: 'timestamptz', simnao: 'boolean', numero: 'numeric', inteiro: 'integer' };
// Colunas usadas em filtros e ligações: ganham índice.
const INDICE = new Set(['cliente_codigo', 'demanda_codigo', 'frente_codigo', 'acao_codigo', 'forum_codigo', 'registro_codigo', 'responsavel_codigo',
  'indicador_codigo', 'serie_codigo', 'status', 'prazo', 'data', 'situacao', 'tipo', 'encerrada']);

const out = [];
out.push(`-- Gestão da Performance: tabelas (gerado por supabase/gerar-sql.mjs a partir de src/esquema.js; não editar à mão).
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
`);

for (const [lista, def] of Object.entries(ESQUEMA)) {
  const t = def.tabela;
  const cols = Object.entries(def.campos).map(([sp, [col, tipo]]) => {
    if (col === 'codigo') return '  codigo text not null';
    if (col === 'so_solve') return '  so_solve boolean not null default false';
    return `  ${col} ${TIPO[tipo]}`;
  });
  out.push(`-- ${lista}
create table if not exists public.${t} (
  id bigint generated always as identity primary key,
${cols.join(',\n')},
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
create unique index if not exists ${t}_codigo on public.${t} (codigo) where excluido_em is null;
create unique index if not exists ${t}_sp_id on public.${t} (sp_id) where sp_id is not null;`);
  for (const [, [col]] of Object.entries(def.campos)) if (INDICE.has(col)) out.push(`create index if not exists ${t}_${col} on public.${t} (${col});`);
  out.push(`alter table public.${t} enable row level security;
create or replace trigger gp_carimbo before insert or update on public.${t} for each row execute function public.gp_carimbo();
create or replace trigger gp_auditar after insert or update or delete on public.${t} for each row execute function public.gp_auditar();
`);
}

writeFileSync(new URL('./migrations/0001_tabelas.sql', import.meta.url), out.join('\n'));
console.log('supabase/migrations/0001_tabelas.sql gerado:', Object.keys(ESQUEMA).length, 'tabelas');
