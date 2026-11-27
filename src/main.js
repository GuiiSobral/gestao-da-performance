// A Gestão da Performance passou a fazer parte da Plataforma Solve (corte em 27/11/2026).
// Este endereço só avisa e leva para lá, mantendo a tela pedida (#acoes, #forum…). Nada é lido nem gravado nas listas.
// Para voltar ao app antigo: reverter este commit (o código anterior continua no histórico).
import './styles.css';
import { aplicarTema, temaAtual } from './theme.js';

aplicarTema(temaAtual());
const NOVO = 'https://plataforma-solve.pages.dev/gp/' + (location.hash || '#visao');
document.getElementById('root').innerHTML = `<div class="gate"><div class="gate-card">
  <div class="marca"><b>Solve</b><span>Gestão da Performance</span></div>
  <p><b>A Gestão da Performance agora faz parte da Plataforma Solve.</b></p>
  <p class="small muted">Os dados foram levados para lá. Entre com o seu e-mail da Solve e a senha da plataforma. Este endereço não recebe mais alterações.</p>
  <div class="row-actions"><a class="btn primary" href="${NOVO}">Abrir na Plataforma Solve</a></div>
  <p class="small muted">Você será levado automaticamente em alguns segundos.</p>
</div></div>`;
setTimeout(() => location.replace(NOVO), 6000);
