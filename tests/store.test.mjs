// Testes da camada de dados com a base em memória: edição simultânea e códigos únicos.
// Rodar com: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryBackend } from '../src/graph.js';
import { Store } from '../src/store.js';

const F = (id, fields) => ({ id, fields });
const fixture = () => ({
  GP_Clientes: [F('1', { Title: 'MOE', Nome: 'Moendo' })],
  GP_Pessoas: [F('1', { Title: 'SOLVE-PEDRO', Nome: 'Pedro', Empresa: 'Solve', Nominal: true, Email: 'pedro@solvegroup.com.br' })],
  GP_Frentes: [F('1', { Title: 'MOE-F01', ClienteCodigo: 'MOE', Nome: 'Omie', Encerrada: false })],
  GP_Demandas: [F('1', { Title: 'MOE-PD-01', ClienteCodigo: 'MOE', Assunto: 'Pendência 1', Tipo: 'Pendência', Encerrada: false })],
  GP_Acoes: [F('1', { Title: 'MOE-A001', ClienteCodigo: 'MOE', DemandaCodigo: 'MOE-PD-01', OQue: 'Ação 1', ResponsavelCodigo: 'SOLVE-PEDRO',
    Prazo: '2026-10-30T12:00:00Z', PrazoOriginal: '2026-10-30T12:00:00Z', Status: 'Em andamento' })],
  GP_Reprogramacoes: [], GP_Foruns: [], GP_Deliberacoes: [], GP_Indicadores: [], GP_Medicoes: []
});
async function duasTelas() {
  const be = new MemoryBackend(fixture());
  const a = new Store(be, { name: 'Guilherme' }); const b = new Store(be, { name: 'Pedro' });
  await a.load(); await b.load();
  return { be, a, b };
}

test('segunda gravação no mesmo item, com tela desatualizada, é recusada', async () => {
  const { be, a, b } = await duasTelas();
  await a.concluir(a.acao('MOE-A001'));
  await assert.rejects(b.cancelar(b.acao('MOE-A001'), 'não precisa mais'), e => e.status === 412);
  assert.equal(be.db.GP_Acoes[0].fields.Status, 'Concluída');
});

test('a mesma tela pode gravar várias vezes seguidas no mesmo item', async () => {
  const { be, a } = await duasTelas();
  const x = a.acao('MOE-A001');
  await a.concluir(x);
  await a.desfazerConclusao(x, 'Em andamento');
  await a.reprogramar(x, '2026-11-15', 'aguardando fornecedor');
  assert.equal(be.db.GP_Acoes[0].fields.Status, 'Em andamento');
  assert.equal(be.db.GP_Acoes[0].fields.Prazo, '2026-11-15T12:00:00Z');
  assert.equal(be.db.GP_Reprogramacoes.length, 1);
});

test('depois de reler, a gravação passa', async () => {
  const { be, a, b } = await duasTelas();
  await a.concluir(a.acao('MOE-A001'));
  await b.load();
  await b.desfazerConclusao(b.acao('MOE-A001'), 'Em andamento');
  assert.equal(be.db.GP_Acoes[0].fields.Status, 'Em andamento');
});

test('reprogramação recusada não deixa histórico solto', async () => {
  const { be, a, b } = await duasTelas();
  await a.cancelar(a.acao('MOE-A001'), 'feito pela Solve');
  await assert.rejects(b.reprogramar(b.acao('MOE-A001'), '2026-12-01', 'motivo'), e => e.status === 412);
  assert.equal(be.db.GP_Reprogramacoes.length, 0);
  assert.equal(be.db.GP_Acoes[0].fields.Prazo, '2026-10-30T12:00:00Z');
});

