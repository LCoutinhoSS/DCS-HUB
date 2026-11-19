# DCS HUB v0.10 — Aceite, comentários, atrasos e lembretes internos

**Atualizado em 19/11/2026.** Migração 010 aplicada ao mesmo Supabase do Autoridades SP, mantendo tabelas e permissões DCS independentes.

## Como o servidor trabalha

1. **Tarefa atribuída:** a pessoa recebe aviso no sino, com atualização periódica enquanto está conectada.
2. **Aceitar tarefa:** o responsável clica em **Aceitar tarefa**. O banco salva o ID da pessoa e a data/hora; o criador recebe aviso do aceite.
3. **Comentários:** o criador, a pessoa responsável e gestores podem ler/escrever na conversa vinculada à tarefa, limitada a 2.000 caracteres por mensagem. Não há edição ou exclusão de comentários nesta versão.
4. **Reatribuição:** sempre que o responsável muda, o aceite anterior é zerado e a pessoa nova deve aceitá-la.
5. **Andamento:** continuam valendo os controles do banco que limitam alterações ao criador, responsável ou gestor.

Aceite não é aprovação administrativa da execução e ainda não bloqueia tecnicamente a conclusão antecipada.

## Prazos e lembretes

- **Atrasadas:** destaque vermelho nos cartões, botão de filtro no Kanban e KPI no Dashboard.
- **Vence hoje/amanhã:** cartão mostra atenção à proximidade do prazo.
- **Lembretes internos diários:** quando o usuário entra no HUB ou mantém a sessão ativa, a função dcs_sync_my_reminders gera alerta de vencimento amanhã, hoje ou atraso, no máximo uma vez por tarefa, por pessoa e por dia. Não avisa sobre tarefas concluídas/canceladas ou eventos encerrados.
- **Importante:** esta versão NÃO envia push, e-mail ou Teams e NÃO executa quando todos estão desconectados. A extensão pg_cron ainda não está instalada. O lembrete aparece na próxima consulta autenticada.

## Segurança e testes

Migração: supabase/migrations/202611190010_task_collaboration.sql.

- Colunas tasks.accepted_at e tasks.accepted_by, com reset em redistribuição.
- Nova tabela task_comments com RLS restrita a pessoas envolvidas e gestores, sem permissão de anônimo.
- RPC dcs_accept_task exige que auth.uid corresponda ao responsável atual.
- Notificações de aceite e comentários somente aos participantes afetados.
- Índice único para lembretes diários; consultas repetidas não criam spam.
- Conteúdo dos comentários escapado como texto na interface para impedir HTML injetado.

**Validação no banco:** foi simulado, em transação revertida, um administrador atribuindo uma tarefa fictícia a outro servidor, que recebeu um único lembrete, aceitou, comentou e foi bloqueado ao tentar comentar em tarefa alheia. O criador recebeu os dois avisos; a reatribuição zerou o aceite. Nenhum registro de teste permaneceu gravado após o rollback.

## Homologar com a equipe

Abra https://lcoutinhoss.github.io/DCS-HUB/homologacao/

1. Entre como Administrador e ative uma segunda conta com a equipe correta.
2. Crie um evento e uma reunião fictícios; atribua uma tarefa com prazo.
3. A segunda pessoa acessa o HUB em outro navegador, clica em **Aceitar tarefa**, comenta e atualiza o andamento.
4. O criador verifica avisos no sino e responde à conversa.
5. Redistribua a tarefa para conferir que o aceite anterior desaparece.
6. Registre falhas de permissão ou comunicação antes de usar dados institucionais.

## Próxima integração — calendário Microsoft Teams/Outlook

**Ainda não conectada.** A API Microsoft Graph pode criar um evento no calendário do Outlook/Exchange, que dá suporte ao Teams. Reuniões online podem exigir propriedades específicas de Teams e suporte da caixa do organizador.

Planejamento para aprovação da TI:
- Escolher calendário de destino: pessoal, institucional, caixa compartilhada ou grupo Microsoft 365.
- Registrar aplicativo no Microsoft Entra ID e aprovar permissões mínimas (ex.: Calendars.ReadWrite para calendário de usuário).
- Autenticar com OAuth via servidor seguro; nunca deixar tokens ou segredos no GitHub Pages.
- Sincronizar apenas eventos confirmados, com ID remoto, auditoria, idempotência, atualização e cancelamento.
- Utilizar fuso America/Sao_Paulo e testar em calendário isolado.
- A criação no calendário NÃO substitui reserva oficial dos espaços ALESP.

Documentação:
- https://learn.microsoft.com/en-us/graph/api/calendar-post-events?view=graph-rest-1.0
- https://learn.microsoft.com/pt-br/graph/outlook-calendar-online-meetings
