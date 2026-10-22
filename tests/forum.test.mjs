// Fórum com convocação: pauta escolhida à mão sem repetição, condução por item, desdobramentos, não tratados e ata.
// Rodar com: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryBackend } from '../src/graph.js';
import { Store } from '../src/store.js';

const F = (id, fields) => ({ id, fields });
const acao = (id, n, dem, extra) => F(String(n), { Title: id, ClienteCodigo: 'MOE', DemandaCodigo: dem, OQue: `Ação ${id}`, ResponsavelCodigo: 'MOE-ANA',
  Prazo: '2026-11-30T12:00:00Z', PrazoOriginal: '2026-11-30T12:00:00Z', Status: 'Em andamento', ...extra });
const fixture = () => ({
  GP_Clientes: [F('1', { Title: 'MOE', Nome: 'Moendo' }), F('2', { Title: 'AZE', Nome: 'Azevedo' })],
  GP_Pessoas: [
    F('1', { Title: 'SOLVE-GUILHERME', Nome: 'Guilherme', Empresa: 'Solve', Nominal: true, Ativo: true }),
    F('2', { Title: 'SOLVE-PEDRO', Nome: 'Pedro', Empresa: 'Solve', Nominal: true, Ativo: true }),
    F('3', { Title: 'MOE-ANA', Nome: 'Ana', ClienteCodigo: 'MOE', Empresa: 'Cliente', Nominal: true, Ativo: true }),
    F('4', { Title: 'MOE-EQUIPE', Nome: 'Equipe', ClienteCodigo: 'MOE', Empresa: 'Cliente', Nominal: false, Ativo: true }),
    F('5', { Title: 'AZE-TATI', Nome: 'Tati', ClienteCodigo: 'AZE', Empresa: 'Cliente', Nominal: true, Ativo: true }),
    F('6', { Title: 'SOLVE', Nome: 'Solve', Empresa: 'Solve', Nominal: false, Ativo: true })],
  GP_Frentes: [],
  GP_Demandas: [
    F('1', { Title: 'MOE-QC-01', ClienteCodigo: 'MOE', Assunto: 'Fluxo de caixa diário', Tipo: 'Questão crítica', Encerrada: false }),
    F('2', { Title: 'MOE-PD-01', ClienteCodigo: 'MOE', Assunto: 'Conciliação bancária de setembro', Tipo: 'Pendência', Encerrada: false }),
    F('3', { Title: 'MOE-QC-02', ClienteCodigo: 'MOE', Assunto: 'Sem plano', Tipo: 'Questão crítica', Encerrada: false })],
  GP_Acoes: [acao('MOE-A001', 1, 'MOE-QC-01'), acao('MOE-A002', 2, 'MOE-QC-01'), acao('MOE-A003', 3, 'MOE-PD-01')],
  GP_Reprogramacoes: [], GP_Deliberacoes: [], GP_Indicadores: [], GP_Medicoes: [], GP_Compromissos: [],
  GP_Foruns: [F('1', { Title: 'MOE-FO-20261001', ClienteCodigo: 'MOE', Data: '2026-10-01T12:00:00Z', Ata: 'ata antiga' })],
  GP_Pauta: []
});
async function abrir() {
  const be = new MemoryBackend(fixture());
  const s = new Store(be, { name: 'Guilherme' });
  await s.load();
  return { be, s };
}
const CONV = { cli: 'MOE', data: '2026-11-05', hora: '09:30', local: 'Sede da Moendo', convocados: ['SOLVE-GUILHERME', 'MOE-ANA'] };
async function emAndamento(itens) {
  const r = await abrir();
  const fo = await r.s.convocarForum({ ...CONV, itens });
  await r.s.iniciarForum(fo, ['SOLVE-GUILHERME']);
  r.s.forumAtivo = fo.id;
  return { ...r, fo };
}

test('fórum antigo, sem situação gravada, aparece como realizado', async () => {
  const { s } = await abrir();
  const fo = s.forum('MOE-FO-20261001');
  assert.equal(fo.situacao, 'Realizado');
  assert.equal(fo.antigo, true);
});

test('convocação exige data, horário, local, participante e pauta', async () => {
  const { s } = await abrir();
  const itens = [{ tipo: 'Demanda', reg: 'MOE-QC-01' }];
  await assert.rejects(s.convocarForum({ ...CONV, data: '', itens }), /data/);
  await assert.rejects(s.convocarForum({ ...CONV, hora: '', itens }), /horário/);
  await assert.rejects(s.convocarForum({ ...CONV, local: '  ', itens }), /local/);
  await assert.rejects(s.convocarForum({ ...CONV, convocados: [], itens }), /participante/);
  await assert.rejects(s.convocarForum({ ...CONV, itens: [] }), /pauta/);
});

