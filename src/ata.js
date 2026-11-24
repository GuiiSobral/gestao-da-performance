// Ata do fórum em PDF e Word.
// A fonte é o texto da ata (o mesmo que vai para o WhatsApp, com as edições feitas na tela):
// blocosDaAta() lê a marcação simples do texto e devolve blocos; gerarAtaPdf() e gerarAtaDocx() desenham esses blocos.
// Marcação: 1ª linha *em negrito* = título; linhas *em negrito* logo abaixo = subtítulo; "*Rótulo:* valor" = campo;
// *MAIÚSCULAS* = seção; *1. Texto* = assunto (a linha seguinte, se não for tópico, é a identificação);
// outra linha só *em negrito* = grupo (ex.: o responsável nos encaminhamentos); "• texto" = tópico; "   • texto" = subtópico.
// Atas antigas, em outro formato, também saem: o que não casa com a marcação vira parágrafo.

const FAIXA = '#0C1037', PESSEGO = '#F7AC70', ACENTO = '#2D368C', ACENTO_SUAVE = '#E5EBFD', TINTA = '#0D182D', CINZA = '#5A6475', LINHA = '#E2E6EE', FAIXA_TXT = '#BBC3DF';
const tiraNegrito = t => String(t).replace(/\*([^*\n]+)\*/g, '$1');
const soNegrito = l => /^\*[^*]+\*$/.test(l);
const maiusculas = t => t === t.toLocaleUpperCase('pt-BR') && /[A-ZÀ-Ý]/.test(t);

export function blocosDaAta(texto) {
  const linhas = String(texto || '').replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < linhas.length && !linhas[i].trim()) i++;
  if (i < linhas.length) {
    const l = linhas[i].trim();
    out.push({ t: 'titulo', txt: tiraNegrito(l) });
    i++;
    while (i < linhas.length && soNegrito(linhas[i].trim()) && !maiusculas(tiraNegrito(linhas[i].trim()))) { out.push({ t: 'subtitulo', txt: tiraNegrito(linhas[i].trim()) }); i++; }
  }
  let aposAssunto = false;
  for (; i < linhas.length; i++) {
    const cru = linhas[i], l = cru.trim();
    if (!l) { out.push({ t: 'espaco' }); continue; }
    let m;
    if ((m = l.match(/^\*([^*]{1,40}):\*\s*(.*)$/))) { out.push({ t: 'campo', rotulo: m[1], txt: tiraNegrito(m[2]) }); aposAssunto = false; continue; }
    if (soNegrito(l)) {
      const t = tiraNegrito(l);
      if (maiusculas(t)) out.push({ t: 'secao', txt: t });
      else if (/^\d+\.\s/.test(t)) { out.push({ t: 'assunto', txt: t }); aposAssunto = true; continue; }
      else out.push({ t: 'grupo', txt: t });
      aposAssunto = false; continue;
    }
    if ((m = cru.match(/^(\s*)[•\-–]\s+(.*)$/))) { out.push({ t: m[1].length >= 2 ? 'subtopico' : 'topico', txt: tiraNegrito(m[2]) }); aposAssunto = false; continue; }
    out.push({ t: aposAssunto ? 'ident' : 'paragrafo', txt: tiraNegrito(l) });
    aposAssunto = false;
  }
  // Espaços em branco viram só separação: tira os repetidos, os do começo e os do fim.
  return out.filter((b, k) => b.t !== 'espaco' || (k > 0 && out[k - 1].t !== 'espaco' && k < out.length - 1));
}

const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Nome do arquivo: Ata_<cliente>_<aaaa-mm-dd>.pdf
export function nomeArquivoAta(fo, cliNome) { return ['Ata', slug(cliNome || fo.cli), fo.data || ''].filter(Boolean).join('_'); }

/* ---------- PDF (A4 retrato, cores do guia Solve) ---------- */
function filete(doc, x, y, h) {
  const w = h * 0.45, k = h * 0.25;
  doc.setFillColor(PESSEGO);
  doc.lines([[w, 0], [k, -h], [-w, 0]], x, y, [1, 1], 'F', true);
}

