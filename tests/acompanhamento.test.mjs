// Acompanhamento de ações e compromissos: vários registros, códigos, edição e exclusão com desfazer,
// série de compromissos, troca de cliente e independência do status e do prazo.
// Rodar com: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryBackend } from '../src/graph.js';
import { Store, hojeISO } from '../src/store.js';

const F = (id, fields) => ({ id, fields });
const fixture = () => ({
  GP_Clientes: [F('1', { Title: 'MOE', Nome: 'Moendo' }), F('2', { Title: 'AZE', Nome: 'Azevedo' })],
  GP_Pessoas: [F('1', { Title: 'SOLVE-GUILHERME', Nome: 'Guilherme', Empresa: 'Solve', Nominal: true }),
    F('2', { Title: 'SOLVE-PEDRO', Nome: 'Pedro', Empresa: 'Solve', Nominal: true })],
  GP_Frentes: [],
  GP_Demandas: [F('1', { Title: 'MOE-PD-01', ClienteCodigo: 'MOE', Assunto: 'Pendência 1', Tipo: 'Pendência', ResponsavelCodigo: 'SOLVE-GUILHERME', Encerrada: false, Origem: 'Captura rápida' })],
  GP_Acoes: [F('1', { Title: 'MOE-A001', ClienteCodigo: 'MOE', DemandaCodigo: 'MOE-PD-01', OQue: 'Ação 1', ResponsavelCodigo: 'SOLVE-GUILHERME',
    Prazo: '2026-12-30T12:00:00Z', PrazoOriginal: '2026-12-30T12:00:00Z', Status: 'Em andamento', Origem: 'Captura rápida' })],
  GP_Reprogramacoes: [], GP_Foruns: [], GP_Deliberacoes: [], GP_Indicadores: [], GP_Medicoes: [], GP_Compromissos: [], GP_Pauta: [], GP_Acompanhamentos: []
});
async function duas() {
  const be = new MemoryBackend(fixture());
  const a = new Store(be, { name: 'Guilherme' }), b = new Store(be, { name: 'Pedro' });
  await a.load(); await b.load();
  return { be, a, b };
}