test('duas pessoas criando ação no mesmo cliente recebem códigos diferentes', async () => {
  const { be, a, b } = await duasTelas();
  const base = { cli: 'MOE', dem: 'MOE-PD-01', resp: 'SOLVE-PEDRO', prazo: '2026-11-01', area: 'Financeiro', origem: 'Captura rápida' };
  const x = await a.novaAcao({ ...base, acao: 'Ação de Guilherme' });
  const y = await b.novaAcao({ ...base, acao: 'Ação de Pedro' });
  assert.equal(x.id, 'MOE-A002');
  assert.equal(y.id, 'MOE-A003');
  const titulos = be.db.GP_Acoes.map(i => i.fields.Title);
  assert.equal(new Set(titulos).size, titulos.length);
});

test('frente, entrega, demanda, fórum, deliberação e reprogramação também não repetem código', async () => {
  const { be, a, b } = await duasTelas();
  const fr = { cli: 'MOE', area: 'Financeiro', dono: 'SOLVE-PEDRO', fim: '2026-12-31' };
  await a.novaFrente({ ...fr, nome: 'Frente A' });
  await b.novaFrente({ ...fr, nome: 'Frente B' });
  const base = { cli: 'MOE', resp: 'SOLVE-PEDRO', prazo: '2026-11-01', area: 'Financeiro', origem: 'Captura rápida' };
  await a.novaAcao({ ...base, acao: 'Sem demanda A' });
  await b.novaAcao({ ...base, acao: 'Sem demanda B' });
  // dois fóruns convocados para o mesmo dia, cada um numa tela
  const conv = { cli: 'MOE', data: '2026-11-05', hora: '09:30', local: 'Sala 1', convocados: ['SOLVE-PEDRO'], itens: [{ tipo: 'Demanda', reg: 'MOE-PD-01' }] };
  const fa = await a.convocarForum(conv);
  const fb = await b.convocarForum({ ...conv, itens: [{ tipo: 'Tópico livre', assunto: 'Informes' }] });
  assert.notEqual(fa.id, fb.id);
  await a.iniciarForum(fa, ['SOLVE-PEDRO']);
  await b.load();
  a.forumAtivo = fa.id; b.forumAtivo = fa.id;
  a.alvoPauta = a.pautaDe(fa.id)[0].id; b.alvoPauta = b.pautaDe(fa.id)[0].id;
  await a.registrarDeliberacao({ cli: 'MOE', texto: 'Decisão A', tipo: 'Deliberado' });
  await b.registrarDeliberacao({ cli: 'MOE', texto: 'Decisão B', tipo: 'Deliberado' });
  for (const l of ['GP_Frentes', 'GP_Demandas', 'GP_Acoes', 'GP_Deliberacoes', 'GP_Foruns', 'GP_Pauta']) {
    const t = be.db[l].map(i => i.fields.Title);
    assert.equal(new Set(t).size, t.length, `${l}: ${t.join(', ')}`);
  }
  assert.ok(be.db.GP_Deliberacoes.every(d => d.fields.ForumCodigo === fa.id));
});

test('ata não sobrescreve a ata que outra pessoa já registrou', async () => {
  const { be, a, b } = await duasTelas();
  const fo = await a.convocarForum({ cli: 'MOE', data: '2026-11-05', hora: '09:30', local: 'Sala 1', convocados: ['SOLVE-PEDRO'], itens: [{ tipo: 'Demanda', reg: 'MOE-PD-01' }] });
  await a.iniciarForum(fo, ['SOLVE-PEDRO']);
  await a.encerrarForum(fo);
  await b.load();
  await a.salvarAta(fo, 'Ata do Guilherme');
  await assert.rejects(b.salvarAta(b.forum(fo.id), 'Ata do Pedro'), e => e.status === 412);
  assert.equal(be.db.GP_Foruns[0].fields.Ata, 'Ata do Guilherme');
});

test('código criado direto no SharePoint por fora do app é respeitado', async () => {
  const { be, a } = await duasTelas();
  be.inserirExterno('GP_Acoes', { Title: 'MOE-A007', ClienteCodigo: 'MOE' });
  const x = await a.novaAcao({ cli: 'MOE', dem: 'MOE-PD-01', resp: 'SOLVE-PEDRO', prazo: '2026-11-01', area: 'Financeiro', origem: 'Captura rápida', acao: 'Nova' });
  assert.equal(x.id, 'MOE-A008');
});