export async function gerarAtaPdf(texto, meta = {}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 18, LW = W - 2 * M;
  const blocos = blocosDaAta(texto);
  const titulo = (blocos.find(b => b.t === 'titulo') || {}).txt || 'Ata do fórum';
  const sub = blocos.filter(b => b.t === 'subtitulo').map(b => b.txt).join(' · ');
  let y = 0;

  const faixa = primeira => {
    doc.setFillColor(FAIXA); doc.rect(0, 0, W, primeira ? 14 : 9, 'F');
    filete(doc, M, primeira ? 10 : 6.6, primeira ? 5 : 3.6);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(primeira ? 12 : 8); doc.setTextColor('#FFFFFF');
    doc.text('Solve', M + 5, primeira ? 9.6 : 6.2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(primeira ? 9 : 7.5); doc.setTextColor(FAIXA_TXT);
    doc.text(primeira ? 'Gestão da Performance' : `${titulo}${sub ? '  ·  ' + sub : ''}`, M + (primeira ? 18 : 14), primeira ? 9.6 : 6.2);
  };
  const novaPagina = () => { doc.addPage(); faixa(false); y = 18; };
  const cabe = h => { if (y + h > H - 16) novaPagina(); };
  const escreve = (txt, { tam = 10, peso = 'normal', cor = TINTA, x = M, larg = LW, antes = 0, depois = 0, entre = 1.38 } = {}) => {
    doc.setFont('helvetica', peso); doc.setFontSize(tam); doc.setTextColor(cor);
    const ls = doc.splitTextToSize(txt, larg), alt = tam * 0.3528 * entre;
    y += antes;
    for (const l of ls) { cabe(alt); doc.text(l, x, y + alt * 0.78); y += alt; }
    y += depois;
  };

  faixa(true);
  y = 24;
  escreve(titulo, { tam: 17, peso: 'bold' });
  if (sub) escreve(sub, { tam: 12, peso: 'bold', cor: ACENTO, antes: 0.5 });
  y += 3;

  const campos = blocos.filter(b => b.t === 'campo');
  const resto = blocos.filter(b => !['titulo', 'subtitulo', 'campo'].includes(b.t));
  if (campos.length) {
    const top = y, RW = 26;
    doc.setFillColor('#F4F7FB');
    // Mede antes para desenhar o fundo do quadro.
    doc.setFontSize(9.5);
    const alturas = campos.map(c => doc.splitTextToSize(c.txt, LW - RW - 8).length * 9.5 * 0.3528 * 1.38 + 1.6);
    const total = alturas.reduce((a, b) => a + b, 0) + 5;
    doc.roundedRect(M, top, LW, total, 1.5, 1.5, 'F');
    y = top + 2.5;
    campos.forEach(c => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(CINZA);
      doc.text(c.rotulo.toUpperCase(), M + 4, y + 3.3);
      escreve(c.txt, { tam: 9.5, x: M + 4 + RW, larg: LW - RW - 8, depois: 1.6 });
    });
    y = top + total + 4;
  }

  for (let k = 0; k < resto.length; k++) {
    const b = resto[k];
    switch (b.t) {
      case 'espaco': y += 1.5; break;
      case 'secao':
        cabe(16);
        y += 3;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(ACENTO);
        doc.text(b.txt, M, y + 3.4);
        y += 5.2;
        doc.setDrawColor(LINHA); doc.setLineWidth(0.35); doc.line(M, y, W - M, y);
        y += 2.5;
        break;
      case 'assunto': cabe(18); escreve(b.txt, { tam: 11, peso: 'bold', antes: 1.5, depois: 0.4 }); break;
      case 'grupo': cabe(12); escreve(b.txt, { tam: 10, peso: 'bold', cor: ACENTO, antes: 1, depois: 0.4 }); break;
      case 'ident': escreve(b.txt, { tam: 8.5, cor: CINZA, depois: 1 }); break;
      case 'topico': case 'subtopico': {
        const rec = b.t === 'topico' ? 2 : 7;
        doc.setFontSize(10);
        const alt = 10 * 0.3528 * 1.38;
        cabe(alt);
        doc.setFillColor(ACENTO); doc.circle(M + rec + 0.8, y + alt * 0.52, 0.55, 'F');
        escreve(b.txt, { x: M + rec + 4, larg: LW - rec - 4, depois: 0.9 });
        break;
      }
      default: escreve(b.txt, { depois: 1.2 });
    }
  }

  const n = doc.getNumberOfPages();
  const rodape = `Gestão da Performance · Solve Group${meta.codigo ? ' · ' + meta.codigo : ''}${meta.emitido ? ' · emitida em ' + meta.emitido : ''}`;
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(CINZA);
    doc.text(rodape, M, H - 8);
    doc.text(`Página ${p} de ${n}`, W - M, H - 8, { align: 'right' });
  }
  return doc;
}

