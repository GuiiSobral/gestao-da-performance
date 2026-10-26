// Exportação de ações selecionadas para PDF e Excel.
// montarRelatorio() só lê o store e devolve dados prontos (testável no Node);
// baixarPdf() e baixarExcel() carregam as bibliotecas só quando alguém exporta.

const ACENTO = '#0E5D57', ACENTO_SUAVE = '#DAEDE9', TINTA = '#17201D', CINZA = '#56635E', LINHA = '#D6DEDA';
const COR_SIT = { bad: '#B42318', warn: '#B54708', good: '#0E5D57', ok: '#56635E', off: '#56635E' };

const dataBR = i => (i ? `${i.slice(8, 10)}/${i.slice(5, 7)}/${i.slice(0, 4)}` : '');
const dt = i => new Date(i + 'T12:00:00');
const addDias = (i, n) => { const d = dt(i); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const diasEntre = (a, b) => Math.round((dt(a) - dt(b)) / 86400000);
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Mesma régua da tela Ações, com o texto por extenso para quem lê fora do app.
export function situacaoExport(a, hoje) {
  if (a.status === 'Concluída') return { k: 'ok', o: 5, t: a.conclusao ? `Concluída em ${dataBR(a.conclusao)}` : 'Concluída' };
  if (a.status === 'Cancelada') return { k: 'off', o: 6, t: 'Cancelada' };
  if (!a.prazo) return { k: 'warn', o: 3, t: 'Sem prazo' };
  if (a.prazo < hoje) { const d = diasEntre(hoje, a.prazo); return { k: 'bad', o: 1, dias: d, t: `Vencida há ${plural(d, 'dia', 'dias')}` }; }
  if (a.prazo <= addDias(hoje, 7)) return { k: 'warn', o: 2, t: a.prazo === hoje ? 'Vence hoje' : 'Vence em até 7 dias' };
  return { k: 'good', o: 4, t: 'No prazo' };
}

function ordemUrgencia(x, y) {
  if (x.sit.o !== y.sit.o) return x.sit.o - y.sit.o;
  if (x.sit.o === 1) return y.sit.dias - x.sit.dias;
  return (x.prazo || '9999').localeCompare(y.prazo || '9999') || x.id.localeCompare(y.id, 'pt', { numeric: true });
}

function listaCurta(nomes, unid, unidPl) {
  if (nomes.length <= 3) return nomes.join(', ');
  return `${plural(nomes.length, unid, unidPl)}: ${nomes.slice(0, 3).join(', ')} e outros`;
}

/**
 * @param st     Store já carregado
 * @param ids    códigos das ações selecionadas
 * @param op     { hoje: 'aaaa-mm-dd', agora: Date, titulo, agrupar: ''|'resp'|'demanda', detalhes: bool }
 */
export function montarRelatorio(st, ids, op = {}) {
  const hoje = op.hoje, agora = op.agora || new Date();
  const linhas = ids.map(id => st.acao(id)).filter(Boolean).map(a => {
    const d = st.demanda(a.demanda), c = st.cliente(a.cli), p = a.resp ? st.pessoa(a.resp) : null;
    return {
      id: a.id, cli: a.cli, cliNome: c ? c.nome : a.cli,
      acao: a.acao, problema: a.problema || '', causa: a.causa || '', como: a.como || '',
      demandaId: a.demanda || '', demanda: d ? d.titulo : (a.demanda || ''), demandaTipo: d ? d.tipo : '',
      resp: a.resp || '', respNome: a.resp ? st.nome(a.resp) : 'Sem dono nominal', respSolve: !!(p && p.empresa === 'Solve'),
      apoio: a.apoio || '', area: a.area || '',
      inicio: a.inicio || '', prazoOriginal: a.prazoOriginal || '', prazo: a.prazo || '',
      reprog: (a.reprogramacoes || []).length, status: a.status, conclusao: a.conclusao || '',
      motivoCancel: a.motivoCancel || '', sit: situacaoExport(a, hoje)
    };
  });

  const agrupar = op.agrupar || '';
  const chave = l => (agrupar === 'resp' ? l.respNome : agrupar === 'demanda' ? `${l.cliNome} · ${l.demanda}` : '');
  linhas.sort((x, y) => (agrupar ? chave(x).localeCompare(chave(y), 'pt') : 0) || ordemUrgencia(x, y));
  const grupos = [];
  for (const l of linhas) {
    const k = chave(l), g = grupos[grupos.length - 1];
    if (g && g.titulo === k) g.linhas.push(l); else grupos.push({ titulo: k, linhas: [l] });
  }

  const clis = [...new Set(linhas.map(l => l.cli))];
  const nomesCli = clis.map(c => (st.cliente(c) || {}).nome || c);
  const resps = [...new Set(linhas.map(l => l.respNome))];
  const umCli = clis.length === 1, umResp = resps.length === 1;

  const n = s => linhas.filter(l => l.sit.o === s).length;
  const partes = [[n(1), 'vencida', 'vencidas'], [n(2), 'vence em até 7 dias', 'vencem em até 7 dias'], [n(3), 'sem prazo', 'sem prazo'],
    [n(4), 'no prazo', 'no prazo'], [n(5), 'concluída', 'concluídas'], [n(6), 'cancelada', 'canceladas']]
    .filter(([q]) => q).map(([q, s, p]) => plural(q, s, p));
  const resumo = `${plural(linhas.length, 'ação', 'ações')}${partes.length ? ': ' + partes.join(' · ') : ''}`;

  const emitido = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  const cab = [
    ['Cliente', umCli ? nomesCli[0] : listaCurta(nomesCli, 'cliente', 'clientes')],
    ['Responsável', umResp ? resps[0] : listaCurta(resps, 'responsável', 'responsáveis')],
    ['Emitido em', emitido],
    ['Emitido por', (st.user && (st.user.name || st.user.username)) || 'Solve']
  ];
  const titulo = (op.titulo || '').trim() || 'Plano de ação';
  const data = hoje || agora.toISOString().slice(0, 10);
  const arquivo = ['Acoes', umCli ? clis[0] : 'Carteira', umResp && resps[0] !== 'Sem dono nominal' ? slug(resps[0]) : '', data].filter(Boolean).join('_');

  return { titulo, cab, resumo, linhas, grupos, agrupar, detalhes: !!op.detalhes, multiCli: !umCli, umResp, arquivo, hoje: data };
}

/* ---------- PDF ---------- */
export async function baixarPdf(rel) {
  const doc = await gerarPdf(rel);
  doc.save(rel.arquivo + '.pdf');
}
export async function gerarPdf(rel) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 12;

  // Cabeçalho da primeira página
  doc.setFillColor(ACENTO); doc.rect(0, 0, W, 2.2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(ACENTO);
  doc.text('SOLVE GROUP  ·  GESTÃO DA PERFORMANCE', M, 10);
  doc.setFontSize(17); doc.setTextColor(TINTA);
  doc.text(rel.titulo, M, 18);
  let y = 25;
  const colW = (W - 2 * M) / 4;
  rel.cab.forEach(([k, v], i) => {
    const x = M + i * colW;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(CINZA);
    doc.text(k.toUpperCase(), x, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(TINTA);
    doc.text(doc.splitTextToSize(v, colW - 4).slice(0, 2), x, y + 4.6);
  });
  y += 12;
  doc.setDrawColor(LINHA); doc.setLineWidth(0.3); doc.line(M, y, W - M, y);
  y += 5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(TINTA);
  doc.text(rel.resumo, M, y);
  y += 4;

  // Tabela
  const cols = [
    ...(rel.multiCli ? [{ k: 'cli', t: 'Cliente', w: 16 }] : []),
    { k: 'id', t: 'Código', w: 24 },
    { k: 'acao', t: 'Ação (o quê)' },
    { k: 'demanda', t: 'Demanda', w: 58 },
    { k: 'resp', t: 'Responsável', w: 38 },
    { k: 'prazo', t: 'Prazo', w: 30 },
    { k: 'sit', t: 'Situação', w: 34 }
  ];
  const celula = (l, k) => {
    switch (k) {
      case 'cli': return l.cli;
      case 'acao': {
        let t = l.acao;
        if (rel.detalhes) {
          const pq = [l.problema, l.causa].filter(Boolean).join(' · ');
          if (pq) t += `\nPor quê: ${pq}`;
          if (l.como) t += `\nComo: ${l.como}`;
          if (l.status === 'Cancelada' && l.motivoCancel) t += `\nMotivo do cancelamento: ${l.motivoCancel}`;
        }
        return t;
      }
      case 'demanda': return l.demanda + (l.demandaTipo ? `\n${l.demandaTipo}` : '');
      case 'resp': return l.respNome + (l.respSolve ? ' (Solve)' : '') + (l.apoio ? `\nApoio: ${l.apoio}` : '');
      case 'prazo': return (dataBR(l.prazo) || '—') + (l.reprog ? `\nOriginal: ${dataBR(l.prazoOriginal)}\n${l.reprog}ª reprogramação` : '');
      case 'sit': return l.sit.t;
      default: return l[k] || '';
    }
  };
  const body = [];
  for (const g of rel.grupos) {
    if (rel.agrupar) body.push([{ content: `${g.titulo}  (${plural(g.linhas.length, 'ação', 'ações')})`, colSpan: cols.length,
      styles: { fillColor: ACENTO_SUAVE, textColor: ACENTO, fontStyle: 'bold', fontSize: 9 } }]);
    for (const l of g.linhas) body.push(cols.map(c => ({ content: celula(l, c.k), _l: l, _k: c.k })));
  }
  const columnStyles = {};
  cols.forEach((c, i) => { if (c.w) columnStyles[i] = { cellWidth: c.w }; });
  const iId = cols.findIndex(c => c.k === 'id'), iSit = cols.findIndex(c => c.k === 'sit');
  columnStyles[iId] = { ...columnStyles[iId], fontSize: 7.5, textColor: CINZA };

  autoTable(doc, {
    startY: y, head: [cols.map(c => c.t)], body, columnStyles,
    margin: { left: M, right: M, top: 16, bottom: 14 },
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8.5, textColor: TINTA, cellPadding: { top: 2, right: 2.2, bottom: 2, left: 2.2 }, valign: 'top', overflow: 'linebreak', lineColor: LINHA },
    headStyles: { fontStyle: 'bold', fontSize: 7.5, textColor: CINZA, fillColor: '#E9EEEB', lineWidth: { bottom: 0.3 } },
    bodyStyles: { lineWidth: { bottom: 0.2 } },
    showHead: 'everyPage', rowPageBreak: 'avoid',
    didParseCell: h => {
      if (h.section !== 'body' || !h.cell.raw || !h.cell.raw._l) return;
      if (h.column.index === iSit) { h.cell.styles.textColor = COR_SIT[h.cell.raw._l.sit.k]; h.cell.styles.fontStyle = 'bold'; }
    },
    didDrawPage: () => {
      const pg = doc.internal.getCurrentPageInfo().pageNumber;
      if (pg > 1) {
        doc.setFillColor(ACENTO); doc.rect(0, 0, W, 2.2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(CINZA);
        doc.text(`${rel.titulo}  ·  ${rel.cab[0][1]}`, M, 10);
      }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(CINZA);
      doc.text(`Gestão da Performance · Solve Group · emitido em ${rel.cab[2][1]} por ${rel.cab[3][1]}`, M, H - 7);
      doc.text(`Página ${pg} de {total}`, W - M, H - 7, { align: 'right' });
    }
  });
  if (typeof doc.putTotalPages === 'function') doc.putTotalPages('{total}');
  return doc;
}

/* ---------- Excel ---------- */
const dataXls = i => (i ? new Date(Date.UTC(+i.slice(0, 4), +i.slice(5, 7) - 1, +i.slice(8, 10))) : null);

export function planilha(rel) {
  const cols = [
    { t: 'Cliente', w: 22, v: l => l.cliNome },
    { t: 'Código', w: 15, v: l => l.id },
    { t: 'Ação (o quê)', w: 48, v: l => l.acao, wrap: true },
    { t: 'Por quê: problema', w: 30, v: l => l.problema, wrap: true },
    { t: 'Por quê: causa', w: 30, v: l => l.causa, wrap: true },
    { t: 'Como', w: 36, v: l => l.como, wrap: true },
    { t: 'Demanda', w: 36, v: l => l.demanda, wrap: true },
    { t: 'Tipo de demanda', w: 18, v: l => l.demandaTipo },
    { t: 'Responsável', w: 20, v: l => l.respNome },
    { t: 'Apoio', w: 18, v: l => l.apoio },
    { t: 'Área', w: 16, v: l => l.area },
    { t: 'Início', w: 11, d: l => l.inicio },
    { t: 'Prazo original', w: 13, d: l => l.prazoOriginal },
    { t: 'Prazo vigente', w: 13, d: l => l.prazo },
    { t: 'Reprogramações', w: 9, n: l => l.reprog },
    { t: 'Status', w: 14, v: l => l.status },
    { t: 'Situação', w: 22, v: l => l.sit.t, cor: l => COR_SIT[l.sit.k] },
    { t: 'Concluída em', w: 13, d: l => l.conclusao },
    { t: 'Motivo do cancelamento', w: 30, v: l => l.motivoCancel, wrap: true }
  ];
  const N = cols.length;
  const linhaCab = (k, v) => [{ value: k, fontWeight: 'bold', textColor: CINZA }, { value: v, columnSpan: 4 }, null, null, null];
  const rows = [
    [{ value: 'SOLVE GROUP · GESTÃO DA PERFORMANCE', fontWeight: 'bold', textColor: ACENTO, fontSize: 9, columnSpan: 5 }, null, null, null, null],
    [{ value: rel.titulo, fontWeight: 'bold', fontSize: 15, height: 22, columnSpan: 5 }, null, null, null, null],
    ...rel.cab.map(([k, v]) => linhaCab(k, v)),
    linhaCab('Resumo', rel.resumo),
    []
  ];
  const linhaTitulos = rows.length;
  rows.push(cols.map(c => ({ value: c.t, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: ACENTO, wrap: true, alignVertical: 'center', height: 30 })));
  for (const l of rel.linhas) {
    rows.push(cols.map(c => {
      const base = { alignVertical: 'top', bottomBorderColor: LINHA, bottomBorderStyle: 'thin' };
      if (c.d) { const v = dataXls(c.d(l)); return v ? { ...base, value: v, type: Date, format: 'dd/mm/yyyy' } : { ...base, value: null }; }
      if (c.n) return { ...base, value: c.n(l), type: Number };
      const v = c.v(l);
      const cell = { ...base, value: v || null, type: String, wrap: !!c.wrap };
      if (c.cor) { cell.textColor = c.cor(l); cell.fontWeight = 'bold'; }
      return cell;
    }));
  }
  return { rows, columns: cols.map(c => ({ width: c.w })), linhaTitulos, nCols: N };
}

// Filtro automático na linha de títulos (o write-excel-file não tem a opção pronta).
const filtroAuto = (ref) => ({
  files: { transform: { 'xl/worksheets/sheet{id}.xml': { transform: xml => xml.replace('</sheetData>', `</sheetData><autoFilter ref="${ref}"/>`) } } }
});
const letra = n => { let s = ''; for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };

export async function gerarExcel(rel) {
  const { default: writeExcelFile } = await import('write-excel-file/universal');
  const p = planilha(rel);
  const ref = `A${p.linhaTitulos + 1}:${letra(p.nCols - 1)}${p.rows.length}`;
  const opts = { sheet: 'Ações', columns: p.columns, stickyRowsCount: p.linhaTitulos + 1, orientation: 'landscape' };
  let blob;
  try {
    blob = await writeExcelFile(p.rows, opts, { fontFamily: 'Calibri', fontSize: 10, features: [filtroAuto(ref)] }).toBlob();
  } catch (e) {
    blob = await writeExcelFile(p.rows, opts, { fontFamily: 'Calibri', fontSize: 10 }).toBlob();
  }
  return blob;
}
export async function baixarExcel(rel) {
  const blob = await gerarExcel(rel);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = rel.arquivo + '.xlsx';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
