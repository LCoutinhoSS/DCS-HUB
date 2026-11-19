# DCS HUB v0.18 — Painel de Controle da Agenda

**Data:** 19 de novembro de 2026. **Objetivo:** centralizar o acompanhamento manual da importação dos eventos no Outlook, sem pedir acesso à conta Microsoft da ALESP.

## Onde acessar

No menu, clique **Controle da agenda**. O Dashboard mostra um resumo de pontos de atenção com acesso direto ao mesmo painel.

### Informações apresentadas

- **Sem registro:** evento confirmado/concluído sem declaração de importação para o Outlook.
- **Atualização necessária:** alguém declarou a importação, mas o título, local, início ou fim do evento foi alterado depois.
- **Conferir cancelamento:** o evento foi cancelado no HUB e existe uma declaração prévia de importação. O compromisso pode ainda existir no Outlook.
- **Conferidos:** declaração de importação cadastrada e sem mudanças detectadas na versão do HUB.
- **Aguardando aprovação:** eventos pendentes que ainda não podem ser exportados.

Não contamos eventos cancelados que nunca tiveram importação declarada como problemas de remoção no Outlook.

O painel possui **busca por título/local/equipe/solicitante**, filtros por estado, filtro de próximos 30 dias e acesso **Abrir evento**, direcionando ao campo de acompanhamento na aba Outlook / Teams.

## Regra importante

**Conferido não significa sincronizado com a Microsoft.** Significa somente que a equipe declarou manualmente a importação e que os dados do evento no HUB não mudaram desde então. Nem o painel nem a importação `.ics` consultam o Outlook ou verificam o recebimento no Teams.

## Segurança e compatibilidade

- Reutiliza `event_calendar_imports` com RLS e permissões já existentes.
- O painel é exclusivamente de leitura; alterações continuam restritas à aba Outlook / Teams com declaração explícita por editor autenticado.
- Carrega demo e homologação; sem novas migrações nem credenciais.
- Preserva o estabilizador de navegação 0.17.1, evitando saltos ao consultar filtros.
- Não toca em dados Autoridades SP.

## Roteiro rápido para apresentação

1. Dashboard → destaque **Agenda da equipe** → **Abrir controle da agenda**.
2. Mostre cartões, busca e filtro **Precisam de atenção**.
3. Clique em **Abrir evento** de uma pendência e mostre a aba **Outlook / Teams**.
4. Explique a exportação `.ics`, a declaração humana e a detecção de mudanças.
5. Reforce que o vínculo direto com Microsoft 365 dependerá de autorização institucional.
