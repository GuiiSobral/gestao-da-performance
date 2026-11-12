-- Testes das regras de acesso por perfil. Cada bloco falha com "FALHOU: ..." se a regra não se comportar como esperado.
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- ---------- massa de teste (gravada como dono do banco, como faria a migração) ----------
insert into gp_clientes (codigo, nome, interno) values ('MOE', 'Moendo', false), ('MET', 'Metalflex', false), ('SOL', 'Solve (interno)', true);
insert into gp_pessoas (codigo, nome, cliente_codigo, empresa, nominal, email, ativo) values
  ('SOLVE-GUILHERME', 'Guilherme', null, 'Solve', true, 'guilherme@solvegroup.com.br', true),
  ('SOLVE-PEDRO', 'Pedro', null, 'Solve', true, 'pedro@solvegroup.com.br', true),
  ('MOE-LUCAS', 'Lucas', 'MOE', 'Cliente', true, 'lucas@moendo.com.br', true),
  ('MOE-HENRIQUE', 'Henrique', 'MOE', 'Cliente', true, 'henrique@moendo.com.br', true),
  ('MOE-RISO', 'Riso', 'MOE', 'Cliente', true, 'riso@moendo.com.br', true),
  ('MET-LAYRA', 'Layra', 'MET', 'Cliente', true, 'layra@metalflex.com.br', true);
insert into gp_usuarios (email, perfil, cliente_codigo, pessoa_codigo, ativo) values
  ('guilherme@solvegroup.com.br', 'admin', null, 'SOLVE-GUILHERME', true),
  ('pedro@solvegroup.com.br', 'solve', null, 'SOLVE-PEDRO', true),
  ('lucas@moendo.com.br', 'gestor', 'MOE', 'MOE-LUCAS', true),
  ('henrique@moendo.com.br', 'colaborador', 'MOE', 'MOE-HENRIQUE', true),
  ('layra@metalflex.com.br', 'gestor', 'MET', 'MET-LAYRA', true),
  ('ex@moendo.com.br', 'gestor', 'MOE', null, false);
insert into gp_frentes (codigo, cliente_codigo, nome) values ('MOE-F01', 'MOE', 'Omie'), ('MET-F01', 'MET', 'ERP');
insert into gp_demandas (codigo, cliente_codigo, assunto, tipo) values
  ('MOE-PD-01', 'MOE', 'Cadastros', 'Pendência'), ('MET-PD-01', 'MET', 'Fiscal', 'Pendência');
insert into gp_acoes (codigo, cliente_codigo, demanda_codigo, o_que, responsavel_codigo, apoio, prazo, prazo_original, status) values
  ('MOE-A001', 'MOE', 'MOE-PD-01', 'Limpar produtos', 'MOE-HENRIQUE', null, '2026-11-20', '2026-11-20', 'Não iniciada'),
  ('MOE-A002', 'MOE', 'MOE-PD-01', 'Limpar fornecedores', 'MOE-RISO', 'MOE-HENRIQUE', '2026-11-25', '2026-11-25', 'Em andamento'),
  ('MOE-A003', 'MOE', 'MOE-PD-01', 'Validar clientes', 'MOE-LUCAS', null, null, null, 'Não iniciada'),
  ('MET-A001', 'MET', 'MET-PD-01', 'Apurar PIS', 'MET-LAYRA', null, '2026-11-05', '2026-11-05', 'Em andamento');
insert into gp_compromissos (codigo, cliente_codigo, o_que, responsavel_codigo, data, status, so_solve) values
  ('MOE-C0001', 'MOE', 'Enviar extratos', 'MOE-HENRIQUE', '2026-11-14', 'Pendente', false),
  ('MOE-C0002', 'MOE', 'Alinhar proposta de renovação da Moendo', 'SOLVE-GUILHERME', '2026-11-18', 'Pendente', true),
  ('MET-C0001', 'MET', 'Pedir apuração', 'SOLVE-PEDRO', '2026-11-05', 'Pendente', false),
  ('SOL-C0001', 'SOL', 'Reunião interna', 'SOLVE-GUILHERME', '2026-11-13', 'Pendente', false);
