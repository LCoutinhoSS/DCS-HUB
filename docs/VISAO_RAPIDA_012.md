# DCS HUB 0.12 — Visão rápida do evento e acesso de servidor para avaliação

Atualização de 19/11/2026. Não houve migração de banco nesta etapa: o resumo lê os dados já registrados nas versões 0.8–0.11. O banco Autoridades SP segue independente em tabelas e políticas.

## O problema que esta versão resolve

A área anterior exibia respostas, participantes, reunião e tarefas em abas separadas. Um servidor que só precisava compreender o andamento tinha de abrir muitas seções.

A aba padrão do evento passa a ser **Visão rápida**, com cartões claros e vínculos aos detalhes. Não são dados novos nem duplicados — o resumo é calculado das mesmas tabelas.

### 1. O essencial do evento

Cabeçalho com título, tipo, status, solicitante, data/hora, local informado, responsável/equipe e quatro indicadores:
- Definições confirmadas;
- Informações ainda a definir;
- Presenças confirmadas;
- Etapas do checklist concluídas.

A existência do evento no HUB **não confirma reserva de sala**.

### 2. Informações consolidadas

**O que já está definido:** respostas prioritárias com status Confirmado e texto realmente preenchido. Perguntas sem resposta ficam explicitamente como pendência. Dados de público inseridos no cadastro inicial podem ser exibidos como estimativa *não validada*.

**O que falta esclarecer com o gabinete:** até seis questões prioritárias do tipo de evento, com status A confirmar/Sem resposta e ligação direta à Ficha do Gabinete. O contador considera o conjunto completo de perguntas.

**Mesa, homenageados e participantes:** nomes, cargos, instituição e confirmação a partir da lista do próprio evento, sem criar duplicação do Diretório de Autoridades.

**Reunião preparatória mais recente:** pauta, decisões e momento da reunião conforme o que foi efetivamente registrado.

**Providências da equipe:** tarefas abertas, responsáveis, prazos, atraso, quantidade de tarefas pendentes e andamento do checklist.

**Materiais de trabalho:** referências funcionais a Roteiro, Resumo da reunião, Nominatas e Prismas, com ações para abrir a aba correspondente. Esses documentos não foram automaticamente enviados ao repositório, nem é possível gerar os modelos oficiais na versão atual.

Um botão **Copiar resumo** cria um texto com todas as seções para compartilhar internamente; outro botão **Atualizar** consulta novamente as respostas do banco e reuniões.

## Uso dos documentos fornecidos

Foram inspecionados os cinco materiais enviados:

- **ROTEIRO BASE.docx e ROTEIRO BASE(1).docx:** ordem de cerimônia (recepção, chegada do deputado, composição da mesa, hino, discursos, vídeo/apresentação, entrega, encerramento). A Visão rápida apresenta as decisões confirmadas, sem supor horários ou atos que ainda não foram aprovados.
- **RESUMO REUNIÃO.docx:** é a principal referência de estrutura: decisões sobre convite, roteiro, mestre de cerimônias, hino, público, estacionamento, receptivo, vídeo, composição e falas da mesa e homenagem. Essas definições são apresentadas a quem consulta, com pendências visíveis.
- **MODELO NOMINATAS.doc:** nome, cargo, saudação de autoridades e texto de representação; os campos devem vir da lista Pessoas e mesa, respeitando a confirmação.
- **PRISMAS - MESA(1).pptx:** título/tratamento, nome e cargo na identificação de mesa; futuramente poderá usar automaticamente os participantes da composição da mesa.

**Os arquivos originais não foram incorporados ao repositório GitHub público.** Alguns modelos carregam identidade visual e conteúdo institucional. A futura geração de documentos deve manter o design original em SharePoint com permissões e validação do Cerimonial.

## Como avaliar com conta comum

A **demonstração pública** (https://lcoutinhoss.github.io/DCS-HUB/) tem acesso fictício para a avaliação do papel **Servidor DCS**:

- E-mail demonstrativo: **usuario@demo.dcs-hub.invalid**
- Senha demonstrativa: **DCSdemo2026!**
- Perfil: **Servidor DCS**
- Os dados são fictícios e ficam apenas na demonstração do navegador. Não é conta institucional, não dá acesso ao Supabase real, não deve ser usada com informações sensíveis.

A conta de demonstração **Leitor** também está disponível na caixa de seleção, para comparar consulta sem opções de alteração. Use a mesma senha demonstrativa.

A **homologação com banco real** permanece em https://lcoutinhoss.github.io/DCS-HUB/homologacao/. Criar uma nova conta real requer **Authentication → Users → Invite user**, com e-mail autorizado e acesso administrativo ao Supabase. Em seguida, o Administrador do DCS HUB ativa o perfil **Servidor DCS** ou **Servidor Cerimonial** na área **Administração**. Não há botão que cria um usuário do Auth no frontend, e não foi criado um usuário real sem e-mail/invitação.

## Recomendações para homologação

1. Abra a demonstração como Servidor DCS.
2. Em **Gestão de eventos**, abra a Sessão Solene fictícia para ver a Visão rápida preenchida parcialmente.
3. Clique em **Resolver pendências** e volte ao resumo após registrar uma resposta.
4. Confirme como a mesa, a reunião e as tarefas aparecem. Teste **Copiar resumo**.
5. Faça o mesmo como Leitor: os cartões informativos continuam visíveis, mas edição deve ficar bloqueada.
6. Na homologação real, entre com **duas contas autorizadas diferentes**, registre uma resposta na ficha e use **Atualizar** na outra conta para verificar a colaboração.

Não carregue arquivos reais diretamente no GitHub público. Para a fase de documentos, preferir vínculo SharePoint/OneDrive, com autorização e permissões institucionais.

## Próxima iteração sugerida

Transformar os quatro documentos em **modelos editáveis do HUB**, com geração mediante aprovação do Cerimonial. As informações serão preenchidas com respostas da Ficha e Pessoas e mesa, mas nunca marcadas como confirmadas automaticamente sem validação da equipe.

A integração com o calendário Outlook/Teams continua planejada para eventos confirmados, condicionada às permissões e ao calendário institucional escolhido.
