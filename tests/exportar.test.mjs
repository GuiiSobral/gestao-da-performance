// Exportação das ações marcadas: cabeçalho, resumo, ordem e arquivos gerados.
// Rodar com: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryBackend } from '../src/graph.js';
import { Store } from '../src/store.js';
import { montarRelatorio, gerarPdf, gerarExcel, planilha } from '../src/exportar.js';

const F = (id, fields) => ({ id, fields });
const D = d => d + 'T12:00:00Z';
const acao = (n, cli, dem, resp, prazo, status = 'Em andamento', extra = {}) => F(String(n), {
  Title: `${cli}-A${String(n).padStart(3, '0')}`, ClienteCodigo: cli, DemandaCodigo: dem, OQue: `Ação ${n}`, ResponsavelCodigo: resp,
  Prazo: prazo && D(prazo), PrazoOriginal: prazo && D(prazo), Status: status, ...extra });
export const fixture = () => ({
  GP_Clientes: [F('1', { Title: 'MOE', Nome: 'Moendo Construções' }), F('2', { Title: 'AZE', Nome: 'Azevedo Pescados' })],
  GP_Pessoas: [F('1', { Title: 'SOLVE-PEDRO', Nome: 'Pedro', Empresa: 'Solve', Nominal: true }),
    F('2', { Title: 'MOE-ANA', Nome: 'Ana', ClienteCodigo: 'MOE', Empresa: 'Cliente', Nominal: true }),
    F('3', { Title: 'AZE-TATI', Nome: 'Tatiane', ClienteCodigo: 'AZE', Empresa: 'Cliente', Nominal: true })],
  GP_Frentes: [],
  GP_Demandas: [F('1', { Title: 'MOE-PD-01', ClienteCodigo: 'MOE', Assunto: 'Fechamento de outubro', Tipo: 'Pendência', Encerrada: false }),
    F('2', { Title: 'AZE-QC-01', ClienteCodigo: 'AZE', Assunto: 'Caixa negativo', Tipo: 'Questão crítica', Encerrada: false })],
  GP_Acoes: [
    acao(1, 'MOE', 'MOE-PD-01', 'MOE-ANA', '2026-11-30', 'Não iniciada', { Problema: 'DRE atrasada', Como: 'Puxar extratos' }),
    acao(2, 'MOE', 'MOE-PD-01', 'MOE-ANA', '2026-10-10'),
    acao(3, 'MOE', 'MOE-PD-01', 'SOLVE-PEDRO', '2026-10-29'),
    acao(4, 'MOE', 'MOE-PD-01', 'MOE-ANA', null),
    acao(5, 'MOE', 'MOE-PD-01', 'MOE-ANA', '2026-10-01', 'Concluída', { DataConclusao: D('2026-10-05') }),
    acao(6, 'AZE', 'AZE-QC-01', 'AZE-TATI', '2026-10-20', 'Em andamento', { PrazoOriginal: D('2026-09-30') })
  ],
  GP_Reprogramacoes: [F('1', { Title: 'AZE-A006-R1', AcaoCodigo: 'AZE-A006', ClienteCodigo: 'AZE', PrazoAnterior: D('2026-09-30'), PrazoNovo: D('2026-10-20') })],
  GP_Foruns: [], GP_Deliberacoes: [], GP_Indicadores: [], GP_Medicoes: []
});
const HOJE = '2026-10-26', AGORA = new Date('2026-10-26T15:30:00-03:00');
async function store() { const s = new Store(new MemoryBackend(fixture()), { name: 'Guilherme Sobral' }); await s.load(); return s; }

test('um cliente e um responsável: cabeçalho nominal e nome do arquivo', async () => {
  const st = await store();
  const r = montarRelatorio(st, ['MOE-A001', 'MOE-A002', 'MOE-A004'], { hoje: HOJE, agora: AGORA });
  const cab = Object.fromEntries(r.cab);
  assert.equal(cab.Cliente, 'Moendo Construções');
  assert.equal(cab['Responsável'], 'Ana');
  assert.equal(cab['Emitido por'], 'Guilherme Sobral');
  assert.match(cab['Emitido em'], /26\/10\/2026/);
  assert.equal(r.arquivo, 'Acoes_MOE_Ana_2026-10-26');
  assert.equal(r.titulo, 'Plano de ação');
  // vencida primeiro, depois sem prazo, depois no prazo
  assert.deepEqual(r.linhas.map(l => l.id), ['MOE-A002', 'MOE-A004', 'MOE-A001']);
  assert.equal(r.resumo, '3 ações: 1 vencida · 1 sem prazo · 1 no prazo');
  assert.equal(r.linhas[0].sit.t, 'Vencida há 16 dias');
});

test('vários clientes e responsáveis: cabeçalho resume e agrupa por responsável', async () => {
  const st = await store();
  const r = montarRelatorio(st, ['MOE-A001', 'MOE-A003', 'MOE-A005', 'AZE-A006'], { hoje: HOJE, agora: AGORA, agrupar: 'resp', titulo: 'Cobrança da semana' });
  const cab = Object.fromEntries(r.cab);
  assert.equal(cab.Cliente, 'Moendo Construções, Azevedo Pescados');
  assert.equal(cab['Responsável'], 'Ana, Pedro, Tatiane');
  assert.equal(r.multiCli, true);
  assert.equal(r.arquivo, 'Acoes_Carteira_2026-10-26');
  assert.deepEqual(r.grupos.map(g => [g.titulo, g.linhas.length]), [['Ana', 2], ['Pedro', 1], ['Tatiane', 1]]);
  const aze = r.linhas.find(l => l.id === 'AZE-A006');
  assert.equal(aze.reprog, 1);
  assert.equal(aze.prazoOriginal, '2026-09-30');
  assert.equal(r.linhas.find(l => l.id === 'MOE-A005').sit.t, 'Concluída em 05/10/2026');
  assert.equal(r.linhas.find(l => l.id === 'MOE-A003').sit.t, 'Vence em até 7 dias');
});

test('código que não existe mais é ignorado', async () => {
  const st = await store();
  const r = montarRelatorio(st, ['MOE-A001', 'MOE-A999'], { hoje: HOJE, agora: AGORA });
  assert.equal(r.linhas.length, 1);
});

test('PDF e Excel são gerados', async () => {
  const st = await store();
  const r = montarRelatorio(st, ['MOE-A001', 'MOE-A002', 'MOE-A003', 'MOE-A004', 'MOE-A005', 'AZE-A006'], { hoje: HOJE, agora: AGORA, agrupar: 'demanda', detalhes: true });
  const doc = await gerarPdf(r);
  const pdf = Buffer.from(doc.output('arraybuffer'));
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  const p = planilha(r);
  assert.equal(p.rows[p.linhaTitulos][1].value, 'Código');
  assert.equal(p.rows.length, p.linhaTitulos + 1 + 6);
  const xlsx = Buffer.from(await (await gerarExcel(r)).arrayBuffer());
  assert.equal(xlsx.subarray(0, 2).toString(), 'PK');
  if (process.env.GP_EXPORT_DIR) {
    const fs = await import('node:fs');
    fs.writeFileSync(`${process.env.GP_EXPORT_DIR}/${r.arquivo}.pdf`, pdf);
    fs.writeFileSync(`${process.env.GP_EXPORT_DIR}/${r.arquivo}.xlsx`, xlsx);
  }
});