insert into gp_acompanhamentos (codigo, cliente_codigo, registro_tipo, registro_codigo, texto, so_solve) values
  ('MOE-A003-N01', 'MOE', 'Ação', 'MOE-A003', 'Lucas pediu mais uma semana', false),
  ('MOE-C0002-N01', 'MOE', 'Compromisso', 'MOE-C0002', 'Diretoria sinalizou corte de escopo', true);

-- Afirmação simples.
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is not true then raise exception 'FALHOU: %', msg; end if; end $$;
grant execute on function pg_temp.ok(boolean, text) to authenticated, anon;

-- ================= Gestor da Moendo =================
set role authenticated;
set request.jwt.claims = '{"email":"Lucas@Moendo.com.br"}';
select pg_temp.ok((select gp_perfil()) = 'gestor', 'perfil do gestor (e-mail sem diferenciar maiúsculas)');
select pg_temp.ok((select count(*) from gp_clientes) = 1 and (select codigo from gp_clientes) = 'MOE', 'gestor vê só o próprio cliente');
select pg_temp.ok((select count(*) from gp_pessoas where cliente_codigo = 'MET') = 0, 'gestor não vê pessoas de outro cliente');
select pg_temp.ok((select count(*) from gp_pessoas where empresa = 'Solve') = 2, 'gestor vê as pessoas da Solve');
select pg_temp.ok((select count(*) from gp_acoes) = 3 and not exists (select 1 from gp_acoes where cliente_codigo <> 'MOE'), 'gestor vê só ações da Moendo');
select pg_temp.ok(not exists (select 1 from gp_demandas where cliente_codigo <> 'MOE') and not exists (select 1 from gp_frentes where cliente_codigo <> 'MOE'), 'gestor não vê demandas/frentes de outro cliente');
select pg_temp.ok((select count(*) from gp_compromissos) = 1 and (select codigo from gp_compromissos) = 'MOE-C0001', 'gestor não vê compromisso só Solve, de outro cliente nem do SOL');
select pg_temp.ok((select count(*) from gp_acompanhamentos) = 1, 'gestor não vê acompanhamento só Solve');
select pg_temp.ok((select count(*) from gp_usuarios) = 1, 'gestor vê só o próprio cadastro de usuário');
select pg_temp.ok((select count(*) from gp_historico) = 0, 'gestor não vê o histórico');
select pg_temp.ok((select array_agg(c order by c) from gp_codigos('GP_Compromissos') c) = array['MOE-C0001', 'MOE-C0002'],
  'códigos para numeração incluem o só Solve da Moendo e nada de outro cliente');
do $$ declare n int; begin
  update gp_acoes set status = 'Concluída' where codigo = 'MET-A001'; get diagnostics n = row_count;
  perform pg_temp.ok(n = 0, 'gestor não altera ação de outro cliente');
  update gp_compromissos set status = 'Feito' where codigo = 'MOE-C0002'; get diagnostics n = row_count;
  perform pg_temp.ok(n = 0, 'gestor não altera compromisso só Solve');
  update gp_acoes set status = 'Cancelada', motivo_cancelamento = 'teste' where codigo = 'MOE-A003'; get diagnostics n = row_count;
  perform pg_temp.ok(n = 1, 'gestor cancela ação da Moendo');
