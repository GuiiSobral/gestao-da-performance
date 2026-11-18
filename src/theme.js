// Tema da interface (guia Solve, seção 9.1): claro ou escuro, trocado pelo botão no topo.
// A escolha fica salva no navegador ("tema"); na primeira visita segue o sistema.
const KEY = 'tema';
const COR_FAIXA = { claro: '#0C1037', escuro: '#020B16' };

const sistema = () => (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro');

// Escolha salva pela pessoa, ou null se ela nunca escolheu (aí vale o sistema).
export function temaSalvo() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'claro' || v === 'escuro') return v;
    const antigo = localStorage.getItem('gp.tema');   // versão anterior do app: light / dark
    if (antigo === 'light' || antigo === 'dark') return antigo === 'dark' ? 'escuro' : 'claro';
  } catch (e) { /* sem storage */ }
  return null;
}
export const temaAtual = () => temaSalvo() || sistema();

export function aplicarTema(v, salvar) {
  const t = v === 'escuro' ? 'escuro' : 'claro';
  document.documentElement.dataset.theme = t;
  if (salvar) {
    try { localStorage.setItem(KEY, t); localStorage.removeItem('gp.tema'); } catch (e) { /* sem storage */ }
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', COR_FAIXA[t]);
  return t;
}

export const alternarTema = () => aplicarTema(temaAtual() === 'escuro' ? 'claro' : 'escuro', true);

// Rótulo e ícone do botão: lua para ir ao escuro, sol para ir ao claro.
export function botaoTema() {
  const escuro = temaAtual() === 'escuro';
  return {
    label: escuro ? 'Usar tema claro' : 'Usar tema escuro',
    icone: escuro
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
  };
}
