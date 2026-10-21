// Compromissos: códigos, repetição, desfazer, edição simultânea e leitura de uma linha.
// Rodar com: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryBackend } from '../src/graph.js';
import { Store, lerLinha, proximaData, hojeISO } from '../src/store.js';

const F = (id, fields) => ({ id, fields });
const fixture = () => ({
  GP_Clientes: [F('1', { Title: 'MET', Nome: 'Metalflex' }), F('2', { Title: 'SOL', Nome: 'Solve (interno)', Interno: true })],
  GP_Pessoas: [F('1', { Title: 'SOLVE-PEDRO', Nome: 'Pedro', Empresa: 'Solve', Nominal: true }),
    F('2', { Title: 'MET-LAYRA-BRITO', Nome: 'Layra Brito', ClienteCodigo: 'MET', Empresa: 'Cliente', Nominal: true }),
    F('3', { Title: 'SOLVE-GUILHERME', Nome: 'Guilherme', Empresa: 'Solve', Nominal: true })],
  GP_Frentes: [], GP_Demandas: [], GP_Acoes: [], GP_Reprogramacoes: [], GP_Foruns: [], GP_Deliberacoes: [], GP_Indicadores: [], GP_Medicoes: []
});
const somar = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
async function duas() {
  const be = new MemoryBackend(fixture());
  const a = new Store(be, { name: 'Pedro' }), b = new Store(be, { name: 'Guilherme' });
  await a.load(); await b.load();
  return { be, a, b };
}
const base = { cli: 'MET', oque: 'Solicitar a apuração de PIS e COFINS', tipo: 'Solicitar', resp: 'SOLVE-PEDRO', contra: 'MET-LAYRA-BRITO' };

test('sem a lista GP_Compromissos o app carrega o resto normalmente', async () => {
  const st = new Store(new MemoryBackend(fixture()), {});
  await st.load();
  assert.equal(st.compromissos.length, 0);
  assert.equal(st.interno('SOL'), true);
  assert.equal(st.interno('MET'), false);
});

test('duas pessoas registrando compromisso no mesmo cliente recebem códigos diferentes', async () => {
  const { be, a, b } = await duas();
  const x = await a.novoCompromisso({ ...base, data: somar(hojeISO(), 5) });
  const y = await b.novoCompromisso({ ...base, data: somar(hojeISO(), 6) });
  assert.equal(x.id, 'MET-C0001');
  assert.equal(y.id, 'MET-C0002');
  assert.equal(be.db.GP_Compromissos.length, 2);
  assert.equal(x.serie, null);
});

test('compromisso mensal: fechar cria a próxima vez uma única vez, e desfazer apaga a próxima', async () => {
  const { be, a } = await duas();
  const d = somar(hojeISO(), 2);
  const c = await a.novoCompromisso({ ...base, data: d, rec: 'Mensal' });
  assert.equal(c.serie, c.id);
  const r = await a.fecharCompromisso(c, 'Feito', 'Layra enviou');
  assert.ok(r.prox);
  assert.equal(r.prox.serie, c.id);
  assert.equal(r.prox.data, proximaData(d, 'Mensal'));
  assert.equal(be.db.GP_Compromissos.length, 2);
  assert.equal(be.db.GP_Compromissos[0].fields.Status, 'Feito');
  assert.equal(be.db.GP_Compromissos[0].fields.Resultado, 'Layra enviou');
  await a.desfazerFechamento(c, r.ant, r.prox);
  assert.equal(be.db.GP_Compromissos.length, 1);
  assert.equal(be.db.GP_Compromissos[0].fields.Status, 'Pendente');
  assert.equal(be.db.GP_Compromissos[0].fields.DataRealizacao, null);
});

test('remarcar não muda a data original, e a próxima repetição sai da data original', async () => {
  const { a } = await duas();
  const d = somar(hojeISO(), 1);
  const c = await a.novoCompromisso({ ...base, data: d, rec: 'Semanal' });
  await a.remarcarCompromisso(c, somar(d, 3), '10:00');
  assert.equal(c.dataOrig, d);
  const r = await a.fecharCompromisso(c, 'Feito');
  assert.equal(r.prox.data, somar(d, 7));
  assert.equal(r.prox.hora, '10:00');
});

test('não ocorreu também gera a próxima vez; cancelar encerra a repetição', async () => {
  const { be, a } = await duas();
  const c = await a.novoCompromisso({ ...base, data: somar(hojeISO(), 1), rec: 'Semanal' });
  const r = await a.fecharCompromisso(c, 'Não ocorreu');
  assert.ok(r.prox);
  const r2 = await a.fecharCompromisso(r.prox, 'Cancelado');
  assert.equal(r2.prox, null);
  assert.equal(be.db.GP_Compromissos.length, 2);
});