end $$;
do $$ begin
  insert into gp_acoes (codigo, cliente_codigo, demanda_codigo, o_que, responsavel_codigo, prazo, status)
  values ('MET-A099', 'MET', 'MET-PD-01', 'invasão', 'MOE-LUCAS', '2026-12-01', 'Não iniciada');
  raise exception 'FALHOU: gestor criou ação em outro cliente';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into gp_compromissos (codigo, cliente_codigo, o_que, responsavel_codigo, data, status, so_solve)
  values ('MOE-C0003', 'MOE', 'x', 'MOE-LUCAS', '2026-12-01', 'Pendente', true);
  raise exception 'FALHOU: gestor criou compromisso só Solve';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update gp_acoes set cliente_codigo = 'MET' where codigo = 'MOE-A001';
  raise exception 'FALHOU: gestor moveu ação para outro cliente';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into gp_usuarios (email, perfil, cliente_codigo) values ('novo@moendo.com.br', 'gestor', 'MOE');
  raise exception 'FALHOU: gestor cadastrou usuário';
exception when insufficient_privilege then null; end $$;
do $$ begin
  delete from gp_acoes where codigo = 'MOE-A001';
  raise exception 'FALHOU: exclusão física permitida';
exception when insufficient_privilege then null; end $$;
insert into gp_acoes (codigo, cliente_codigo, demanda_codigo, o_que, responsavel_codigo, prazo, status, criado_por, versao)
values ('MOE-A004', 'MOE', 'MOE-PD-01', 'Nova ação do gestor', 'MOE-RISO', '2026-12-01', 'Não iniciada', 'forjado@x.com', 99);
select pg_temp.ok((select criado_por from gp_acoes where codigo = 'MOE-A004') = 'lucas@moendo.com.br'
  and (select versao from gp_acoes where codigo = 'MOE-A004') = 1, 'carimbo de autoria e versão não aceita valor forjado');
-- Código repetido é recusado; depois de excluir (lógico), o mesmo código pode ser recriado (Desfazer).
do $$ begin
  insert into gp_acoes (codigo, cliente_codigo, demanda_codigo, o_que, responsavel_codigo, status) values ('MOE-A004', 'MOE', 'MOE-PD-01', 'dup', 'MOE-RISO', 'Não iniciada');
  raise exception 'FALHOU: código repetido aceito';
exception when unique_violation then null; end $$;
update gp_acoes set excluido_em = now() where codigo = 'MOE-A004';
insert into gp_acoes (codigo, cliente_codigo, demanda_codigo, o_que, responsavel_codigo, status) values ('MOE-A004', 'MOE', 'MOE-PD-01', 'recriada', 'MOE-RISO', 'Não iniciada');
select pg_temp.ok((select count(*) from gp_acoes where codigo = 'MOE-A004' and excluido_em is null) = 1, 'recriação após exclusão lógica');
-- Pessoas: gestor cadastra pessoa da Moendo, não da Solve nem de outro cliente.
insert into gp_pessoas (codigo, nome, cliente_codigo, empresa, nominal, ativo) values ('MOE-JOAO', 'João', 'MOE', 'Cliente', true, true);
do $$ begin
  insert into gp_pessoas (codigo, nome, cliente_codigo, empresa, nominal, ativo) values ('SOLVE-X', 'X', null, 'Solve', true, true);
  raise exception 'FALHOU: gestor cadastrou pessoa da Solve';
exception when insufficient_privilege then null; end $$;
reset role;

-- ================= Colaborador da Moendo =================
set role authenticated;
set request.jwt.claims = '{"email":"henrique@moendo.com.br"}';
select pg_temp.ok((select count(*) from gp_acoes where excluido_em is null) = 4, 'colaborador vê todas as ações da Moendo');
select pg_temp.ok((select count(*) from gp_compromissos) = 1, 'colaborador não vê compromisso só Solve');
do $$ declare n int; begin
  update gp_acoes set status = 'Concluída', data_conclusao = '2026-11-12' where codigo = 'MOE-A001'; get diagnostics n = row_count;
  perform pg_temp.ok(n = 1, 'colaborador conclui a própria ação');
  update gp_acoes set prazo = '2026-11-30' where codigo = 'MOE-A002'; get diagnostics n = row_count;
  perform pg_temp.ok(n = 1, 'colaborador muda o prazo da ação em que é apoio');
  update gp_acoes set status = 'Em andamento' where codigo = 'MOE-A004'; get diagnostics n = row_count;
  perform pg_temp.ok(n = 0, 'colaborador não altera ação de outra pessoa');
