// Tema da interface: automático (segue o sistema), claro ou escuro. A escolha fica salva no navegador de cada pessoa.
const KEY = 'gp.tema';
export const TEMAS = [['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Escuro']];
const DICA = { auto: 'Automático: segue o tema do sistema', light: 'Tema claro', dark: 'Tema escuro' };

export function temaAtual() {
  try { const v = localStorage.getItem(KEY); return TEMAS.some(t => t[0] === v) ? v : 'auto'; } catch (e) { return 'auto'; }
}

export function aplicarTema(v) {
  const t = TEMAS.some(x => x[0] === v) ? v : 'auto';
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t);
  try { if (t === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch (e) { /* sem storage */ }
  const escuro = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', escuro ? '#0E1412' : '#F2F4F2');
  return t;
}

// Controle segmentado usado no rodapé do menu lateral e no menu "Conta" do celular.
export function temaHtml(idSuffix) {
  const cur = temaAtual();
  return `<div class="seg tema" role="radiogroup" aria-label="Tema da interface" id="tema-${idSuffix}">${TEMAS.map(([v, l]) =>
    `<button type="button" role="radio" data-tema="${v}" aria-checked="${v === cur}" title="${DICA[v]}" aria-label="${DICA[v]}">${l}</button>`).join('')}</div>`;
}
