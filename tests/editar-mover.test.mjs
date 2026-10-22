// Editar textos, mover ação entre demandas, criar demanda ao registrar e trocar o cliente de um registro feito no cliente errado.
// Rodar com: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryBackend } from '../src/graph.js';
import { Store } from '../src/store.js';

const F = (id, fields) => ({ id, fields });
const fixture = () => ({
  GP_Clientes: [F('1', { Title: 'MOE', Nome: 'Moendo' }), F('2', { Title: 'LIR', Nome: 'Lira' })],
  GP_Pessoas: [F('1', { Title: 'SOLVE-GUILHERME', Nome: 'Guilherme', Empresa: 'Solve', Nominal: true }),
    F('2', { Title: 'MOE-LUCAS', Nome: 'Lucas', ClienteCodigo: 'MOE', Empresa: 'Cliente', Nominal: true }),
    F('3', { Title: 'LIR-JEFFERSON', Nome: 'Jefferson', ClienteCodigo: 'LIR', Empresa: 'Cliente', Nominal: true })],
  GP_Frentes: [F('1', { Title: 'MOE-F01', ClienteCodigo: 'MOE', Nome: 'Implantação Omie', Encerrada: false })],
  GP_Demandas: [
    F('1', { Title: 'MOE-PD-01', ClienteCodigo: 'MOE', Assunto: 'Entregar planilha', Tipo: 'Pendência', ResponsavelCodigo: 'SOLVE-GUILHERME', Encerrada: false, Origem: 'Captura rápida' }),
    F('2', { Title: 'MOE-QC-01', ClienteCodigo: 'MOE', Assunto: 'Fechamento mensal', Tipo: 'Questão crítica', Prioridade: 2, Encerrada: false, Origem: 'Questões Críticas' }),
    F('3', { Title: 'LIR-PD-01', ClienteCodigo: 'LIR', Assunto: 'Conciliação', Tipo: 'Pendência', Encerrada: false, Origem: 'Captura rápida' }),
    F('4', { Title: 'MOE-EF-01', ClienteCodigo: 'MOE', Assunto: 'Cadastros', Tipo: 'Entrega de frente', FrenteCodigo: 'MOE-F01', Encerrada: false })],
  GP_Acoes: [
    F('1', { Title: 'MOE-A001', ClienteCodigo: 'MOE', DemandaCodigo: 'MOE-PD-01', OQue: 'Entregar planilha', ResponsavelCodigo: 'SOLVE-GUILHERME', Area: 'Controladoria',
      Inicio: '2026-10-22T12:00:00Z', PrazoOriginal: '2026-11-05T12:00:00Z', Prazo: '2026-11-05T12:00:00Z', Status: 'Não iniciada', Origem: 'Captura rápida', Registro: '2026-10-22T12:00:00Z' }),
    F('2', { Title: 'MOE-A002', ClienteCodigo: 'MOE', DemandaCodigo: 'MOE-QC-01', OQue: 'Fechar outubro', ResponsavelCodigo: 'MOE-LUCAS', Status: 'Em andamento',
      Prazo: '2026-11-10T12:00:00Z', PrazoOriginal: '2026-11-01T12:00:00Z', Origem: 'Captura rápida' })],
  GP_Reprogramacoes: [F('1', { Title: 'MOE-R001', AcaoCodigo: 'MOE-A002', ClienteCodigo: 'MOE', PrazoAnterior: '2026-11-01T12:00:00Z', PrazoNovo: '2026-11-10T12:00:00Z', Motivo: 'x' })],
  GP_Foruns: [], GP_Deliberacoes: [], GP_Indicadores: [], GP_Medicoes: [],
  GP_Compromissos: [F('1', { Title: 'MOE-C0001', ClienteCodigo: 'MOE', OQue: 'Pedir extrato', Tipo: 'Solicitar', ResponsavelCodigo: 'SOLVE-GUILHERME',
    ContraparteCodigo: 'MOE-LUCAS', Data: '2026-11-03T12:00:00Z', DataOriginal: '2026-11-03T12:00:00Z', Recorrencia: 'Única', Status: 'Pendente' })]
});
async function abrir() {
  const be = new MemoryBackend(fixture());
  const s = new Store(be, { name: 'Guilherme' });
  await s.load();
  return { be, s };
}
const item = (be, lista, code) => be.db[lista].find(x => x.fields.Title === code);

