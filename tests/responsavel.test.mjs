// Troca de responsável em ação, compromisso e demanda: grava, desfaz, respeita edição simultânea e repassa à próxima vez da série.
// Rodar com: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryBackend } from '../src/graph.js';
import { Store, hojeISO } from '../src/store.js';

const F = (id, fields) => ({ id, fields });
const fixture = () => ({
  GP_Clientes: [F('1', { Title: 'MOE', Nome: 'Moendo' })],
  GP_Pessoas: [F('1', { Title: 'SOLVE-PEDRO', Nome: 'Pedro', Empresa: 'Solve', Nominal: true }),
    F('2', { Title: 'SOLVE-GUILHERME', Nome: 'Guilherme', Empresa: 'Solve', Nominal: true }),
    F('3', { Title: 'MOE-FINANCEIRO', Nome: 'Financeiro', ClienteCodigo: 'MOE', Empresa: 'Cliente', Nominal: false })],
  GP_Frentes: [],
  GP_Demandas: [F('1', { Title: 'MOE-PD-01', ClienteCodigo: 'MOE', Assunto: 'Pendência 1', Tipo: 'Pendência', ResponsavelCodigo: 'SOLVE-PEDRO', Encerrada: false })],
  GP_Acoes: [F('1', { Title: 'MOE-A001', ClienteCodigo: 'MOE', DemandaCodigo: 'MOE-PD-01', OQue: 'Ação 1', ResponsavelCodigo: 'MOE-FINANCEIRO', Apoio: 'Ana',
    Prazo: '2026-12-30T12:00:00Z', PrazoOriginal: '2026-12-30T12:00:00Z', Status: 'Em andamento' })],
  GP_Reprogramacoes: [], GP_Foruns: [], GP_Deliberacoes: [], GP_Indicadores: [], GP_Medicoes: [], GP_Compromissos: []
});
async function duas() {
  const be = new MemoryBackend(fixture());
  const a = new Store(be, { name: 'Guilherme' }), b = new Store(be, { name: 'Pedro' });
  await a.load(); await b.load();
  return { be, a, b };
}

test('troca o responsável e o apoio da ação sem mexer no prazo, e o desfazer volta ao anterior', async () => {
  const { be, a } = await duas();
  const x = a.acao('MOE-A001');
  const ant = await a.trocarResponsavel('acao', x, 'SOLVE-GUILHERME', 'Pedro');
  const f = be.db.GP_Acoes[0].fields;
  assert.equal(f.ResponsavelCodigo, 'SOLVE-GUILHERME');
  assert.equal(f.Apoio, 'Pedro');
  assert.equal(f.Prazo, '2026-12-30T12:00:00Z');
  assert.equal(be.db.GP_Reprogramacoes.length, 0);
  assert.equal(x.resp, 'SOLVE-GUILHERME');
  assert.deepEqual(ant, { resp: 'MOE-FINANCEIRO', apoio: 'Ana' });
  await a.trocarResponsavel('acao', x, ant.resp, ant.apoio);
  assert.equal(f.ResponsavelCodigo, 'MOE-FINANCEIRO');
  assert.equal(f.Apoio, 'Ana');
});

test('troca de responsável com a tela desatualizada é recusada', async () => {
  const { be, a, b } = await duas();
  await a.trocarResponsavel('acao', a.acao('MOE-A001'), 'SOLVE-GUILHERME', '');
  await assert.rejects(b.trocarResponsavel('acao', b.acao('MOE-A001'), 'SOLVE-PEDRO', ''), e => e.status === 412);
  assert.equal(be.db.GP_Acoes[0].fields.ResponsavelCodigo, 'SOLVE-GUILHERME');
});

test('demanda troca só o responsável dela; as ações ficam como estão', async () => {
  const { be, a } = await duas();
  await a.trocarResponsavel('dem', a.demanda('MOE-PD-01'), 'SOLVE-GUILHERME');
  assert.equal(be.db.GP_Demandas[0].fields.ResponsavelCodigo, 'SOLVE-GUILHERME');
  assert.equal(be.db.GP_Acoes[0].fields.ResponsavelCodigo, 'MOE-FINANCEIRO');
  assert.equal('Apoio' in be.db.GP_Demandas[0].fields, false);
});

test('compromisso que se repete: a próxima vez nasce com o novo responsável', async () => {
  const { be, a } = await duas();
  const c = await a.novoCompromisso({ cli: 'MOE', oque: 'Pedir extratos', tipo: 'Solicitar', resp: 'SOLVE-PEDRO', contra: '', data: hojeISO(), hora: '', rec: 'Semanal' });
  await a.trocarResponsavel('comp', c, 'SOLVE-GUILHERME');
  const { prox } = await a.fecharCompromisso(c, 'Feito');
  assert.ok(prox);
  assert.equal(prox.resp, 'SOLVE-GUILHERME');
  assert.equal(be.db.GP_Compromissos.find(x => x.fields.Title === prox.id).fields.ResponsavelCodigo, 'SOLVE-GUILHERME');
});