test('convocados possíveis: toda a Solve e as pessoas nominais do cliente', async () => {
  const { s } = await abrir();
  assert.deepEqual(s.convocaveis('MOE').map(p => p.id), ['MOE-ANA', 'SOLVE-GUILHERME', 'SOLVE-PEDRO']);
});

test('convocar grava o fórum agendado e a pauta na ordem escolhida, sem repetição', async () => {
  const { be, s } = await abrir();
  const fo = await s.convocarForum({ ...CONV, itens: [
    { tipo: 'Ação', reg: 'MOE-A003' },
    { tipo: 'Ação', reg: 'MOE-A001' },          // absorvida: a demanda inteira entra logo abaixo
    { tipo: 'Demanda', reg: 'MOE-QC-01' },
    { tipo: 'Demanda', reg: 'MOE-QC-01' },      // repetida
    { tipo: 'Tópico livre', assunto: 'Informes do jurídico' },
    { tipo: 'Tópico livre', assunto: 'informes do  JURÍDICO' }] });
  assert.equal(fo.id, 'MOE-FO-20261105');
  const f = be.db.GP_Foruns.at(-1).fields;
  assert.equal(f.Situacao, 'Agendado');
  assert.equal(f.Hora, '09:30');
  assert.equal(f.Local, 'Sede da Moendo');
  assert.equal(f.Convocados, 'SOLVE-GUILHERME; MOE-ANA');
  const p = be.db.GP_Pauta.map(x => x.fields);
  assert.deepEqual(p.map(x => [x.Title, x.Ordem, x.Tipo, x.RegistroCodigo || x.Assunto]), [
    ['MOE-FO-20261105-P01', 1, 'Ação', 'MOE-A003'],
    ['MOE-FO-20261105-P02', 2, 'Demanda', 'MOE-QC-01'],
    ['MOE-FO-20261105-P03', 3, 'Tópico livre', 'Informes do jurídico']]);
  assert.equal(p[1].Assunto, 'Fluxo de caixa diário');
  assert.ok(p.every(x => x.Origem === 'Convocação'));
});

test('editar a convocação tira, inclui e reordena itens', async () => {
  const { be, s } = await abrir();
  const fo = await s.convocarForum({ ...CONV, itens: [{ tipo: 'Demanda', reg: 'MOE-QC-01' }, { tipo: 'Demanda', reg: 'MOE-PD-01' }] });
  await s.editarConvocacao(fo, { ...CONV, hora: '14:00', convocados: ['SOLVE-PEDRO'],
    itens: [{ tipo: 'Tópico livre', assunto: 'Informes' }, { tipo: 'Demanda', reg: 'MOE-PD-01' }] });
  assert.equal(be.db.GP_Foruns.at(-1).fields.Hora, '14:00');
  assert.equal(be.db.GP_Foruns.at(-1).fields.Convocados, 'SOLVE-PEDRO');
  const p = s.pautaDe(fo.id);
  assert.deepEqual(p.map(x => [x.ordem, x.tipo, x.reg || x.assunto]), [[1, 'Tópico livre', 'Informes'], [2, 'Demanda', 'MOE-PD-01']]);
  assert.equal(be.db.GP_Pauta.length, 2);
});

test('mostra quando o registro já está na pauta de outro fórum agendado', async () => {
  const { s } = await abrir();
  const fo = await s.convocarForum({ ...CONV, itens: [{ tipo: 'Demanda', reg: 'MOE-QC-01' }] });
  assert.equal(s.emOutraPauta('MOE', 'Demanda', 'MOE-QC-01').id, fo.id);
  assert.equal(s.emOutraPauta('MOE', 'Demanda', 'MOE-QC-01', fo.id), null);
});

test('tópico livre parecido com uma demanda aberta é apontado', async () => {
  const { s } = await abrir();
  assert.deepEqual(s.parecidas('MOE', 'conciliação bancária').map(d => d.id), ['MOE-PD-01']);
  assert.deepEqual(s.parecidas('MOE', 'Informes do jurídico'), []);
});

