// Cancelar demanda sem ação aberta: um clique, sem motivo e sem ação de fachada; aparece como Cancelada; desfazer e nova ação reabrem.
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

test('cancela a demanda sem ação: só Encerrada e data, sem motivo e sem criar ação', async () => {
  const { be, s } = await abrir();
  await s.cancelarDemanda(s.demanda('MET-QC-01'));
  const f = be.db.GP_Demandas[0].fields;
  assert.equal(f.Encerrada, true);
  assert.equal(f.DataEncerramento, `${hojeISO()}T12:00:00Z`);
  assert.equal('MotivoCancelamento' in f, false);
  assert.deepEqual(Object.keys(be.log.at(-1)[3]).sort(), ['DataEncerramento', 'Encerrada']);
  assert.equal(be.db.GP_Acoes.length, 1);
});

test('demanda com ação aberta não pode ser cancelada direto', async () => {
  const { be, s } = await abrir();
  await assert.rejects(s.cancelarDemanda(s.demanda('MET-QC-02')), /ações abertas/);
  assert.equal(be.db.GP_Demandas[1].fields.Encerrada, false);
});

test('desfazer reabre a demanda', async () => {
  const { be, s } = await abrir();
  const d = s.demanda('MET-QC-01');
  await s.cancelarDemanda(d);
  await s.reabrirDemanda(d);
  const f = be.db.GP_Demandas[0].fields;
  assert.equal(f.Encerrada, false);
  assert.ok(!f.DataEncerramento);
});

test('nova ação numa demanda cancelada a reabre', async () => {
  const { be, s } = await abrir();
  const d = s.demanda('MET-QC-01');
  await s.cancelarDemanda(d);
  await s.novaAcao({ cli: 'MET', acao: 'Retomar', dem: d.id, resp: 'SOLVE-GUILHERME', prazo: '2026-12-30', area: 'Produção', origem: 'Captura rápida' });
  assert.equal(be.db.GP_Demandas[0].fields.Encerrada, false);
  assert.equal(d.encerrada, false);
});

test('o app não lê nem grava coluna de motivo em GP_Demandas', async () => {
  const { LISTS } = await import('../src/store.js');
  assert.equal(LISTS.GP_Demandas.includes('MotivoCancelamento'), false);
});
