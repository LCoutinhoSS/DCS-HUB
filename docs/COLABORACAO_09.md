# DCS HUB 0.9 — Reuniões preparatórias, tarefas e notificações entre servidores

Atualização de 19/11/2026. Utiliza o **mesmo projeto Supabase do Autoridades SP**, com tabelas e perfis DCS independentes. **A migração 009 está aplicada**; nenhuma tabela de autoridades ou de acesso do Autoridades SP foi modificada.

## 1. Reuniões vinculadas ao evento

Abra **Gestão de eventos → selecione um evento → Reuniões**. Ali é possível criar diversas reuniões preparatórias para o mesmo evento, sem perder a vinculação.

Cada reunião contém:
- Título, data e horário, duração e modalidade (presencial, híbrida, virtual).
- Participantes e áreas envolvidas.
- Pauta, ata/registro, decisões e encaminhamentos.
- Situação: agendada, realizada ou cancelada.
- Histórico mínimo de criação/alteração no histórico do evento.

A reunião é criada por um servidor DCS/Cerimonial ou gestor. O criador e gestores podem editá-la; Leitor consulta. Não há exclusão de reunião nesta etapa, para preservar o registro operacional.

## 2. Encaminhamento → tarefa → pessoa → aviso

Na aba **Reuniões**, expanda a reunião e clique em **Criar tarefa de encaminhamento**.

O formulário contém título da entrega, descrição, equipe DCS/Cerimonial, servidor responsável, prazo e prioridade. O evento e a reunião vêm vinculados automaticamente. Ao criar:
1. O registro entra em \`public.tasks\`, com \`event_id\`, \`meeting_id\` e \`assignee_id\` (UUID), não apenas nome textual.
2. O gatilho já existente cria uma linha em \`public.task_notifications\` destinada ao responsável.
3. O responsável recebe o aviso **dentro do HUB**, ao entrar ou na próxima atualização automática (consulta a cada 30 segundos), e encontra a tarefa em **Tarefas → Minhas tarefas**.
4. Ao mover para **Em andamento** ou **Concluído**, o criador recebe uma nova notificação interna de andamento, com botão **Ver tarefa**.
5. A coluna **Ver reunião** no cartão da tarefa leva à sua origem, dentro do evento.

**Ainda não existem avisos por e-mail, Microsoft Teams, Outlook, push fora do navegador ou reserva de sala automatizada.** O usuário deve manter a sessão ativa para receber atualizações no sino.

## 3. Ajustes de segurança aplicados

A atualização 009 adiciona três funções de alteração controlada:
- \`dcs_set_task_status\`: responsável, criador ou gestor podem atualizar andamento; somente criador/gestor podem cancelar ou enviar para aprovação. Para tarefas derivadas de checklist, a conclusão sincroniza o item de origem.
- \`dcs_assign_task\`: apenas criador/gestor podem redistribuir uma tarefa, verificando se a pessoa está ativa e pertence à equipe selecionada.
- \`dcs_set_checklist_complete\`: criador do evento, responsável pelo item ou gestor podem concluir/reabrir o item; tarefas ligadas a esse item acompanham o status.

Foram revogadas as permissões de **UPDATE direto** em \`public.tasks\` e \`public.event_checklist\` para o papel \`authenticated\`. Os botões da interface chamam as RPCs acima, com validação no servidor. Alterações na tabela \`event_meetings\` são protegidas por RLS, que também impede uma conta de trocar o autor ou o evento vinculado.

As permissões originais de \`public.autoridades\` e \`public.perfis_usuarios\` não foram alteradas. A nova consulta de autoridades da atualização 008 continua protegida.

## 4. Validação realizada e limites

A migração 009 foi aplicada. Verificação no Supabase:
- \`authenticated\` **não possui UPDATE direto** em tarefas/checklists.
- As RPCs exigem autenticação e verificam papel, autoria ou responsabilidade.
- Contas \`anon\` não podem executar as RPCs nem ler as reuniões.
- Em transação **revertida**, simulamos dois usuários existentes: criador de evento, reunião, tarefa para outra conta e conclusão pelo responsável; a tentativa de a pessoa reatribuir a tarefa foi negada.
- Nenhum evento/reunião/tarefa/notificação da simulação ficou gravado. Confirmados 150 registros originais no Autoridades SP.

**Pendente:** testar com dois navegadores e dois logins reais, observar o tempo do sino, verificar links e confirmar permissões no uso da equipe. Só depois da homologação e da autorização da TI, usar dados institucionais sensíveis.

Supabase Advisor ainda apresenta avisos de funções \`SECURITY DEFINER\` e de proteção contra senhas vazadas. Revisar essas advertências com a equipe de TI, especialmente porque Auth e infraestrutura são compartilhados.

## 5. Roteiro de teste com a equipe

1. Entre em https://lcoutinhoss.github.io/DCS-HUB/homologacao/ como Administrador DCS.
2. Em **Administração**, confirme que o colega tem conta do mesmo Supabase, perfil DCS ativo e está no grupo correto. O administrador pode cadastrar/ativar perfis, mas não deve compartilhar a própria senha.
3. Em **Gestão de eventos**, crie um evento fictício. Escolha um solicitante e espaço padronizado, sem usar dados reais.
4. Abra a área desse evento e a aba **Reuniões**. Crie uma reunião, informe pauta e participantes.
5. Expanda a reunião e clique em **Criar tarefa de encaminhamento**, atribuindo-a ao colega do grupo correspondente.
6. O colega entra **em outro navegador ou computador** com a própria conta. Acesse o sino e **Tarefas → Minhas tarefas**.
7. O colega altera o status da tarefa para **Em andamento** e depois **Concluído**.
8. O criador vê o aviso de conclusão no sino e pode acessar a tarefa pelo botão **Ver tarefa**.
9. Consulte a reunião: a tarefa aparece vinculada ao encaminhamento original.
10. Registre eventuais falhas. **Não use a opção "Restaurar demonstração" para apagar ensaios reais**, pois ela não remove registros do banco.

## 6. Próxima fase sugerida

Após validar o fluxo acima com a equipe, desenvolver: notificação por e-mail/Teams mediante autorização TI, comentários e anexos por tarefa, aceite formal do responsável, lembretes de prazo e gestão de pendências, trilha de revisões da ata e calendário de reuniões dentro da agenda.
