# DCS HUB 0.17 — Controle manual e colaborativo da agenda

**19 de novembro de 2026.** Esta fase funciona sem conectar Microsoft Outlook, Teams, SharePoint ou Entra ID. O HUB **não verifica** o calendário externo.

## Operação

1. Abra **Gestão de eventos → evento → Outlook / Teams**. Eventos **Confirmados** ou **Concluídos** oferecem **Baixar evento (.ics)**.
2. Importe o arquivo no calendário Outlook escolhido e confira os dados. O HUB não envia convites nem cria links Teams.
3. Volte ao HUB. Informe opcionalmente o nome do calendário onde efetuou a importação. Marque a caixa **Confirmo que importei ou atualizei este evento manualmente no Outlook**.
4. Clique **Registrar confirmação manual**. Somente agora aparece **Importação manual declarada**, com data, responsável e calendário informado.
5. Outro usuário pode abrir o mesmo evento e usar **Atualizar situação** para consultar o estado compartilhado.

O download, por si só, **não** atualiza o registro. O servidor registra a afirmação humana, não uma confirmação da Microsoft.

## Mudanças de evento

A confirmação guarda uma cópia mínima de título, início, término e local. Se qualquer campo mudar, o HUB exibe **Evento alterado após a importação**. Volte ao Outlook, corrija o compromisso manualmente e registre nova confirmação. Se o evento for cancelado, aparece **Evento cancelado: conferir retirada do Outlook**; o HUB não apaga o compromisso externo.

O botão **Desfazer registro** remove a declaração atual, preservando a ação no histórico de alterações. Os registros persistem no Supabase e podem ser consultados por contas ativas do DCS HUB. Leitores não podem criar nem desfazer declarações.

## Banco e segurança

- Migração: `supabase/migrations/202611190017_calendar_manual_imports.sql`
- Tabela `public.event_calendar_imports` com RLS; apenas leitura autorizada a membros ativos, escrita somente por função.
- Função `public.dcs_set_calendar_manual_import` valida `auth.uid()`, o perfil editor, o status e a versão atual do evento antes de gravar. Não aceita versão antiga de dados.
- A trilha de `event_history` recebe registro da declaração e de sua exclusão.
- Os arquivos e o código não contêm credenciais Microsoft, nem acesso ao calendário da ALESP. Não houve alteração nos dados do Autoridades SP.

## Homologação com duas contas

Use apenas dados fictícios. Na conta A, confirme um evento, baixe o .ics e declare a importação. Na conta B, abra o mesmo evento e clique Atualizar situação. Se a conta B for Leitor, deverá ver o registro sem os controles de edição. Reagende o evento com a conta autorizada: a aba deverá indicar desatualização. Corrija o compromisso Outlook apenas em ambiente de teste e registre outra confirmação.

**Integração real futura:** depende da TI disponibilizar autorização, calendário de destino e credenciais gerenciadas em backend. Isto não deve ser substituído por senha de usuário, chave de serviço no frontend nem Power Automate sem governança.
