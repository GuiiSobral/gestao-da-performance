// Interface da Gestão da Performance (mesmas telas do protótipo aprovado), lendo e gravando nas Listas do SharePoint.
import { AREAS, hojeISO, lerLinha, TIPOS_COMP, TIPOS_DEM, REPETICOES, TOPICO, normTxt } from './store.js';
import { aplicarTema, temaHtml } from './theme.js';

let st = null;          // Store
let ctx = {};           // { logout, listUrl }
let HOJE = hojeISO();
let LIM7 = null;          // definido a cada render (HOJE + 7 dias)

const S = {
  cli: null, fa: { q: '', sit: 'abertas', resp: '', area: '', tipo: '' }, fd: { tipo: 'todas', st: 'abertas' },
  demOpen: new Set(), fo: {}, conv: null, incl: null, pessoaSemana: null, drawer: null, modal: null, busy: false, reloading: false,
  opener: null, ataDirty: false, fc: { p: '', cli: '', ver: 'pendentes' },
  todos: false, semCli: ''   // todos: Ações e Demandas de todos os clientes; semCli: cliente filtrado em Minha semana
};

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = i => (i ? i.slice(8, 10) + '/' + i.slice(5, 7) + (i.slice(0, 4) !== HOJE.slice(0, 4) ? '/' + i.slice(2, 4) : '') : '—');
const fmtF = i => (i ? fmt(i) + '/' + i.slice(0, 4) : '—');
const dt = i => new Date(i + 'T12:00:00');
function addDays(i, n) { const d = dt(i); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
const diff = (a, b) => Math.round((dt(a) - dt(b)) / 86400000);
const plural = (n, s, p) => (n === 1 ? s : p);
const aberta = a => a.status === 'Em andamento' || a.status === 'Não iniciada';
const FAROL = { bad: 'Farol vermelho', warn: 'Farol amarelo', good: 'Farol verde', off: 'Encerrada' };
const SEV = { bad: 0, warn: 1, good: 2, off: 3 };
const store = () => st;
const cliNome = code => { const c = st.cliente(code); return c ? c.nome : code; };
const acoesC = cli => st.acoes.filter(a => a.cli === cli);
const demandasC = cli => st.demandas.filter(d => d.cli === cli);
const frentesC = cli => st.frentes.filter(f => f.cli === cli);
const clientesOrd = () => st.clientes.filter(c => !c.interno).sort((a, b) => st.temDados(b.id) - st.temDados(a.id) || a.nome.localeCompare(b.nome));
// Compromissos aceitam também a própria Solve (cliente interno), que fica fora da Carteira.
const clientesComp = () => st.clientes.filter(c => c.situacao !== 'Encerrado').sort((a, b) => (b.interno - a.interno) || a.nome.localeCompare(b.nome));
// Ações e Demandas aceitam "Todos os clientes": os clientes da carteira (fora o interno e os encerrados).
const COM_TODOS = ['acoes', 'demandas'];
const naCarteira = cli => { const c = st.cliente(cli); return !!c && !c.interno && c.situacao !== 'Encerrado'; };
const todosAtivo = () => S.todos && COM_TODOS.includes(route());
const acoesEsc = () => (todosAtivo() ? st.acoes.filter(a => naCarteira(a.cli)) : acoesC(S.cli));
const demandasEsc = () => (todosAtivo() ? st.demandas.filter(d => naCarteira(d.cli)) : demandasC(S.cli));
// Código do cliente como atalho: clicar filtra a tela atual por esse cliente.
const tagCli = cli => `<button type="button" class="tag tagbtn${st.interno(cli) ? ' solve' : ''}" data-fcli="${esc(cli)}" title="Mostrar só ${esc(cliNome(cli))}">${esc(cli)}</button>`;
const DSEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const solveFez = a => a.status === 'Cancelada' && /mesmo fez/i.test(`${a.como} ${a.motivoCancel}`);

function situacao(a) {
  if (a.status === 'Concluída') return { k: 'ok', t: 'Concluída', o: 5 };
  if (a.status === 'Cancelada') return { k: 'off', t: 'Cancelada', o: 6 };
  if (!a.prazo) return { k: 'warn', t: 'Sem prazo', o: 3, line: true };
  if (a.prazo < HOJE) { const d = diff(HOJE, a.prazo); return { k: 'bad', t: `Vencida há ${d} d`, o: 1, dias: d }; }
  if (a.prazo <= LIM7) return { k: 'warn', t: `Vence ${fmt(a.prazo)}`, o: 2 };
  return { k: 'good', t: `No prazo · ${fmt(a.prazo)}`, o: 4 };
}
const pill = s => `<span class="pill ${s.k}${s.line ? ' line' : ''}">${esc(s.t)}</span>`;
const SHAPE = {
  bad: '<circle cx="6" cy="6" r="5.2"/>',
  warn: '<path d="M6 .8 11.4 10.9H.6Z"/>',
  good: '<circle cx="6" cy="6" r="5.2"/><path d="M3.4 6.2 5.3 8l3.3-3.6" fill="none" style="stroke:var(--surface)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  off: '<circle cx="6" cy="6" r="4.4" fill="none" stroke="currentColor" stroke-width="1.6"/>'
};
const dot = (k, t) => `<svg class="dot ${k}" viewBox="0 0 12 12" width="12" height="12" role="img" aria-label="${esc(t || FAROL[k] || '')}"><title>${esc(t || FAROL[k] || '')}</title>${SHAPE[k] || SHAPE.off}</svg>`;

function respHtml(code, apoio) {
  if (!code) return '<span class="tag bad">sem dono nominal</span>';
  const p = st.pessoa(code);
  let h = esc(st.nome(code));
  if (p && !p.nominal) h += ' <span class="tag bad">sem dono nominal</span>';
  else if (p && p.empresa === 'Solve') h += ' <span class="tag solve">Solve</span>';
  if (apoio) h += `<span class="sub">apoio: ${esc(apoio)}</span>`;
  return h;
}

function M(list) {
  const ab = list.filter(aberta);
  return {
    total: list.length, ab: ab.length,
    venc: ab.filter(a => a.prazo && a.prazo < HOJE).length,
    v7: ab.filter(a => a.prazo && a.prazo >= HOJE && a.prazo <= LIM7).length,
    semp: ab.filter(a => !a.prazo).length,
    conc: list.filter(a => a.status === 'Concluída').length,
    canc: list.filter(a => a.status === 'Cancelada').length,
    semDono: ab.filter(a => !st.nominal(a.resp)).length,
    repVenc: ab.filter(a => a.reprogramacoes.length && a.prazo && a.prazo < HOJE).length
  };
}

function infoDem(d) {
  const ac = st.acoesDe(d.id), ab = ac.filter(aberta);
  const venc = ab.filter(a => a.prazo && a.prazo < HOJE).length;
  const semp = ab.filter(a => !a.prazo).length;
  const v7 = ab.filter(a => a.prazo && a.prazo >= HOJE && a.prazo <= LIM7).length;
  const conc = ac.filter(a => a.status === 'Concluída').length;
  let status;
  if (d.encerrada) status = ac.some(a => a.status === 'Concluída') ? 'Concluída' : 'Cancelada';
  else if (ab.length) status = 'Em andamento';
  else if (ac.length) status = 'Validar encerramento';
  else status = 'Sem plano de ação';
  const validar = status === 'Validar encerramento';
  const farol = status === 'Sem plano de ação' ? 'bad' : venc ? 'bad' : (semp || v7 || validar) ? 'warn' : ab.length ? 'good' : 'off';
  return { ac, ab, venc, semp, v7, conc, status, farol, validar, aberta: !d.encerrada };
}

function infoFr(f) {
  const dems = st.demandas.filter(d => d.frente === f.id);
  const ac = dems.flatMap(d => st.acoesDe(d.id)), ab = ac.filter(aberta);
  const val = ac.filter(a => a.status !== 'Cancelada'), conc = ac.filter(a => a.status === 'Concluída').length;
  const prog = val.length ? Math.round(conc * 100 / val.length) : 0;
  const status = f.encerrada ? 'Concluída' : ab.length ? 'Em andamento' : 'Sem plano ativo';
  const atrasada = status === 'Em andamento' && f.fim && f.fim < HOJE;
  const venc = ab.filter(a => a.prazo && a.prazo < HOJE).length;
  const farol = status === 'Sem plano ativo' ? 'bad' : status === 'Concluída' ? 'off' : (atrasada || venc) ? 'bad' : ab.some(a => !a.prazo) ? 'warn' : 'good';
  return { dems, ac, ab, prog, status, atrasada, venc, farol, conc, val: val.length };
}

function sortAcoes(list) {
  return list.slice().sort((a, b) => {
    const sa = situacao(a), sb = situacao(b);
    if (sa.o !== sb.o) return sa.o - sb.o;
    if (sa.o === 1) return sb.dias - sa.dias;
    return (a.prazo || '9999').localeCompare(b.prazo || '9999') || a.id.localeCompare(b.id, 'pt', { numeric: true });
  });
}

let toastT, toastUndo = null, buscaT;
// Aviso de sucesso (some sozinho; com "Desfazer" fica 6 s) e alerta de erro (fica até a pessoa fechar).
function toast(msg, erro, undo) {
  if (erro) {
    const a = $('#alert');
    $('#alertMsg').textContent = msg; a.hidden = false;
    return;
  }
  const t = $('#toast'), b = $('#toastAct');
  $('#toastMsg').textContent = msg; t.hidden = false;
  toastUndo = undo || null; b.hidden = !undo;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; toastUndo = null; }, undo ? 6000 : 2800);
}
function fecharToast() { clearTimeout(toastT); $('#toast').hidden = true; toastUndo = null; }
async function copiar(text, el) {
  try { await navigator.clipboard.writeText(text); toast('Texto copiado'); }
  catch (e) { if (el) { el.focus(); el.select(); } toast('Selecionei o texto: use Ctrl+C para copiar'); }
}