test('compromisso atrasado de várias semanas: a próxima vez nunca nasce no passado', async () => {
  const be = new MemoryBackend({ ...fixture(), GP_Compromissos: [F('9', { Title: 'MET-C0001', ClienteCodigo: 'MET', OQue: 'Cobrar relatório', ResponsavelCodigo: 'SOLVE-PEDRO',
    Data: somar(hojeISO(), -30) + 'T12:00:00Z', DataOriginal: somar(hojeISO(), -30) + 'T12:00:00Z', Recorrencia: 'Semanal', Status: 'Pendente', SerieCodigo: 'MET-C0001' })] });
  const st = new Store(be, { name: 'Pedro' }); await st.load();
  const r = await st.fecharCompromisso(st.compromisso('MET-C0001'), 'Feito');
  assert.ok(r.prox.data >= hojeISO());
  assert.equal(r.prox.id, 'MET-C0002');
});

test('segunda pessoa fechando o mesmo compromisso com a tela velha é recusada e não duplica a próxima vez', async () => {
  const { be, a, b } = await duas();
  const c = await a.novoCompromisso({ ...base, data: somar(hojeISO(), 1), rec: 'Mensal' });
  await b.load();
  await a.fecharCompromisso(c, 'Feito');
  await assert.rejects(b.fecharCompromisso(b.compromisso(c.id), 'Não ocorreu'), e => e.status === 412);
  assert.equal(be.db.GP_Compromissos.length, 2);
  assert.equal(be.db.GP_Compromissos[0].fields.Status, 'Feito');
});

test('se a próxima vez não puder ser criada, o compromisso volta para pendente', async () => {
  const { be, a } = await duas();
  const c = await a.novoCompromisso({ ...base, data: somar(hojeISO(), 1), rec: 'Mensal' });
  const create = be.create.bind(be);
  be.create = async () => { const e = new Error('Falha simulada'); e.status = 500; throw e; };
  await assert.rejects(a.fecharCompromisso(c, 'Feito'));
  be.create = create;
  assert.equal(be.db.GP_Compromissos[0].fields.Status, 'Pendente');
  assert.equal(c.status, 'Pendente');
});

test('mensal no dia 31 segue no último dia dos meses curtos e volta ao 31', () => {
  assert.equal(proximaData('2026-01-31', 'Mensal', 31), '2026-02-28');
  assert.equal(proximaData('2026-02-28', 'Mensal', 31), '2026-03-31');
  assert.equal(proximaData('2026-12-05', 'Mensal'), '2027-01-05');
  assert.equal(proximaData('2026-12-28', 'Semanal'), '2027-01-04');
});

test('lê os exemplos escritos como se fala', () => {
  const P = [{ id: 'MET-LAYRA-BRITO', nome: 'Layra Brito' }, { id: 'SOLVE-GUILHERME', nome: 'Guilherme' }];
  const h = '2026-10-21';
  let r = lerLinha('Solicitar a Layra o envio da apuração de PIS e COFINS no dia 05/11/2026', P, h);
  assert.deepEqual([r.texto, r.data, r.tipo, r.contra], ['Solicitar a Layra o envio da apuração de PIS e COFINS', '2026-11-05', 'Solicitar', 'MET-LAYRA-BRITO']);
  r = lerLinha('Solicitar a Daniel o envio da relação de Expedições no dia 01/11/2026', P, h);
  assert.deepEqual([r.texto, r.data, r.contra, r.contraNome], ['Solicitar a Daniel o envio da relação de Expedições', '2026-11-01', null, 'Daniel']);
  r = lerLinha('Reunião de alinhamento sobre a Gestão da Performance com Guilherme dia 21/10/2026 às 14:00', P, h);
  assert.deepEqual([r.texto, r.data, r.hora, r.tipo, r.contra], ['Reunião de alinhamento sobre a Gestão da Performance com Guilherme', '2026-10-21', '14:00', 'Reunião', 'SOLVE-GUILHERME']);
  r = lerLinha('Cobrar a Layra a apuração todo dia 05', P, h);
  assert.deepEqual([r.texto, r.data, r.rec], ['Cobrar a Layra a apuração', '2026-11-05', 'Mensal']);
  r = lerLinha('Enviar o fluxo de caixa toda segunda às 9h', P, h);
  assert.deepEqual([r.data, r.hora, r.rec, r.tipo], ['2026-10-26', '09:00', 'Semanal', 'Entregar']);
  r = lerLinha('Revisar a DRE de setembro', P, h);
  assert.deepEqual([r.texto, r.data, r.hora, r.rec], ['Revisar a DRE de setembro', null, null, null]);
});