test('iniciar exige presentes e só um fórum em andamento por cliente', async () => {
  const { s } = await abrir();
  const a = await s.convocarForum({ ...CONV, itens: [{ tipo: 'Demanda', reg: 'MOE-QC-01' }] });
  const b = await s.convocarForum({ ...CONV, itens: [{ tipo: 'Demanda', reg: 'MOE-PD-01' }] });
  await assert.rejects(s.iniciarForum(a, []), /presente/);
  await s.iniciarForum(a, ['MOE-ANA']);
  assert.equal(a.situacao, 'Em andamento');
  await assert.rejects(s.iniciarForum(b, ['MOE-ANA']), /em andamento/);
});

test('o que se faz numa ação vira desdobramento do item e define o tratamento', async () => {
  const { s, fo } = await emAndamento([{ tipo: 'Demanda', reg: 'MOE-QC-01' }, { tipo: 'Ação', reg: 'MOE-A003' }]);
  const [dem, ac] = s.pautaDe(fo.id);
  await s.concluir(s.acao('MOE-A001'));
  assert.equal(dem.trat, 'Tratado');
  assert.deepEqual(dem.eventos.map(e => [e.k, e.cod]), [['concluida', 'MOE-A001']]);
  await s.desfazerConclusao(s.acao('MOE-A001'), 'Em andamento');
  assert.equal(dem.trat, null);
  assert.equal(dem.eventos.length, 0);
  await s.reprogramar(s.acao('MOE-A003'), '2026-12-15', 'aguardando o banco');
  assert.equal(ac.trat, 'Repactuado');
  await s.cancelar(s.acao('MOE-A003'), 'substituída');
  assert.equal(ac.trat, 'Cancelado');
});

test('trocar o responsável e voltar ao anterior não deixa rastro', async () => {
  const { s, fo } = await emAndamento([{ tipo: 'Ação', reg: 'MOE-A003' }]);
  const [p] = s.pautaDe(fo.id);
  const a = s.acao('MOE-A003');
  await s.trocarResponsavel('acao', a, 'SOLVE-PEDRO');
  assert.equal(p.eventos.length, 1);
  await s.trocarResponsavel('acao', a, 'MOE-ANA');
  assert.equal(p.eventos.length, 0);
  assert.equal(p.trat, null);
});

test('encerrar ou cancelar a demanda do item; desfazer tira da pauta', async () => {
  const { s, fo } = await emAndamento([{ tipo: 'Demanda', reg: 'MOE-QC-02' }]);
  const [p] = s.pautaDe(fo.id);
  const d = s.demanda('MOE-QC-02');
  await s.cancelarDemanda(d);
  assert.equal(p.trat, 'Cancelado');
  await s.reabrirDemanda(d);
  assert.equal(p.trat, null);
});

test('ação nova criada a partir de um item fica no item; sem item, entra na pauta como incluída no fórum', async () => {
  const { s, fo } = await emAndamento([{ tipo: 'Tópico livre', assunto: 'Informes do jurídico' }]);
  const [top] = s.pautaDe(fo.id);
  const base = { cli: 'MOE', resp: 'MOE-ANA', prazo: '2026-11-20', area: 'Financeiro', origem: 'Captura rápida' };
  s.alvoPauta = top.id;
  const a1 = await s.novaAcao({ ...base, acao: 'Enviar o parecer' });
  s.alvoPauta = null;
  assert.deepEqual(top.eventos.map(e => [e.k, e.cod]), [['nova', a1.id]]);
  assert.equal(top.trat, 'Tratado');
  const a2 = await s.novaAcao({ ...base, acao: 'Ação fora da pauta' });
  const novo = s.pautaDe(fo.id)[1];
  assert.equal(novo.tipo, 'Ação');
  assert.equal(novo.reg, a2.id);
  assert.equal(novo.origem, 'Incluído no fórum');
  assert.equal(novo.ordem, 2);
});

test('incluir na pauta durante o fórum não repete o que já está nela', async () => {
  const { s, fo } = await emAndamento([{ tipo: 'Demanda', reg: 'MOE-QC-01' }]);
  await assert.rejects(s.incluirNaPauta(fo, { tipo: 'Demanda', reg: 'MOE-QC-01' }), /já está na pauta/);
  await assert.rejects(s.incluirNaPauta(fo, { tipo: 'Ação', reg: 'MOE-A002' }), /demanda desta ação já está na pauta/);
  const p = await s.incluirNaPauta(fo, { tipo: 'Tópico livre', assunto: 'Férias coletivas' });
  assert.equal(p.ordem, 2);
});