end $$;
do $$ begin
  update gp_acoes set o_que = 'texto mudado' where codigo = 'MOE-A001';
  raise exception 'FALHOU: colaborador editou o texto da ação';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update gp_acoes set status = 'Cancelada' where codigo = 'MOE-A002';
  raise exception 'FALHOU: colaborador cancelou ação';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update gp_acoes set responsavel_codigo = 'MOE-RISO' where codigo = 'MOE-A001';
  raise exception 'FALHOU: colaborador trocou responsável';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update gp_acoes set excluido_em = now() where codigo = 'MOE-A001';
  raise exception 'FALHOU: colaborador excluiu ação';
exception when insufficient_privilege then null; end $$;
insert into gp_reprogramacoes (codigo, acao_codigo, cliente_codigo, prazo_anterior, prazo_novo, motivo)
values ('MOE-A002-R01', 'MOE-A002', 'MOE', '2026-11-25', '2026-11-30', 'Fornecedor atrasou a lista');
do $$ begin
  insert into gp_reprogramacoes (codigo, acao_codigo, cliente_codigo, prazo_novo, motivo) values ('MOE-A004-R01', 'MOE-A004', 'MOE', '2026-12-30', 'x');
  raise exception 'FALHOU: colaborador reprogramou ação de outra pessoa';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into gp_demandas (codigo, cliente_codigo, assunto, tipo) values ('MOE-PD-02', 'MOE', 'x', 'Pendência');
  raise exception 'FALHOU: colaborador criou demanda';
exception when insufficient_privilege then null; end $$;
insert into gp_compromissos (codigo, cliente_codigo, o_que, responsavel_codigo, data, status) values ('MOE-C0003', 'MOE', 'Ligar para o contador', 'MOE-HENRIQUE', '2026-11-20', 'Pendente');
do $$ declare n int; begin
  update gp_compromissos set status = 'Feito', data_realizacao = '2026-11-12' where codigo = 'MOE-C0001'; get diagnostics n = row_count;
  perform pg_temp.ok(n = 1, 'colaborador marca o próprio compromisso como feito');
end $$;
do $$ begin
  insert into gp_compromissos (codigo, cliente_codigo, o_que, responsavel_codigo, data, status) values ('MOE-C0004', 'MOE', 'x', 'MOE-LUCAS', '2026-11-20', 'Pendente');
  raise exception 'FALHOU: colaborador criou compromisso para outra pessoa';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update gp_compromissos set responsavel_codigo = 'MOE-LUCAS' where codigo = 'MOE-C0003';
  raise exception 'FALHOU: colaborador passou o compromisso para outra pessoa';
exception when insufficient_privilege then null; end $$;
insert into gp_acompanhamentos (codigo, cliente_codigo, registro_tipo, registro_codigo, texto) values ('MOE-A001-N01', 'MOE', 'Ação', 'MOE-A001', 'Planilha enviada');
do $$ begin
  insert into gp_acompanhamentos (codigo, cliente_codigo, registro_tipo, registro_codigo, texto) values ('MOE-A004-N01', 'MOE', 'Ação', 'MOE-A004', 'x');
  raise exception 'FALHOU: colaborador registrou andamento em ação de outra pessoa';
exception when insufficient_privilege then null; end $$;
do $$ declare n int; begin
  update gp_acompanhamentos set texto = 'mudado' where codigo = 'MOE-A003-N01'; get diagnostics n = row_count;
  perform pg_temp.ok(n = 0, 'colaborador não edita andamento de outra pessoa');
  update gp_acompanhamentos set texto = 'Planilha enviada ao Lucas' where codigo = 'MOE-A001-N01'; get diagnostics n = row_count;
  perform pg_temp.ok(n = 1, 'colaborador edita o próprio andamento');
end $$;
reset role;

