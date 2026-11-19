# DCS HUB v0.11 — Ficha do Gabinete, Participantes e Mesa

**Estado: 19/11/2026.** O mesmo Supabase compartilhado com o Autoridades SP recebeu a migração 011. Os registros do Autoridades SP não foram alterados e o evento já criado pelo usuário foi preservado.

## Por que esta mudança

Os cinco arquivos de checklist fornecidos têm duas naturezas distintas:

1. **Perguntas da reunião preparatória:** o gabinete ou a assessoria precisa informar composição da mesa, autoridades convidadas, homenageados, previsão de público, apresentações, necessidades de infraestrutura, acessibilidade e outras definições.
2. **Providências operacionais:** a equipe DCS/Cerimonial precisa executar tarefas concretas, definir responsável, prazo e marcar conclusão.

Um checkbox de concluído não guarda a resposta nem permite a outro servidor entender o que ficou combinado. Por isso, os dois assuntos agora ficam separados em abas do evento.

## Abas novas

### Ficha do Gabinete

Acesse **Gestão de eventos → [evento] → Ficha do Gabinete**.

- Perguntas específicas de cada modelo: Sessão Solene, Audiência Pública, Cursos/Palestras, Recepção de Comitiva, Velório; modelos básicos para Reunião, Exposição, Visita e Comunicação Visual.
- Perguntas organizadas por assunto em seções recolhíveis, com contador de respostas e filtro de pendências.
- Cada pergunta tem resposta em texto, situação (**Pendente / A confirmar / Confirmado / Não se aplica**) e botão **Salvar resposta**.
- As respostas ficam no banco por **evento + identificador da pergunta**, e mostram data/hora e a conta que alterou.
- Qualquer membro ativo do HUB pode consultar; somente pessoas com papel operacional/gestão podem editar. Eventos concluídos ou cancelados são somente leitura.
- Botão **Atualizar dados** permite consultar mudanças realizadas em outro navegador/conta.

### Pessoas e mesa

Acesse **Gestão de eventos → [evento] → Pessoas e mesa**.

- Registre nome, cargo, instituição, tipo de participação (**mesa, uso da palavra, homenageado, palestrante, convidado, comitiva, outro**) e situação do convite (**a confirmar, convidado, confirmado, não comparecerá**).
- **Vincular ao Diretório (opcional):** permite usar um registro do Autoridades SP como referência, com nome/cargo/instituição sugeridos. A pessoa pode ser informada manualmente se não constar do diretório.
- É possível corrigir dados, acompanhar confirmação e **retirar da lista** sem apagar o histórico bruto (inativação).
- Os dados estão no banco e são consultáveis por outras contas ativas; alterações registram autor e metadados no histórico do evento.

### Checklist de execução

Acesse **Gestão de eventos → [evento] → Execução**.

- Mostra progresso e quantidade aplicável, agrupado por fase.
- As seções podem ser abertas/recolhidas; a primeira começa aberta.
- Filtros **Pendentes, Todos, Concluídos**.
- Conclusão, delegação, equipe e prazo continuam nas tarefas existentes.
- O painel lateral do evento foi reduzido a um resumo, evitando exibir dezenas de caixas de seleção de uma vez.

**Nota importante:** a migração preserva os checklists já existentes. Alguns títulos dos checklists originais ainda podem repetir assuntos da nova Ficha, pois representam providências de confirmar/organizar; o checklist não foi apagado nem reescrito automaticamente.

## Sobre o campo Autoridades

**Solicitante** não é sinônimo de autoridade presente. São três conceitos:
- **Solicitante:** deputado, órgão, gabinete ou unidade que pediu o evento.
- **Pessoas e mesa:** quem foi convidado, confirmou, falará, receberá homenagem ou estará à mesa.
- **Diretório de autoridades:** consulta aos registros do Autoridades SP. Não serve para registrar a lista de presença de cada evento.

Não é obrigatório cadastrar cada convidado no Autoridades SP. O vínculo com o diretório é opcional e o cadastro original não é alterado.

## Origem dos modelos de perguntas

As perguntas foram adaptadas dos cinco arquivos XLSX fornecidos em 18/11/2026:
- Sessão Solene — aba **Reunião Preparatória**;
- Audiência Pública — aba **Checklist**;
- Cursos e Palestras — aba **Checklist**;
- Recepção de Comitivas e Autoridades — aba **CheckList Planejamento**;
- Velório — aba **CheckList Planejamento**.

A redação foi ajustada para consulta digital e não é uma cópia literal integral de cada célula. Exigências de segurança, documentos de homenageados e dados pessoais como **RG, CPF e placas** não devem ser armazenados em texto livre. Para documentos ou informações restritas, use SharePoint com controle de acesso institucional autorizado.

## Banco de dados e segurança

Migração aplicada: **supabase/migrations/202611190011_gabinete_briefing_participants.sql**.

- **event_briefing_answers** — chave composta evento/pergunta, resposta, status, autor da edição e hora; leitura via RLS apenas para membros ativos; gravação exclusivamente via RPC **dcs_save_event_briefing**, que exige perfil editor e rejeita eventos encerrados; histórico registra identificador/status da pergunta, não seu conteúdo.
- **event_participants** — integrantes de mesa, convidados etc. com vínculo opcional à fonte original, nome/cargo e status da presença; políticas RLS de leitura por membro e edição por perfil ativo autorizado; sem permissão de DELETE nem edição de evento finalizado.
- Não foram alteradas tabelas ou permissões de **public.autoridades**, **public.perfis_usuarios** nem **auth.users**.

### Teste multiusuário realizado

Em transação que terminou com **ROLLBACK**, um administrador criou evento fictício, preencheu uma resposta e adicionou uma pessoa à mesa; outro perfil operacional leu e atualizou ambos; um perfil **Leitor** foi impedido de editar. Nenhum registro do teste foi mantido.

## Como testar com outras contas

1. Acesse https://lcoutinhoss.github.io/DCS-HUB/homologacao/ e abra **Gestão de eventos**.
2. Selecione um evento de ensaio. Na **Ficha do Gabinete**, registre uma resposta, escolha **A confirmar** ou **Confirmado** e clique em **Salvar resposta**.
3. Em **Pessoas e mesa**, adicione uma pessoa fictícia e marque como **Convidado**.
4. Em outro navegador, entre com uma conta de servidor DCS/Cerimonial que esteja ativa. Abra o mesmo evento e use **Atualizar dados**.
5. Confirme a leitura da resposta e a lista de convidados. Altere o status da pessoa ou edite uma resposta e confira novamente na primeira conta.
6. Entre com uma conta **Leitor**: as informações devem aparecer, mas sem formulários de alteração.
7. Abra **Execução** e navegue entre as fases/filtros. Não inclua dados sensíveis nos exemplos.

**Atenção:** o botão de restauração da demonstração pública não apaga dados inseridos na homologação real. Evite criar registros reais durante testes sem plano de limpeza.

A sincronização com calendário Outlook/Teams continua sendo a etapa posterior, sujeita à autorização de TI e escolha do calendário institucional.
