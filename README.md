# Gestão da Performance

Plataforma da Solve Group para compilar, tratar e acompanhar as demandas dos clientes: carteira, visão do cliente, demandas, ações em 5W2H, fórum de gestão (com ata no formato do WhatsApp) e "Minha semana".

Endereço: https://guiisobral.github.io/gestao-da-performance/

## Como funciona

- **Interface:** este app web (HTML, CSS e JavaScript, sem servidor), publicado no GitHub Pages.
- **Login:** conta Microsoft da Solve (Entra ID, registro "Gestão da Performance"). Cada pessoa acessa com as próprias permissões.
- **Base de dados:** as 10 Listas do SharePoint `GP_*` no site Solve Group Base Centralizada, lidas e gravadas pelo Microsoft Graph. O que muda no app aparece na lista, e o contrário também.
- **Nenhum dado fica neste repositório.** O código é público; os dados só aparecem depois do login com uma conta da Solve que tenha acesso ao site.

## Regras gravadas pelo app

- Ação nova só entra com responsável nominal e prazo.
- Novo prazo exige motivo e fica registrado em `GP_Reprogramacoes`; a partir da 2ª reprogramação, a ação entra na pauta do fórum.
- Cancelamento exige motivo.
- Situação da ação, farol, status da demanda e avanço da frente são calculados, nunca digitados.
- Demanda com todas as ações fechadas fica em "Validar encerramento" até alguém confirmar.

## Interface

- Tema claro, escuro ou automático (segue o sistema), escolhido no rodapé do menu ou em **Conta** no celular; fica salvo no navegador.
- Filtros e telas ficam no endereço (ex.: `#acoes?cli=MOE&sit=vencidas`): o Voltar funciona e o link pode ser enviado.
- Concluir uma ação ou encerrar uma demanda mostra **Desfazer** por 6 segundos.
- O rascunho da ata fica guardado na aba até ser salvo no SharePoint.

## Desenvolvimento

```bash
npm install
npm run dev      # http://localhost:5173/gestao-da-performance/
npm run build    # gera dist/
```

Cada push na branch `main` publica uma nova versão pelo GitHub Actions (`.github/workflows/pages.yml`).

Configuração pública em `src/config.js` (tenant, client ID do app e site do SharePoint). Para rodar localmente, o endereço `http://localhost:5173/gestao-da-performance/` precisa estar cadastrado como URI de redirecionamento (SPA) no registro do Entra.