test('edita o texto da ação, grava só o que mudou e o desfazer volta', async () => {
  const { be, s } = await abrir();
  const a = s.acao('MOE-A001');
  const antes = await s.editar('acao', a, { acao: 'Entregar planilha de custos ', problema: 'Custos sem base', como: '', area: 'Controladoria' });
  const f = item(be, 'GP_Acoes', 'MOE-A001').fields;
  assert.equal(f.OQue, 'Entregar planilha de custos');
  assert.equal(f.Problema, 'Custos sem base');
  assert.deepEqual(be.log.at(-1)[3], { OQue: 'Entregar planilha de custos', Problema: 'Custos sem base' });
  assert.equal(f.Prazo, '2026-11-05T12:00:00Z');
  assert.equal(a.acao, 'Entregar planilha de custos');
  await s.editar('acao', a, antes);
  assert.equal(f.OQue, 'Entregar planilha');
  assert.equal(f.Problema, null);
});

test('edição sem mudança ou com texto vazio é recusada', async () => {
  const { s } = await abrir();
  const a = s.acao('MOE-A001');
  await assert.rejects(s.editar('acao', a, { acao: 'Entregar planilha' }), e => e.nadaMudou);
  await assert.rejects(s.editar('acao', a, { acao: '  ' }), /vazio/);
});

test('edita demanda: título, tipo entre pendência e questão crítica, prioridade', async () => {
  const { be, s } = await abrir();
  await s.editar('dem', s.demanda('MOE-PD-01'), { titulo: 'Planilha de custos', tipo: 'Questão crítica', prioridade: '3' });
  const f = item(be, 'GP_Demandas', 'MOE-PD-01').fields;
  assert.equal(f.Assunto, 'Planilha de custos');
  assert.equal(f.Tipo, 'Questão crítica');
  assert.equal(f.Prioridade, 3);
  await assert.rejects(s.editar('dem', s.demanda('MOE-EF-01'), { tipo: 'Pendência' }), /não muda/);
  await assert.rejects(s.editar('dem', s.demanda('MOE-QC-01'), { prioridade: 9 }), /P1 a P7/);
});

test('edita compromisso: texto, tipo e com quem', async () => {
  const { be, s } = await abrir();
  await s.editar('comp', s.compromisso('MOE-C0001'), { oque: 'Pedir extrato do Itaú', tipo: 'Solicitar', contra: 'Lucas Souza' });
  const f = item(be, 'GP_Compromissos', 'MOE-C0001').fields;
  assert.equal(f.OQue, 'Pedir extrato do Itaú');
  assert.equal(f.ContraparteCodigo, 'Lucas Souza');
});

test('registrar ação com + Nova demanda cria a questão crítica com código QC e na frente escolhida', async () => {
  const { be, s } = await abrir();
  const a = await s.novaAcao({ cli: 'MOE', acao: 'Mapear processo', dem: '', novaDem: { titulo: 'Processo de compras', tipo: 'Questão crítica', frente: 'MOE-F01' },
    resp: 'MOE-LUCAS', prazo: '2026-12-01', area: 'Compras', origem: 'Captura rápida' });
  assert.equal(a.demanda, 'MOE-QC-02');
  const d = item(be, 'GP_Demandas', 'MOE-QC-02').fields;
  assert.equal(d.Assunto, 'Processo de compras');
  assert.equal(d.Tipo, 'Questão crítica');
  assert.equal(d.FrenteCodigo, 'MOE-F01');
});

test('registrar ação sem escolher demanda continua criando pendência com o mesmo título', async () => {
  const { be, s } = await abrir();
  const a = await s.novaAcao({ cli: 'MOE', acao: 'Conferir notas', dem: '', resp: 'MOE-LUCAS', prazo: '2026-12-01', area: 'Fiscal', origem: 'Captura rápida' });
  assert.equal(a.demanda, 'MOE-PD-02');
  assert.equal(item(be, 'GP_Demandas', 'MOE-PD-02').fields.Assunto, 'Conferir notas');
});

test('mover a ação isolada para uma questão crítica cancela a pendência automática; desfazer volta tudo', async () => {
  const { be, s } = await abrir();
  const a = s.acao('MOE-A001');
  const r = await s.moverAcao(a, 'MOE-QC-01');
  assert.equal(item(be, 'GP_Acoes', 'MOE-A001').fields.DemandaCodigo, 'MOE-QC-01');
  const pd = item(be, 'GP_Demandas', 'MOE-PD-01').fields;
  assert.equal(pd.Encerrada, true);
  assert.equal('MotivoCancelamento' in pd, false);
  assert.equal(r.encerrou, true);
  await s.desfazerMover(a, r);
  assert.equal(item(be, 'GP_Acoes', 'MOE-A001').fields.DemandaCodigo, 'MOE-PD-01');
  assert.equal(pd.Encerrada, false);
});

test('mover ação de uma demanda de verdade não encerra a origem', async () => {
  const { be, s } = await abrir();
  const r = await s.moverAcao(s.acao('MOE-A002'), 'MOE-PD-01');
  assert.equal(r.encerrou, false);
  assert.equal(item(be, 'GP_Demandas', 'MOE-QC-01').fields.Encerrada, false);
});

