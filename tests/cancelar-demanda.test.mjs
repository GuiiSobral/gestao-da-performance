// Cancelar demanda sem ação aberta: grava o motivo na própria demanda, sem criar ação de fachada; reabrir e nova ação limpam o cancelamento.
// Rodar com: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryBackend } from '../src/graph.js';
import { Store, hojeISO } from '../src/store.js';

const F = (id, fields) => ({ id, fields });
const fixture = () => ({
  GP_Clientes: [F('1', { Title: 'MET', Nome: 'Metalflex' })],
  GP_Pessoas: [F('1', { Title: 'SOLVE-GUILHERME', Nome: 'Guilherme', Empresa: 'Solve', Nominal: true })],
  GP_Frentes: [],
  GP_Demandas: [
    F('1', { Title: 'MET-QC-01', ClienteCodigo: 'MET', Assunto: 'Desenho do fluxograma', Tipo: 'Questão crítica', Encerrada: false }),
    F('2', { Title: 'MET-QC-02', ClienteCodigo: 'MET', Assunto: 'Com ação aberta', Tipo: 'Questão crítica', Encerrada: false })],
  GP_Acoes: [F('1', { Title: 'MET-A001', ClienteCodigo: 'MET', DemandaCodigo: 'MET-QC-02', OQue: 'Ação aberta', ResponsavelCodigo: 'SOLVE-GUILHERME', Status: 'Em andamento' })],
  GP_Reprogramacoes: [], GP_Foruns: [], GP_Deliberacoes: [], GP_Indicadores: [], GP_Medicoes: [], GP_Compromissos: []
});
async function abrir() {
  const be = new MemoryBackend(fixture());
  const s = new Store(be, { name: 'Guilherme' });
  await s.load();
  return { be, s };
}

test('cancela a demanda sem ação, grava motivo e data, e não cria ação', async () => {
  const { be, s } = await abrir();
  const d = s.demanda('MET-QC-01');
  await s.cancelarDemanda(d, '  Deixou de ser prioridade do cliente ');
  const f = be.db.GP_Demandas[0].fields;
  assert.equal(f.Encerrada, true);
  assert.equal(f.MotivoCancelamento, 'Deixou de ser prioridade do cliente');
  assert.equal(f.DataEncerramento, `${hojeISO()}T12:00:00Z`);
  assert.equal(be.db.GP_Acoes.length, 1);
  assert.equal(d.motivoCancel, 'Deixou de ser prioridade do cliente');
  // relido do SharePoint, continua cancelada
  const s2 = new Store(be); await s2.load();
  assert.equal(s2.demanda('MET-QC-01').motivoCancel, 'Deixou de ser prioridade do cliente');
});

test('sem motivo, não cancela', async () => {
  const { be, s } = await abrir();
  await assert.rejects(s.cancelarDemanda(s.demanda('MET-QC-01'), '   '), /motivo/);
  assert.equal(be.db.GP_Demandas[0].fields.Encerrada, false);
});

test('demanda com ação aberta não pode ser cancelada direto', async () => {
  const { be, s } = await abrir();
  await assert.rejects(s.cancelarDemanda(s.demanda('MET-QC-02'), 'Motivo'), /ações abertas/);
  assert.equal(be.db.GP_Demandas[1].fields.Encerrada, false);
});

test('desfazer reabre e limpa o motivo', async () => {
  const { be, s } = await abrir();
  const d = s.demanda('MET-QC-01');
  await s.cancelarDemanda(d, 'Motivo');
  await s.reabrirDemanda(d);
  const f = be.db.GP_Demandas[0].fields;
  assert.equal(f.Encerrada, false);
  assert.ok(!f.MotivoCancelamento);
  assert.ok(!f.DataEncerramento);
  assert.equal(d.motivoCancel, '');
});

test('nova ação numa demanda cancelada a reabre e limpa o cancelamento', async () => {
  const { be, s } = await abrir();
  const d = s.demanda('MET-QC-01');
  await s.cancelarDemanda(d, 'Motivo');
  await s.novaAcao({ cli: 'MET', acao: 'Retomar', dem: d.id, resp: 'SOLVE-GUILHERME', prazo: '2026-12-30', area: 'Produção', origem: 'Captura rápida' });
  const f = be.db.GP_Demandas[0].fields;
  assert.equal(f.Encerrada, false);
  assert.ok(!f.MotivoCancelamento);
  assert.equal(d.encerrada, false);
});

test('reabrir uma demanda encerrada normalmente não toca na coluna de motivo', async () => {
  const { be, s } = await abrir();
  const d = s.demanda('MET-QC-01');
  await s.encerrarDemanda(d);
  await s.reabrirDemanda(d);
  assert.equal('MotivoCancelamento' in be.db.GP_Demandas[0].fields, false);
});