test('a mesma ação aceita vários andamentos, cada um com código, data, hora e autor', async () => {
  const { be, a } = await duas();
  const x = a.acao('MOE-A001');
  const n1 = await a.registrarAcomp('acao', x, 'Liguei para a Tati; extrato sai amanhã');
  const n2 = await a.registrarAcomp('acao', x, 'Extrato recebido, falta o de outubro');
  const n3 = await a.registrarAcomp('acao', x, '  Conferido com o razão  ');
  assert.deepEqual([n1.id, n2.id, n3.id], ['MOE-A001-N01', 'MOE-A001-N02', 'MOE-A001-N03']);
  assert.equal(be.db.GP_Acompanhamentos.length, 3);
  const f = be.db.GP_Acompanhamentos[2].fields;
  assert.equal(f.Texto, 'Conferido com o razão');
  assert.equal(f.RegistroTipo, 'Ação');
  assert.equal(f.RegistroCodigo, 'MOE-A001');
  assert.equal(f.ClienteCodigo, 'MOE');
  assert.equal(f.RegistradoPor, 'Guilherme');
  assert.match(f.RegistradoEm, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  assert.equal(a.acompanhamentos('acao', 'MOE-A001').length, 3);
  assert.equal(a.ultimoAcomp('acao', 'MOE-A001').id, 'MOE-A001-N03');
});

test('andamento não mexe em status, prazo nem na ação', async () => {
  const { be, a } = await duas();
  await a.registrarAcomp('acao', a.acao('MOE-A001'), 'Aguardando retorno');
  assert.equal(be.log.filter(l => l[1] === 'GP_Acoes').length, 0);
  assert.equal(be.db.GP_Acoes[0].fields.Status, 'Em andamento');
  assert.equal(be.db.GP_Reprogramacoes.length, 0);
});

test('texto vazio não grava', async () => {
  const { be, a } = await duas();
  await assert.rejects(a.registrarAcomp('acao', a.acao('MOE-A001'), '   '), /Escreva o andamento/);
  assert.equal(be.db.GP_Acompanhamentos.length, 0);
});

test('duas pessoas registrando ao mesmo tempo recebem códigos diferentes', async () => {
  const { a, b } = await duas();
  const x = await a.registrarAcomp('acao', a.acao('MOE-A001'), 'Primeiro');
  const y = await b.registrarAcomp('acao', b.acao('MOE-A001'), 'Segundo');
  assert.equal(x.id, 'MOE-A001-N01');
  assert.equal(y.id, 'MOE-A001-N02');
});

test('editar: só o autor, com desfazer, e recusa se outra pessoa mudou antes', async () => {
  const { be, a, b } = await duas();
  const n = await a.registrarAcomp('acao', a.acao('MOE-A001'), 'Texto 1');
  await b.load();
  await assert.rejects(b.editarAcomp(b.acomp[0], 'Mudado pelo Pedro'), /Só quem registrou/);
  const ant = await a.editarAcomp(n, 'Texto 2');
  assert.equal(ant, 'Texto 1');
  assert.equal(be.db.GP_Acompanhamentos[0].fields.Texto, 'Texto 2');
  await a.editarAcomp(n, ant);
  assert.equal(be.db.GP_Acompanhamentos[0].fields.Texto, 'Texto 1');
  be.externo('GP_Acompanhamentos', be.db.GP_Acompanhamentos[0].id, { Texto: 'Mudado no SharePoint' });
  await assert.rejects(a.editarAcomp(n, 'Texto 3'), e => e.status === 412);
});

test('excluir vai para a lixeira e o desfazer recria com o mesmo código, data e autor', async () => {
  const { be, a } = await duas();
  const x = a.acao('MOE-A001');
  await a.registrarAcomp('acao', x, 'Um');
  const n2 = await a.registrarAcomp('acao', x, 'Dois');
  const em = n2.em;
  const apagado = await a.excluirAcomp(n2);
  assert.equal(be.db.GP_Acompanhamentos.length, 1);
  assert.equal(a.acompanhamentos('acao', 'MOE-A001').length, 1);
  const volta = await a.restaurarAcomp(apagado);
  assert.equal(volta.id, 'MOE-A001-N02');
  assert.equal(volta.em, em);
  assert.equal(volta.por, 'Guilherme');
  assert.equal(be.db.GP_Acompanhamentos.length, 2);
});

test('compromisso que se repete: os andamentos de todas as vezes aparecem juntos', async () => {
  const { a } = await duas();
  const c1 = await a.novoCompromisso({ cli: 'MOE', oque: 'Pedir extratos', tipo: 'Solicitar', resp: 'SOLVE-GUILHERME', contra: '', data: hojeISO(), hora: '', rec: 'Semanal' });
  await a.registrarAcomp('comp', c1, 'Banco do Brasil mandou só a conta corrente');
  const { prox } = await a.fecharCompromisso(c1, 'Feito');
  await a.registrarAcomp('comp', prox, 'Desta vez veio completo');
  assert.equal(a.acompanhamentos('comp', prox.id).length, 1);
  const serie = a.acompanhamentosSerie(prox);
  assert.equal(serie.length, 2);
  assert.deepEqual(new Set(serie.map(n => n.reg)), new Set([c1.id, prox.id]));
});

test('trocar o cliente da ação leva os andamentos para o código novo, e o desfazer traz de volta', async () => {
  const { be, a } = await duas();
  const x = a.acao('MOE-A001');
  await a.registrarAcomp('acao', x, 'Um');
  await a.registrarAcomp('acao', x, 'Dois');
  const r = await a.trocarClienteAcao(x, 'AZE', { resp: 'SOLVE-GUILHERME', dem: '' });
  assert.equal(r.nova.id, 'AZE-A001');
  const lista = a.acompanhamentos('acao', 'AZE-A001');
  assert.deepEqual(lista.map(n => n.id).sort(), ['AZE-A001-N01', 'AZE-A001-N02']);
  assert.ok(be.db.GP_Acompanhamentos.every(it => it.fields.RegistroCodigo === 'AZE-A001' && it.fields.ClienteCodigo === 'AZE'));
  assert.equal(a.acompanhamentos('acao', 'MOE-A001').length, 0);
  const ordem = lista.slice().reverse().map(n => n.texto);
  assert.deepEqual(ordem, ['Um', 'Dois']);
  const v = await a.trocarClienteAcao(r.nova, 'MOE', { resp: 'SOLVE-GUILHERME', dem: '' });
  assert.equal(a.acompanhamentos('acao', v.nova.id).length, 2);
  assert.ok(be.db.GP_Acompanhamentos.every(it => it.fields.RegistroCodigo === v.nova.id && it.fields.ClienteCodigo === 'MOE'));
});

test('trocar o cliente do compromisso leva os andamentos junto', async () => {
  const { be, a } = await duas();
  const c = await a.novoCompromisso({ cli: 'MOE', oque: 'Reunião de alinhamento', tipo: 'Reunião', resp: 'SOLVE-GUILHERME', contra: '', data: hojeISO(), hora: '14:00', rec: 'Única' });
  await a.registrarAcomp('comp', c, 'Pauta enviada');
  const r = await a.trocarClienteComp(c, 'AZE', { resp: 'SOLVE-GUILHERME' });
  assert.equal(a.acompanhamentos('comp', r.novo.id).length, 1);
  assert.equal(be.db.GP_Acompanhamentos[0].fields.Title, `${r.novo.id}-N01`);
});

test('sem a lista GP_Acompanhamentos o resto do app carrega e o registro avisa', async () => {
  const fx = fixture(); delete fx.GP_Acompanhamentos;
  const be = new MemoryBackend(fx);
  const orig = be.items.bind(be);
  be.items = async (n, f) => { if (n === 'GP_Acompanhamentos') throw new Error('A lista GP_Acompanhamentos não foi encontrada no SharePoint.'); return orig(n, f); };
  const st = new Store(be, { name: 'Guilherme' });
  await st.load();
  assert.equal(st.acoes.length, 1);
  assert.equal(st.semListaAcomp(), true);
  await assert.rejects(st.registrarAcomp('acao', st.acao('MOE-A001'), 'x'), /ainda não foi criada/);
});