-- ================= Gestor de outro cliente (Metalflex) =================
set role authenticated;
set request.jwt.claims = '{"email":"layra@metalflex.com.br"}';
select pg_temp.ok((select count(*) from gp_acoes) = 1 and (select count(*) from gp_compromissos) = 1 and (select count(*) from gp_acompanhamentos) = 0,
  'gestor da Metalflex não vê nada da Moendo');
select pg_temp.ok(not exists (select 1 from gp_codigos('GP_Acoes') c where c like 'MOE-%'), 'numeração da Metalflex não expõe códigos da Moendo');
reset role;

-- ================= Equipe Solve =================
set role authenticated;
set request.jwt.claims = '{"email":"pedro@solvegroup.com.br"}';
select pg_temp.ok((select count(*) from gp_clientes) = 3, 'equipe Solve vê toda a carteira, inclusive SOL');
select pg_temp.ok((select count(*) from gp_compromissos) = 5 and (select count(*) from gp_acompanhamentos) = 3, 'equipe Solve vê os registros só Solve');
insert into gp_compromissos (codigo, cliente_codigo, o_que, responsavel_codigo, data, status, so_solve) values ('MOE-C0005', 'MOE', 'Preparar fórum', 'SOLVE-PEDRO', '2026-11-19', 'Pendente', true);
do $$ begin
  insert into gp_usuarios (email, perfil) values ('novo@solvegroup.com.br', 'solve');
  raise exception 'FALHOU: equipe Solve cadastrou usuário';
exception when insufficient_privilege then null; end $$;
select pg_temp.ok((select count(*) from gp_historico) = 0, 'equipe Solve não vê o histórico');
reset role;

-- ================= Sem cadastro, inativo e anônimo =================
set role authenticated;
set request.jwt.claims = '{"email":"curioso@gmail.com"}';
select pg_temp.ok((select count(*) from gp_acoes) + (select count(*) from gp_clientes) + (select count(*) from gp_pessoas) = 0,
  'pessoa sem cadastro não vê dados');
set request.jwt.claims = '{"email":"ex@moendo.com.br"}';
select pg_temp.ok((select count(*) from gp_acoes) = 0 and (select gp_perfil()) is null, 'usuário inativo não vê dados');
select pg_temp.ok((select count(*) from gp_codigos('GP_Acoes')) = 0, 'usuário inativo não lê códigos');
reset role;
set role anon;
do $$ begin
  perform 1 from gp_acoes;
  raise exception 'FALHOU: anônimo leu a tabela';
exception when insufficient_privilege then null; end $$;
reset role;

-- ================= Administrador =================
set role authenticated;
set request.jwt.claims = '{"email":"guilherme@solvegroup.com.br"}';
select pg_temp.ok((select versao from gp_acoes where codigo = 'MOE-A002') = 2, 'versão sobe a cada gravação');
select pg_temp.ok((select alterado_por from gp_acoes where codigo = 'MOE-A001') = 'henrique@moendo.com.br', 'quem alterou fica gravado');
select pg_temp.ok(exists (select 1 from gp_historico where codigo = 'MOE-A001' and operacao = 'UPDATE' and por = 'henrique@moendo.com.br'
  and antes ->> 'status' = 'Não iniciada' and depois ->> 'status' = 'Concluída'), 'histórico guarda antes e depois');
select pg_temp.ok(exists (select 1 from gp_historico where codigo = 'MOE-A004' and operacao = 'EXCLUSAO' and por = 'lucas@moendo.com.br'), 'histórico registra a exclusão');
insert into gp_usuarios (email, perfil, cliente_codigo, pessoa_codigo) values ('Riso@Moendo.com.br', 'colaborador', 'MOE', 'MOE-RISO');
select pg_temp.ok(exists (select 1 from gp_usuarios where email = 'riso@moendo.com.br'), 'admin cadastra usuário (e-mail em minúsculas)');
reset role;

select 'TODOS OS TESTES DE ACESSO PASSARAM' as resultado;
