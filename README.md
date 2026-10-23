# Gestão da Performance

Plataforma da Solve Group para compilar, tratar e acompanhar as demandas dos clientes: carteira, visão do cliente, demandas, ações em 5W2H, fórum de gestão (com ata no formato do WhatsApp), "Minha semana" e compromissos do dia a dia.

Endereço: https://guiisobral.github.io/gestao-da-performance/

## Como funciona

- **Interface:** este app web (HTML, CSS e JavaScript, sem servidor), publicado no GitHub Pages.
- **Login:** conta Microsoft da Solve (Entra ID, registro "Gestão da Performance"). Cada pessoa acessa com as próprias permissões.
- **Base de dados:** as 12 Listas do SharePoint `GP_*` no site Solve Group Base Centralizada, lidas e gravadas pelo Microsoft Graph. O que muda no app aparece na lista, e o contrário também.
- **Nenhum dado fica neste repositório.** O código é público; os dados só aparecem depois do login com uma conta da Solve que tenha acesso ao site.

## Regras gravadas pelo app

- Ação nova só entra com responsável nominal e prazo.
- Novo prazo exige motivo e fica registrado em `GP_Reprogramacoes`; a partir da 2ª reprogramação, o app avisa para levar a ação ao fórum.
- Cancelamento exige motivo.
- Situação da ação, farol, status da demanda e avanço da frente são calculados, nunca digitados.
- Demanda com todas as ações fechadas fica em "Validar encerramento" até alguém confirmar.
- Demanda sem plano de ação pode ser cancelada direto (**Cancelar demanda** na demanda, **Cancelar questão** no Fórum), sem motivo e sem criar ação. Encerrada sem nenhuma ação concluída, aparece como Cancelada. Tem **Desfazer** por 6 segundos; criar uma ação nela depois a reabre.
- **Editar** na ação (o quê, por quê, causa, área, como), no compromisso (o quê, tipo, hora, com quem) e na demanda (título, tipo entre Pendência e Questão crítica, prioridade, área). Prazo, responsável e status continuam nos botões próprios, para o novo prazo seguir pedindo motivo. Tem **Desfazer** por 6 segundos; o histórico de versões da lista guarda o texto anterior.
- **Mover** a ação para outra demanda aberta do mesmo cliente ou para **+ Nova demanda** (título, tipo e frente). Se a origem era a pendência criada só para aquela ação, ela é cancelada; uma demanda de verdade fica como Sem plano de ação. Tem Desfazer.
- No registro de ação, o campo Demanda oferece **+ Nova demanda**, além da pendência com o mesmo título (padrão) e das demandas existentes. Código da demanda nova pelo tipo: QC, PD ou EF.
- **Trocar cliente** de ação aberta ou compromisso pendente feito no cliente errado, só sem história (sem reprogramação, sem deliberação, fora da migração; no compromisso, sem série e sem pendência). O código carrega o cliente, então o registro é recriado no cliente certo com código novo e o antigo vai para a lixeira do site (com a pendência criada só para ele). O responsável precisa atender o cliente novo. Tem Desfazer, que recria no cliente original com outro código.
- Responsável de ação, compromisso ou demanda aberta pode ser trocado (**Trocar** na ação e no compromisso, **Trocar responsável** na demanda). Não pede motivo: o prazo não muda e o histórico de versões da lista guarda quem trocou. Tem **Desfazer** por 6 segundos. No compromisso que se repete, a próxima vez já nasce com o novo responsável.

## Fórum (`GP_Foruns` e `GP_Pauta`)

O fórum nasce de uma convocação e passa por **Agendado → Em andamento → Realizado** (ou **Cancelado**).

- **+ Novo fórum** pede data, horário, local, participantes (qualquer pessoa da Solve e as pessoas nominais do cliente) e a pauta.
- **Pauta escolhida à mão** numa lista única: cada demanda aberta do cliente (questão crítica, pendência, entrega de frente e outras) com as ações abertas dela embaixo. Pendência é tipo de demanda e aparece uma vez só.
  - Marcar a demanda inclui as ações dela; as ações que já estavam marcadas sozinhas saem da lista e ficam travadas como "entra pela demanda".
  - A ação só é marcada sozinha quando a demanda não está na pauta. O mesmo registro não entra duas vezes.
  - Registro que já está na pauta de outro fórum agendado aparece marcado com a data desse fórum.
  - **Tópico livre** para assunto que ainda não é registro. Se o texto parece com uma demanda aberta, o app avisa: oferece incluir a demanda ou diz que ela já está na pauta. Tópico com o mesmo texto de outro não entra.
  - Itens que ficaram **Não tratado** no fórum anterior já entram na pauta do próximo; quem convoca pode tirar.
- Enquanto agendado: **Editar convocação** e **Cancelar fórum** (com Desfazer).
- A data pode ser passada, para registrar um fórum que já aconteceu: ele fica agendado e segue o mesmo fluxo. Conclusões e novos prazos registrados nele ficam com a data do dia em que foram lançados.
- **Excluir fórum**, em qualquer situação: o fórum, os itens da pauta e as deliberações dele vão para a lixeira do site (restauráveis em até 93 dias pelo SharePoint). As ações criadas nele continuam no plano, e os não tratados que ele tinha trazido voltam para a próxima pauta.
- **Iniciar fórum** registra a presença (convocados e quem participou sem ter sido convocado). Um fórum em andamento por cliente.
- Durante o fórum, cada item tem os botões das ações (Concluir, Novo prazo e o detalhe), **+ Nova ação**, **Deliberação**, **Mantido sem mudança** e **Não tratado**; tópico livre tem anotação. O que é feito no item fica registrado nele (desdobramentos) e define o tratamento: Concluído, Repactuado, Cancelado, Encerrado, Mantido, Tratado ou Não tratado. Desfazer tira o desdobramento.
- **+ Incluir na pauta** durante o fórum: registro existente, tópico livre ou registro novo criado na reunião.
- **Encerrar fórum**: item sem tratamento vira Não tratado e vai para a pauta do próximo fórum. A ata sai dos desdobramentos de cada item (presentes, ausentes, pauta com o que foi feito e próximos passos), pode ser editada, copiada para o WhatsApp e salva no SharePoint.
- Fóruns gravados antes da convocação (sem situação) aparecem como realizados, com a ata que já tinham.

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
- Ações e Demandas têm o filtro de cliente na barra de filtros, com **Todos os clientes** (`#acoes?cli=todos`): junta os clientes da carteira, fora o interno e os encerrados. Minha semana e Compromissos também filtram por cliente. Minha semana tem **Todos os responsáveis** (`#semana?p=todos`): as ações e os compromissos abertos de todos, com o quadro Por responsável (vencidas, vencem em 7 dias, sem prazo e total); clicar no nome abre a semana da pessoa e a mensagem de cobrança dela. Nas listas que misturam clientes, clicar no código do cliente (ex.: MOE) filtra a tela por ele.
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