test('mover para + Nova demanda cria a demanda; desfazer apaga a demanda criada', async () => {
  const { be, s } = await abrir();
  const a = s.acao('MOE-A002');
  const r = await s.moverAcao(a, { titulo: 'Fechamento de outubro', tipo: 'Pendência' });
  assert.equal(r.criada, true);
  assert.equal(a.demanda, r.para);
  assert.ok(item(be, 'GP_Demandas', r.para));
  await s.desfazerMover(a, r);
  assert.equal(item(be, 'GP_Demandas', r.para), undefined);
  assert.equal(a.demanda, 'MOE-QC-01');
});

test('mover recusa demanda de outro cliente', async () => {
  const { s } = await abrir();
  await assert.rejects(s.moverAcao(s.acao('MOE-A001'), 'LIR-PD-01'), /deste cliente/);
});

test('troca de cliente: recria ação e pendência no cliente certo e apaga as antigas', async () => {
  const { be, s } = await abrir();
  const a = s.acao('MOE-A001');
  const r = await s.trocarClienteAcao(a, 'LIR', { resp: 'SOLVE-GUILHERME', dem: '' });
  assert.equal(r.nova.id, 'LIR-A001');
  assert.equal(item(be, 'GP_Acoes', 'MOE-A001'), undefined);
  assert.equal(item(be, 'GP_Demandas', 'MOE-PD-01'), undefined);
  const n = item(be, 'GP_Acoes', 'LIR-A001').fields;
  assert.equal(n.ClienteCodigo, 'LIR');
  assert.equal(n.DemandaCodigo, 'LIR-PD-02');
  assert.equal(n.OQue, 'Entregar planilha');
  assert.equal(n.Prazo, '2026-11-05T12:00:00Z');
  assert.equal(item(be, 'GP_Demandas', 'LIR-PD-02').fields.Assunto, 'Entregar planilha');
  assert.equal(s.acao('MOE-A001'), null);
  assert.ok(s.acao('LIR-A001'));
});

test('troca de cliente para demanda existente e exige responsável que atenda o cliente', async () => {
  const { be, s } = await abrir();
  await assert.rejects(s.trocarClienteAcao(s.acao('MOE-A001'), 'LIR', { resp: 'MOE-LUCAS' }), /não atende/);
  const r = await s.trocarClienteAcao(s.acao('MOE-A001'), 'LIR', { resp: 'LIR-JEFFERSON', dem: 'LIR-PD-01' });
  assert.equal(item(be, 'GP_Acoes', r.nova.id).fields.DemandaCodigo, 'LIR-PD-01');
  assert.equal(item(be, 'GP_Acoes', r.nova.id).fields.ResponsavelCodigo, 'LIR-JEFFERSON');
});

test('ação com histórico de prazo não troca de cliente', async () => {
  const { s } = await abrir();
  assert.equal(s.podeTrocarCliente('acao', s.acao('MOE-A002')).ok, false);
  await assert.rejects(s.trocarClienteAcao(s.acao('MOE-A002'), 'LIR', { resp: 'SOLVE-GUILHERME' }), /histórico de prazo/);
});

test('falha ao apagar a antiga desfaz o que foi criado', async () => {
  const { be, s } = await abrir();
  const a = s.acao('MOE-A001');
  const orig = be.remove.bind(be);
  let n = 0;
  be.remove = async (lista, id) => { if (n++ === 0) throw new Error('Falha simulada'); return orig(lista, id); };
  await assert.rejects(s.trocarClienteAcao(a, 'LIR', { resp: 'SOLVE-GUILHERME' }), /Falha/);
  assert.ok(item(be, 'GP_Acoes', 'MOE-A001'));
  assert.equal(be.db.GP_Acoes.some(x => x.fields.ClienteCodigo === 'LIR'), false);
  assert.equal(be.db.GP_Demandas.some(x => x.fields.Title === 'LIR-PD-02'), false);
});

test('troca de cliente do compromisso: novo código, com quem do cliente antigo vira nome', async () => {
  const { be, s } = await abrir();
  const r = await s.trocarClienteComp(s.compromisso('MOE-C0001'), 'LIR', { resp: 'SOLVE-GUILHERME' });
  assert.equal(r.novo.id, 'LIR-C0001');
  assert.equal(item(be, 'GP_Compromissos', 'MOE-C0001'), undefined);
  const f = item(be, 'GP_Compromissos', 'LIR-C0001').fields;
  assert.equal(f.ContraparteCodigo, 'Lucas');
  assert.equal(f.Data, '2026-11-03T12:00:00Z');
});
