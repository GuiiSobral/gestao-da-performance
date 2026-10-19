import './styles.css';
import { initAuth, login, logout, getToken, authErrorMessage } from './auth.js';
import { GraphBackend, MemoryBackend } from './graph.js';
import { Store } from './store.js';
import { startApp } from './app.js';
import { aplicarTema, temaAtual } from './theme.js';

aplicarTema(temaAtual());
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => aplicarTema(temaAtual()));

const root = document.getElementById('root');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function tela(conteudo) {
  root.innerHTML = `<div class="gate"><div class="gate-card">
    <div class="brand"><b>Gestão da Performance</b><span>Solve Group</span></div>
    ${conteudo}
  </div></div>`;
}
function telaLogin(erro) {
  tela(`<p>Demandas, ações e fóruns de todos os clientes da Solve, gravados direto nas listas do SharePoint.</p>
    <button class="btn primary" id="btnLogin">Entrar com a conta da Solve</button>
    ${erro ? `<p class="err-text" role="alert">${esc(erro)}</p>` : '<p class="small muted">Use a sua conta @solvegroup.com.br. No primeiro acesso a Microsoft pede para você aprovar a permissão do app.</p>'}`);
  document.getElementById('btnLogin').addEventListener('click', () => login());
}
function telaCarregando(msg) {
  tela(`<p class="loading">${esc(msg)}</p>`);
}
function telaErro(msg, detalhe) {
  tela(`<p class="err-text" role="alert">${esc(msg)}</p>${detalhe ? `<p class="small muted mono">${esc(detalhe)}</p>` : ''}
    <div class="row-actions"><button class="btn primary" id="btnTentar">Tentar de novo</button><button class="btn" id="btnSair">Sair</button></div>`);
  document.getElementById('btnTentar').addEventListener('click', () => location.reload());
  document.getElementById('btnSair').addEventListener('click', () => logout());
}

async function boot() {
  // Modo de teste automatizado: dados em memória injetados pelo teste, sem login.
  if (window.__GP_FIXTURE__) {
    const be = new MemoryBackend(window.__GP_FIXTURE__);
    window.__GP_BACKEND__ = be;
    const st = new Store(be, window.__GP_USER__ || { name: 'Guilherme', username: 'guilherme@solvegroup.com.br' });
    await st.load();
    startApp(st, {});
    return;
  }

  telaCarregando('Conectando à conta da Solve…');
  let account;
  try {
    account = await initAuth();
  } catch (e) {
    console.error(e);
    telaLogin(authErrorMessage(e));
    return;
  }
  if (!account) { telaLogin(); return; }

  telaCarregando('Lendo as listas do SharePoint…');
  const be = new GraphBackend(getToken);
  const st = new Store(be, { name: account.name || account.username, username: account.username });
  try {
    await be.init();
    await st.load();
  } catch (e) {
    console.error(e);
    const msg = e.status === 403 ? 'Sua conta não tem acesso às listas da Gestão da Performance no SharePoint. Peça acesso ao site Base Centralizada.'
      : e.status === 401 ? 'A sessão expirou. Entre de novo.'
      : 'Não consegui ler as listas do SharePoint.';
    telaErro(msg, e.message);
    return;
  }
  startApp(st, { logout, login, listUrl: be.webUrl ? be.webUrl + '/_layouts/15/viewlsts.aspx' : null });
}

boot();