/* ---------- casca ---------- */
const ROUTES = {
  carteira: { t: 'Carteira', r: renderCarteira, global: true },
  visao: { t: 'Visão geral', r: renderVisao },
  demandas: { t: 'Demandas', r: renderDemandas },
  acoes: { t: 'Ações', r: renderAcoes },
  forum: { t: 'Fórum de gestão', r: renderForum },
  semana: { t: 'Minha semana', r: renderSemana, global: true },
  agenda: { t: 'Compromissos', r: renderAgenda, global: true }
};
// Endereço = tela + filtros (ex.: #acoes?cli=MOE&sit=vencidas). O Voltar do navegador funciona e o link pode ser enviado.
const parseHash = () => {
  const h = (location.hash || '').replace(/^#/, ''), i = h.indexOf('?');
  const r = i < 0 ? h : h.slice(0, i);
  return { r: ROUTES[r] ? r : 'visao', p: new URLSearchParams(i < 0 ? '' : h.slice(i + 1)) };
};
const route = () => parseHash().r;
const FA0 = { q: '', sit: 'abertas', resp: '', area: '', tipo: '' }, FD0 = { tipo: 'todas', st: 'abertas' };
function hashDe(r) {
  const p = new URLSearchParams();
  if (!ROUTES[r].global && S.cli) p.set('cli', S.todos && COM_TODOS.includes(r) ? 'todos' : S.cli);
  if (r === 'acoes') for (const k of Object.keys(FA0)) { if (S.fa[k] && S.fa[k] !== FA0[k]) p.set(k, S.fa[k]); }
  if (r === 'demandas') { if (S.fd.tipo !== FD0.tipo) p.set('tipo', S.fd.tipo); if (S.fd.st !== FD0.st) p.set('st', S.fd.st); }
  if (r === 'forum' && (S.fo.novo || S.fo.id)) { p.set('f', S.fo.novo ? 'novo' : S.fo.id); if (S.fo.editar) p.set('e', '1'); }
  if (r === 'semana' && S.pessoaSemana) p.set('p', S.pessoaSemana);
  if (r === 'semana' && S.semCli) p.set('c', S.semCli);
  if (r === 'agenda') { if (S.fc.p) p.set('p', S.fc.p); if (S.fc.cli) p.set('c', S.fc.cli); if (S.fc.ver !== 'pendentes') p.set('ver', S.fc.ver); }
  const q = p.toString();
  return '#' + r + (q ? '?' + q : '');
}
function lerHash() {
  const { r, p } = parseHash();
  const c = p.get('cli');
  if (c && c !== 'todos') S.cli = c;
  if (COM_TODOS.includes(r)) S.todos = c === 'todos';
  if (r === 'acoes') S.fa = Object.fromEntries(Object.keys(FA0).map(k => [k, p.get(k) || FA0[k]]));
  if (r === 'demandas') S.fd = { tipo: p.get('tipo') || FD0.tipo, st: p.get('st') || FD0.st };
  if (r === 'forum') { const f = p.get('f'); S.fo = !f ? {} : f === 'novo' ? { novo: true } : { id: f, editar: p.get('e') === '1' }; }
  if (r === 'semana' && p.get('p')) S.pessoaSemana = p.get('p');
  if (r === 'semana') S.semCli = p.get('c') || '';
  if (r === 'agenda') S.fc = { p: p.get('p') || '', cli: p.get('c') || '', ver: p.get('ver') || 'pendentes' };
}
// Atualiza o endereço sem criar uma entrada nova no histórico (usado ao mexer em filtros).
function syncHash() { const h = hashDe(route()); if (location.hash !== h) history.replaceState(null, '', h); }

function shell() {
  $('#root').innerHTML = `
  <div class="app">
    <aside class="rail">
      <div class="brand"><b>Gestão da Performance</b><span>Solve Group</span></div>
      <nav class="nav" id="nav" aria-label="Seções">
        <a href="#carteira" data-r="carteira">Carteira</a>
        <div class="grp label" id="grpCli">Cliente</div>
        <label class="clisel" id="cliWrap"><span class="sr">Cliente</span><select id="selCli"></select></label>
        <a href="#visao" data-r="visao">Visão geral</a>
        <a href="#demandas" data-r="demandas">Demandas</a>
        <a href="#acoes" data-r="acoes">Ações <span class="cnt" id="cntAb"></span></a>
        <a href="#forum" data-r="forum">Fórum</a>
        <div class="grp label">Pessoas</div>
        <a href="#semana" data-r="semana">Minha semana</a>
        <a href="#agenda" data-r="agenda">Compromissos <span class="cnt" id="cntComp"></span></a>
      </nav>
      <div class="railnote" id="railnote"></div>
    </aside>
    <main>
      <div class="top">
        <div class="ttl"><div class="label" id="eyebrow"></div><h1 id="ttl"></h1></div>
        <div class="chips"><details class="acct" id="acct"><summary class="btn">Conta</summary><div class="acct-menu" id="acctMenu"></div></details><button class="btn" data-do="recarregar" id="btnSync" title="Ler de novo as listas do SharePoint">Atualizar</button><button class="btn" data-do="novoComp" title="Compromisso pontual ou de rotina: um passo só, com data">+ Compromisso</button><button class="btn primary" data-do="capturar">+ Nova ação</button></div>
      </div>
      <div id="view" class="view"></div>
    </main>
  </div>`;
}

function render() {
  HOJE = hojeISO(); LIM7 = addDays(HOJE, 7);
  const r = route(), R = ROUTES[r];
  const comDados = st.clientes.filter(c => !c.interno && st.temDados(c.id));
  if (!S.cli || !st.cliente(S.cli) || st.interno(S.cli)) S.cli = (comDados[0] || st.clientes[0] || {}).id || null;
  const sel = $('#selCli');
  const tod = todosAtivo();
  sel.innerHTML = (COM_TODOS.includes(r) ? `<option value="todos"${tod ? ' selected' : ''}>Todos os clientes</option>` : '') + clientesOrd().map(c => `<option value="${esc(c.id)}"${!tod && c.id === S.cli ? ' selected' : ''}>${esc(c.nome)}${st.temDados(c.id) ? '' : ' (a migrar)'}</option>`).join('');
  $('#cliWrap').hidden = !!R.global; $('#grpCli').hidden = !!R.global; sel.disabled = !!R.global;
  $('#eyebrow').textContent = R.global ? 'Solve Group' : tod ? 'Todos os clientes' : cliNome(S.cli);
  $('#ttl').textContent = R.t;
  document.querySelectorAll('#nav a').forEach(a => { if (a.dataset.r === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#cntAb').textContent = S.cli ? M(acoesEsc()).ab : '';
  const eu = st.eu();
  const urg = eu ? st.compromissos.filter(c => c.resp === eu.id && c.status === 'Pendente' && c.data && c.data <= HOJE).length : 0;
  $('#cntComp').textContent = urg || '';
  const hora = st.loadedAt ? st.loadedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
  const conta = suf => `<b>${esc(st.user.name || '')}</b>${eu ? '' : '<span class="small">sem cadastro em Pessoas</span>'}
    <span>Dados do SharePoint lidos às ${hora}</span>
    <span class="label">Tema</span>${temaHtml(suf)}
    <span class="row-actions">${ctx.listUrl ? `<a class="btn sm ghost" href="${esc(ctx.listUrl)}" target="_blank" rel="noopener">Listas no SharePoint</a>` : ''}${ctx.logout ? '<button class="btn sm ghost" data-do="sair">Sair</button>' : ''}</span>`;
  $('#railnote').innerHTML = conta('rail');
  $('#acctMenu').innerHTML = conta('menu');
  const focused = document.activeElement && document.activeElement.id;
  const pos = focused === 'fq' ? document.activeElement.selectionStart : null;
  st.forumAtivo = null;   // só a tela do fórum em andamento liga o registro de desdobramentos
  $('#view').innerHTML = R.r();
  syncHash();
  if (focused === 'fq') { const i = $('#fq'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }
  renderLayer();
}
function go(r) { const h = hashDe(r); if (location.hash === h) render(); else location.hash = h.slice(1); }

/* ---------- Carteira ---------- */
function renderCarteira() {
  const cart = clientesOrd().filter(c => c.situacao !== 'Encerrado');
  const todas = st.acoes.filter(a => cart.some(c => c.id === a.cli));
  const mt = M(todas);
  const rows = cart.map(c => {
    if (!st.temDados(c.id)) return `<tr class="dim"><td><span class="sem" aria-hidden="true"><i></i><i></i><i></i></span></td>
      <td><b>${esc(c.nome)}</b><span class="sub mono">${esc(c.arquivo || 'Planilha ainda não mapeada')}</span></td><td colspan="5"><span class="pill ok line">Aguardando migração</span></td></tr>`;
    const m = M(acoesC(c.id));
    const sp = semPlano(c.id).length;
    const fr = m.venc || sp ? 'bad' : (m.semp || m.v7) ? 'warn' : 'good';
    return `<tr class="click" data-cli-go="${esc(c.id)}"><td><span class="sem" role="img" aria-label="${FAROL[fr]}"><i class="${fr === 'bad' ? 'on bad' : ''}"></i><i class="${fr === 'warn' ? 'on warn' : ''}"></i><i class="${fr === 'good' ? 'on good' : ''}"></i></span></td>
      <td><button class="linkbtn" data-cli-go="${esc(c.id)}">${esc(c.nome)}</button><span class="sub">${c.consultor ? 'Consultor: ' + esc(st.nome(c.consultor)) : 'Sem consultor definido'}${c.supervisor ? ' · supervisão: ' + esc(st.nome(c.supervisor)) : ''}</span></td>
      <td class="num">${m.ab}</td><td class="num" style="color:var(--bad);font-weight:600">${m.venc}</td><td class="num">${m.semp}</td><td class="num">${m.semDono}</td><td class="num">${sp}</td></tr>`;
  }).join('');
  const exc = cart.filter(c => st.temDados(c.id)).flatMap(c => excecoes(c.id).map(e => ({ ...e, cli: c.id })));
  return `
  <div class="strip static s4">
    <div><span class="v">${cart.length}</span><span class="k">Clientes na carteira</span></div>
    <div><span class="v">${cart.filter(c => st.temDados(c.id)).length}<span class="muted" style="font-size:1rem"> / ${cart.length}</span></span><span class="k">Na nova base</span></div>
    <div><span class="v">${mt.ab}</span><span class="k">Ações abertas</span></div>
    <div class="bad"><span class="v">${mt.venc}</span><span class="k">Vencidas</span></div>
  </div>
  <p class="small muted" style="margin:-10px 0 0">Para ver as ações de um cliente, clique no nome dele na tabela.</p>
  <div class="tablewrap"><table>
    <thead><tr><th style="width:1%">Farol</th><th>Cliente</th><th>Abertas</th><th>Vencidas</th><th>Sem prazo</th><th>Sem dono nominal</th><th>Sem plano</th></tr></thead>
    <tbody>${rows}</tbody></table></div>
  <section class="panel">
    <header><h2>Exceções que pedem decisão</h2><span class="small muted">gestão por exceção: só o que saiu da regra</span></header>
    ${exc.length ? `<div class="list">${exc.map(e => `<div class="li">${dot(e.k, FAROL[e.k])}<div class="body"><button class="linkbtn" data-cli-set="${esc(e.cli)}" ${e.attr}>${esc(e.t)}</button><div class="meta">${esc(cliNome(e.cli))} · ${esc(e.m)}</div></div></div>`).join('')}</div>` : '<div class="empty">Nenhuma exceção na carteira.</div>'}
  </section>`;
}
function semPlano(cli) {
  return [...demandasC(cli).filter(d => infoDem(d).status === 'Sem plano de ação'), ...frentesC(cli).filter(f => infoFr(f).status === 'Sem plano ativo')];
}
function excecoes(cli) {
  const out = [];
  const ab = acoesC(cli).filter(aberta);
  const velhas = ab.filter(a => a.prazo && diff(HOJE, a.prazo) > 90);
  if (velhas.length) out.push({ k: 'bad', t: `${velhas.length} ${plural(velhas.length, 'ação vencida', 'ações vencidas')} há mais de 90 dias`, m: velhas.map(a => a.acao).slice(0, 3).join(' · '), attr: 'data-sig="vencidas"' });
  const rep = ab.filter(a => a.reprogramacoes.length && a.prazo && a.prazo < HOJE);
  if (rep.length) out.push({ k: 'bad', t: `${rep.length} ${plural(rep.length, 'ação reprogramada venceu', 'ações reprogramadas venceram')} de novo`, m: 'levar ao fórum', attr: 'data-sig="repact"' });
  demandasC(cli).filter(d => infoDem(d).status === 'Sem plano de ação').forEach(d => out.push({ k: 'bad', t: `Sem plano de ação: ${d.titulo}`, m: d.resp ? 'responsável ' + st.nome(d.resp) : 'sem dono nominal', attr: `data-dem-go="${esc(d.id)}"` }));
  frentesC(cli).filter(f => infoFr(f).status === 'Sem plano ativo').forEach(f => out.push({ k: 'bad', t: `Frente sem plano ativo: ${f.nome}`, m: f.nota || 'nenhuma ação aberta', attr: 'data-go="visao"' }));
  const val = demandasC(cli).filter(d => infoDem(d).validar);
  if (val.length) out.push({ k: 'warn', t: `${val.length} ${plural(val.length, 'demanda com todas as ações fechadas', 'demandas com todas as ações fechadas')}`, m: 'validar o encerramento', attr: 'data-go="demandas" data-fd="validar"' });
  const sd = ab.filter(a => !st.nominal(a.resp));
  if (sd.length) out.push({ k: 'warn', t: `${sd.length} ${plural(sd.length, 'ação aberta', 'ações abertas')} sem dono nominal`, m: 'responsável registrado como empresa ou setor', attr: 'data-sig="semdono"' });
  return out;
}

function semDados() {
  const c = st.cliente(S.cli);
  return `<div class="empty"><b>${esc(c ? c.nome : 'Cliente')}</b> ainda não foi migrado para a nova base.${c && c.arquivo ? `<br><span class="small mono">${esc(c.arquivo)}</span>` : ''}<br><br><span class="row-actions" style="justify-content:center"><button class="btn primary" data-do="capturar">+ Registrar a primeira ação</button><button class="btn" data-do="novaFrente">+ Nova frente</button></span></div>`;
}

/* ---------- Visão geral ---------- */
function renderVisao() {
  if (!S.cli) return '<div class="empty">Nenhum cliente cadastrado em GP_Clientes.</div>';
  if (!st.temDados(S.cli)) return semDados();
  const lista = acoesC(S.cli), m = M(lista);
  const ab = lista.filter(aberta), venc = ab.filter(a => a.prazo && a.prazo < HOJE);
  const faixas = [['1 a 30 dias', 1, 30], ['31 a 60 dias', 31, 60], ['61 a 90 dias', 61, 90], ['mais de 90 dias', 91, 1e9]]
    .map(([n, a, b]) => [n, venc.filter(x => { const d = diff(HOJE, x.prazo); return d >= a && d <= b; }).length]);
  const fmax = Math.max(1, ...faixas.map(f => f[1]));
  const carga = {};
  ab.forEach(a => { const k = a.resp || '—'; carga[k] = carga[k] || { t: 0, v: 0 }; carga[k].t++; if (a.prazo && a.prazo < HOJE) carga[k].v++; });
  const cg = Object.entries(carga).sort((x, y) => y[1].t - x[1].t || y[1].v - x[1].v).slice(0, 8);
  const cmax = Math.max(1, ...cg.map(c => c[1].t));
  const qcs = demandasC(S.cli).filter(d => d.tipo === 'Questão crítica').map(d => ({ d, i: infoDem(d) })).filter(x => x.i.aberta)
    .sort((a, b) => (a.d.prioridade || 99) - (b.d.prioridade || 99) || SEV[a.i.farol] - SEV[b.i.farol]);
  const frs = frentesC(S.cli).map(f => ({ f, i: infoFr(f) })).sort((a, b) => SEV[a.i.farol] - SEV[b.i.farol] || a.f.id.localeCompare(b.f.id, 'pt', { numeric: true }));
  const sp = semPlano(S.cli).length, nval = demandasC(S.cli).filter(d => infoDem(d).validar).length, pf = lista.filter(solveFez).length;
  return `
  <div><p class="lede">${m.ab ? `<em>${m.venc}</em> das ${m.ab} ações abertas estão vencidas.` : 'Nenhuma ação aberta.'}</p>
  <p class="lede-sub">O atraso é calculado pelo prazo de cada ação, nunca digitado. Clique em qualquer número para ver as ações.</p></div>
  <div class="strip">
    <button data-sig="abertas"><span class="v">${m.ab}</span><span class="k">Abertas</span></button>
    <button class="bad" data-sig="vencidas"><span class="v">${m.venc}</span><span class="k">Vencidas</span></button>
    <button class="warn" data-sig="v7"><span class="v">${m.v7}</span><span class="k">Vencem em 7 dias</span></button>
    <button class="warn" data-sig="semprazo"><span class="v">${m.semp}</span><span class="k">Sem prazo</span></button>
    <button class="${m.semDono ? 'warn' : ''}" data-sig="semdono"><span class="v">${m.semDono}</span><span class="k">Sem dono nominal</span></button>
    <button data-sig="concluidas"><span class="v">${m.conc}</span><span class="k">Concluídas</span></button>
  </div>
  <div class="grid2">
    <section class="panel"><header><h2>Há quanto tempo as ações estão vencidas</h2><span class="small muted">${m.venc} ${plural(m.venc, 'vencida', 'vencidas')}</span></header>
      <div class="bars">${faixas.map(([n, v]) => `<div class="bar"><span class="nm">${n}</span><span class="track"><span class="fill" style="width:${v / fmax * 100}%"></span></span><span class="n">${v}</span></div>`).join('')}</div>
    </section>
    <section class="panel"><header><h2>Carga por responsável</h2><span class="small muted">ações abertas</span></header>
      ${cg.length ? `<div class="bars">${cg.map(([n, c]) => `<div class="bar"><button class="linkbtn nm" data-resp="${esc(n)}">${esc(st.nome(n))}</button><span class="track"><span class="fill" style="width:${c.v / cmax * 100}%"></span><span class="fill rest" style="width:${(c.t - c.v) / cmax * 100}%"></span></span><span class="n">${c.t}</span></div>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--bad)"></i>vencidas</span><span><i style="background:var(--off);opacity:.55"></i>no prazo ou sem prazo</span></div>` : '<div class="empty small">Nenhuma ação aberta.</div>'}
    </section>
  </div>
  <div class="grid3">
    <section class="panel"><header><h2>Questões críticas</h2><span class="small muted">por prioridade definida no fórum</span></header>
      ${qcs.length ? `<div class="list">${qcs.map(({ d, i }) => `<div class="li">${dot(i.farol, FAROL[i.farol])}<div class="body">
        <button class="linkbtn" data-dem-go="${esc(d.id)}">${d.prioridade ? `<span class="prio">P${d.prioridade}</span> ` : ''}${esc(d.titulo)}</button>
        <div class="meta"><span>${d.resp ? esc(st.nome(d.resp)) : 'sem dono nominal'}</span><span>${i.ab.length} ${plural(i.ab.length, 'ação aberta', 'ações abertas')}</span>${i.venc ? `<span style="color:var(--bad)">${i.venc} ${plural(i.venc, 'vencida', 'vencidas')}</span>` : ''}${i.status === 'Sem plano de ação' ? '<span class="pill bad">sem plano de ação</span>' : ''}${i.validar ? '<span class="pill acc">validar encerramento</span>' : ''}</div></div></div>`).join('')}</div>` : '<div class="empty small">Nenhuma questão crítica aberta.</div>'}
    </section>
    <div class="stack">
      <section class="panel"><header><h2>Sinais de gestão</h2></header>
        <div class="signals">
          <button class="signal" data-sig="repact"><b style="color:var(--bad)">${m.repVenc}</b><span>${plural(m.repVenc, 'ação reprogramada venceu de novo', 'ações reprogramadas venceram de novo')}</span></button>
          ${pf ? `<button class="signal" data-sig="solvefez"><b>${pf}</b><span>${plural(pf, 'ação cancelada porque', 'ações canceladas porque')} a Solve executou a tarefa do cliente</span></button>` : ''}
          <button class="signal" data-go="demandas" data-fd="semplano"><b style="color:var(--bad)">${sp}</b><span>demandas e frentes sem plano de ação ativo</span></button>
          <button class="signal" data-go="demandas" data-fd="validar"><b>${nval}</b><span>${plural(nval, 'demanda com todas as ações fechadas, para validar o encerramento', 'demandas com todas as ações fechadas, para validar o encerramento')}</span></button>
        </div>
      </section>
      ${indicadoresPanel()}
    </div>
  </div>
  <section class="stack"><header class="sechead"><h2>Frentes (projetos estratégicos)</h2><span class="row-actions"><span class="small muted">avanço = ações concluídas sobre ações não canceladas</span><button class="btn sm" data-do="novaFrente">+ Nova frente</button></span></header>
  ${frs.length ? `<div class="tablewrap"><table>
    <thead><tr><th style="width:1%"></th><th>Frente</th><th>Dono</th><th>Fim</th><th>Avanço</th><th>Status</th><th><span class="sr-only">Ações</span></th></tr></thead>
    <tbody>${frs.map(({ f, i }) => `<tr><td>${dot(i.farol, FAROL[i.farol])}</td><td><b>${esc(f.nome)}</b><span class="sub">${esc(f.area)}${f.nota ? ' · ' + esc(f.nota) : ''}</span></td>
      <td class="c-nw">${respHtml(f.dono)}</td><td class="num c-nw">${f.fim ? fmt(f.fim) : '—'}</td>
      <td><div class="prog"><span class="t"><span class="f" style="width:${i.prog}%"></span></span><span class="n">${i.ac.length ? i.prog + '%' : '—'}</span></div><span class="sub">${i.conc} de ${i.val} ações</span></td>
      <td class="c-nw">${i.status === 'Em andamento' && i.atrasada ? '<span class="pill bad">Atrasada</span>' : i.status === 'Sem plano ativo' ? '<span class="pill bad line">Sem plano ativo</span>' : i.status === 'Concluída' ? '<span class="pill ok">Concluída</span>' : '<span class="pill good">Em andamento</span>'}</td>
      <td class="c-nw"><span class="row-actions" style="flex-wrap:nowrap;justify-content:flex-end">${f.encerrada ? '' : i.dems.some(d => !d.encerrada) ? `<button class="btn sm ghost" data-do="capturar" data-dem-pre="${esc(i.dems.find(d => !d.encerrada).id)}" aria-label="Nova ação na frente ${esc(f.nome)}">+ Ação</button>` : ''}<button class="btn sm ghost" data-do="novaEntrega" data-fr="${esc(f.id)}" aria-label="Nova entrega na frente ${esc(f.nome)}">+ Entrega</button></span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty small">Nenhuma frente cadastrada para este cliente.</div>'}</section>`;
}

function indicadoresPanel() {
  const inds = st.indicadores.filter(x => x.cli === S.cli);
  if (!inds.length) return '';
  const ult = id => st.medicoes.filter(m => m.indicador === id).sort((a, b) => (b.mes || '').localeCompare(a.mes || ''))[0];
  const temMed = inds.some(x => ult(x.id));
  const fr = x => {
    if (x.situacao === 'Cancelado') return ['off', 'cancelado'];
    const m = ult(x.id);
    if (!m || m.meta === null || m.realizado === null) return ['warn', 'sem meta e realizado'];
    const ok = x.polaridade === 'Menor é melhor' ? m.realizado <= m.meta : m.realizado >= m.meta;
    return [ok ? 'good' : 'bad', `${fmt(m.mes).slice(3)}: ${m.realizado} / meta ${m.meta}`];
  };
  return `<section class="panel"><header><h2>Indicadores</h2><span class="small muted">meta x realizado</span></header>
    <div class="kv" style="margin-bottom:10px">${inds.map(x => { const [k, t] = fr(x); return `<span title="${esc(t)}">${dot(k, t)} ${esc(x.area || x.nome)}</span>`; }).join('')}</div>
    ${temMed ? '' : '<div class="empty small">Nenhuma medição lançada ainda. Com meta e realizado por mês, cada indicador fora da meta vira uma demanda.</div>'}
  </section>`;
}

/* ---------- Demandas ---------- */
function renderDemandas() {
  const todos = todosAtivo();
  if (!todos && !st.temDados(S.cli)) return semDados();
  const f = S.fd;
  let list = demandasEsc().map(d => ({ d, i: infoDem(d) }));
  if (f.tipo !== 'todas') list = list.filter(x => x.d.tipo === f.tipo);
  if (f.st === 'abertas') list = list.filter(x => x.i.aberta);
  if (f.st === 'semplano') list = list.filter(x => x.i.status === 'Sem plano de ação');
  if (f.st === 'validar') list = list.filter(x => x.i.validar);
  if (f.st === 'encerradas') list = list.filter(x => !x.i.aberta);
  list.sort((a, b) => SEV[a.i.farol] - SEV[b.i.farol] || (a.d.prioridade || 99) - (b.d.prioridade || 99) || b.i.venc - a.i.venc || a.d.titulo.localeCompare(b.d.titulo));
  const tipos = [...new Set(demandasEsc().map(d => d.tipo))];
  const nCli = new Set(list.map(x => x.d.cli)).size;
  const seg = (k, v, opts) => `<div class="seg" role="group">${opts.map(([val, lab]) => `<button data-fd-${k}="${esc(val)}" aria-pressed="${v === val}">${lab}</button>`).join('')}</div>`;
  return `
  <p class="lede-sub" style="margin:0">Uma demanda é o que entra na gestão: pendência, questão crítica, entrega de uma frente, deliberação ou desvio de indicador. O status dela vem das ações; o encerramento é confirmado aqui.</p>
  <div class="toolbar">
    ${filtroCliHtml()}
    ${seg('tipo', f.tipo, [['todas', 'Todas'], ...['Questão crítica', 'Pendência', 'Entrega de frente', 'Deliberação do fórum', 'Desvio de indicador'].filter(t => tipos.includes(t)).map(t => [t, t === 'Questão crítica' ? 'Questões críticas' : t === 'Pendência' ? 'Pendências' : t === 'Entrega de frente' ? 'Entregas de frente' : t])])}
    ${seg('st', f.st, [['abertas', 'Abertas'], ['semplano', 'Sem plano'], ['validar', 'Validar encerramento'], ['encerradas', 'Encerradas'], ['todas', 'Todas']])}
    <span class="small muted">${list.length} ${plural(list.length, 'demanda', 'demandas')}${todos ? ` de ${nCli} ${plural(nCli, 'cliente', 'clientes')}` : ''}</span>
  </div>
  <div class="tablewrap" style="overflow:visible">${list.length ? list.map(({ d, i }) => demRow(d, i, todos)).join('') : '<div class="empty" style="margin:16px">Nenhuma demanda com esses filtros.</div>'}</div>`;
}
function demRow(d, i, comCli) {
  const open = S.demOpen.has(d.id);
  const fr = d.frente ? st.frente(d.frente) : null;
  const naoCanc = i.ac.length - i.ac.filter(a => a.status === 'Cancelada').length;
  const stPill = i.status === 'Sem plano de ação' ? '<span class="pill bad">Sem plano de ação</span>'
    : i.status === 'Em andamento' ? '<span class="pill good">Em andamento</span>'
    : i.validar ? '<span class="pill acc">Validar encerramento</span>'
    : `<span class="pill ${i.status === 'Cancelada' ? 'off' : 'ok'}">${i.status}</span>`;
  const notas = [d.statusOriginal ? `No arquivo de origem: ${d.statusOriginal}` : '', ...String(d.nota || '').split('\n')].filter(Boolean);
  return `<div class="dem" id="dem-${esc(d.id)}">
    <button data-dem="${esc(d.id)}" aria-expanded="${open}">${dot(i.farol, FAROL[i.farol])}
      <span style="min-width:0"><span class="t">${d.prioridade ? `<span class="prio">P${d.prioridade}</span> ` : ''}${esc(d.titulo)}</span>
        <span class="m">${comCli ? `<span class="tag${st.interno(d.cli) ? ' solve' : ''}" title="${esc(cliNome(d.cli))}">${esc(d.cli)}</span>` : ''}<span class="tag">${esc(d.tipo)}</span>${fr ? `<span>${esc(fr.nome)}</span>` : ''}<span>${d.resp ? esc(st.nome(d.resp)) : '<b style="color:var(--bad)">sem dono nominal</b>'}</span>
        ${i.ac.length ? `<span>${i.conc}/${naoCanc} concluídas</span>` : ''}${i.venc ? `<span style="color:var(--bad);font-weight:600">${i.venc} ${plural(i.venc, 'vencida', 'vencidas')}</span>` : ''}${i.semp ? `<span style="color:var(--warn)">${i.semp} sem prazo</span>` : ''}
        ${d.nota ? '<span class="pill warn">nota da migração</span>' : ''}</span></span>
      <span class="r">${stPill}</span>
    </button>
    ${open ? `<div class="open">
      ${notas.length ? `<div class="note"><b>O que a migração encontrou</b><ul>${notas.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      <div class="small muted"><span class="mono">${esc(d.id)}</span>${d.origem ? ' · origem: ' + esc(d.origem) : ''}${d.prazo ? ` · prazo da demanda: ${fmt(d.prazo)}` : ''}${d.encerrada && d.dataEnc ? ` · ${i.status === 'Cancelada' ? 'cancelada' : 'encerrada'} em ${fmtF(d.dataEnc)}` : ''}</div>
      ${i.ac.length ? `<div style="overflow-x:auto"><table class="mini"><tbody>${sortAcoes(i.ac).map(a => `<tr data-acao="${esc(a.id)}"><td class="c-id">${esc(a.id)}</td><td><button class="linkbtn plain" data-acao="${esc(a.id)}">${esc(a.acao)}</button></td><td class="c-nw">${esc(st.nome(a.resp) || '—')}</td><td class="c-nw">${pill(situacao(a))}</td></tr>`).join('')}</tbody></table></div>` : ''}
      <div class="row-actions">${i.aberta ? `<button class="btn sm" data-do="capturar" data-dem-pre="${esc(d.id)}">+ ${i.ac.length ? 'Nova ação nesta demanda' : 'Criar a primeira ação'}</button><button class="btn sm" data-do="respDem" data-id="${esc(d.id)}">Trocar responsável</button>` : ''}<button class="btn sm ghost" data-do="editDem" data-id="${esc(d.id)}">Editar</button>
        ${i.validar ? `<button class="btn sm primary" data-do="encerrarDem" data-id="${esc(d.id)}">Confirmar encerramento</button>` : ''}
        ${i.status === 'Sem plano de ação' ? `<button class="btn sm danger ghost" data-do="cancDem" data-id="${esc(d.id)}">Cancelar demanda</button>` : ''}</div>
    </div>` : ''}
  </div>`;
}

/* ---------- seletor de cliente nas barras de filtro ---------- */
// Ações e Demandas: mesmo valor do seletor lateral, com "Todos os clientes".
function filtroCliHtml() {
  const cs = clientesOrd().filter(c => naCarteira(c.id) && st.temDados(c.id));
  if (S.cli && !cs.some(c => c.id === S.cli) && st.cliente(S.cli)) cs.unshift(st.cliente(S.cli));
  const v = todosAtivo() ? 'todos' : S.cli;
  return `<select id="fcli" aria-label="Cliente"><option value="todos"${v === 'todos' ? ' selected' : ''}>Todos os clientes</option>${cs.map(c => `<option value="${esc(c.id)}"${c.id === v ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}</select>`;
}
function escolherCliente(v) {
  if (v === 'todos') { S.todos = true; }
  else { S.todos = false; S.cli = v; try { localStorage.setItem('gp.cli', S.cli); } catch (x) { /* sem storage */ } }
  S.demOpen.clear(); S.fo = {};
}
// Atalho da tag: filtra a tela atual pelo cliente da tag.
function filtrarPelaTag(cli) {
  const r = route();
  if (r === 'agenda') S.fc.cli = cli;
  else if (r === 'semana') S.semCli = cli;
  else if (COM_TODOS.includes(r)) escolherCliente(cli);
  else return;
  render();
  const f = $(r === 'agenda' ? '#cCliF' : r === 'semana' ? '#fsCli' : '#fcli'); if (f) f.focus();
}

/* ---------- Ações ---------- */
const SIT = [['abertas', 'Abertas'], ['vencidas', 'Vencidas'], ['v7', 'Vencem em 7 dias'], ['semprazo', 'Sem prazo'], ['semdono', 'Sem dono nominal'], ['repact', 'Reprogramadas e vencidas'], ['solvefez', 'Canceladas: Solve executou'], ['concluidas', 'Concluídas'], ['canceladas', 'Canceladas'], ['todas', 'Todas']];
function filtraAcoes() {
  const f = S.fa, q = f.q.trim().toLowerCase();
  return sortAcoes(acoesEsc().filter(a => {
    const s = situacao(a);
    switch (f.sit) {
      case 'abertas': if (!aberta(a)) return false; break;
      case 'vencidas': if (s.o !== 1) return false; break;
      case 'v7': if (s.o !== 2) return false; break;
      case 'semprazo': if (!(aberta(a) && !a.prazo)) return false; break;
      case 'semdono': if (!(aberta(a) && !st.nominal(a.resp))) return false; break;
      case 'repact': if (!(aberta(a) && a.reprogramacoes.length && a.prazo && a.prazo < HOJE)) return false; break;
      case 'solvefez': if (!solveFez(a)) return false; break;
      case 'concluidas': if (a.status !== 'Concluída') return false; break;
      case 'canceladas': if (a.status !== 'Cancelada') return false; break;
      default: break;
    }
    if (f.resp && a.resp !== f.resp) return false;
    if (f.area && a.area !== f.area) return false;
    const d = st.demanda(a.demanda);
    if (f.tipo && (!d || d.tipo !== f.tipo)) return false;
    if (q && !`${a.acao} ${d ? d.titulo : ''} ${a.id} ${st.nome(a.resp)} ${a.como} ${cliNome(a.cli)}`.toLowerCase().includes(q)) return false;
    return true;
  }));
}
function renderAcoes() {
  const todos = todosAtivo();
  if (!todos && !st.temDados(S.cli)) return semDados();
  const f = S.fa, list = filtraAcoes(), lista = acoesEsc();
  const resps = [...new Set(lista.map(a => a.resp).filter(Boolean))].sort((a, b) => st.nome(a).localeCompare(st.nome(b)));
  const areas = [...new Set(lista.map(a => a.area).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const tipos = [...new Set(demandasEsc().map(d => d.tipo))];
  const nCli = new Set(list.map(a => a.cli)).size;
  const opt = (v, cur, lab) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(lab)}</option>`;
  return `
  <div class="toolbar">
    <input type="search" id="fq" placeholder="Buscar ação, demanda, código ou pessoa" value="${esc(f.q)}" aria-label="Buscar">
    ${filtroCliHtml()}
    <select id="fsit" aria-label="Situação">${SIT.map(([v, l]) => opt(v, f.sit, l)).join('')}</select>
    <select id="fresp" aria-label="Responsável">${opt('', f.resp, 'Todos os responsáveis')}${resps.map(r => opt(r, f.resp, st.nome(r))).join('')}</select>
    <select id="farea" aria-label="Área">${opt('', f.area, 'Todas as áreas')}${areas.map(r => opt(r, f.area, r)).join('')}</select>
    <select id="ftipo" aria-label="Tipo de demanda">${opt('', f.tipo, 'Todos os tipos')}${tipos.map(r => opt(r, f.tipo, r)).join('')}</select>
  </div>
  <div class="small muted">${list.length} ${plural(list.length, 'ação', 'ações')}${todos ? ` de ${nCli} ${plural(nCli, 'cliente', 'clientes')} · números somados da carteira` : ''} · ordenadas pela urgência: vencidas primeiro, pelo maior atraso</div>
  <div class="tablewrap"><table class="cards">
    <thead><tr><th>Código</th><th>Ação</th><th>Demanda</th><th>Responsável</th><th>Prazo</th><th>Situação</th></tr></thead>
    <tbody>${list.length ? list.map(a => { const d = st.demanda(a.demanda); return `<tr class="click" data-acao="${esc(a.id)}">
      <td class="c-id" data-l="Código">${esc(a.id)}</td>
      <td class="c-main" style="min-width:240px">${todos ? tagCli(a.cli) + ' ' : ''}<button class="linkbtn plain" data-acao="${esc(a.id)}">${esc(a.acao)}</button>${a.reprogramacoes.length ? `<span class="sub">${a.reprogramacoes.length}ª reprogramação · prazo original ${fmt(a.prazoOriginal)}</span>` : ''}</td>
      <td data-l="Demanda" style="min-width:180px">${esc(d ? d.titulo : a.demanda)}<span class="sub">${esc(d ? d.tipo : '')}</span></td>
      <td class="c-nw" data-l="Responsável">${respHtml(a.resp)}</td>
      <td class="num c-nw" data-l="Prazo">${fmt(a.prazo)}</td>
      <td class="c-nw" data-l="Situação">${pill(situacao(a))}</td></tr>`; }).join('') : '<tr class="noc"><td colspan="6"><div class="empty">Nenhuma ação com esses filtros.</div></td></tr>'}</tbody></table></div>`;
}

/* ---------- Fórum ---------- */
// O fórum nasce de uma convocação (data, horário, local, convocados e pauta escolhida à mão) e passa por
// Agendado → Em andamento → Realizado, ou Cancelado. A ata sai do que foi feito em cada item da pauta.
const SIT_PILL = { Agendado: 'acc', 'Em andamento': 'warn', Realizado: 'good', Cancelado: 'off' };
const TRAT_PILL = { Concluído: 'good', Encerrado: 'good', Repactuado: 'warn', Cancelado: 'ok', Mantido: 'ok', Tratado: 'acc', 'Não tratado': 'bad' };
const tratPill = t => (t ? `<span class="pill ${TRAT_PILL[t] || 'ok'}">${esc(t)}</span>` : '<span class="pill warn line">a tratar</span>');
const sitPill = s => `<span class="pill ${SIT_PILL[s] || 'ok'}">${esc(s)}</span>`;
const quandoFo = f => `${fmtF(f.data)}${f.hora ? ' às ' + esc(f.hora) : ''}`;
const nomes = codes => codes.map(c => esc(st.nome(c))).join(', ');
const ORIGEM_TAG = { 'Não tratado no fórum anterior': 'não tratado antes', 'Incluído no fórum': 'incluído no fórum' };
function tipoTag(i) {
  if (i.tipo === TOPICO) return '<span class="tag">Tópico</span>';
  if (i.tipo === 'Ação') return '<span class="tag">Ação</span>';
  const d = st.demanda(i.reg);
  const t = d ? d.tipo : 'Demanda';
  return `<span class="tag">${esc(t === 'Questão crítica' ? 'QC' : t === 'Entrega de frente' ? 'Entrega' : t)}</span>`;
}
function tituloRasc(i) {
  if (i.tipo === 'Demanda') { const d = st.demanda(i.reg); return d ? d.titulo : i.assunto || i.reg; }
  if (i.tipo === 'Ação') { const a = st.acao(i.reg); return a ? a.acao : i.assunto || i.reg; }
  return i.assunto;
}

function renderForum() {
  if (!st.temDados(S.cli)) return semDados();
  if (st.faltando && st.faltando.includes('GP_Pauta')) return '<div class="empty">A lista GP_Pauta ainda não foi criada no SharePoint. Sem ela não dá para convocar fóruns.</div>';
  if (S.fo.novo || S.fo.editar) return renderConvocacao();
  const fo = S.fo.id ? st.forum(S.fo.id) : null;
  if (fo && fo.cli === S.cli) return renderForumDetalhe(fo);
  return renderForunsLista();
}

function foLinha(f) {
  const n = st.pautaDe(f.id).length;
  return `<div class="li">${sitPill(f.situacao)}<div class="body"><button class="linkbtn" data-fo="${esc(f.id)}">${quandoFo(f)}</button>
    <div class="meta">${f.local ? `<span>${esc(f.local)}</span>` : ''}${f.antigo ? '<span>fórum anterior à convocação</span>' : `<span>${n} ${plural(n, 'item', 'itens')} na pauta</span><span>${f.convocados.length} ${plural(f.convocados.length, 'convocado', 'convocados')}</span>`}
    ${f.situacao === 'Realizado' ? (f.ata ? '<span class="pill good line">ata salva</span>' : '<span class="pill warn line">ata não salva</span>') : ''}<span class="mono">${esc(f.id)}</span></div></div></div>`;
}
function renderForunsLista() {
  const fs = st.forunsDe(S.cli);
  const and = fs.filter(f => f.situacao === 'Em andamento');
  const ag = fs.filter(f => f.situacao === 'Agendado').sort((a, b) => (a.data || '').localeCompare(b.data || '') || (a.hora || '').localeCompare(b.hora || ''));
  const re = fs.filter(f => f.situacao === 'Realizado'), ca = fs.filter(f => f.situacao === 'Cancelado');
  const nt = st.naoTratados(S.cli);
  const sec = (t, l, vazio) => `<section class="panel"><header><h2>${t}</h2><span class="small muted">${l.length}</span></header>${l.length ? `<div class="list">${l.map(foLinha).join('')}</div>` : `<div class="empty small">${vazio}</div>`}</section>`;
  return `<div class="sechead"><p class="lede-sub" style="margin:0">O fórum nasce de uma convocação: data, horário, local, participantes e pauta. A ata sai do que for feito em cada item da pauta durante a reunião.</p>
    <button class="btn primary" data-do="novoForum">+ Novo fórum</button></div>
    ${nt.length ? `<div class="note">${nt.length} ${plural(nt.length, 'item ficou', 'itens ficaram')} sem tratamento no último fórum e ${plural(nt.length, 'entra', 'entram')} na pauta do próximo: ${nt.map(p => esc(st.tituloItem(p))).slice(0, 4).join('; ')}${nt.length > 4 ? '…' : ''}</div>` : ''}
    ${and.length ? sec('Em andamento', and, '') : ''}
    ${sec('Agendados', ag, 'Nenhum fórum agendado. Use “+ Novo fórum” para convocar.')}
    ${sec('Realizados', re, 'Nenhum fórum realizado ainda.')}
    ${ca.length ? `<details class="panel"><summary class="label" style="cursor:pointer">Cancelados (${ca.length})</summary><div class="list" style="margin-top:8px">${ca.map(foLinha).join('')}</div></details>` : ''}`;
}

/* --- convocação: novo fórum e edição --- */
function novoRascunho(fo) {
  const base = { q: '', ft: 'todas', fr: '', abertos: [], sug: null, err: '', dirty: false };
  if (fo) return { ...base, cli: fo.cli, editId: fo.id, data: fo.data || '', hora: fo.hora || '', local: fo.local || '', conv: [...fo.convocados],
    itens: st.pautaDe(fo.id).map(p => ({ tipo: p.tipo, reg: p.reg, assunto: p.assunto, resp: p.resp, origem: p.origem, anterior: p.anterior })) };
  // Os itens que ficaram sem tratamento no fórum anterior já entram na pauta; quem convoca pode tirar.
  const nt = st.naoTratados(S.cli).map(p => ({ tipo: p.tipo, reg: p.reg, assunto: p.assunto, resp: p.resp, origem: 'Não tratado no fórum anterior', anterior: p.id }));
  return { ...base, cli: S.cli, editId: null, data: '', hora: '', local: '', conv: [], itens: st.normalizarPauta(nt).itens };
}
function selDe(itens) {
  return { dems: new Set(itens.filter(i => i.tipo === 'Demanda').map(i => i.reg)), acs: new Set(itens.filter(i => i.tipo === 'Ação').map(i => i.reg)) };
}
const GRUPOS = [['Questão crítica', 'Questões críticas'], ['Pendência', 'Pendências'], ['Entrega de frente', 'Entregas de frente'], ['*', 'Outras demandas']];
// Lista dos registros do cliente para a pauta: cada demanda aberta com as ações abertas dela embaixo.
// Pendência é um tipo de demanda: aparece uma vez só, no grupo dela. Marcar a demanda inclui as ações dela;
// a ação só pode ser marcada sozinha quando a demanda não está na pauta.
function pickerHtml(cli, f, sel, modo, exceto) {
  const q = normTxt(f.q), bate = s => !q || normTxt(s).includes(q);
  const dems = demandasC(cli).filter(d => !d.encerrada);
  const grupos = GRUPOS.map(([tipo, nome]) => {
    const l = dems.filter(d => (tipo === '*' ? !['Questão crítica', 'Pendência', 'Entrega de frente'].includes(d.tipo) : d.tipo === tipo))
      .filter(() => f.ft === 'todas' || f.ft === tipo)
      .map(d => ({ d, i: infoDem(d) }))
      .filter(({ d, i }) => !f.fr || d.resp === f.fr || i.ab.some(a => a.resp === f.fr))
      .filter(({ d, i }) => bate(d.titulo + ' ' + d.id) || i.ab.some(a => bate(a.acao + ' ' + a.id)))
      .sort((a, b) => (a.d.prioridade || 99) - (b.d.prioridade || 99) || a.d.titulo.localeCompare(b.d.titulo));
    return { nome, l };
  }).filter(g => g.l.length);
  if (!grupos.length) return '<div class="empty small">Nenhum registro aberto com esses filtros.</div>';
  const linhaDem = ({ d, i }) => {
    const naPauta = sel.dems.has(d.id);
    const ab = sortAcoes(i.ab);
    const nAc = ab.filter(a => sel.acs.has(a.id)).length;
    const outro = st.emOutraPauta(cli, 'Demanda', d.id, exceto);
    const aberto = f.abertos.includes(d.id) || (q && ab.some(a => bate(a.acao + ' ' + a.id)) && !bate(d.titulo + ' ' + d.id));
    const status = i.status === 'Sem plano de ação' ? '<span class="pill bad">sem plano</span>' : i.validar ? '<span class="pill acc">validar encerramento</span>' : `<span>${ab.length} ${plural(ab.length, 'ação aberta', 'ações abertas')}${i.venc ? `, ${i.venc} ${plural(i.venc, 'vencida', 'vencidas')}` : ''}</span>`;
    const meta = `<span class="meta"><span class="mono">${esc(d.id)}</span>${status}<span>${d.resp ? esc(st.nome(d.resp)) : 'sem dono nominal'}</span>${!naPauta && nAc ? `<span class="pill acc line">${nAc} ${plural(nAc, 'ação', 'ações')} na pauta</span>` : ''}${outro ? `<span class="pill ok line">também na pauta de ${fmt(outro.data)}</span>` : ''}</span>`;
    const ctrl = modo === 'check'
      ? `<label class="pk-row"><input type="checkbox" data-pk="Demanda" data-id="${esc(d.id)}"${naPauta ? ' checked' : ''}><span><span class="pk-t">${d.prioridade ? `<span class="prio">P${d.prioridade}</span> ` : ''}${esc(d.titulo)}</span>${meta}</span></label>`
      : `<div class="pk-row"><span style="flex:1;min-width:0"><span class="pk-t">${d.prioridade ? `<span class="prio">P${d.prioridade}</span> ` : ''}${esc(d.titulo)}</span>${meta}</span>${naPauta ? '<span class="pill ok">na pauta</span>' : `<button type="button" class="btn sm" data-inc="Demanda" data-id="${esc(d.id)}">Incluir</button>`}</div>`;
    const acs = aberto ? `<div class="pk-acs">${ab.map(a => {
      const pelaDem = naPauta, marcada = pelaDem || sel.acs.has(a.id);
      const txt = `<span><span class="mono small muted">${esc(a.id)}</span> ${esc(a.acao)}<span class="meta"><span>${esc(st.nome(a.resp))}</span>${pill(situacao(a))}${pelaDem ? '<span>entra pela demanda</span>' : ''}</span></span>`;
      if (modo === 'check') return `<label class="pk-row"><input type="checkbox" data-pk="Ação" data-id="${esc(a.id)}"${marcada ? ' checked' : ''}${pelaDem ? ' disabled' : ''}>${txt}</label>`;
      return `<div class="pk-row">${txt}${marcada ? '<span class="pill ok">na pauta</span>' : `<button type="button" class="btn sm" data-inc="Ação" data-id="${esc(a.id)}">Incluir</button>`}</div>`;
    }).join('')}</div>` : '';
    return `<div class="pk-dem">${ctrl}${ab.length ? `<button type="button" class="btn sm ghost pk-x" data-cv="abrir" data-id="${esc(d.id)}" aria-expanded="${aberto}">${aberto ? 'Esconder ações' : `Ver ações (${ab.length})`}</button>` : ''}${acs}</div>`;
  };
  return `<div class="pk">${grupos.map(g => `<div class="pk-grp label">${g.nome} · ${g.l.length}</div>${g.l.map(linhaDem).join('')}`).join('')}</div>`;
}
function filtrosPicker(f, cli, px) {
  const pes = st.pessoasPara(cli);
  return `<div class="toolbar"><input type="search" id="${px}Q" placeholder="Buscar demanda ou ação" value="${esc(f.q)}" aria-label="Buscar">
    <select id="${px}Ft" aria-label="Tipo"><option value="todas">Todos os tipos</option>${GRUPOS.map(([t, n]) => `<option value="${esc(t)}"${f.ft === t ? ' selected' : ''}>${n}</option>`).join('')}</select>
    <select id="${px}Fr" aria-label="Responsável"><option value="">Qualquer responsável</option>${pes.map(p => `<option value="${esc(p.id)}"${f.fr === p.id ? ' selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></div>`;
}
function topicoHtml(cli, f, px) {
  const sug = f.sug;
  return `<form class="form boxed" id="${px}Top" style="margin-top:10px">
    <div class="field full"><label for="${px}TopTxt">Tópico livre (assunto que ainda não é registro)</label><input id="${px}TopTxt" maxlength="255" value="${esc(sug ? sug.assunto : '')}" placeholder="Ex.: Informes do jurídico"></div>
    <div class="field"><label for="${px}TopResp">Quem traz o assunto (opcional)</label><select id="${px}TopResp"><option value="">—</option>${st.convocaveis(cli).map(p => `<option value="${esc(p.id)}"${sug && sug.resp === p.id ? ' selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></div>
    <div class="field"><label>&nbsp;</label><button class="btn" type="submit">Incluir tópico</button></div>
    ${sug ? `<div class="full note">${sug.ja.length ? `Esse assunto parece já estar na pauta: ${sug.ja.map(id => `<b>${esc(st.demanda(id).titulo)}</b>`).join('; ')}.` : ''}
      ${sug.dems.length ? `<div>${sug.ja.length ? 'Também parecida' : 'Já existe uma demanda aberta parecida'}: ${sug.dems.map(id => `<b>${esc(st.demanda(id).titulo)}</b> <button type="button" class="btn sm" data-cv="usarDem" data-id="${esc(id)}">Incluir a demanda</button>`).join(' ')}</div>` : ''}
      <div style="margin-top:6px"><button type="button" class="btn sm ghost" data-cv="forcarTop">Incluir como tópico mesmo assim</button></div></div>` : ''}
    <span class="full small err-text" id="${px}TopErr" role="alert">${esc(f.topErr || '')}</span></form>`;
}
function renderConvocacao() {
  const fo = S.fo.editar ? st.forum(S.fo.id) : null;
  if (S.fo.editar && (!fo || fo.situacao !== 'Agendado')) { S.fo = fo ? { id: fo.id } : {}; return fo ? renderForumDetalhe(fo) : renderForunsLista(); }
  if (!S.conv || S.conv.cli !== S.cli || (S.conv.editId || null) !== (fo ? fo.id : null)) S.conv = novoRascunho(fo);
  const c = S.conv, sel = selDe(c.itens);
  const pes = st.convocaveis(S.cli), solve = pes.filter(p => p.empresa === 'Solve'), doCli = pes.filter(p => p.empresa !== 'Solve');
  const chk = p => `<label class="check"><input type="checkbox" data-cvp="${esc(p.id)}"${c.conv.includes(p.id) ? ' checked' : ''}> ${esc(p.nome)}</label>`;
  const itens = c.itens.map((i, k) => {
    const outro = i.tipo !== TOPICO && st.emOutraPauta(S.cli, i.tipo, i.reg, c.editId);
    return `<li><span class="mono">${k + 1}.</span><div class="body">${tipoTag(i)} ${esc(tituloRasc(i))}
      <div class="meta">${i.reg ? `<span class="mono">${esc(i.reg)}</span>` : ''}${i.resp ? `<span>${esc(st.nome(i.resp))}</span>` : ''}${ORIGEM_TAG[i.origem] ? `<span class="pill bad line">${ORIGEM_TAG[i.origem]}</span>` : ''}${outro ? `<span class="pill ok line">também na pauta de ${fmt(outro.data)}</span>` : ''}</div></div>
      <span class="row-actions"><button type="button" class="btn sm ghost" data-cv="up" data-i="${k}" aria-label="Subir item ${k + 1}"${k ? '' : ' disabled'}>↑</button><button type="button" class="btn sm ghost" data-cv="down" data-i="${k}" aria-label="Descer item ${k + 1}"${k < c.itens.length - 1 ? '' : ' disabled'}>↓</button><button type="button" class="btn sm ghost danger" data-cv="rm" data-i="${k}" aria-label="Tirar item ${k + 1} da pauta">✕</button></span></li>`;
  }).join('');
  return `<div class="sechead"><button class="btn sm ghost" data-cv="voltar">← Fóruns</button><span class="small muted">${fo ? `Editando a convocação ${esc(fo.id)}` : `Novo fórum · ${esc(cliNome(S.cli))}`}</span></div>
  <section class="panel"><header><h2>1. Quando e onde</h2></header>
    <div class="form"><div class="field"><label for="cvData">Data</label><input type="date" id="cvData" value="${esc(c.data)}"></div>
    <div class="field"><label for="cvHora">Horário</label><input type="time" id="cvHora" value="${esc(c.hora)}"></div>
    <div class="field full"><label for="cvLocal">Local</label><input id="cvLocal" maxlength="255" value="${esc(c.local)}" placeholder="Ex.: Sala de reuniões da Moendo ou link do Teams"></div>
    <div class="full small note" id="cvPassado"${c.data && c.data < HOJE ? '' : ' hidden'}>Data já passou: use para registrar um fórum que já aconteceu. Ele fica agendado; depois é só iniciar, marcar a presença e tratar a pauta. Conclusões e novos prazos registrados nele ficam com a data de hoje.</div></div></section>
  <section class="panel"><header><h2>2. Participantes</h2><span class="small muted">${c.conv.length} ${plural(c.conv.length, 'convocado', 'convocados')}</span></header>
    <div class="grid2"><div><div class="label" style="margin-bottom:6px">${esc(cliNome(S.cli))}</div><div class="conv-grid">${doCli.map(chk).join('') || '<span class="small muted">Ninguém do cliente cadastrado em GP_Pessoas.</span>'}</div></div>
    <div><div class="label" style="margin-bottom:6px">Solve</div><div class="conv-grid">${solve.map(chk).join('')}</div></div></div></section>
  <section class="panel"><header><h2>3. Pauta</h2><span class="small muted">marque as demandas e ações que entram neste fórum</span></header>
    <div class="fo-cols"><div class="stack" style="gap:10px">${filtrosPicker(c, S.cli, 'pk')}${pickerHtml(S.cli, c, sel, 'check', c.editId)}${topicoHtml(S.cli, c, 'cv')}</div>
    <div><div class="label" style="margin-bottom:6px">Pauta · ${c.itens.length} ${plural(c.itens.length, 'item', 'itens')}</div>${c.itens.length ? `<ol class="pauta-ed">${itens}</ol>` : '<div class="empty small">Nenhum item na pauta ainda.</div>'}</div></div></section>
  <div class="row-actions" style="align-items:center"><button class="btn primary" data-cv="salvar">${fo ? 'Salvar convocação' : 'Convocar fórum'}</button><button class="btn" data-cv="voltar">Voltar</button><span class="small err-text" id="cvErr" role="alert">${esc(c.err)}</span></div>`;
}
// Inclui um tópico livre no rascunho (ou no fórum em andamento). Antes, aponta demanda aberta parecida.
function tirarAcoesDaDemanda(itens, dem) {
  const fora = itens.filter(i => i.tipo === 'Ação' && st.acao(i.reg) && st.acao(i.reg).demanda === dem);
  return { itens: itens.filter(i => !fora.includes(i)), n: fora.length };
}
function cvToggle(tipo, id, marcar) {
  const c = S.conv; c.dirty = true; c.err = '';
  const k = c.itens.findIndex(i => i.tipo === tipo && i.reg === id);
  if (!marcar) { if (k >= 0) c.itens.splice(k, 1); return; }
  if (k >= 0) return;
  if (tipo === 'Demanda') {
    const r = tirarAcoesDaDemanda(c.itens, id);
    c.itens = r.itens;
    if (r.n) toast(`${r.n} ${plural(r.n, 'ação saiu', 'ações saíram')} da lista: ${plural(r.n, 'entra', 'entram')} pela demanda`);
  }
  c.itens.push({ tipo, reg: id, origem: 'Convocação' });
}
function addTopico(f, assunto, resp, forcar, alvo) {
  const a = String(assunto || '').trim();
  f.topErr = '';
  if (!a) { f.topErr = 'Escreva o assunto do tópico.'; return null; }
  if (alvo.some(i => i.tipo === TOPICO && normTxt(i.assunto) === normTxt(a))) { f.topErr = 'Esse tópico já está na pauta.'; return null; }
  if (!forcar) {
    // Assunto parecido com demanda aberta: se ela já está na pauta, avisa; se não está, oferece incluir a demanda.
    const naPauta = d => alvo.some(i => i.tipo === 'Demanda' && i.reg === d.id) || alvo.some(i => i.tipo === 'Ação' && st.acao(i.reg) && st.acao(i.reg).demanda === d.id);
    const p = st.parecidas(S.cli, a);
    if (p.length) { f.sug = { assunto: a, resp, dems: p.filter(d => !naPauta(d)).map(d => d.id), ja: p.filter(naPauta).map(d => d.id) }; return null; }
  }
  f.sug = null;
  return { tipo: TOPICO, assunto: a, resp: resp || null, origem: 'Convocação' };
}
function focoPor(sel) { const el = document.querySelector(sel); if (el) el.focus(); }

/* --- detalhe do fórum --- */
function renderForumDetalhe(fo) {
  const itens = st.pautaDe(fo.id);
  const tratados = itens.filter(p => p.trat).length;
  const aus = fo.convocados.filter(c => !fo.presentes.includes(c));
  let acoesHead = '';
  const excluir = '<button class="btn danger ghost" data-do="foExcluir">Excluir fórum</button>';
  if (fo.situacao === 'Agendado') acoesHead = `<div class="row-actions"><button class="btn primary" data-do="foIniciar">Iniciar fórum</button><button class="btn" data-do="foEditar">Editar convocação</button><button class="btn danger ghost" data-do="foCancelar">Cancelar fórum</button>${excluir}</div>`;
  else if (fo.situacao === 'Em andamento') acoesHead = `<div class="row-actions"><button class="btn" data-do="foPresenca">Presença</button>${excluir}</div>`;
  else acoesHead = `<div class="row-actions">${excluir}</div>`;
  const head = `<div class="sechead"><button class="btn sm ghost" data-do="foLista">← Fóruns</button><span class="mono small muted">${esc(fo.id)}</span></div>
    <section class="panel"><header><h2>Fórum de ${quandoFo(fo)}</h2>${sitPill(fo.situacao)}</header>
      <dl class="w5 fo-dl"><dt>LOCAL</dt><dd>${esc(fo.local) || '<span class="muted">—</span>'}</dd>
      <dt>CONVOCADOS</dt><dd>${fo.convocados.length ? nomes(fo.convocados) : '<span class="muted">—</span>'}</dd>
      ${fo.presentes.length ? `<dt>PRESENTES</dt><dd>${nomes(fo.presentes)}${aus.length ? `<span class="sub">ausentes: ${nomes(aus)}</span>` : ''}</dd>` : ''}
      ${fo.situacao !== 'Agendado' && fo.situacao !== 'Cancelado' && itens.length ? `<dt>PAUTA</dt><dd>${tratados} de ${itens.length} ${plural(itens.length, 'item tratado', 'itens tratados')}</dd>` : ''}</dl>
      ${acoesHead}</section>`;
  if (fo.situacao === 'Em andamento') {
    st.forumAtivo = fo.id;
    return `${head}<p class="small muted" style="margin:0">O que você fizer em cada item (concluir, novo prazo, cancelar, trocar responsável, nova ação, deliberação) fica registrado no item e entra na ata. Item sem tratamento ao encerrar vai para a pauta do próximo fórum.</p>
      ${itens.map((p, k) => itemCard(p, k)).join('')}
      <div class="row-actions"><button class="btn" data-do="foIncluir">+ Incluir na pauta</button><button class="btn primary" data-do="foEncerrar">Encerrar fórum</button></div>`;
  }
  if (fo.situacao === 'Realizado' && fo.antigo) {
    const dl = st.delib.filter(x => x.forum === fo.id);
    return `${head}<div class="note">Fórum registrado antes da convocação com pauta: não tem pauta nem desdobramentos.</div>
      ${fo.ata ? `<section class="panel"><header><h2>Ata</h2><span class="row-actions"><button class="btn sm" data-do="copiarAta">Copiar texto</button></span></header><textarea class="out" id="ataTxt" aria-label="Ata">${esc(S.ataRascunho && S.ataRascunho.fo === fo.id ? S.ataRascunho.texto : fo.ata)}</textarea>
        <div class="row-actions" style="margin-top:10px;align-items:center"><button class="btn primary" data-do="salvarAta">Salvar ata no SharePoint</button><span class="small" id="ataEstado">${ataEstado(fo)}</span></div></section>` : ''}
      <section class="panel"><header><h2>Deliberações</h2><span class="small muted">${dl.length}</span></header>${dl.length ? `<div class="list">${dl.map(x => `<div class="li"><span class="tag">${esc(x.tipo)}</span><div class="body">${esc(x.texto)}<div class="meta"><span>${esc(x.resp ? st.nome(x.resp) : '—')}</span>${x.demanda && st.demanda(x.demanda) ? `<span>${esc(st.demanda(x.demanda).titulo)}</span>` : ''}${x.acaoId ? `<button class="linkbtn" data-acao="${esc(x.acaoId)}">${esc(x.acaoId)}</button>` : ''}</div></div></div>`).join('')}</div>` : '<div class="empty small">Nenhuma deliberação registrada.</div>'}</section>`;
  }
  if (fo.situacao === 'Realizado') {
    const texto = S.ataRascunho && S.ataRascunho.fo === fo.id ? S.ataRascunho.texto : fo.ata || st.ataDoForum(fo);
    return `${head}<section class="panel"><header><h2>Ata para o grupo do WhatsApp</h2><span class="row-actions">${fo.antigo ? '' : '<button class="btn sm" data-do="gerarAta">Gerar de novo</button>'}<button class="btn sm" data-do="copiarAta">Copiar texto</button></span></header>
      <textarea class="out" id="ataTxt" aria-label="Ata">${esc(texto)}</textarea>
      <div class="row-actions" style="margin-top:10px;align-items:center"><button class="btn primary" data-do="salvarAta">Salvar ata no SharePoint</button><span class="small" id="ataEstado">${ataEstado(fo)}</span></div></section>
      ${itens.length ? pautaLeitura(itens, true) : ''}`;
  }
  return `${head}${fo.situacao === 'Cancelado' ? '<div class="note">Fórum cancelado. A pauta fica registrada aqui; os itens não tratados de fóruns anteriores voltam para a próxima convocação.</div>' : ''}${pautaLeitura(itens, false)}`;
}
function pautaLeitura(itens, comResultado) {
  return `<section class="panel"><header><h2>Pauta</h2><span class="small muted">${itens.length} ${plural(itens.length, 'item', 'itens')}</span></header>
    <div class="list">${itens.map((p, k) => {
      const aberto = st.itemAberto(p);
      return `<div class="li"><span class="mono">${k + 1}.</span><div class="body">${tipoTag(p)} <b>${esc(st.tituloItem(p))}</b>
        <div class="meta">${p.reg ? `<span class="mono">${esc(p.reg)}</span>` : ''}${p.resp ? `<span>${esc(st.nome(p.resp))}</span>` : ''}${ORIGEM_TAG[p.origem] ? `<span class="pill bad line">${ORIGEM_TAG[p.origem]}</span>` : ''}${comResultado ? tratPill(p.trat) : !aberto ? '<span class="pill ok line">já fechado</span>' : ''}</div>
        ${comResultado && (p.eventos.length || p.nota) ? `<ul class="desd">${p.eventos.map(e => `<li>${esc(st.linhaEvento(e))}</li>`).join('')}${p.nota ? `<li>${esc(p.nota)}</li>` : ''}</ul>` : ''}</div></div>`;
    }).join('')}</div></section>`;
}
function itemCard(p, k) {
  let corpo = '';
  if (p.tipo === 'Demanda') {
    const d = st.demanda(p.reg);
    if (!d) corpo = '<div class="small muted">Demanda não encontrada.</div>';
    else {
      const i = infoDem(d);
      if (d.encerrada) corpo = `<div class="small">Demanda ${i.status === 'Cancelada' ? 'cancelada' : 'encerrada'}.</div>`;
      else if (i.ab.length) corpo = quickTable(sortAcoes(i.ab));
      else if (i.validar) corpo = `<div class="row-actions" style="align-items:center"><span class="small">Todas as ações foram concluídas. Se o fórum confirmar, a demanda é encerrada.</span><button class="btn sm primary" data-do="encerrarDem" data-id="${esc(d.id)}">Confirmar encerramento</button></div>`;
      else corpo = `<div class="row-actions" style="align-items:center"><span class="pill bad">Sem plano de ação</span><button class="btn sm danger ghost" data-do="cancDem" data-id="${esc(d.id)}">Cancelar demanda</button></div>`;
    }
  } else if (p.tipo === 'Ação') {
    const a = st.acao(p.reg);
    corpo = !a ? '<div class="small muted">Ação não encontrada.</div>' : aberta(a) ? quickTable([a]) : `<div class="small"><button class="linkbtn" data-acao="${esc(a.id)}">${esc(a.id)}</button> · ${pill(situacao(a))}</div>`;
  } else {
    corpo = `<form class="pnota" data-p="${esc(p.id)}"><label class="sr" for="nota-${esc(p.id)}">Anotação do tópico</label><textarea id="nota-${esc(p.id)}" class="nota-in" maxlength="4000" placeholder="O que foi dito sobre o tópico">${esc(p.nota)}</textarea>
      <div class="row-actions" style="margin-top:6px"><button class="btn sm" type="submit">Salvar anotação</button></div></form>`;
  }
  const ev = p.eventos.length ? `<div><div class="label">Neste fórum</div><ul class="desd">${p.eventos.map(e => `<li>${esc(st.linhaEvento(e))}</li>`).join('')}</ul></div>` : '';
  const respItem = p.tipo === 'Demanda' ? (st.demanda(p.reg) || {}).resp : p.tipo === 'Ação' ? (st.acao(p.reg) || {}).resp : p.resp;
  return `<article class="qc" id="pi-${esc(p.id)}"><header><span class="mono">${k + 1}.</span>${tipoTag(p)}<h3>${esc(st.tituloItem(p))}</h3>${p.reg ? `<span class="mono small muted">${esc(p.reg)}</span>` : ''}${respItem ? `<span class="small muted">${esc(st.nome(respItem))}</span>` : ''}${ORIGEM_TAG[p.origem] ? `<span class="pill bad line">${ORIGEM_TAG[p.origem]}</span>` : ''}<span style="margin-left:auto">${tratPill(p.trat)}</span></header>
    ${corpo}${ev}
    <div class="row-actions"><button class="btn sm" data-pi="acao" data-p="${esc(p.id)}">+ Nova ação</button><button class="btn sm" data-pi="delib" data-p="${esc(p.id)}">Deliberação</button>${p.trat === 'Mantido' ? '' : `<button class="btn sm ghost" data-pi="Mantido" data-p="${esc(p.id)}">Mantido sem mudança</button>`}${p.trat === 'Não tratado' ? '' : `<button class="btn sm ghost" data-pi="Não tratado" data-p="${esc(p.id)}">Não tratado</button>`}</div></article>`;
}
function ataEstado(fo) {
  if (S.ataDirty && S.ataRascunho && S.ataRascunho.fo === (fo && fo.id)) return '<span class="pill warn">Rascunho não salvo</span> <span class="muted">fica guardado enquanto o app estiver aberto</span>';
  return `<span class="muted">${fo && fo.ata ? `Ata salva em ${esc(fo.id)}.` : 'A ata fica no histórico de fóruns do cliente.'}</span>`;
}
function quickTable(l, showCli) {
  return `<div style="overflow-x:auto"><table class="mini cards"><tbody>${l.map(a => { const d = st.demanda(a.demanda); return `<tr data-acao="${esc(a.id)}"><td class="c-id">${esc(a.id)}</td><td class="c-main" style="min-width:220px">${showCli ? tagCli(a.cli) + ' ' : ''}<button class="linkbtn plain" data-acao="${esc(a.id)}">${esc(a.acao)}</button><span class="sub" style="display:block;color:var(--muted);font-size:.8rem">${esc(d ? d.titulo : '')}${a.reprogramacoes.length >= 2 ? ` · ${a.reprogramacoes.length}ª reprogramação` : ''}</span></td><td class="c-nw">${esc(st.nome(a.resp))}</td><td class="c-nw">${pill(situacao(a))}</td>
    <td class="c-nw c-act" style="text-align:right"><span class="row-actions" style="justify-content:flex-end"><button class="btn sm" data-q="concluir" data-id="${esc(a.id)}">Concluir</button><button class="btn sm" data-q="reprog" data-id="${esc(a.id)}">${a.prazo ? 'Novo prazo' : 'Definir prazo'}</button></span></td></tr>`; }).join('')}</tbody></table></div>`;
}

/* --- janelas do fórum: presença, deliberação e incluir na pauta --- */
function presencaModalHtml() {
  const fo = st.forum(S.modal.fo);
  if (!fo) return '';
  const iniciar = S.modal.iniciar;
  const marc = c => (iniciar ? true : fo.presentes.includes(c));
  const outros = st.convocaveis(fo.cli).filter(p => !fo.convocados.includes(p.id));
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mT">
    ${cabModal(iniciar ? 'Iniciar fórum' : 'Presença')}
    ${iniciar && fo.data !== HOJE ? `<div class="note">O fórum estava marcado para ${fmtF(fo.data)}.</div>` : ''}
    <form id="fPres" class="form">
      <div class="field full"><span class="label">Convocados: desmarque quem faltou</span><div class="conv-grid">${fo.convocados.map(c => `<label class="check"><input type="checkbox" name="pres" value="${esc(c)}"${marc(c) ? ' checked' : ''}> ${esc(st.nome(c))}</label>`).join('')}</div></div>
      ${outros.length ? `<details class="full"${fo.presentes.some(c => !fo.convocados.includes(c)) ? ' open' : ''}><summary class="small" style="cursor:pointer">Participou alguém que não foi convocado?</summary><div class="conv-grid" style="margin-top:8px">${outros.map(p => `<label class="check"><input type="checkbox" name="pres" value="${esc(p.id)}"${fo.presentes.includes(p.id) ? ' checked' : ''}> ${esc(p.nome)}${p.empresa === 'Solve' ? ' (Solve)' : ''}</label>`).join('')}</div></details>` : ''}
      <div class="full row-actions"><button class="btn primary" type="submit">${iniciar ? 'Iniciar fórum' : 'Salvar presença'}</button><span class="small err-text" id="presErr" role="alert"></span></div>
    </form></div>`;
}
function delibModalHtml() {
  const p = st.itemPauta(S.modal.p);
  if (!p) return '';
  const dem = demDoItem(p);
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mT">
    ${cabModal('Deliberação')}
    <p class="small muted" style="margin:0">Item ${p.ordem}: ${esc(st.tituloItem(p))}</p>
    <form id="fDelib" class="form">
      <div class="field full"><label for="dTexto">O que foi decidido</label><textarea id="dTexto" required placeholder="Ex.: Financeiro envia a conciliação de setembro até sexta"></textarea></div>
      <div class="field"><label for="dTipo">Tipo</label><select id="dTipo"><option>Deliberado</option><option>Encaminhamento</option><option>Informativo</option></select></div>
      <div class="field"><label for="dResp">Responsável</label><select id="dResp"><option value="">Escolha</option>${optPessoas(p.cli)}</select></div>
      <div class="field"><label for="dPrazo">Prazo</label><input type="date" id="dPrazo" min="${HOJE}"></div>
      <div class="field"><label>&nbsp;</label><label class="check"><input type="checkbox" id="dGera" checked> Gerar ação no plano</label></div>
      <div class="full small muted">${dem ? `A ação gerada entra na demanda ${esc(st.demanda(dem).titulo)}.` : 'A ação gerada cria uma pendência nova com o texto da deliberação.'}</div>
      <div class="full row-actions"><button class="btn primary" type="submit">Registrar deliberação</button><span class="small err-text" id="dErr" role="alert"></span></div>
    </form></div>`;
}
function demDoItem(p) {
  if (p.tipo === 'Demanda') return st.demanda(p.reg) ? p.reg : null;
  if (p.tipo === 'Ação') { const a = st.acao(p.reg); return a ? a.demanda : null; }
  return null;
}
function incluirModalHtml() {
  const fo = st.forum(S.modal.fo);
  if (!fo) return '';
  const f = S.incl;
  const sel = selDe(st.pautaDe(fo.id));
  return `<div class="modal wide" role="dialog" aria-modal="true" aria-labelledby="mT">
    ${cabModal('Incluir na pauta')}
    <p class="small muted" style="margin:0">Registro que surgiu na reunião. Cada inclusão grava na hora e entra no fim da pauta.</p>
    ${filtrosPicker(f, fo.cli, 'in')}
    ${pickerHtml(fo.cli, f, sel, 'incluir', null)}
    ${topicoHtml(fo.cli, f, 'in')}
    <div class="row-actions"><button class="btn" data-do="inNova">+ Registro novo (ação)</button><button class="btn" data-do="fechar">Concluído</button></div>
  </div>`;
}


/* ---------- Compromissos ---------- */
// Um passo só, com data marcada. Não entram em farol, avanço de frente nem nos números de ações.
const fechado = c => c.status !== 'Pendente';
const quando = c => c.dataOrig || c.data;
function sitComp(c) {
  if (c.status === 'Feito') return c.realizado && quando(c) && c.realizado > quando(c) ? { k: 'warn', t: `Feito ${fmt(c.realizado)} · com atraso`, o: 5 } : { k: 'good', t: `Feito ${fmt(c.realizado)}`, o: 5 };
  if (c.status === 'Não ocorreu') return { k: 'bad', t: 'Não ocorreu', o: 6, line: true };
  if (c.status === 'Cancelado') return { k: 'off', t: 'Cancelado', o: 7 };
  if (!c.data) return { k: 'warn', t: 'Sem data', o: 1, dias: 0 };
  if (c.data < HOJE) { const d = diff(HOJE, c.data); return { k: 'bad', t: `Atrasado há ${d} d`, o: 1, dias: d }; }
  if (c.data === HOJE) return { k: 'warn', t: 'Hoje' + (c.hora ? ' · ' + c.hora : ''), o: 2 };
  return { k: 'good', t: `${DSEM[dt(c.data).getDay()]} ${fmt(c.data)}${c.hora ? ' · ' + c.hora : ''}`, o: c.data <= LIM7 ? 3 : 4, line: c.data > LIM7 };
}
const sortComp = l => l.slice().sort((a, b) => (a.data || '').localeCompare(b.data || '') || (a.hora || '99').localeCompare(b.hora || '99') || a.id.localeCompare(b.id, 'pt', { numeric: true }));
// Sugestão de levar para a gestão: parado há 3 dias ou mais, ou a contraparte falhou nas duas últimas vezes da série.
function sugerePendencia(c) {
  if (c.status !== 'Pendente' || c.demanda || st.interno(c.cli)) return false;
  if (c.data && c.data < HOJE && diff(HOJE, c.data) >= 3) return true;
  const ult = st.serieDe(c).filter(fechado).filter(x => x.status !== 'Cancelado').slice(-2);
  return ult.length === 2 && ult.every(x => x.status === 'Não ocorreu');
}
const contraNome = c => (c.contra ? st.nome(c.contra) : '');
function compRows(l, showResp, showCli = true) {
  return `<div style="overflow-x:auto"><table class="mini cards"><tbody>${l.map(c => { const s = sitComp(c), sug = sugerePendencia(c); return `<tr data-comp="${esc(c.id)}">
    <td class="c-main" style="min-width:220px">${showCli ? tagCli(c.cli) + ' ' : ''}<button class="linkbtn plain" data-comp="${esc(c.id)}">${esc(c.oque)}</button>
      <span class="sub" style="display:block;color:var(--muted);font-size:.8rem">${[c.contra ? 'com ' + esc(contraNome(c)) : '', showResp ? esc(st.nome(c.resp)) : '', c.rec !== 'Única' ? '↻ ' + c.rec.toLowerCase() : '',
        c.status === 'Pendente' && c.dataOrig && c.data !== c.dataOrig ? 'remarcado de ' + fmt(c.dataOrig) : '', c.demanda ? 'virou pendência ' + esc(c.demanda) : ''].filter(Boolean).join(' · ')}</span></td>
    <td class="c-nw">${pill(s)}${sug ? ' <span class="pill acc">virar pendência?</span>' : ''}</td>
    <td class="c-nw c-act" style="text-align:right">${c.status === 'Pendente' ? `<span class="row-actions" style="justify-content:flex-end"><button class="btn sm" data-c="feito" data-id="${esc(c.id)}">Feito</button><button class="btn sm" data-c="remarcar" data-id="${esc(c.id)}">Remarcar</button></span>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
}
// Cumprimento nos últimos 90 dias, pela data original: feito no dia, feito com atraso, não ocorreu e ainda atrasado.
function cumprimento(list) {
  const ini = addDays(HOJE, -90), g = {};
  list.filter(c => c.status !== 'Cancelado' && quando(c) && quando(c) >= ini && quando(c) < HOJE || (c.status !== 'Pendente' && c.status !== 'Cancelado' && quando(c) === HOJE))
    .forEach(c => {
      const k = c.cli + '|' + (c.contra || '');
      const x = g[k] = g[k] || { cli: c.cli, contra: c.contra, t: 0, dia: 0, atr: 0, nao: 0, pend: 0 };
      x.t++;
      if (c.status === 'Feito') { if (c.realizado && c.realizado > quando(c)) x.atr++; else x.dia++; }
      else if (c.status === 'Não ocorreu') x.nao++;
      else x.pend++;
    });
  return Object.values(g).map(x => ({ ...x, pct: Math.round(x.dia * 100 / x.t) })).sort((a, b) => a.pct - b.pct || b.t - a.t);
}
function renderAgenda() {
  if (st.faltando && st.faltando.includes('GP_Compromissos')) return '<div class="empty">A lista <b>GP_Compromissos</b> não foi encontrada no SharePoint. Peça para criá-la no site Base Centralizada.</div>';
  const eu = st.eu(), f = S.fc;
  const p = f.p || (eu ? eu.id : 'todos');
  const resps = [...new Set([...(eu ? [eu.id] : []), ...st.compromissos.map(c => c.resp).filter(Boolean)])].sort((a, b) => st.nome(a).localeCompare(st.nome(b)));
  const base = st.compromissos.filter(c => (p === 'todos' || c.resp === p) && (!f.cli || c.cli === f.cli));
  const todos = p === 'todos';
  const opt = (v, cur, lab) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(lab)}</option>`;
  let corpo;
  if (f.ver === 'realizados') {
    const ini = addDays(HOJE, -60);
    const l = base.filter(c => fechado(c) && (c.realizado || c.data || '') >= ini).sort((a, b) => (b.realizado || b.data || '').localeCompare(a.realizado || a.data || ''));
    corpo = l.length ? `<section class="panel"><header><h2>Fechados nos últimos 60 dias</h2><span class="small muted">${l.length}</span></header>${compRows(l, todos)}</section>` : '<div class="empty">Nenhum compromisso fechado nos últimos 60 dias.</div>';
  } else {
    const pend = sortComp(base.filter(c => c.status === 'Pendente'));
    const sec = [['Atrasados', pend.filter(c => sitComp(c).o === 1)], ['Hoje', pend.filter(c => sitComp(c).o === 2)], [`Até ${DSEM[dt(LIM7).getDay()]} ${fmt(LIM7)}`, pend.filter(c => sitComp(c).o === 3)], ['Depois', pend.filter(c => sitComp(c).o === 4)]];
    corpo = sec.filter(x => x[1].length).map(([t, l]) => `<section class="panel"><header><h2>${t}</h2><span class="small muted">${l.length}</span></header>${compRows(l, todos)}</section>`).join('')
      || `<div class="empty">Nenhum compromisso pendente${todos ? '' : ' para ' + esc(st.nome(p))}.<br><br><button class="btn primary" data-do="novoComp">+ Registrar compromisso</button></div>`;
  }
  const cp = cumprimento(base);
  const tot = cp.reduce((a, x) => ({ t: a.t + x.t, dia: a.dia + x.dia }), { t: 0, dia: 0 });
  return `
  <p class="lede-sub" style="margin:0">Compromissos pontuais e de rotina: um passo só, com data marcada. Ficam fora dos números de ações, frentes e demandas. Quando deixa de ser corriqueiro, vira pendência.</p>
  <div class="toolbar">
    <select id="cP" aria-label="Responsável">${opt('todos', p, 'Todas as pessoas')}${resps.map(r => opt(r, p, st.nome(r) + (eu && r === eu.id ? ' (você)' : ''))).join('')}</select>
    <select id="cCliF" aria-label="Cliente">${opt('', f.cli, 'Todos os clientes')}${clientesComp().map(c => opt(c.id, f.cli, c.nome)).join('')}</select>
    <div class="seg" role="group"><button data-fc-ver="pendentes" aria-pressed="${f.ver !== 'realizados'}">Pendentes</button><button data-fc-ver="realizados" aria-pressed="${f.ver === 'realizados'}">Fechados</button></div>
  </div>
  <div class="grid3">
    <div class="stack">${corpo}</div>
    <section class="panel"><header><h2>Cumprimento</h2><span class="small muted">últimos 90 dias${tot.t ? ` · ${Math.round(tot.dia * 100 / tot.t)}% no dia` : ''}</span></header>
      ${cp.length ? `<div style="overflow-x:auto"><table class="mini"><thead><tr><th>Com quem</th><th class="num">No dia</th><th class="num" title="Feito com atraso, não ocorreu ou ainda atrasado">Falhou</th><th class="num">%</th></tr></thead><tbody>${cp.slice(0, 12).map(x => `<tr><td>${tagCli(x.cli)} ${esc(x.contra ? st.nome(x.contra) : 'sem contraparte')}<span class="sub" style="display:block;color:var(--muted);font-size:.78rem">${x.t} no período${x.atr ? ` · ${x.atr} com atraso` : ''}${x.nao ? ` · ${x.nao} não ${plural(x.nao, 'ocorreu', 'ocorreram')}` : ''}${x.pend ? ` · ${x.pend} ${plural(x.pend, 'atrasado', 'atrasados')}` : ''}</span></td><td class="num">${x.dia}</td><td class="num">${x.t - x.dia}</td><td class="num" style="${x.pct < 70 ? 'color:var(--bad);font-weight:600' : ''}">${x.pct}%</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty small">O cumprimento aparece quando os primeiros compromissos chegarem à data.</div>'}
      <p class="small muted" style="margin:10px 0 0">Conta pela data original: remarcar e fazer depois conta como atraso.</p>
    </section>
  </div>`;
}

/* ---------- Minha semana ---------- */
function renderSemana() {
  const fc = S.semCli, doCli = x => !fc || x.cli === fc;
  const ab = st.acoes.filter(a => aberta(a) && st.nominal(a.resp) && doCli(a));
  const cont = {}; ab.forEach(a => { cont[a.resp] = (cont[a.resp] || 0) + 1; });
  const compAb = st.compromissos.filter(c => c.status === 'Pendente' && c.resp && doCli(c));
  const contC = {}; compAb.forEach(c => { contC[c.resp] = (contC[c.resp] || 0) + 1; });
  const pes = [...new Set([...Object.keys(cont), ...Object.keys(contC)])].map(k => [k, cont[k] || 0, contC[k] || 0])
    .sort((a, b) => b[1] - a[1] || b[2] - a[2] || st.nome(a[0]).localeCompare(st.nome(b[0])));
  const eu = st.eu();
  const tem = k => !!(cont[k] || contC[k]);
  // Com cliente filtrado, a pessoa escolhida continua na tela mesmo sem nada nele (em vez de trocar de pessoa sem avisar).
  const temEmAlgum = k => st.acoes.some(a => a.resp === k && aberta(a) && st.nominal(k)) || st.compromissos.some(c => c.resp === k && c.status === 'Pendente');
  if (!S.pessoaSemana || !(tem(S.pessoaSemana) || (fc && temEmAlgum(S.pessoaSemana)))) S.pessoaSemana = eu && tem(eu.id) ? eu.id : (pes[0] || [])[0];
  if (S.pessoaSemana && !tem(S.pessoaSemana)) pes.unshift([S.pessoaSemana, 0, 0]);
  const optC = (v, lab) => `<option value="${esc(v)}"${v === fc ? ' selected' : ''}>${esc(lab)}</option>`;
  const selCli = `<select id="fsCli" aria-label="Cliente">${optC('', 'Todos os clientes')}${clientesComp().map(c => optC(c.id, c.nome)).join('')}</select>`;
  if (!S.pessoaSemana) return `<div class="toolbar">${selCli}</div><div class="empty">${fc ? `Nada aberto em ${esc(cliNome(fc))} com responsável nominal.` : 'Nenhuma ação aberta com responsável nominal.'}</div>`;
  const p = S.pessoaSemana, minhas = sortAcoes(ab.filter(a => a.resp === p));
  const meusComp = sortComp(compAb.filter(c => c.resp === p && c.data && c.data <= LIM7));
  const varios = new Set(minhas.map(a => a.cli)).size > 1;
  const sec = [['Vencidas', minhas.filter(a => situacao(a).o === 1)], [`Vencem até ${fmt(LIM7)}`, minhas.filter(a => situacao(a).o === 2)], ['Sem prazo', minhas.filter(a => situacao(a).o === 3)], ['Depois', minhas.filter(a => situacao(a).o === 4)]];
  return `
  <p class="lede-sub" style="margin:0">O que vence, o que atrasou e o que depende de cada pessoa, em todos os clientes. A mensagem de cobrança sai pronta para o WhatsApp.</p>
  <div class="toolbar"><label class="small muted" for="selP">Ver como</label><select id="selP">${pes.map(([n, c, k]) => `<option value="${esc(n)}"${n === p ? ' selected' : ''}>${esc(st.nome(n))}${st.pessoa(n) && st.pessoa(n).empresa === 'Solve' ? ' (Solve)' : ''} · ${c} ${plural(c, 'ação', 'ações')}${k ? `, ${k} ${plural(k, 'compromisso', 'compromissos')}` : ''}</option>`).join('')}</select>${eu && p === eu.id ? '<span class="pill acc">você</span>' : ''}${selCli}</div>
  <div class="grid3">
    <div class="stack">${meusComp.length ? `<section class="panel"><header><h2>Compromissos até ${fmt(LIM7)}</h2><a class="btn sm ghost" style="text-decoration:none" href="#agenda?p=${encodeURIComponent(p)}${fc ? '&c=' + encodeURIComponent(fc) : ''}">Ver todos</a></header>${compRows(meusComp, false)}</section>` : ''}${sec.filter(s => s[1].length).map(([t, l]) => `<section class="panel"><header><h2>${t}</h2><span class="small muted">${l.length}</span></header>${quickTable(l, varios)}</section>`).join('') || `<div class="empty">${fc ? `Nada aberto para ${esc(st.nome(p))} em ${esc(cliNome(fc))}.` : 'Nenhuma ação aberta.'}</div>`}</div>
    <section class="panel"><header><h2>Mensagem de cobrança</h2><button class="btn sm" data-do="copiarCob">Copiar</button></header><textarea class="out" id="cobTxt" readonly aria-label="Mensagem de cobrança" style="min-height:260px">${esc(cobranca(p, sec, varios))}</textarea></section>
  </div>`;
}
function cobranca(p, sec, varios) {
  const L = [`Oi, ${st.nome(p)}! Tudo bem?`, 'Seguem suas ações em aberto:', ''];
  sec.forEach(([t, l]) => { if (!l.length) return; L.push(`*${t}*`); l.forEach(a => L.push(`• ${varios ? `[${cliNome(a.cli)}] ` : ''}${a.acao}${a.prazo ? ` (prazo ${fmt(a.prazo)})` : ''}`)); L.push(''); });
  L.push('Pode me passar a previsão de cada uma até amanhã?');
  return L.join('\n');
}

/* ---------- gaveta e janela ---------- */
// Gaveta e janela: foco preso dentro enquanto abertas, fundo inerte e foco devolvido a quem abriu.
const FOCAVEIS = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function lembrar(el) {
  if (!el || el === document.body) return null;
  const b = el.closest('[data-acao],[data-comp],[data-do],[data-q],[data-c]');
  let sel = null;
  if (b && b.dataset.comp) sel = `button[data-comp="${CSS.escape(b.dataset.comp)}"]`;
  else if (b && b.dataset.c) sel = `[data-c="${CSS.escape(b.dataset.c)}"][data-id="${CSS.escape(b.dataset.id || '')}"]`;
  else if (b && b.dataset.acao) sel = `button[data-acao="${CSS.escape(b.dataset.acao)}"]`;
  else if (b && b.dataset.q) sel = `[data-q="${CSS.escape(b.dataset.q)}"][data-id="${CSS.escape(b.dataset.id || '')}"]`;
  else if (b && b.dataset.do) sel = `[data-do="${CSS.escape(b.dataset.do)}"]`;
  return { el, sel };
}
function renderLayer() {
  const L = $('#layer'), aberto = !!(S.drawer || S.modal);
  const dentro = L.contains(document.activeElement), prevId = dentro ? document.activeElement.id : null;
  if (aberto && !S.opener) S.opener = lembrar(document.activeElement);
  if (S.drawer) L.innerHTML = `<div class="scrim" data-do="fechar"></div>${drawerHtml()}`;
  else if (S.modal) L.innerHTML = `<div class="scrim" data-do="fechar"></div>${modalHtml()}`;
  else L.innerHTML = '';
  const root = $('#root'); if (root) root.inert = aberto;
  if (aberto) {
    const dlg = L.querySelector('[role="dialog"]');
    const el = (prevId && document.getElementById(prevId)) || (dlg && dlg.querySelector('h2[tabindex]'));
    if (el && !(dentro && document.activeElement === el)) el.focus();
  } else if (S.opener) {
    const o = S.opener; S.opener = null;
    const el = (o.el && o.el.isConnected && o.el) || (o.sel && document.querySelector(o.sel));
    if (el) el.focus();
  }
}
function prenderFoco(e) {
  const dlg = $('#layer [role="dialog"]');
  if (!dlg) return;
  const f = [...dlg.querySelectorAll(FOCAVEIS)].filter(x => x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && (document.activeElement === first || !dlg.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (document.activeElement === last || !dlg.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
}
function compDrawerHtml() {
  const { comp, modo } = S.drawer, c = st.compromisso(comp);
  if (!c) return '';
  const s = sitComp(c), serie = st.serieDe(c), aberto = c.status === 'Pendente';
  const outras = serie.filter(x => x !== c).slice(-6).reverse();
  const podePend = aberto && !c.demanda && !st.interno(c.cli);
  let form = '';
  if (modo === 'remarcar') form = `<form id="fRem" class="form boxed">
      <div class="field"><label for="rcData">Nova data</label><input type="date" id="rcData" required min="${HOJE}" value="${c.data && c.data >= HOJE ? c.data : ''}"></div>
      <div class="field"><label for="rcHora">Hora (opcional)</label><input type="time" id="rcHora" value="${esc(c.hora)}"></div>
      <div class="full small muted">Remarcar não pede motivo. A data original continua valendo para medir o cumprimento${c.rec !== 'Única' ? ' e para a próxima repetição' : ''}.</div>
      <div class="full row-actions"><button class="btn primary" type="submit">Salvar nova data</button><button class="btn" type="button" data-do="modo" data-m="">Voltar</button><span class="small err-text" id="rcErr" role="alert"></span></div></form>`;
  if (modo === 'editar') form = `<form id="fEdC" class="form boxed">
      <div class="field full"><label for="eOque">O quê</label><input id="eOque" required maxlength="255" value="${esc(c.oque)}"></div>
      <div class="field"><label for="eTipo">Tipo</label><select id="eTipo">${TIPOS_COMP.map(t => `<option${t === c.tipo ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="field"><label for="eHora">Hora (opcional)</label><input type="time" id="eHora" value="${esc(c.hora)}"></div>
      <div class="field full"><label for="eContra">Com quem</label><input id="eContra" list="eContraL" maxlength="255" autocomplete="off" value="${esc(contraNome(c))}"><datalist id="eContraL">${st.contrapartes(c.cli).map(p => `<option value="${esc(p.nome)}">`).join('')}</datalist></div>
      <div class="full small muted">A data muda em Remarcar, e quem cumpre em Trocar. ${c.rec !== 'Única' ? 'As próximas vezes da série nascem com o texto novo.' : ''}</div>
      <div class="full row-actions"><button class="btn primary" type="submit">Salvar edição</button><button class="btn" type="button" data-do="modo" data-m="">Voltar</button><span class="small err-text" id="eErr" role="alert"></span></div></form>`;
  if (modo === 'cliente') form = trocaCliHtml('comp', c);
  if (modo === 'resp') form = `<form id="fRespC" class="form boxed">
      <div class="field full"><label for="tResp">Quem cumpre</label><select id="tResp" required><option value="">Escolha</option>${optPessoas(c.cli, c.resp)}</select></div>
      <div class="full small muted">${c.rec !== 'Única' ? 'Vale para esta vez e para as próximas da série, que são criadas a partir desta. ' : ''}A data e o cumprimento não mudam.</div>
      <div class="full row-actions"><button class="btn primary" type="submit">Salvar responsável</button><button class="btn" type="button" data-do="modo" data-m="">Voltar</button><span class="small err-text" id="tErr" role="alert"></span></div></form>`;
  return `<aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="dwT">
    <div class="dh"><div style="min-width:0"><div class="label mono">${esc(c.id)} · ${esc(cliNome(c.cli))}</div><h2 id="dwT" tabindex="-1" style="margin-top:4px">${esc(c.oque)}</h2><div style="margin-top:8px" class="row-actions">${pill(s)}<span class="pill ok">${esc(c.status)}</span>${sugerePendencia(c) ? '<span class="pill acc">virar pendência?</span>' : ''}</div></div><button class="btn sm ghost xbtn" data-do="fechar" aria-label="Fechar">✕</button></div>
    <div class="db">
      <dl class="w5">
        <dt>O QUÊ</dt><dd>${esc(c.oque)} <span class="tag">${esc(c.tipo)}</span></dd>
        <dt>COM QUEM</dt><dd>${c.contra ? esc(contraNome(c)) : '<span class="muted">—</span>'}</dd>
        <dt>QUANDO</dt><dd>${fmtF(c.data)}${c.hora ? ' às ' + esc(c.hora) : ''}${c.dataOrig && c.dataOrig !== c.data ? `<span class="sub">data original ${fmtF(c.dataOrig)}</span>` : ''}${c.realizado ? `<span class="sub">${c.status === 'Feito' ? 'feito' : 'fechado'} em ${fmtF(c.realizado)}</span>` : ''}</dd>
        <dt>QUEM</dt><dd>${respHtml(c.resp)}${aberto && !modo ? ' <button class="btn sm ghost" data-do="modo" data-m="resp">Trocar</button>' : ''}</dd>
        <dt>REPETE</dt><dd>${c.rec === 'Única' ? 'Não' : c.rec + (aberto ? ` · a próxima é criada ao fechar esta (${fmt(st.proximaDe(c))})` : '')}</dd>
      </dl>
      ${!modo ? `<div class="row-actions"><button class="btn sm" data-do="modo" data-m="editar">Editar</button>${aberto ? `<button class="btn sm ghost" data-do="modo" data-m="cliente">Trocar cliente</button>` : ''}</div>` : ''}
      ${c.demanda ? `<div class="panel" style="padding:12px;background:var(--surface-2)"><div class="label">Virou pendência</div><button class="linkbtn" data-dem-go="${esc(c.demanda)}" data-cli-set="${esc(c.cli)}" style="margin-top:4px">${esc(st.demanda(c.demanda) ? st.demanda(c.demanda).titulo : c.demanda)}</button></div>` : ''}
      <form id="fRes" class="form"><div class="field full"><label for="cRes">Resultado${aberto ? ' (opcional, gravado ao fechar)' : ''}</label><textarea id="cRes" maxlength="2000" placeholder="Ex.: Layra enviou só o PIS; COFINS fica para segunda">${esc(c.resultado)}</textarea></div>
        ${aberto ? '' : '<div class="full row-actions"><button class="btn sm" type="submit">Salvar resultado</button></div>'}</form>
      ${outras.length ? `<div><div class="label" style="margin-bottom:6px">Outras vezes desta série</div><div class="hist">${outras.map(x => `<div><button class="linkbtn" data-comp="${esc(x.id)}">${fmtF(quando(x))}</button> · ${pill(sitComp(x))}${x.resultado ? `<br><span class="muted">${esc(x.resultado)}</span>` : ''}</div>`).join('')}</div></div>` : ''}
      ${c.registro ? `<div class="small muted">Registrado em ${fmtF(c.registro)}${c.por ? ' por ' + esc(c.por) : ''}</div>` : ''}
      ${form}
    </div>
    ${aberto && !modo ? `<div class="df"><button class="btn primary" data-do="compFeito">Feito</button><button class="btn" data-do="compNao">Não ocorreu</button><button class="btn" data-do="modo" data-m="remarcar">Remarcar</button>${podePend ? '<button class="btn" data-do="virarPend">Virar pendência</button>' : ''}<button class="btn danger ghost" data-do="compCancelar">${c.rec === 'Única' ? 'Cancelar' : 'Encerrar repetição'}</button></div>` : ''}
  </aside>`;
}
function drawerHtml() {
  if (S.drawer.comp) return compDrawerHtml();
  const { id, modo } = S.drawer, a = st.acao(id);
  if (!a) return '';
  const d = st.demanda(a.demanda), fr = d && d.frente ? st.frente(d.frente) : null, s = situacao(a);
  const hist = a.reprogramacoes.map((r, k) => `<div><b>${k + 1}ª reprogramação</b>: ${fmt(r.de)} → ${fmt(r.para)}<br><span class="muted">${esc(r.motivo)}${r.em ? ` · ${fmtF(r.em)}` : ''}${r.por ? ` · ${esc(r.por)}` : ''}</span></div>`).join('');
  let form = '';
  if (modo === 'reprog') {
    const definir = !a.prazo;
    form = `<form id="fRep" class="form boxed">
      ${!definir && a.reprogramacoes.length >= 1 ? `<div class="full note">Esta será a ${a.reprogramacoes.length + 1}ª reprogramação. A partir da segunda, leve a ação ao próximo fórum.</div>` : ''}
      <div class="field"><label for="rPrazo">${definir ? 'Prazo' : 'Novo prazo'}</label><input type="date" id="rPrazo" required min="${HOJE}"></div>
      ${definir ? '<div class="field"><label>&nbsp;</label><span class="small muted">A ação ainda não tinha prazo; este passa a ser o prazo original.</span></div>' : '<div class="field full"><label for="rMot">Motivo</label><input type="text" id="rMot" required placeholder="Ex.: aguardando NCM da contabilidade"></div>'}
      <div class="full row-actions"><button class="btn primary" type="submit">${definir ? 'Salvar prazo' : 'Salvar novo prazo'}</button><button class="btn" type="button" data-do="modo" data-m="">Voltar</button><span class="small err-text" id="rErr" role="alert"></span></div></form>`;
  }
  if (modo === 'resp') form = `<form id="fResp" class="form boxed">
      <div class="field"><label for="tResp">Novo responsável</label><select id="tResp" required><option value="">Escolha</option>${optPessoas(a.cli, a.resp)}</select></div>
      <div class="field"><label for="tApoio">Apoio (opcional)</label><input id="tApoio" maxlength="255" value="${esc(a.apoio)}" placeholder="Nomes, separados por vírgula"></div>
      <div class="full small muted">Prazo e histórico de prazo continuam os mesmos. O histórico de versões da lista guarda quem trocou e quando.</div>
      <div class="full row-actions"><button class="btn primary" type="submit">Salvar responsável</button><button class="btn" type="button" data-do="modo" data-m="">Voltar</button><span class="small err-text" id="tErr" role="alert"></span></div></form>`;
  if (modo === 'editar') form = `<form id="fEdA" class="form boxed">
      <div class="field full"><label for="eOque">O quê (ação)</label><input id="eOque" required maxlength="255" value="${esc(a.acao)}"></div>
      <div class="field full"><label for="ePq">Por quê (problema)</label><input id="ePq" maxlength="255" value="${esc(a.problema)}"></div>
      <div class="field full"><label for="eCausa">Causa (opcional)</label><input id="eCausa" maxlength="255" value="${esc(a.causa)}"></div>
      <div class="field"><label for="eArea">Onde (área)</label><select id="eArea"><option value="">—</option>${optAreas(a.area)}</select></div>
      <div class="field full"><label for="eComo">Como</label><textarea id="eComo" maxlength="2000">${esc(a.como)}</textarea></div>
      <div class="full small muted">Prazo, responsável e status têm botões próprios, para o novo prazo continuar pedindo motivo. O histórico de versões da lista guarda o texto anterior.</div>
      <div class="full row-actions"><button class="btn primary" type="submit">Salvar edição</button><button class="btn" type="button" data-do="modo" data-m="">Voltar</button><span class="small err-text" id="eErr" role="alert"></span></div></form>`;
  if (modo === 'mover') {
    const outras = demandasC(a.cli).filter(x => !x.encerrada && x.id !== a.demanda).sort((x, y) => (x.tipo === 'Questão crítica' ? 0 : 1) - (y.tipo === 'Questão crítica' ? 0 : 1) || x.titulo.localeCompare(y.titulo));
    const soDela = st.pendenciaSoDela(d, a);
    form = `<form id="fMov" class="form boxed">
      <div class="field full"><label for="mvDem">Mover para</label><select id="mvDem">${outras.length ? '<option value="">Escolha a demanda</option>' : ''}<option value="__nova__"${outras.length ? '' : ' selected'}>+ Nova demanda</option>${outras.map(x => `<option value="${esc(x.id)}">${esc(x.tipo === 'Questão crítica' ? 'QC · ' : x.tipo === 'Entrega de frente' ? 'Entrega · ' : '')}${esc(x.titulo)}</option>`).join('')}</select></div>
      ${novaDemHtml('mv', a.cli, a.acao, !outras.length)}
      <div class="full small muted">${soDela ? `A pendência atual (${esc(d.id)}) foi criada só para esta ação: ela será cancelada.` : 'A demanda atual continua; se ficar sem ações, aparece como Sem plano de ação.'} Prazo, responsável e histórico da ação não mudam.</div>
      <div class="full row-actions"><button class="btn primary" type="submit">Mover ação</button><button class="btn" type="button" data-do="modo" data-m="">Voltar</button><span class="small err-text" id="mvErr" role="alert"></span></div></form>`;
  }
  if (modo === 'cliente') form = trocaCliHtml('acao', a);
  if (modo === 'cancel') form = `<form id="fCan" class="form boxed">
      <div class="field full"><label for="cMot">Por que cancelar?</label><input type="text" id="cMot" required placeholder="Ex.: substituída por outra ação"></div>
      <div class="full row-actions"><button class="btn danger" type="submit">Cancelar ação</button><button class="btn" type="button" data-do="modo" data-m="">Voltar</button><span class="small err-text" id="cErr" role="alert"></span></div></form>`;
  return `<aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="dwT">
    <div class="dh"><div style="min-width:0"><div class="label mono">${esc(a.id)} · ${esc(cliNome(a.cli))}</div><h2 id="dwT" tabindex="-1" style="margin-top:4px">${esc(a.acao)}</h2><div style="margin-top:8px" class="row-actions">${pill(s)}<span class="pill ok">${esc(a.status)}</span></div></div><button class="btn sm ghost xbtn" data-do="fechar" aria-label="Fechar">✕</button></div>
    <div class="db">
      <dl class="w5">
        <dt>O QUÊ</dt><dd>${esc(a.acao)}</dd>
        <dt>POR QUÊ</dt><dd>${a.problema || a.causa ? `${esc(a.problema)}${a.problema && a.causa ? '<br>' : ''}${a.causa ? `<span class="muted">Causa: ${esc(a.causa)}</span>` : ''}` : '<span class="muted">Não registrado</span>'}</dd>
        <dt>QUEM</dt><dd>${respHtml(a.resp, a.apoio)}${aberta(a) && !modo ? ' <button class="btn sm ghost" data-do="modo" data-m="resp">Trocar</button>' : ''}</dd>
        <dt>QUANDO</dt><dd>Início ${fmtF(a.inicio)} · prazo ${fmtF(a.prazo)}${a.reprogramacoes.length ? `<span class="sub">prazo original ${fmtF(a.prazoOriginal)}</span>` : ''}${a.conclusao ? `<span class="sub">concluída em ${fmtF(a.conclusao)}</span>` : ''}</dd>
        <dt>ONDE</dt><dd>${esc(a.area) || '<span class="muted">—</span>'}</dd>
        <dt>COMO</dt><dd>${a.como ? esc(a.como) : '<span class="muted">Sem observação</span>'}</dd>
        <dt>QUANTO</dt><dd>${a.quanto !== null && a.quanto !== undefined ? 'R$ ' + Number(a.quanto).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '<span class="muted">Não registrado</span>'}</dd>
      </dl>
      ${!modo ? `<div class="row-actions"><button class="btn sm" data-do="modo" data-m="editar">Editar</button>${aberta(a) ? '<button class="btn sm ghost" data-do="modo" data-m="cliente">Trocar cliente</button>' : ''}</div>` : ''}
      <div class="panel" style="padding:12px;background:var(--surface-2)"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div class="label">Demanda</div>${!modo ? '<button class="btn sm ghost" data-do="modo" data-m="mover">Mover</button>' : ''}</div><button class="linkbtn" data-dem-go="${esc(d ? d.id : '')}" style="margin-top:4px">${esc(d ? d.titulo : a.demanda)}</button><div class="small muted">${esc(d ? d.tipo : '')}${fr ? ` · frente ${esc(fr.nome)}` : ''}</div></div>
      ${hist ? `<div><div class="label" style="margin-bottom:6px">Histórico de prazo</div><div class="hist">${hist}</div></div>` : ''}
      ${a.motivoCancel ? `<div class="note">Cancelada: ${esc(a.motivoCancel)}</div>` : ''}
      <div class="small muted">Origem: ${a.linha ? `linha ${a.linha} de ${esc(a.arquivo || 'arquivo de origem')}` : esc(a.origem || '—')} · registrada em ${fmtF(a.registro)}${a.statusOriginal ? ` · status no arquivo: “${esc(a.statusOriginal)}”` : ''}${a.respOriginal && a.respOriginal !== st.nome(a.resp) ? ` · responsável no arquivo: “${esc(a.respOriginal)}”` : ''}</div>
      ${form}
    </div>
    ${aberta(a) && !modo ? `<div class="df"><button class="btn primary" data-do="concluir">Concluir</button><button class="btn" data-do="modo" data-m="reprog">${a.prazo ? 'Novo prazo' : 'Definir prazo'}</button>${a.status === 'Não iniciada' ? '<button class="btn" data-do="iniciar">Iniciar</button>' : ''}<button class="btn danger ghost" data-do="modo" data-m="cancel">Cancelar</button></div>` : ''}
  </aside>`;
}
const optPessoas = (cli, sel) => st.pessoasPara(cli).map(p => `<option value="${esc(p.id)}"${p.id === sel ? ' selected' : ''}>${esc(p.nome)}${p.empresa === 'Solve' ? ' (Solve)' : ''}</option>`).join('');
const optAreas = sel => AREAS.map(a => `<option${a === sel ? ' selected' : ''}>${esc(a)}</option>`).join('');
// Campos de "+ Nova demanda" (no registro de ação e no mover). Ficam escondidos até a pessoa escolher a opção.
function novaDemHtml(px, cli, titulo, aberto) {
  const frs = st.frentes.filter(f => f.cli === cli && !f.encerrada).sort((a, b) => a.nome.localeCompare(b.nome));
  return `<div class="full nova-dem" id="${px}Nova"${aberto ? '' : ' hidden'}>
      <div class="field full"><label for="${px}Tit">Título da nova demanda</label><input id="${px}Tit" maxlength="255" value="${esc(titulo || '')}" placeholder="Em branco, leva o texto da ação"></div>
      <div class="field"><label for="${px}Tipo">Tipo</label><select id="${px}Tipo">${TIPOS_DEM.map(t => `<option>${t}</option>`).join('')}</select></div>
      <div class="field"><label for="${px}Fr">Frente (opcional)</label><select id="${px}Fr"><option value="">Nenhuma</option>${frs.map(f => `<option value="${esc(f.id)}">${esc(f.nome)}</option>`).join('')}</select></div>
    </div>`;
}
// Troca de cliente de ação ou compromisso. Só para registro sem história; o motivo aparece quando não pode.
function trocaCliHtml(tipo, obj) {
  const pode = st.podeTrocarCliente(tipo, obj);
  if (!pode.ok) return `<div class="boxed form"><div class="full note">Não dá para trocar o cliente: ${esc(pode.motivo)} O código carrega o cliente e o histórico ficaria ligado ao cliente errado. Se foi registrado no cliente errado, cancele e registre de novo no cliente certo.</div>
      <div class="full row-actions"><button class="btn" type="button" data-do="modo" data-m="">Voltar</button></div></div>`;
  const lista = (tipo === 'comp' ? clientesComp() : clientesOrd()).filter(c => c.id !== obj.cli && c.situacao !== 'Encerrado');
  const dest = S.drawer.tcCli && lista.some(c => c.id === S.drawer.tcCli) ? S.drawer.tcCli : '';
  const respOk = dest && st.pessoasPara(dest).some(p => p.id === obj.resp) ? obj.resp : '';
  const demAtual = tipo === 'acao' ? st.demanda(obj.demanda) : null;
  const dems = dest && tipo === 'acao' ? demandasC(dest).filter(x => !x.encerrada).sort((x, y) => x.titulo.localeCompare(y.titulo)) : [];
  return `<form id="fTroca" class="form boxed" data-tipo="${tipo}">
      <div class="field full"><label for="tcCli">Cliente certo</label><select id="tcCli" required><option value="">Escolha</option>${lista.map(c => `<option value="${esc(c.id)}"${c.id === dest ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div>
      ${dest ? `<div class="field${tipo === 'acao' ? '' : ' full'}"><label for="tcResp">${tipo === 'comp' ? 'Quem cumpre' : 'Responsável'}</label><select id="tcResp" required><option value="">Escolha</option>${optPessoas(dest, respOk)}</select></div>
      ${tipo === 'acao' ? `<div class="field"><label for="tcDem">Demanda no cliente certo</label><select id="tcDem"><option value="">Nova: ${esc((demAtual ? demAtual.titulo : obj.acao).slice(0, 60))}</option>${dems.map(x => `<option value="${esc(x.id)}">${esc(x.titulo)}</option>`).join('')}</select></div>` : ''}` : ''}
      <div class="full small muted">O registro é recriado em ${dest ? esc(cliNome(dest)) : 'outro cliente'} com código novo, com o mesmo texto, prazo e status. O ${esc(obj.id)} vai para a lixeira do site${tipo === 'acao' && st.pendenciaSoDela(demAtual, obj) ? `, junto com a pendência ${esc(demAtual.id)}, criada só para ele` : ''}.</div>
      <div class="full row-actions"><button class="btn primary" type="submit"${dest ? '' : ' disabled'}>Trocar cliente</button><button class="btn" type="button" data-do="modo" data-m="">Voltar</button><span class="small err-text" id="tcErr" role="alert"></span></div></form>`;
}
function editDemModalHtml() {
  const d = st.demanda(S.modal.dem);
  if (!d) return '';
  const tipoLivre = TIPOS_DEM.includes(d.tipo);
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mT">
    ${cabModal('Editar demanda')}
    <p class="small muted" style="margin:0"><span class="mono">${esc(d.id)}</span> · ${esc(cliNome(d.cli))}</p>
    <form id="fEdD" class="form">
      <div class="field full"><label for="eTit">Título</label><input id="eTit" required maxlength="255" value="${esc(d.titulo)}"></div>
      <div class="field"><label for="eTipo">Tipo</label>${tipoLivre ? `<select id="eTipo">${TIPOS_DEM.map(t => `<option${t === d.tipo ? ' selected' : ''}>${t}</option>`).join('')}</select>` : `<input id="eTipo" value="${esc(d.tipo)}" disabled>`}</div>
      <div class="field"><label for="ePrio">Prioridade</label><select id="ePrio"><option value="">Sem prioridade</option>${[1, 2, 3, 4, 5, 6, 7].map(n => `<option value="${n}"${n === d.prioridade ? ' selected' : ''}>P${n}</option>`).join('')}</select></div>
      <div class="field full"><label for="eArea">Área</label><select id="eArea"><option value="">—</option>${optAreas(d.area)}</select></div>
      <div class="full row-actions"><button class="btn primary" type="submit">Salvar edição</button><button class="btn" type="button" data-do="fechar">Voltar</button><span class="small err-text" id="eErr" role="alert"></span></div>
    </form>
    <p class="small muted" style="margin:0">${tipoLivre ? 'O código não muda ao trocar o tipo. ' : 'Entregas de frente, deliberações e desvios mantêm o tipo. '}Responsável muda em Trocar responsável; o status vem das ações.</p>
  </div>`;
}
const cabModal = t => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 id="mT" tabindex="-1">${t}</h2><button class="btn sm ghost xbtn" data-do="fechar" aria-label="Fechar">✕</button></div>`;
function frenteModalHtml() {
  const cli = S.modal.cli || S.cli;
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mT">
    ${cabModal('Nova frente')}
    <form id="fFrente" class="form">
      <div class="field full"><label for="nfCli">Cliente</label><select id="nfCli">${clientesOrd().map(c => `<option value="${esc(c.id)}"${c.id === cli ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div>
      <div class="field full"><label for="nfNome">Nome da frente</label><input id="nfNome" required maxlength="255" placeholder="Ex.: Implantar o fluxo de caixa diário"></div>
      <div class="field full"><label for="nfEnt">Primeira entrega (opcional)</label><input id="nfEnt" maxlength="255" placeholder="Em branco, a entrega leva o nome da frente"></div>
      <div class="field"><label for="nfDono">Dono</label><select id="nfDono" required><option value="">Escolha</option>${optPessoas(cli)}</select></div>
      <div class="field"><label for="nfArea">Área</label><select id="nfArea" required><option value="">Escolha</option>${optAreas('')}</select></div>
      <div class="field"><label for="nfIni">Início</label><input type="date" id="nfIni" value="${HOJE}"></div>
      <div class="field"><label for="nfFim">Fim previsto</label><input type="date" id="nfFim" required min="${HOJE}"></div>
      <div class="field full"><label for="nfApoio">Apoio (opcional)</label><input id="nfApoio" maxlength="255" placeholder="Nomes, separados por vírgula"></div>
      <div class="full row-actions"><button class="btn primary" type="submit">Criar frente</button><span class="small err-text" id="nfErr" role="alert"></span></div>
    </form>
    <p class="small muted" style="margin:0">O código (${esc(cli)}-F..) é gerado sozinho. A frente nasce com uma demanda de entrega e, em seguida, abre a primeira ação: frente sem ação aberta aparece como “sem plano ativo”.</p>
  </div>`;
}
function entregaModalHtml() {
  const fr = st.frente(S.modal.fr);
  if (!fr) return '';
  const n = st.demandas.filter(d => d.frente === fr.id).length;
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mT">
    ${cabModal('Nova entrega')}
    <p class="small muted" style="margin:0">Frente <b>${esc(fr.nome)}</b> · ${n} ${plural(n, 'entrega registrada', 'entregas registradas')}${fr.encerrada ? ' · a frente está encerrada e será reaberta' : ''}</p>
    <form id="fEntrega" class="form">
      <div class="field full"><label for="neTit">Entrega</label><input id="neTit" required maxlength="255" value="${n ? '' : esc(fr.nome)}" placeholder="O que esta etapa da frente entrega"></div>
      <div class="field"><label for="neResp">Responsável</label><select id="neResp" required><option value="">Escolha</option>${optPessoas(fr.cli, st.nominal(fr.dono) ? fr.dono : '')}</select></div>
      <div class="field"><label for="neArea">Área</label><select id="neArea" required><option value="">Escolha</option>${optAreas(fr.area)}</select></div>
      <div class="field"><label for="nePrazo">Prazo</label><input type="date" id="nePrazo" required min="${HOJE}" value="${fr.fim && fr.fim >= HOJE ? fr.fim : ''}"></div>
      <div class="full row-actions"><button class="btn primary" type="submit">Criar entrega</button><span class="small err-text" id="neErr" role="alert"></span></div>
    </form>
  </div>`;
}
function compModalHtml() {
  const cli = S.modal.cli, eu = st.eu();
  const pes = st.pessoasPara(cli), cl = st.cliente(cli);
  const resp = S.modal.resp || (eu && pes.some(p => p.id === eu.id) ? eu.id : cl && pes.some(p => p.id === cl.consultor) ? cl.consultor : '');
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mT">
    ${cabModal('Novo compromisso')}
    <form id="fComp" class="form">
      <div class="field full"><label for="cCli">Cliente</label><select id="cCli">${clientesComp().map(c => `<option value="${esc(c.id)}"${c.id === cli ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div>
      <div class="field full"><label for="cOque">O quê</label><input id="cOque" required maxlength="255" autocomplete="off" placeholder="Ex.: Solicitar a Layra a apuração de PIS e COFINS todo dia 05"><span class="small muted" id="cHint" aria-live="polite">Escreva como falaria: data, hora, “com fulano”, “todo dia 05” ou “toda segunda” preenchem os campos sozinhos.</span></div>
      <div class="field"><label for="cContra">Com quem</label><input id="cContra" list="cContraL" maxlength="255" autocomplete="off" placeholder="Pessoa do cliente ou da Solve"><datalist id="cContraL">${st.contrapartes(cli).map(p => `<option value="${esc(p.nome)}">`).join('')}</datalist></div>
      <div class="field"><label for="cResp">Quem cumpre</label><select id="cResp" required><option value="">Escolha</option>${pes.map(p => `<option value="${esc(p.id)}"${p.id === resp ? ' selected' : ''}>${esc(p.nome)}${p.empresa === 'Solve' ? ' (Solve)' : ''}</option>`).join('')}</select></div>
      <div class="field"><label for="cData">Data</label><input type="date" id="cData" required min="${HOJE}"></div>
      <div class="field"><label for="cHora">Hora (opcional)</label><input type="time" id="cHora"></div>
      <div class="field"><label for="cRec">Repete</label><select id="cRec">${REPETICOES.map(r => `<option>${r}</option>`).join('')}</select></div>
      <div class="field"><label for="cTipo">Tipo</label><select id="cTipo">${TIPOS_COMP.map(r => `<option${r === 'Outro' ? ' selected' : ''}>${r}</option>`).join('')}</select></div>
      <div class="full row-actions"><button class="btn primary" type="submit">Registrar compromisso</button><span class="small err-text" id="cErr" role="alert"></span></div>
    </form>
    <p class="small muted" style="margin:0">Compromisso é um passo só, com data, que não muda o rumo do cliente se atrasar um dia. Se precisa de mais de um passo, de um dono no cliente ou de análise de causa, registre como ação.</p>
  </div>`;
}
// Preenche data, hora, repetição, tipo e "com quem" a partir do texto, sem mexer no que a pessoa já escolheu à mão.
function lerCompTexto() {
  const i = $('#cOque'); if (!i) return;
  const cli = $('#cCli').value, r = lerLinha(i.value, st.contrapartes(cli), HOJE);
  const pos = (id, v) => { const el = $('#' + id); if (el && !el.dataset.manual && v) el.value = v; };
  pos('cData', r.data); pos('cHora', r.hora); pos('cRec', r.rec); pos('cTipo', r.tipo !== 'Outro' ? r.tipo : null); pos('cContra', r.contraNome);
  const achou = r.data || r.hora || r.rec;
  $('#cHint').textContent = achou && r.texto ? `Vai gravar: “${r.texto}”${r.data ? ' · ' + fmtF(r.data) : ''}${r.hora ? ' às ' + r.hora : ''}${r.rec ? ' · repete ' + r.rec.toLowerCase() : ''}` : 'Escreva como falaria: data, hora, “com fulano”, “todo dia 05” ou “toda segunda” preenchem os campos sozinhos.';
}
function respDemModalHtml() {
  const d = st.demanda(S.modal.dem);
  if (!d) return '';
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mT">
    ${cabModal('Trocar responsável da demanda')}
    <p class="small muted" style="margin:0"><span class="mono">${esc(d.id)}</span> · ${esc(d.titulo)} · hoje: ${d.resp ? esc(st.nome(d.resp)) : 'sem dono nominal'}</p>
    <form id="fRespD" class="form">
      <div class="field full"><label for="tResp">Novo responsável</label><select id="tResp" required><option value="">Escolha</option>${optPessoas(d.cli, d.resp)}</select></div>
      <div class="full row-actions"><button class="btn primary" type="submit">Salvar responsável</button><span class="small err-text" id="tErr" role="alert"></span></div>
    </form>
    <p class="small muted" style="margin:0">As ações da demanda continuam com os responsáveis delas. Para trocar o de uma ação, abra a ação.</p>
  </div>`;
}
function modalHtml() {
  if (S.modal.kind === 'presenca') return presencaModalHtml();
  if (S.modal.kind === 'delib') return delibModalHtml();
  if (S.modal.kind === 'incluir') return incluirModalHtml();
  if (S.modal.kind === 'respDem') return respDemModalHtml();
  if (S.modal.kind === 'editDem') return editDemModalHtml();
  if (S.modal.kind === 'comp') return compModalHtml();
  if (S.modal.kind === 'frente') return frenteModalHtml();
  if (S.modal.kind === 'entrega') return entregaModalHtml();
  const cli = S.modal.cli || S.cli;
  const pre = S.modal.dem || '';
  const pes = st.pessoasPara(cli);
  const dems = demandasC(cli).filter(d => d.id === pre || !d.encerrada).sort((a, b) => a.titulo.localeCompare(b.titulo));
  const areaPre = pre && st.demanda(pre) ? st.demanda(pre).area : '';
  const pf = S.modal.pre || {};
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mT">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 id="mT" tabindex="-1">${S.modal.comp ? 'Virar pendência' : 'Nova ação'}</h2><button class="btn sm ghost xbtn" data-do="fechar" aria-label="Fechar">✕</button></div>
    <form id="fNova" class="form">
      <div class="field full"><label for="mCli">Cliente</label><select id="mCli">${clientesOrd().map(c => `<option value="${esc(c.id)}"${c.id === cli ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div>
      <div class="field full"><label for="mAcao">O quê (ação)</label><input id="mAcao" required maxlength="255" value="${esc(pf.acao || '')}" placeholder="Verbo no infinitivo + objeto. Ex.: Enviar a posição do estoque de outubro"></div>
      <div class="field full"><label for="mPq">Por quê (problema ou causa)</label><input id="mPq" maxlength="255" value="${esc(pf.porque || '')}"></div>
      <div class="field full"><label for="mDem">Demanda</label><select id="mDem"><option value="">Nova pendência com o mesmo título</option>${S.modal.comp ? '' : '<option value="__nova__">+ Nova demanda (escolher título, tipo e frente)</option>'}${dems.map(d => `<option value="${esc(d.id)}"${d.id === pre ? ' selected' : ''}>${esc(d.titulo)}</option>`).join('')}</select></div>
      ${S.modal.comp ? '' : novaDemHtml('mNd', cli, '', false)}
      <div class="field"><label for="mResp">Quem</label><select id="mResp" required><option value="">Escolha</option>${pes.map(p => `<option value="${esc(p.id)}"${p.id === pf.resp ? ' selected' : ''}>${esc(p.nome)}${p.empresa === 'Solve' ? ' (Solve)' : ''}</option>`).join('')}</select></div>
      <div class="field"><label for="mPrazo">Prazo</label><input type="date" id="mPrazo" required min="${HOJE}"></div>
      <div class="field"><label for="mArea">Onde (área)</label><select id="mArea" required><option value="">Escolha</option>${AREAS.map(a => `<option${a === areaPre ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select></div>
      <div class="field"><label for="mComo">Como (opcional)</label><input id="mComo" maxlength="500"></div>
      <div class="full row-actions"><button class="btn primary" type="submit">Registrar ação</button><span class="small err-text" id="mErr" role="alert"></span></div>
    </form>
    ${S.modal.comp ? `<p class="small muted" style="margin:0">Cria uma pendência nova com esta ação e liga o compromisso ${esc(S.modal.comp)} a ela. O compromisso continua na agenda até ser fechado.</p>` : ''}
    <p class="small muted" style="margin:0">Ação sem dono nominal ou sem prazo não entra: é a regra que evita repetir o problema da planilha. Se a pessoa não aparece na lista, cadastre-a em GP_Pessoas.</p>
  </div>`;
}
function abrirAcao(id) { S.drawer = { id, modo: null }; S.modal = null; renderLayer(); }
// Formulário aberto com algo digitado: pergunta antes de descartar.
function sujo() {
  const f = $('#layer form');
  return !!f && [...f.querySelectorAll('input:not([type=checkbox]):not([type=hidden]),textarea')].some(i => i.value.trim() && i.value !== i.defaultValue);
}
function fechar(forcar) {
  if (!forcar && sujo() && !confirm('Descartar o que foi digitado?')) return;
  S.drawer = null; S.modal = null; renderLayer();
}

/* ---------- gravação ---------- */
function fotografarCampos() {
  return [...document.querySelectorAll('#layer form [id], #view form [id], #ataTxt, #ataPart')]
    .filter(el => /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)).map(el => ({ id: el.id, v: el.value, c: el.checked }));
}
function restaurarCampos(fs) {
  fs.forEach(({ id, v, c }) => { const el = document.getElementById(id); if (!el) return; if (el.type === 'checkbox') el.checked = c; else el.value = v; });
}
async function grava(fn, okMsg, undo) {
  if (S.busy) return;
  S.busy = true; document.body.classList.add('busy');
  const campos = fotografarCampos();
  let falhou = false;
  try {
    const r = await fn();
    toast(typeof okMsg === 'function' ? okMsg(r) : okMsg, false, undo && undo.length ? () => undo(r) : undo);
    if (st.avisos.length) { toast(st.avisos.join(' '), true); st.avisos = []; }
  } catch (e) {
    console.error(e);
    falhou = true;
    toast(e.status === 401
      ? 'Sua sessão com a Microsoft expirou e nada foi gravado. Atualize a página para entrar de novo; o que você digitou continua no formulário.'
      : e.status === 412
      ? `${e.message || 'Outra pessoa alterou este registro'}, então não gravei para não apagar a alteração dela. Os dados foram relidos: confira e faça de novo. O que você digitou continua no formulário.`
      : 'Não consegui gravar no SharePoint: ' + (e.message || e) + '. Nada foi alterado; os dados foram relidos e o que você digitou continua no formulário.', true);
    await recarregar(true);
  } finally {
    S.busy = false; document.body.classList.remove('busy');
    render();
    if (falhou) restaurarCampos(campos);
  }
}
async function recarregar(silencioso) {
  if (S.reloading) return;
  S.reloading = true; document.body.classList.add('busy');
  const b = $('#btnSync'); if (b) { b.disabled = true; b.textContent = 'Atualizando…'; }
  try { await st.load(); if (!silencioso) toast('Dados atualizados do SharePoint'); }
  catch (e) { console.error(e); toast('Não consegui ler as listas: ' + (e.message || e), true); }
  finally {
    S.reloading = false; document.body.classList.remove('busy');
    if (b) { b.disabled = false; b.textContent = 'Atualizar'; }
    render();
  }
}
const fecharComp = (c, status, resultado) => {
  const msg = { Feito: 'feito', 'Não ocorreu': 'marcado como não ocorrido', Cancelado: 'cancelado' }[status];
  grava(() => st.fecharCompromisso(c, status, resultado), r => `${c.id} ${msg}${r.prox ? `; próxima vez em ${fmt(r.prox.data)}` : ''}`,
    r => grava(() => st.desfazerFechamento(c, r.ant, r.prox), `${c.id} voltou para pendente`));
};
const concluirComDesfazer = a => {
  const antes = a.status;
  grava(() => st.concluir(a), `${a.id} concluída`, () => grava(() => st.desfazerConclusao(a, antes), `${a.id} voltou para ${antes === 'Não iniciada' ? 'não iniciada' : 'em andamento'}`));
};
// Rascunho da ata guardado na aba: sobrevive a recarregar a página ou a um novo login.
const ATA_KEY = 'gp.ataRascunho';
function guardarAta() { try { if (S.ataRascunho) sessionStorage.setItem(ATA_KEY, JSON.stringify(S.ataRascunho)); } catch (e) { /* sem storage */ } }
function esquecerAta() { try { sessionStorage.removeItem(ATA_KEY); } catch (e) { /* sem storage */ } }
function recuperarAta() {
  try { const r = JSON.parse(sessionStorage.getItem(ATA_KEY) || 'null'); if (r && r.fo) { S.ataRascunho = { fo: r.fo, texto: r.texto }; S.ataDirty = true; } } catch (e) { /* sem storage */ }
}
const atualizarEstadoAta = () => { const el = $('#ataEstado'); if (el) el.innerHTML = ataEstado(st.forum(S.fo.id)); };

/* ---------- eventos ---------- */
function onClick(e) {
  const acct = $('#acct'); if (acct && acct.open && !e.target.closest('#acct')) acct.open = false;
  const t = e.target.closest('button, a, tr[data-acao], tr[data-comp], tr[data-cli-go], [data-do]');
  if (!t) return;
  const ds = t.dataset;
  if (ds.tema) { aplicarTema(ds.tema); render(); const b = document.querySelector(`#${t.closest('.tema').id} [data-tema="${ds.tema}"]`); if (b) b.focus(); return; }
  if (ds.fcli) { e.stopPropagation(); filtrarPelaTag(ds.fcli); return; }
  if (ds.cliSet) { S.cli = ds.cliSet; S.todos = false; }
  if (ds.cliGo) { S.cli = ds.cliGo; go('visao'); return; }
  if (ds.sig) { e.preventDefault(); S.fa = { ...FA0, sit: ds.sig }; S.todos = false; S.drawer = null; go('acoes'); return; }
  if (ds.resp) { S.fa = { ...FA0, resp: ds.resp }; S.todos = false; go('acoes'); return; }
  if (ds.demGo) { S.demOpen.add(ds.demGo); S.fd = { tipo: 'todas', st: 'todas' }; S.drawer = null; go('demandas'); setTimeout(() => { const el = document.getElementById('dem-' + ds.demGo); if (el) el.scrollIntoView({ block: 'center' }); }, 30); return; }
  if (ds.dem) { S.demOpen.has(ds.dem) ? S.demOpen.delete(ds.dem) : S.demOpen.add(ds.dem); render(); const b = document.querySelector(`[data-dem="${CSS.escape(ds.dem)}"]`); if (b) b.focus(); return; }
  if (ds.fdTipo) { S.fd.tipo = ds.fdTipo; render(); return; }
  if (ds.fdSt) { S.fd.st = ds.fdSt; render(); return; }
  if (ds.fo) { S.fo = { id: ds.fo }; go('forum'); window.scrollTo({ top: 0 }); return; }
  if (ds.cv) { cliqueConvocacao(ds); return; }
  if (ds.pi) { cliqueItem(ds); return; }
  if (ds.inc) { const fo = st.forum(S.modal.fo); if (fo) grava(() => st.incluirNaPauta(fo, { tipo: ds.inc, reg: ds.id }), `${ds.id} incluído na pauta`); return; }
  if (ds.q === 'concluir') { e.stopPropagation(); const a = st.acao(ds.id); if (a) concluirComDesfazer(a); return; }
  if (ds.q === 'reprog') { e.stopPropagation(); S.drawer = { id: ds.id, modo: 'reprog' }; renderLayer(); const i = $('#rPrazo'); if (i) i.focus(); return; }
  if (ds.c === 'feito') { e.stopPropagation(); const c = st.compromisso(ds.id); if (c) fecharComp(c, 'Feito'); return; }
  if (ds.c === 'remarcar') { e.stopPropagation(); S.modal = null; S.drawer = { comp: ds.id, modo: 'remarcar' }; renderLayer(); const i = $('#rcData'); if (i) i.focus(); return; }
  if (ds.fcVer) { S.fc.ver = ds.fcVer; render(); return; }
  if (ds.comp) { S.modal = null; S.drawer = { comp: ds.comp, modo: null }; renderLayer(); return; }
  if (ds.acao) { abrirAcao(ds.acao); return; }
  if (ds.go) { if (ds.fd) S.fd = { tipo: 'todas', st: ds.fd }; go(ds.go); return; }
  switch (ds.do) {
    case 'fechar': fechar(); break;
    case 'modo': S.drawer.modo = ds.m || null; S.drawer.tcCli = ''; renderLayer(); { const alvo = { cancel: '#cMot', remarcar: '#rcData', resp: '#tResp', reprog: '#rPrazo', editar: '#eOque', mover: '#mvDem', cliente: '#tcCli' }[ds.m] || '#dwT'; const i = $(alvo) || $('#layer .boxed button'); if (i) i.focus(); } break;
    case 'editDem': S.drawer = null; S.modal = { kind: 'editDem', dem: ds.id }; renderLayer(); { const i = $('#eTit'); if (i) i.focus(); } break;
    case 'respDem': S.drawer = null; S.modal = { kind: 'respDem', dem: ds.id }; renderLayer(); { const i = $('#tResp'); if (i) i.focus(); } break;
    case 'cancDem': { const d = st.demanda(ds.id); if (d) grava(() => st.cancelarDemanda(d), `${d.id} cancelada`, () => grava(() => st.reabrirDemanda(d), `${d.id} reaberta`)); break; }
    case 'novoComp': {
      const r = ROUTES[route()];
      S.drawer = null; S.modal = { kind: 'comp', cli: (r.global ? S.fc.cli : '') || S.cli }; renderLayer(); { const i = $('#cOque'); if (i) i.focus(); } break;
    }
    case 'compFeito': case 'compNao': {
      const c = st.compromisso(S.drawer.comp), res = $('#cRes') ? $('#cRes').value.trim() : undefined;
      S.drawer = null; fecharComp(c, ds.do === 'compFeito' ? 'Feito' : 'Não ocorreu', res); break;
    }
    case 'compCancelar': {
      const c = st.compromisso(S.drawer.comp);
      if (!confirm(c.rec === 'Única' ? `Cancelar “${c.oque}”?` : `Cancelar esta vez e encerrar a repetição de “${c.oque}”? Nenhuma nova ocorrência será criada.`)) break;
      S.drawer = null; fecharComp(c, 'Cancelado', $('#cRes') ? $('#cRes').value.trim() : undefined); break;
    }
    case 'virarPend': {
      const c = st.compromisso(S.drawer.comp);
      S.drawer = null;
      S.modal = { dem: '', cli: c.cli, comp: c.id, pre: { acao: c.oque, porque: `Compromisso de ${fmtF(quando(c))} não cumprido (${c.id})`, resp: st.nominal(c.contra) && st.pessoasPara(c.cli).some(p => p.id === c.contra) ? c.contra : '' } };
      renderLayer(); { const i = $('#mResp').value ? $('#mPrazo') : $('#mResp'); if (i) i.focus(); } break;
    }
    case 'concluir': { const a = st.acao(S.drawer.id); concluirComDesfazer(a); break; }
    case 'iniciar': { const a = st.acao(S.drawer.id); grava(() => st.iniciar(a), `${a.id} em andamento`); break; }
    case 'encerrarDem': { const d = st.demanda(ds.id); if (d) grava(() => st.encerrarDemanda(d), 'Demanda encerrada', () => grava(() => st.reabrirDemanda(d), 'Demanda reaberta')); break; }
    case 'capturar': S.drawer = null; S.modal = { dem: ds.demPre || '', cli: (ds.demPre && st.demanda(ds.demPre) ? st.demanda(ds.demPre).cli : S.cli) }; renderLayer(); { const i = $('#mAcao'); if (i) i.focus(); } break;
    case 'novaFrente': S.drawer = null; S.modal = { kind: 'frente', cli: S.cli }; renderLayer(); { const i = $('#nfNome'); if (i) i.focus(); } break;
    case 'novaEntrega': S.drawer = null; S.modal = { kind: 'entrega', fr: ds.fr }; renderLayer(); { const i = $('#neTit'); if (i) i.focus(); } break;
    case 'copiarAta': copiar($('#ataTxt').value, $('#ataTxt')); break;
    case 'gerarAta': {
      const fo = st.forum(S.fo.id); if (!fo) break;
      if (S.ataDirty && !confirm('Gerar a ata de novo apaga as edições que você fez no texto. Continuar?')) break;
      S.ataRascunho = null; S.ataDirty = false; esquecerAta(); $('#ataTxt').value = st.ataDoForum(fo); atualizarEstadoAta(); break;
    }
    case 'salvarAta': {
      const fo = st.forum(S.fo.id); if (!fo) break;
      const texto = $('#ataTxt').value;
      S.ataRascunho = { fo: fo.id, texto };
      grava(async () => { await st.salvarAta(fo, texto); S.ataDirty = false; S.ataRascunho = null; esquecerAta(); }, 'Ata salva no SharePoint');
      break;
    }
    case 'novoForum':
      if (!S.conv || S.conv.cli !== S.cli || S.conv.editId) S.conv = novoRascunho(null);
      S.fo = { novo: true }; go('forum'); window.scrollTo({ top: 0 }); break;
    case 'foLista': S.fo = {}; go('forum'); break;
    case 'foEditar': { const fo = st.forum(S.fo.id); if (!fo) break; S.conv = novoRascunho(fo); S.fo = { id: fo.id, editar: true }; go('forum'); window.scrollTo({ top: 0 }); break; }
    case 'foCancelar': {
      const fo = st.forum(S.fo.id); if (!fo) break;
      if (!confirm(`Cancelar o fórum de ${fmtF(fo.data)}${fo.hora ? ' às ' + fo.hora : ''}? A pauta fica registrada, mas o fórum não acontece.`)) break;
      grava(() => st.cancelarForum(fo), 'Fórum cancelado', () => grava(() => st.reagendarForum(fo), 'Fórum agendado de novo'));
      break;
    }
    case 'foExcluir': {
      const fo = st.forum(S.fo.id); if (!fo) break;
      const np = st.pautaDe(fo.id).length, nd = st.delib.filter(x => x.forum === fo.id).length;
      const ligados = [np ? `${np} ${plural(np, 'item da pauta', 'itens da pauta')}` : '', nd ? `${nd} ${plural(nd, 'deliberação', 'deliberações')}` : '', fo.ata ? 'a ata' : ''].filter(Boolean);
      const msg = `Excluir o fórum de ${fmtF(fo.data)}${fo.hora ? ' às ' + fo.hora : ''}?\n\nVão para a lixeira do SharePoint: o fórum${ligados.length ? ', ' + ligados.join(', ') : ''}. ` +
        `As ações criadas nele continuam no plano.${fo.situacao === 'Em andamento' ? ' O fórum está em andamento.' : ''}\n\nDá para restaurar pela lixeira do site em até 93 dias.`;
      if (!confirm(msg)) break;
      grava(async () => {
        const r = await st.excluirForum(fo);
        if (S.ataRascunho && S.ataRascunho.fo === fo.id) { S.ataRascunho = null; S.ataDirty = false; esquecerAta(); }
        S.fo = {}; syncHash(); return r;
      }, `Fórum de ${fmtF(fo.data)} excluído`);
      break;
    }
    case 'foIniciar': S.drawer = null; S.modal = { kind: 'presenca', fo: S.fo.id, iniciar: true }; renderLayer(); break;
    case 'foPresenca': S.drawer = null; S.modal = { kind: 'presenca', fo: S.fo.id, iniciar: false }; renderLayer(); break;
    case 'foIncluir': S.drawer = null; S.incl = { q: '', ft: 'todas', fr: '', abertos: [], sug: null }; S.modal = { kind: 'incluir', fo: S.fo.id }; renderLayer(); { const i = $('#inQ'); if (i) i.focus(); } break;
    case 'inNova': S.modal = { dem: '', cli: S.cli }; renderLayer(); { const i = $('#mAcao'); if (i) i.focus(); } break;
    case 'foEncerrar': {
      const fo = st.forum(S.fo.id); if (!fo) break;
      const sem = st.pautaDe(fo.id).filter(p => !p.trat).length;
      if (!confirm(sem ? `${sem} ${plural(sem, 'item está', 'itens estão')} sem tratamento e ${plural(sem, 'vai', 'vão')} como “Não tratado” para a pauta do próximo fórum. Encerrar o fórum?` : 'Encerrar o fórum? Depois de encerrado, a pauta não muda mais e a ata fica pronta para revisar.')) break;
      grava(() => st.encerrarForum(fo), 'Fórum encerrado. Revise a ata e salve no SharePoint.');
      break;
    }
    case 'copiarCob': copiar($('#cobTxt').value, $('#cobTxt')); break;
    case 'recarregar': recarregar(); break;
    case 'sair': if (S.ataDirty && !confirm('A ata editada ainda não foi salva no SharePoint. Sair mesmo assim?')) break; esquecerAta(); if (ctx.logout) ctx.logout(); break;
    default: break;
  }
}
function onSubmit(e) {
  e.preventDefault();
  const f = e.target;
  onSubmitForum(f);
  if (f.id === 'fRep') {
    const a = st.acao(S.drawer.id), p = $('#rPrazo').value;
    if (!p || p < HOJE) { $('#rErr').textContent = 'Escolha uma data a partir de hoje.'; return; }
    if (!a.prazo) { grava(async () => { await st.definirPrazo(a, p); S.drawer = { id: a.id, modo: null }; }, `Prazo de ${a.id}: ${fmt(p)}`); return; }
    const m = $('#rMot').value.trim();
    if (!m) { $('#rErr').textContent = 'Informe o motivo: sem motivo, o novo prazo não é aceito.'; return; }
    grava(async () => { await st.reprogramar(a, p, m); S.drawer = { id: a.id, modo: null }; }, `Novo prazo de ${a.id}: ${fmt(p)}`);
  }
  if (f.id === 'fResp' || f.id === 'fRespC' || f.id === 'fRespD') {
    const tipo = f.id === 'fResp' ? 'acao' : f.id === 'fRespC' ? 'comp' : 'dem';
    const obj = tipo === 'acao' ? st.acao(S.drawer.id) : tipo === 'comp' ? st.compromisso(S.drawer.comp) : st.demanda(S.modal.dem);
    const resp = $('#tResp').value, apoio = tipo === 'acao' ? $('#tApoio').value.trim() : undefined;
    if (!obj) return;
    if (!resp) { $('#tErr').textContent = 'Escolha o novo responsável.'; return; }
    if (!st.nominal(resp)) { $('#tErr').textContent = 'Escolha uma pessoa, não uma empresa ou setor.'; return; }
    if (resp === obj.resp && (apoio === undefined || apoio === (obj.apoio || ''))) { $('#tErr').textContent = 'Nada mudou: é o mesmo responsável.'; return; }
    const volta = () => { if (tipo === 'acao') S.drawer = { id: obj.id, modo: null }; else if (tipo === 'comp') S.drawer = { comp: obj.id, modo: null }; else S.modal = null; };
    grava(async () => { const ant = await st.trocarResponsavel(tipo, obj, resp, apoio); volta(); return ant; },
      `${obj.id}: responsável agora é ${st.nome(resp)}`,
      ant => grava(() => st.trocarResponsavel(tipo, obj, ant.resp, tipo === 'acao' ? ant.apoio : undefined), `${obj.id} voltou para ${ant.resp ? st.nome(ant.resp) : 'sem dono'}`));
  }
  if (f.id === 'fEdA' || f.id === 'fEdC' || f.id === 'fEdD') {
    const tipo = f.id === 'fEdA' ? 'acao' : f.id === 'fEdC' ? 'comp' : 'dem';
    const obj = tipo === 'acao' ? st.acao(S.drawer.id) : tipo === 'comp' ? st.compromisso(S.drawer.comp) : st.demanda(S.modal.dem);
    if (!obj) return;
    let novos;
    if (tipo === 'acao') novos = { acao: $('#eOque').value, problema: $('#ePq').value, causa: $('#eCausa').value, area: $('#eArea').value, como: $('#eComo').value };
    else if (tipo === 'comp') {
      const nomeC = $('#eContra').value.trim(), pc = nomeC && st.contrapartes(obj.cli).find(p => p.nome.toLowerCase() === nomeC.toLowerCase());
      novos = { oque: $('#eOque').value, tipo: $('#eTipo').value, hora: $('#eHora').value, contra: pc ? pc.id : nomeC };
      if (pc && obj.contra === pc.id) novos.contra = obj.contra;
      else if (!pc && nomeC === contraNome(obj)) novos.contra = obj.contra;
    } else {
      novos = { titulo: $('#eTit').value, prioridade: $('#ePrio').value, area: $('#eArea').value };
      if (!$('#eTipo').disabled) novos.tipo = $('#eTipo').value;
    }
    const principal = { acao: 'acao', comp: 'oque', dem: 'titulo' }[tipo];
    if (!String(novos[principal]).trim()) { $('#eErr').textContent = 'O texto principal não pode ficar vazio.'; return; }
    const igual = Object.entries(novos).every(([k, v]) => k === 'prioridade' ? String(obj[k] ?? '') === String(v) : String(obj[k] ?? '') === String(v).trim());
    if (igual) { $('#eErr').textContent = 'Nada mudou.'; return; }
    const volta = () => { if (tipo === 'acao') S.drawer = { id: obj.id, modo: null }; else if (tipo === 'comp') S.drawer = { comp: obj.id, modo: null }; else S.modal = null; };
    grava(async () => { const ant = await st.editar(tipo, obj, novos); volta(); return ant; }, `${obj.id} editada`,
      ant => grava(() => st.editar(tipo, obj, ant), `Edição de ${obj.id} desfeita`));
  }
  if (f.id === 'fMov') {
    const a = st.acao(S.drawer.id), v = $('#mvDem').value;
    if (!a) return;
    if (!v) { $('#mvErr').textContent = 'Escolha para qual demanda mover.'; return; }
    const destino = v === '__nova__' ? { titulo: $('#mvTit').value.trim() || a.acao, tipo: $('#mvTipo').value, frente: $('#mvFr').value } : v;
    grava(async () => { const r = await st.moverAcao(a, destino); S.drawer = { id: a.id, modo: null }; return r; },
      r => `${a.id} movida para ${r.para}${r.encerrou ? ` · a pendência ${r.de} foi cancelada` : ''}`,
      r => grava(() => st.desfazerMover(a, r), `${a.id} voltou para ${r.de}`));
  }
  if (f.id === 'fTroca') {
    const tipo = f.dataset.tipo, cli = $('#tcCli').value, resp = $('#tcResp') ? $('#tcResp').value : '';
    const obj = tipo === 'acao' ? st.acao(S.drawer.id) : st.compromisso(S.drawer.comp);
    if (!obj) return;
    if (!cli) { $('#tcErr').textContent = 'Escolha o cliente certo.'; return; }
    if (!resp) { $('#tcErr').textContent = 'Escolha quem fica responsável no cliente certo.'; return; }
    if (tipo === 'acao') {
      const respAnt = obj.resp, dem = $('#tcDem') ? $('#tcDem').value : '';
      grava(async () => { const r = await st.trocarClienteAcao(obj, cli, { resp, dem }); escolherCliente(cli); S.drawer = { id: r.nova.id, modo: null }; return r; },
        r => `${r.antigo} agora é ${r.nova.id}, em ${cliNome(cli)}`,
        r => grava(async () => {
          const v = await st.trocarClienteAcao(r.nova, r.cliAntigo, { resp: respAnt, dem: r.demAntiga && !r.apagouDem && st.demanda(r.demAntiga) && !st.demanda(r.demAntiga).encerrada ? r.demAntiga : '' });
          escolherCliente(r.cliAntigo); S.drawer = null; return v;
        }, v => `Voltou para ${cliNome(r.cliAntigo)} como ${v.nova.id}`));
    } else {
      grava(async () => { const r = await st.trocarClienteComp(obj, cli, { resp }); S.drawer = { comp: r.novo.id, modo: null }; return r; },
        r => `${r.antigo} agora é ${r.novo.id}, em ${cliNome(cli)}`,
        r => grava(async () => { const v = await st.trocarClienteComp(r.novo, r.cliAntigo, { resp: r.respAntigo }); S.drawer = null; return v; },
          v => `Voltou para ${cliNome(r.cliAntigo)} como ${v.novo.id}`));
    }
  }
  if (f.id === 'fCan') {
    const a = st.acao(S.drawer.id), m = $('#cMot').value.trim();
    if (!m) { $('#cErr').textContent = 'Informe o motivo do cancelamento.'; return; }
    grava(async () => { await st.cancelar(a, m); S.drawer = { id: a.id, modo: null }; }, `${a.id} cancelada`);
  }
  if (f.id === 'fNova') {
    const cli = $('#mCli').value, acao = $('#mAcao').value.trim(), resp = $('#mResp').value, prazo = $('#mPrazo').value;
    if (!acao || !resp || !prazo || !$('#mArea').value) { $('#mErr').textContent = 'Preencha ação, responsável, prazo e área.'; return; }
    if (prazo < HOJE) { $('#mErr').textContent = 'O prazo precisa ser a partir de hoje.'; return; }
    if (!st.nominal(resp)) { $('#mErr').textContent = 'Escolha uma pessoa, não uma empresa ou setor.'; return; }
    const comp = S.modal.comp ? st.compromisso(S.modal.comp) : null;
    grava(async () => {
      const dv = $('#mDem').value, nova = dv === '__nova__';
      st.alvoPauta = S.modal.alvo || null;
      let a;
      try {
        a = await st.novaAcao({ cli, acao, porque: $('#mPq').value.trim(), dem: nova ? '' : dv,
          novaDem: nova ? { titulo: $('#mNdTit').value.trim() || acao, tipo: $('#mNdTipo').value, frente: $('#mNdFr').value } : null,
          resp, prazo, area: $('#mArea').value, como: $('#mComo').value.trim(), origem: comp ? 'Compromisso' : 'Captura rápida' });
      } finally { st.alvoPauta = null; }
      if (comp) await st.ligarDemanda(comp, a.demanda);
      S.modal = null; S.cli = cli; return a;
    }, a => comp ? `Pendência ${a.demanda} criada com a ação ${a.id}` : `Ação ${a.id} registrada`);
  }
  if (f.id === 'fFrente') {
    const cli = $('#nfCli').value, nome = $('#nfNome').value.trim(), dono = $('#nfDono').value, area = $('#nfArea').value;
    const inicio = $('#nfIni').value, fim = $('#nfFim').value;
    if (!nome || !dono || !area || !fim) { $('#nfErr').textContent = 'Preencha nome, dono, área e fim previsto.'; return; }
    if (fim < HOJE) { $('#nfErr').textContent = 'O fim previsto precisa ser a partir de hoje.'; return; }
    if (inicio && inicio > fim) { $('#nfErr').textContent = 'O início não pode ser depois do fim previsto.'; return; }
    if (!st.nominal(dono)) { $('#nfErr').textContent = 'Escolha uma pessoa como dono, não uma empresa ou setor.'; return; }
    const nomeDup = st.frentes.find(x => x.cli === cli && !x.encerrada && x.nome.trim().toLowerCase() === nome.toLowerCase());
    if (nomeDup && !confirm(`Já existe a frente aberta “${nomeDup.nome}” (${nomeDup.id}). Criar outra com o mesmo nome?`)) return;
    grava(async () => {
      const r = await st.novaFrente({ cli, nome, area, dono, apoio: $('#nfApoio').value.trim(), inicio, fim, entrega: $('#nfEnt').value.trim() });
      S.cli = cli; S.modal = { dem: r.entrega.id, cli };
      return r;
    }, r => `Frente ${r.frente.id} criada. Agora registre a primeira ação.`);
  }
  if (f.id === 'fEntrega') {
    const fr = st.frente(S.modal.fr), titulo = $('#neTit').value.trim(), resp = $('#neResp').value, area = $('#neArea').value, prazo = $('#nePrazo').value;
    if (!titulo || !resp || !area || !prazo) { $('#neErr').textContent = 'Preencha entrega, responsável, área e prazo.'; return; }
    if (prazo < HOJE) { $('#neErr').textContent = 'O prazo precisa ser a partir de hoje.'; return; }
    if (!st.nominal(resp)) { $('#neErr').textContent = 'Escolha uma pessoa, não uma empresa ou setor.'; return; }
    grava(async () => {
      const d = await st.novaEntrega({ frente: fr.id, titulo, resp, area, prazo });
      S.modal = { dem: d.id, cli: fr.cli };
      return d;
    }, d => `Entrega ${d.id} criada. Agora registre a primeira ação.`);
  }
  if (f.id === 'fComp') {
    const cli = $('#cCli').value, bruto = $('#cOque').value.trim(), resp = $('#cResp').value, data = $('#cData').value;
    if (!bruto || !resp || !data) { $('#cErr').textContent = 'Preencha o quê, quem cumpre e a data.'; return; }
    if (data < HOJE) { $('#cErr').textContent = 'A data precisa ser a partir de hoje.'; return; }
    if (!st.nominal(resp)) { $('#cErr').textContent = 'Escolha uma pessoa, não uma empresa ou setor.'; return; }
    const lido = lerLinha(bruto, st.contrapartes(cli), HOJE);
    const oque = (lido.data || lido.hora || lido.rec) && lido.texto ? lido.texto : bruto;
    const nomeC = $('#cContra').value.trim();
    const pc = nomeC && st.contrapartes(cli).find(p => p.nome.toLowerCase() === nomeC.toLowerCase());
    grava(async () => {
      const c = await st.novoCompromisso({ cli, oque, tipo: $('#cTipo').value, resp, contra: pc ? pc.id : nomeC, data, hora: $('#cHora').value, rec: $('#cRec').value });
      S.modal = null; return c;
    }, c => `Compromisso ${c.id} registrado para ${fmtF(c.data)}`);
  }
  if (f.id === 'fRem') {
    const c = st.compromisso(S.drawer.comp), d = $('#rcData').value, h = $('#rcHora').value;
    if (!d || d < HOJE) { $('#rcErr').textContent = 'Escolha uma data a partir de hoje.'; return; }
    grava(async () => { await st.remarcarCompromisso(c, d, h); S.drawer = { comp: c.id, modo: null }; }, `${c.id} remarcado para ${fmtF(d)}`);
  }
  if (f.id === 'fRes') {
    const c = st.compromisso(S.drawer.comp);
    if (c.status === 'Pendente') return;
    grava(() => st.salvarResultado(c, $('#cRes').value.trim()), 'Resultado salvo');
  }
  if (f.id === 'fDelib') {
    const texto = $('#dTexto').value.trim(), gera = $('#dGera').checked, resp = $('#dResp').value, prazo = $('#dPrazo').value;
    const dem = demDoItem(st.itemPauta(S.modal.p));
    if (!texto) { $('#dErr').textContent = 'Escreva o que foi decidido.'; return; }
    if (gera && (!resp || !prazo)) { $('#dErr').textContent = 'Para gerar ação, escolha responsável e prazo.'; return; }
    if (gera && prazo < HOJE) { $('#dErr').textContent = 'O prazo precisa ser a partir de hoje.'; return; }
    if (gera && !st.nominal(resp)) { $('#dErr').textContent = 'Escolha uma pessoa, não uma empresa ou setor.'; return; }
    const p = st.itemPauta(S.modal.p);
    grava(async () => {
      st.alvoPauta = p.id;
      try { await st.registrarDeliberacao({ cli: p.cli, texto, tipo: $('#dTipo').value, resp: resp || null, dem: dem || null, prazo, gera }); } finally { st.alvoPauta = null; }
      S.modal = null;
    }, 'Deliberação registrada');
  }
}
function onSubmitForum(f) {
  if (f.id === 'fPres') {
    const fo = st.forum(S.modal.fo), pres = [...f.querySelectorAll('input[name=pres]:checked')].map(i => i.value);
    if (!pres.length) { $('#presErr').textContent = 'Marque quem está presente.'; return; }
    if (S.modal.iniciar) grava(async () => { await st.iniciarForum(fo, pres); S.modal = null; }, 'Fórum iniciado');
    else grava(async () => { await st.atualizarPresentes(fo, pres); S.modal = null; }, 'Presença atualizada');
  }
  if (f.classList.contains('pnota')) {
    const p = st.itemPauta(f.dataset.p), t = f.querySelector('textarea').value;
    if ((p.nota || '') === t.trim()) { toast('Nada mudou na anotação'); return; }
    grava(() => st.salvarAnotacao(p, t), 'Anotação salva');
  }
  if (f.id === 'cvTop' || f.id === 'inTop') {
    const px = f.id.slice(0, 2), forcar = f.dataset.forcar === '1';
    f.dataset.forcar = '';
    const assunto = $('#' + px + 'TopTxt').value, resp = $('#' + px + 'TopResp').value;
    if (px === 'cv') {
      const it = addTopico(S.conv, assunto, resp, forcar, S.conv.itens);
      if (it) { S.conv.itens.push(it); S.conv.dirty = true; }
      render(); focoPor('#cvTopTxt');
    } else {
      const fo = st.forum(S.modal.fo);
      const it = addTopico(S.incl, assunto, resp, forcar, st.pautaDe(fo.id));
      if (it) grava(() => st.incluirNaPauta(fo, it), 'Tópico incluído na pauta');
      else { renderLayer(); focoPor('#inTopTxt'); }
    }
  }
}
// Botões da convocação (novo fórum e edição) e do tópico livre.
function cliqueConvocacao(ds) {
  const noModal = S.modal && S.modal.kind === 'incluir';
  const f = noModal ? S.incl : S.conv;
  if (!f) return;
  switch (ds.cv) {
    case 'abrir': {
      const k = f.abertos.indexOf(ds.id); if (k >= 0) f.abertos.splice(k, 1); else f.abertos.push(ds.id);
      noModal ? renderLayer() : render(); focoPor(`[data-cv="abrir"][data-id="${CSS.escape(ds.id)}"]`); return;
    }
    case 'usarDem': {
      f.sug = null;
      if (noModal) { const fo = st.forum(S.modal.fo); grava(() => st.incluirNaPauta(fo, { tipo: 'Demanda', reg: ds.id }), `${ds.id} incluída na pauta`); return; }
      cvToggle('Demanda', ds.id, true); render(); focoPor('#cvTopTxt'); return;
    }
    case 'forcarTop': { const form = $(noModal ? '#inTop' : '#cvTop'); form.dataset.forcar = '1'; form.requestSubmit(); return; }
    case 'up': case 'down': case 'rm': {
      const i = +ds.i, l = S.conv.itens; S.conv.dirty = true;
      if (ds.cv === 'rm') l.splice(i, 1);
      else { const j = ds.cv === 'up' ? i - 1 : i + 1; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; }
      render();
      const alvo = ds.cv === 'rm' ? `[data-cv="rm"][data-i="${Math.min(i, l.length - 1)}"]` : `[data-cv="${ds.cv}"][data-i="${ds.cv === 'up' ? i - 1 : i + 1}"]`;
      focoPor(alvo); return;
    }
    case 'voltar':
      if (S.conv && S.conv.dirty && !confirm('Sair sem salvar a convocação? O que você preencheu fica guardado até você convocar outro fórum.')) return;
      S.fo = S.fo.editar ? { id: S.fo.id } : {}; if (S.conv && S.conv.editId) S.conv = null; go('forum'); return;
    case 'salvar': {
      const c = S.conv;
      c.data = $('#cvData').value; c.hora = $('#cvHora').value; c.local = $('#cvLocal').value.trim();
      const falta = !c.data ? 'Informe a data.' : !c.hora ? 'Informe o horário.' : !c.local ? 'Informe o local.' : !c.conv.length ? 'Escolha pelo menos um participante.' : !c.itens.length ? 'Escolha pelo menos um item para a pauta.' : '';
      if (falta) { c.err = falta; $('#cvErr').textContent = falta; return; }
      c.err = '';
      const dados = { cli: S.cli, data: c.data, hora: c.hora, local: c.local, convocados: c.conv, itens: c.itens };
      const edit = c.editId ? st.forum(c.editId) : null;
      grava(async () => {
        const fo = edit ? await st.editarConvocacao(edit, dados) : await st.convocarForum(dados);
        S.conv = null; S.fo = { id: fo.id }; syncHash(); return fo;
      }, fo => edit ? 'Convocação atualizada' : `Fórum convocado para ${fmtF(fo.data)} às ${fo.hora}`);
      return;
    }
    default:
  }
}
// Botões de cada item da pauta durante o fórum.
function cliqueItem(ds) {
  const p = st.itemPauta(ds.p);
  if (!p) return;
  if (ds.pi === 'acao') {
    const dem = demDoItem(p);
    S.drawer = null;
    S.modal = { dem: dem || '', cli: p.cli, alvo: p.id, pre: p.tipo === TOPICO ? { porque: p.assunto } : {} };
    renderLayer(); { const i = $('#mAcao'); if (i) i.focus(); }
    return;
  }
  if (ds.pi === 'delib') { S.drawer = null; S.modal = { kind: 'delib', p: p.id }; renderLayer(); { const i = $('#dTexto'); if (i) i.focus(); } return; }
  grava(() => st.marcarTratamento(p, ds.pi), `Item ${p.ordem}: ${ds.pi.toLowerCase()}`, ant => grava(() => st.desmarcarTratamento(p, ant), `Item ${p.ordem} voltou para ${ant ? ant.toLowerCase() : 'a tratar'}`));
}
function onInput(e) {
  if (e.target.id === 'cOque') { lerCompTexto(); return; }
  if (['cData', 'cHora', 'cRec', 'cTipo', 'cContra'].includes(e.target.id)) e.target.dataset.manual = '1';
  if (e.target.id === 'fq') { S.fa.q = e.target.value; clearTimeout(buscaT); buscaT = setTimeout(render, 200); }
  if (e.target.id === 'ataTxt') {
    S.ataRascunho = { fo: S.fo.id, texto: $('#ataTxt').value };
    S.ataDirty = true; guardarAta(); atualizarEstadoAta();
  }
  if (S.conv && ['cvData', 'cvHora', 'cvLocal'].includes(e.target.id)) { S.conv[{ cvData: 'data', cvHora: 'hora', cvLocal: 'local' }[e.target.id]] = e.target.value; S.conv.dirty = true; }
  if (e.target.id === 'cvData') { const n = $('#cvPassado'); if (n) n.hidden = !(e.target.value && e.target.value < HOJE); }
  if (e.target.id === 'pkQ' || e.target.id === 'inQ') {
    const f = e.target.id === 'pkQ' ? S.conv : S.incl, id = e.target.id;
    f.q = e.target.value; clearTimeout(buscaT);
    buscaT = setTimeout(() => { const pos = $('#' + id).selectionStart; id === 'pkQ' ? render() : renderLayer(); const i = $('#' + id); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }, 200);
  }
}
function onChange(e) {
  const id = e.target.id;
  const t = e.target;
  if (t.dataset.pk && S.conv) { cvToggle(t.dataset.pk, t.dataset.id, t.checked); render(); focoPor(`[data-pk="${t.dataset.pk}"][data-id="${CSS.escape(t.dataset.id)}"]`); return; }
  if (t.dataset.cvp && S.conv) { const l = S.conv.conv, k = l.indexOf(t.dataset.cvp); if (t.checked && k < 0) l.push(t.dataset.cvp); if (!t.checked && k >= 0) l.splice(k, 1); S.conv.dirty = true; render(); focoPor(`[data-cvp="${CSS.escape(t.dataset.cvp)}"]`); return; }
  if (['pkFt', 'pkFr', 'inFt', 'inFr'].includes(id)) {
    const f = id.startsWith('pk') ? S.conv : S.incl;
    f[id.endsWith('Ft') ? 'ft' : 'fr'] = t.value; id.startsWith('pk') ? render() : renderLayer(); focoPor('#' + id); return;
  }
  if (id === 'selCli' || id === 'fcli') {
    escolherCliente(e.target.value);
    if (ROUTES[route()].global) go('visao'); else { render(); if (id === 'fcli') { const f = $('#fcli'); if (f) f.focus(); } }
  }
  if (id === 'fsCli') { S.semCli = e.target.value; render(); const f = $('#fsCli'); if (f) f.focus(); }
  if (id === 'fsit') { S.fa.sit = e.target.value; render(); }
  if (id === 'fresp') { S.fa.resp = e.target.value; render(); }
  if (id === 'farea') { S.fa.area = e.target.value; render(); }
  if (id === 'ftipo') { S.fa.tipo = e.target.value; render(); }
  if (id === 'selP') { S.pessoaSemana = e.target.value; render(); }
  if (id === 'cP') { S.fc.p = e.target.value; render(); }
  if (id === 'cCliF') { S.fc.cli = e.target.value; render(); }
  if (['cData', 'cHora', 'cRec', 'cTipo'].includes(id)) e.target.dataset.manual = '1';
  if (id === 'cCli') {
    const ids = ['cOque', 'cContra', 'cData', 'cHora', 'cRec', 'cTipo'];
    const keep = ids.map(k => [k, $('#' + k).value, $('#' + k).dataset.manual]);
    const resp = $('#cResp').value;
    S.modal = { kind: 'comp', cli: e.target.value, resp }; renderLayer();
    keep.forEach(([k, v, man]) => { const el = $('#' + k); el.value = v; if (man) el.dataset.manual = man; });
    lerCompTexto();
  }
  if (id === 'mCli') { S.modal = { cli: e.target.value, dem: '', comp: S.modal.comp, pre: S.modal.pre }; renderLayer(); }
  if (id === 'nfCli') {
    const keep = ['nfNome', 'nfEnt', 'nfArea', 'nfIni', 'nfFim', 'nfApoio'].map(k => [k, $('#' + k).value]);
    S.modal = { kind: 'frente', cli: e.target.value }; renderLayer();
    keep.forEach(([k, v]) => { $('#' + k).value = v; });
  }
  if (id === 'mDem') {
    const d = st.demanda(e.target.value), ar = $('#mArea'); if (d && d.area && ar && !ar.value) ar.value = d.area;
    const box = $('#mNdNova'); if (box) { box.hidden = e.target.value !== '__nova__'; if (!box.hidden) { const t = $('#mNdTit'); if (t && !t.value) t.value = $('#mAcao').value; } }
  }
  if (id === 'mvDem') { const box = $('#mvNova'); if (box) box.hidden = e.target.value !== '__nova__'; }
  if (id === 'tcCli') { S.drawer.tcCli = e.target.value; renderLayer(); const el = $('#tcResp') || $('#tcCli'); if (el) el.focus(); }
  if (id === 'dGera') { const o = $('#dDemNone'); if (o) o.textContent = e.target.checked ? 'Nenhuma (a ação gerada cria uma pendência nova)' : 'Nenhuma'; }
}

export function startApp(theStore, context) {
  st = theStore; ctx = context || {};
  try { S.cli = localStorage.getItem('gp.cli') || null; } catch (e) { S.cli = null; }
  lerHash();
  recuperarAta();
  shell();
  $('#toastAct').addEventListener('click', () => { const u = toastUndo; fecharToast(); if (u) u(); });
  $('#alertClose').addEventListener('click', () => { $('#alert').hidden = true; });
  window.addEventListener('beforeunload', e => { if (S.ataDirty) { guardarAta(); e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('gp:relogin', () => { guardarAta(); toast('Sua sessão expirou. Abrindo o login da Microsoft…'); });
  document.addEventListener('click', onClick);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (S.drawer || S.modal) { e.preventDefault(); fechar(); return; }
      const acct = $('#acct'); if (acct && acct.open) { acct.open = false; acct.querySelector('summary').focus(); }
    }
    if (e.key === 'Tab' && (S.drawer || S.modal)) prenderFoco(e);
  });
  window.addEventListener('hashchange', () => { lerHash(); S.drawer = null; S.modal = null; render(); window.scrollTo({ top: 0 }); });
  window.addEventListener('focus', () => { if (!S.drawer && !S.modal && !S.busy && st.loadedAt && Date.now() - st.loadedAt.getTime() > 180000) recarregar(true); });
  render();
}
export { store };
