# Gestão da Performance

Plataforma da Solve Group para compilar, tratar e acompanhar as demandas dos clientes: carteira, visão do cliente, demandas, ações em 5W2H, fórum de gestão (com ata no formato do WhatsApp), "Minha semana" e compromissos do dia a dia.

Endereço: https://guiisobral.github.io/gestao-da-performance/

## Como funciona

- **Interface:** este app web (HTML, CSS e JavaScript, sem servidor), publicado no GitHub Pages.
- **Login:** conta Microsoft da Solve (Entra ID, registro "Gestão da Performance"). Cada pessoa acessa com as próprias permissões.
- **Base de dados:** as 11 Listas do SharePoint `GP_*` no site Solve Group Base Centralizada, lidas e gravadas pelo Microsoft Graph. O que muda no app aparece na lista, e o contrário também.
- **Nenhum dado fica neste repositório.** O código é público; os dados só aparecem depois do login com uma conta da Solve que tenha acesso ao site.

## Regras gravadas pelo app

- Ação nova só entra com responsável nominal e prazo.
- Novo prazo exige motivo e fica registrado em `GP_Reprogramacoes`; a partir da 2ª reprogramação, a ação entra na pauta do fórum.
- Cancelamento exige motivo.
- Situação da ação, farol, status da demanda e avanço da frente são calculados, nunca digitados.
- Demanda com todas as ações fechadas fica em "Validar encerramento" até alguém confirmar.

## Compromissos (`GP_Compromissos`)

Compromissos pontuais e de rotina: um passo só, com data marcada (ex.: solicitar a apuração de PIS e COFINS no dia 05, reunião de alinhamento às 14:00). Ficam fora do farol, do avanço das frentes e dos números de ações.

- Registro em uma linha: data, hora, "com fulano", "todo dia 05" e "toda segunda" preenchem os campos sozinhos.
- Remarcar não pede motivo; a data original fica gravada e é a base do cumprimento e da próxima repetição.
- Repetição semanal ou mensal: ao marcar Feito ou Não ocorreu, o app cria a próxima vez da série (nunca no passado). Cancelar encerra a repetição.
- Feito e Não ocorreu mostram **Desfazer** por 6 segundos (apaga a próxima vez que tinha sido criada).
- **Virar pendência** cria uma demanda do tipo Pendência com a ação (origem "Compromisso") e liga o compromisso a ela. O app sugere quando o compromisso está parado há 3 dias ou mais, ou quando a contraparte falhou nas duas últimas vezes da série.
- Cumprimento dos últimos 90 dias por cliente e contraparte, pela data original.
- A própria Solve é o cliente interno `SOL` (coluna `Interno` em `GP_Clientes`): aparece em Compromissos e fica fora da Carteira e dos seletores de cliente.

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
