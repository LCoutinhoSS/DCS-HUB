# DCS HUB 0.16 — Outlook / Teams: ponte de calendário

**19/11/2026 · Primeiro estágio funcional.** O site exporta `.ics` para importação manual no Outlook. **Ainda não escreve diretamente nos calendários Microsoft 365 e não cria reuniões do Teams.**

## Uso imediato

No HUB, entre em **Gestão de eventos → evento → Outlook / Teams**, e clique **Baixar evento (.ics)** quando a atividade estiver **Confirmada** ou **Concluída**. O arquivo contém apenas título, início, fim e local, com identificador estável; não exporta convidados, notas internas, contatos nem detalhes de segurança. A opção **Agenda integrada → Exportar .ics** baixa a coleção de eventos confirmados/concluídos. Não é necessário copiar código de calendário manualmente.

Abra o [calendário do Outlook](https://outlook.office.com/calendar/) na conta autorizada. Escolha **Adicionar calendário → Carregar/importar de arquivo** (o nome pode variar com o Outlook e as políticas de TI), selecione o arquivo baixado e escolha o calendário correto. O arquivo não é convite, não envia notificações e não inclui link de Teams.

**Reagendamento e duplicação:** importar `.ics` não cria sincronização de duas vias. Alterações futuras no HUB não chegam ao Outlook automaticamente; a equipe deve verificar se há eventos previamente importados antes de importar outra versão. Não use este fluxo para reservas de espaços institucionais.

## Integração automática futura — pré-requisitos da TI

Escolher **qual calendário institucional será o destino**: pessoal de um servidor, compartilhado da equipe, caixa de recurso ou caixa compartilhada. Confirmar quem pode criar, editar e cancelar eventos e quem pode ler os detalhes. Somente depois registrar um aplicativo no **Microsoft Entra ID** do tenant da ALESP, com ambiente de homologação e consentimento apropriados.

Um conector de produção precisa usar **Microsoft Graph** com autenticação autorizada, persistir IDs imutáveis por par (evento HUB / calendário externo), verificar etags/versões para evitar conflitos, registrar auditoria e ter tratamento de falhas para reagendamentos, cancelamentos, duplicatas e fusos horários. Não guardar refresh tokens nem segredos no GitHub Pages, no navegador ou em tabelas públicas do Supabase.

Para eventos virtuais/híbridos, somente se autorizado e solicitado, o Graph admite criar um evento com `isOnlineMeeting: true` e `onlineMeetingProvider: teamsForBusiness` **quando o calendário suportar o Teams**. Uma sessão presencial da ALESP não deve gerar reunião Teams automaticamente.

Documentação de referência:
- https://learn.microsoft.com/en-us/graph/api/calendar-post-events?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/outlook-calendar-online-meetings
- https://learn.microsoft.com/en-us/entra/identity-platform/msal-authentication-flows

## Testes e limites

Testar download de evento confirmado, bloqueio de pendente, datas de Brasília, caracteres acentuados, exportação conjunta e abertura no Outlook. Validar importação manual com dados **fictícios** na homologação. Nenhuma alteração de esquema Supabase é necessária para a versão 0.16.

A homologação continua disponível publicamente mediante login e não deve receber dados confidenciais antes de avaliação institucional.