/* ---------- Word (.docx) ---------- */
const hex = c => c.replace('#', '');
export async function gerarAtaDocx(texto, meta = {}) {
  const d = await import('docx');
  const { Document, Packer, Paragraph, TextRun, Footer, Header, PageNumber, AlignmentType, BorderStyle, LevelFormat, TabStopType, ShadingType } = d;
  const blocos = blocosDaAta(texto);
  const FONTE = 'Segoe UI';
  const run = (t, o = {}) => new TextRun({ text: t, font: FONTE, ...o });
  const titulo = (blocos.find(b => b.t === 'titulo') || {}).txt || 'Ata do fórum';
  const filhos = [];
  for (const b of blocos) {
    switch (b.t) {
      case 'titulo': filhos.push(new Paragraph({ spacing: { after: 40 }, children: [run(b.txt, { bold: true, size: 32, color: hex(TINTA) })] })); break;
      case 'subtitulo': filhos.push(new Paragraph({ spacing: { after: 200 }, children: [run(b.txt, { bold: true, size: 24, color: hex(ACENTO) })] })); break;
      case 'campo': filhos.push(new Paragraph({
        spacing: { after: 40 }, tabStops: [{ type: TabStopType.LEFT, position: 1500 }], indent: { left: 1500, hanging: 1500 },
        shading: { type: ShadingType.CLEAR, fill: 'F4F7FB', color: 'auto' },
        children: [run(b.rotulo.toUpperCase(), { bold: true, size: 15, color: hex(CINZA) }), run('\t' + b.txt, { size: 20, color: hex(TINTA) })]
      })); break;
      case 'secao': filhos.push(new Paragraph({
        keepNext: true, spacing: { before: 280, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: hex(LINHA), space: 4 } },
        children: [run(b.txt, { bold: true, size: 18, color: hex(ACENTO), characterSpacing: 10 })]
      })); break;
      case 'assunto': filhos.push(new Paragraph({ keepNext: true, spacing: { before: 200, after: 20 }, children: [run(b.txt, { bold: true, size: 22, color: hex(TINTA) })] })); break;
      case 'grupo': filhos.push(new Paragraph({ keepNext: true, spacing: { before: 160, after: 40 }, children: [run(b.txt, { bold: true, size: 20, color: hex(ACENTO) })] })); break;
      case 'ident': filhos.push(new Paragraph({ keepNext: true, spacing: { after: 80 }, children: [run(b.txt, { size: 17, color: hex(CINZA) })] })); break;
      case 'topico': filhos.push(new Paragraph({ numbering: { reference: 'topicos', level: 0 }, spacing: { after: 60 }, children: [run(b.txt, { size: 20, color: hex(TINTA) })] })); break;
      case 'subtopico': filhos.push(new Paragraph({ numbering: { reference: 'topicos', level: 1 }, spacing: { after: 60 }, children: [run(b.txt, { size: 20, color: hex(TINTA) })] })); break;
      case 'espaco': break;
      default: filhos.push(new Paragraph({ spacing: { after: 100 }, children: [run(b.txt, { size: 20, color: hex(TINTA) })] }));
    }
  }
  const rodape = `Gestão da Performance · Solve Group${meta.codigo ? ' · ' + meta.codigo : ''}${meta.emitido ? ' · emitida em ' + meta.emitido : ''}`;
  const doc = new Document({
    creator: 'Solve Group · Gestão da Performance', title: titulo,
    styles: { default: { document: { run: { font: FONTE, size: 20, color: hex(TINTA) } } } },
    numbering: { config: [{ reference: 'topicos', levels: [
      { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 260 } }, run: { color: hex(ACENTO) } } },
      { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 800, hanging: 260 } }, run: { color: hex(ACENTO) } } }
    ] }] },
    sections: [{
      properties: { page: { margin: { top: 1300, bottom: 1100, left: 1100, right: 1100 } } },
      headers: { default: new Header({ children: [new Paragraph({
        shading: { type: ShadingType.CLEAR, fill: hex(FAIXA), color: 'auto' }, spacing: { after: 0 },
        children: [run(' ▌', { bold: true, size: 20, color: hex(PESSEGO) }), run('Solve ', { bold: true, size: 20, color: 'FFFFFF' }), run(' Gestão da Performance', { size: 16, color: hex(FAIXA_TXT) })]
      })] }) },
      footers: { default: new Footer({ children: [new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
        children: [run(rodape, { size: 14, color: hex(CINZA) }), run('\tPágina ', { size: 14, color: hex(CINZA) }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONTE, size: 14, color: hex(CINZA) }), run(' de ', { size: 14, color: hex(CINZA) }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONTE, size: 14, color: hex(CINZA) })]
      })] }) },
      children: filhos
    }]
  });
  return Packer.toBlob(doc);
}

function baixarBlob(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export async function baixarAtaPdf(texto, meta, nome) { (await gerarAtaPdf(texto, meta)).save(nome + '.pdf'); }
export async function baixarAtaDocx(texto, meta, nome) { baixarBlob(await gerarAtaDocx(texto, meta), nome + '.docx'); }