test('deliberação fica no item de onde foi registrada e gera ação no plano', async () => {
  const { be, s, fo } = await emAndamento([{ tipo: 'Demanda', reg: 'MOE-PD-01' }]);
  const [p] = s.pautaDe(fo.id);
  s.alvoPauta = p.id;
  const x = await s.registrarDeliberacao({ cli: 'MOE', texto: 'Ana envia o extrato', tipo: 'Encaminhamento', resp: 'MOE-ANA', dem: 'MOE-PD-01', prazo: '2026-11-10', gera: true });
  s.alvoPauta = null;
  assert.equal(be.db.GP_Deliberacoes[0].fields.ForumCodigo, fo.id);
  assert.equal(p.eventos.length, 1);
  assert.equal(p.eventos[0].k, 'delib');
  assert.equal(p.eventos[0].cod, x.acaoId);
  assert.equal(s.acao(x.acaoId).demanda, 'MOE-PD-01');
});

test('fora do fórum em andamento nada é anotado na pauta', async () => {
  const { s, fo } = await emAndamento([{ tipo: 'Ação', reg: 'MOE-A003' }]);
  s.forumAtivo = null;
  await s.concluir(s.acao('MOE-A003'));
  assert.equal(s.pautaDe(fo.id)[0].eventos.length, 0);
});

test('encerrar marca o que ficou sem tratamento e leva para o próximo fórum', async () => {
  const { be, s, fo } = await emAndamento([{ tipo: 'Demanda', reg: 'MOE-QC-01' }, { tipo: 'Ação', reg: 'MOE-A003' }, { tipo: 'Tópico livre', assunto: 'Informes' }]);
  await s.concluir(s.acao('MOE-A003'));
  const top = s.pautaDe(fo.id)[2];
  await s.marcarTratamento(top, 'Mantido');
  await s.encerrarForum(fo);
  assert.equal(be.db.GP_Foruns.find(f => f.fields.Title === fo.id).fields.Situacao, 'Realizado');
  assert.equal(s.pautaDe(fo.id)[0].trat, 'Não tratado');
  const nt = s.naoTratados('MOE');
  assert.deepEqual(nt.map(p => p.reg), ['MOE-QC-01']);
  // levado ao próximo fórum, sai da lista; se esse fórum for cancelado, volta
  const prox = await s.convocarForum({ ...CONV, data: '2026-11-12', itens: [{ tipo: 'Demanda', reg: 'MOE-QC-01', origem: 'Não tratado no fórum anterior', anterior: nt[0].id }] });
  assert.equal(s.pautaDe(prox.id)[0].origem, 'Não tratado no fórum anterior');
  assert.equal(s.naoTratados('MOE').length, 0);
  await s.cancelarForum(prox);
  assert.equal(s.naoTratados('MOE').length, 1);
});

test('ata sai dos desdobramentos da pauta', async () => {
  const { s, fo } = await emAndamento([{ tipo: 'Demanda', reg: 'MOE-QC-01' }, { tipo: 'Tópico livre', assunto: 'Informes' }]);
  await s.concluir(s.acao('MOE-A001'));
  await s.reprogramar(s.acao('MOE-A002'), '2026-12-15', 'aguardando o banco');
  await s.encerrarForum(fo);
  const t = s.ataDoForum(fo);
  assert.match(t, /^\*Fórum de Gestão \| Moendo \| 05\/11\/2026 às 09:30\*/);
  assert.match(t, /Local: Sede da Moendo/);
  assert.match(t, /Presentes: Guilherme/);
  assert.match(t, /Ausentes: Ana/);
  assert.match(t, /1\. Fluxo de caixa diário \| Tratado/);
  assert.match(t, /Concluída: Ação MOE-A001 \(Ana\)/);
  assert.match(t, /Novo prazo 15\/12 \(era 30\/11\): Ação MOE-A002 \(Ana\)\. Motivo: aguardando o banco/);
  assert.match(t, /2\. Informes \| Não tratado, volta na próxima pauta/);
  assert.match(t, /\*Próximos passos\*\n• Ação MOE-A002 \| \*Ana\* \| até 15\/12/);
  assert.doesNotMatch(t, /Contexto|Riscos/);
});

test('cancelar só fórum agendado; ata só depois de encerrar', async () => {
  const { s, fo } = await emAndamento([{ tipo: 'Demanda', reg: 'MOE-QC-01' }]);
  await assert.rejects(s.cancelarForum(fo), /agendado/);
  await assert.rejects(s.salvarAta(fo, 'x'), /encerrar/);
});
