# DCS HUB — Central de Comunicação Social / Cerimonial (homologação)

Sistema web para agenda, eventos, checklist operacional, gestão de tarefas, equipes **DCS e Cerimonial**, documentos, matérias em formato editorial e administração de usuários.

## Acessos

- **[Demonstração pública](https://lcoutinhoss.github.io/DCS-HUB/):** dados e senhas fictícios apenas no navegador. Use para conhecer a interface; não insira dados reais.
- **[Homologação com login Supabase](https://lcoutinhoss.github.io/DCS-HUB/homologacao/):** usa as contas já existentes do Supabase do **Autoridades SP**, mas tem **permissões, registros e tabelas próprias**. O primeiro administrador do HUB deve ser um administrador já autorizado no Autoridades SP; as demais contas aguardam aprovação. Inicialmente use apenas dados fictícios.

## Status — 19 de novembro de 2026

As migrações 001–015 foram **aplicadas e verificadas** no projeto Supabase existente `BUSCA AUTORIDADE`. O Autoridades SP preservou 150 registros de autoridades e 6 perfis; o HUB começou com 20 espaços ALESP e **nenhum evento criado automaticamente**. As tabelas DCS usam RLS.

O cadastro de **94 deputados estaduais** da aplicação Autoridades SP é consultado pela função restrita `dcs_list_authorities`, usada também pela área **Autoridades SP**. Ela respeita as regras de mascaramento existentes e não duplica nem edita a tabela original. Novos solicitantes (órgãos, setores, outros) são armazenados em `public.event_requesters`. O evento registra o vínculo à fonte e o nome de referência na data do cadastro.

> **Atenção:** a validação automatizada de SQL, permissões e frontend não substitui testes com duas contas reais e revisão da TI. E-mail, Outlook, Planner, SSO institucional e reserva automática de espaços **não estão integrados**. A homologação é acessível pela internet e requer login, não sendo um ambiente aprovado para informações confidenciais.


**Correção de acesso — 19/11/2026:** no Autoridades SP, a tabela `public.autoridades` tem RLS de leitura, mas não concede `SELECT` direto ao papel `authenticated`. Isso causava `permission denied for table autoridades` na homologação. A migração **008** instalou a função `dcs_list_authorities`, restrita a membros ativos do HUB, que reutiliza `consultar_autoridades_seguras()` e devolve somente campos públicos/autorizados. A UI de **Autoridades SP** e o seletor de **Solicitantes** passaram a usar essa função. Os testes com perfil ativo retornaram 150 registros (94 deputados); sem perfil DCS, zero. Nenhuma permissão da tabela original foi modificada.

## Atualização 0.14 — Nominatas Word e prismas PowerPoint

- **Pessoas e mesa** agora tem tratamento/título, ordem protocolar manual e indicação de quem a pessoa representa. O quadro **Ordem da mesa** reúne essas informações e sinaliza o que falta confirmar.
- **Nominata Word (.docx)** gerada com nomes, cargos, tratamentos, saudações e representações. A precedência não é inventada pelo sistema.
- **Prismas PowerPoint (.pptx)** editáveis: uma folha vertical por pessoa confirmada da mesa, com duas faces e a superior invertida para dobra, inspirada no modelo recebido.
- **Aprovação obrigatória:** somente Cerimonial/Gestor/Administrador valida a versão. A API bloqueia mesa incompleta, ordens repetidas, cargo/tratamento ausente, versão antiga e prismas divergentes da lista confirmada.
- Os **arquivos originais e o brasão institucional não foram publicados** no GitHub público; os formatos precisam de validação visual de impressão com o Cerimonial.
- Migrações **014 e 015 aplicadas**, mantendo o Autoridades SP inalterado. Testes SQL são transacionais com rollback, sem deixar dados fictícios.

Leia o [manual de nominatas e prismas 0.14](docs/NOMINATAS_PRISMAS_014.md).

## Atualização 0.13 — Roteiro e Resumo da Reunião em Word

- Na aba **Materiais para impressão** do evento, o HUB agora prepara dois documentos a partir dos dados: **Roteiro** (sequência da cerimônia) e **Resumo da reunião** (decisões, pendências e providências).
- São **minutas editáveis por trecho**. O editor pode corrigir, adicionar, remover ou mover trechos e salvar uma versão de rascunho no banco.
- **Revisão controlada:** apenas Servidor Cerimonial, Gestor ou Administrador autoriza a exportação. O HUB registra identidade, data e versão; cada novo rascunho exige nova revisão.
- **Word (.docx) editável:** gerado no navegador apenas da versão aprovada pelo servidor. Alterações no evento, briefing, participantes ou reuniões depois da revisão exigem nova aprovação.
- Os horários intermediários, a mesa e a presença de autoridades **não são inventados**: quando faltam informações, o documento mostra **A CONFIRMAR**.
- A exportação é produzida sem CDN e sem enviar conteúdos a conversores externos. **Não publica os modelos originais da ALESP** e não representa assinatura digital.
- Migrações **012 e 013** já aplicadas; os testes de permissões e revisão foram realizados em transações revertidas, preservando Autoridades SP e eventos existentes.

Nominatas em Word e prismas em PowerPoint estão disponíveis na versão 0.14, com conferência obrigatória. Integração com SharePoint e calendário Outlook/Teams ainda não foi ativada. Veja o [Guia do gerador Word (0.13)](docs/GERADOR_DOCUMENTOS_013.md).

## Atualização 0.12 — Visão rápida e teste com perfil Servidor

- A primeira aba de cada evento agora é **Visão rápida**: solicitante, data/local, decisões confirmadas, pendências para retorno do gabinete, mesa/homenageados, reuniões e tarefas com prazo.
- Os resumos são calculados das respostas e participantes existentes. **Sem resposta não significa confirmado**: o HUB diferencia informação registrada, aguardando confirmação e ausente.
- Acesso **Copiar resumo** para compartilhar a síntese e **Atualizar** para consultar respostas gravadas por outras contas.
- Os cinco documentos fornecidos (dois roteiros, resumo de reunião, modelo de nominatas e modelo de prismas) foram analisados como fluxos; **não foram publicados no GitHub**. A visão rápida indica onde consultar seus dados de origem; a geração de Roteiro e Resumo da Reunião está disponível na versão 0.13; nominatas e prismas ainda são futuros.
- **Acesso demonstrativo de Servidor DCS** na demonstração pública: `usuario@demo.dcs-hub.invalid` · `DCSdemo2026!`. Fictício, sem banco real. Homologação real só com convite no Supabase Auth e ativação administrativa.
- Mantidas as tabelas atuais sem nova migração ou exclusão dos dados existentes.

Ver [Guia da Visão rápida e acesso comum (0.12)](docs/VISAO_RAPIDA_012.md).

## Atualização 0.11 — Ficha do Gabinete, mesa e checklist por fases

- **Ficha do Gabinete:** perguntas extraídas e adaptadas dos cinco checklists ALESP, agrupadas por assunto, com respostas, situação, autor/data e filtro de pendências. Cada resposta fica no banco e pode ser consultada por outras contas do HUB.
- **Pessoas e mesa:** nomes, cargos, instituições, participação no evento e confirmação de presença; vínculo opcional ao Diretório de Autoridades SP, sem editar a base original.
- **Execução:** checklist agrupado por fase com filtros Pendentes/Todos/Concluídos e progresso visível, sem despejar 73 itens no painel lateral.
- **Cadastro de eventos:** eliminado o campo ambíguo "Pessoas/autoridades principais". Primeiro escolha o **Solicitante** e depois preencha convidados e mesa na área do evento.
- **Segurança e colaboração:** a migração **011** cria tabelas próprias para respostas e participantes com RLS. Usuários ativos consultam; editores atualizam; leitores não editam; eventos encerrados ficam somente para consulta. Alterações são registradas no histórico.
- O evento já existente foi preservado. Testes transacionais entre identidades distintas passaram, revertendo todos os dados fictícios.

Ver [Guia da ficha do gabinete e participantes](docs/GABINETE_011.md), incluindo roteiro de teste com outras contas.

## Atualização 0.10 — Aceite, comentários e alerta de prazos

- **Aceitar tarefa:** responsável confirma o recebimento com data/hora registradas. A nova pessoa deverá aceitar novamente se houver redistribuição.
- **Comentários:** conversa de trabalho vinculada a cada tarefa, acessível somente pelo criador, responsável e gestores, com autoria, data e aviso interno de nova mensagem.
- **Atrasos:** destaque nos cartões, filtro Atrasadas no Kanban e indicador no Dashboard; aviso de vencimento hoje ou amanhã.
- **Lembretes internos automáticos durante sessão autenticada:** alerta diário por tarefa vencendo amanhã, hoje ou atrasada, sem duplicações; não é e-mail, Teams, push nem processamento enquanto todos estão desconectados.
- **Segurança:** RLS específica de comentários, aceite apenas pelo responsável, notificações somente aos participantes e RPCs protegidas.
- Banco recebeu a **migração 010**; simulação com dois usuários validou aceite, bloqueio de comentário indevido, aviso ao criador, lembrete único e reset de aceite após reatribuição; todos os dados fictícios foram revertidos.

A **integração de eventos com o calendário Microsoft Teams/Outlook** é a próxima fase. Dependerá de escolher o calendário institucional, registrar o aplicativo no Microsoft Entra ID e obter autorização de permissões junto à TI. Veja [Manual de colaboração 0.10](docs/COLABORACAO_10.md).

## Atualização 0.9 — Colaboração operacional

- **Reuniões preparatórias vinculadas aos eventos**, com calendário, participantes, pauta, ata, decisões e histórico.
- **Tarefas de encaminhamento ligadas à reunião de origem**, com equipe, responsável individual, prioridade e prazo.
- **Avisos dentro do HUB** para quem recebe tarefa e também para seu criador quando o responsável atualiza o andamento; o sino tem botão **Ver tarefa**.
- **Minhas tarefas** e **Ver reunião** para navegar rapidamente dos encaminhamentos ao trabalho.
- **Concluir checklist agora funciona no banco**, sincronizando o cartão de tarefa quando houver vínculo.
- **Permissões mais seguras:** alterações de tarefas e checklist agora passam por RPCs com verificação de identidade, papel e responsabilidade; não existe mais atualização direta livre desses campos via Data API.
- Banco já recebeu **migração 009**; teste transacional com dois usuários simulados passou e foi revertido sem deixar registros fictícios.

O e-mail/Teams/Outlook e a colaboração via dois navegadores reais ainda exigem homologação com integrantes da equipe. Leia [Manual de colaboração 0.9](docs/COLABORACAO_09.md).

## Recursos

| Recurso | Demonstração | Homologação Supabase |
| --- | --- | --- |
| Login | Contas fictícias públicas | E-mail/senha real, perfil DCS inativo até aprovação |
| Autoridades | Relação fictícia inicial | Consulta à tabela original `public.autoridades` |
| Solicitantes | Busca, inclusão e edição fictícias | Deputados da base Autoridades SP + outros solicitantes administráveis |
| Agenda, eventos e reuniões | Temporários | Persistidos no banco e compartilhados |
| Espaços ALESP | 20 opções iniciais | Catálogo no banco e edição por administrador |
| Checklists | Modelos de cinco planilhas ALESP | Checklist persistente, fases e delegação para usuários ativos |
| Tarefas/notificações | Simulação na mesma aba | Tarefas por UUID e aviso interno por usuário (sem e-mail) |
| Equipes | DCS e Cerimonial fictícios | Perfis e vínculos por equipe |
| Wiki DCS | Matérias, capa, fotos e versões fictícias | Artigos no banco; fotos em bucket privado |
| Administração | Perfis fictícios | Admin libera perfis DCS sem mudar permissões do Autoridades SP |

A seleção de um espaço da ALESP **não é uma reserva** e a confirmação de um evento no HUB não substitui autorização institucional.

## Estrutura e implantação

- `index.html` e `demo.html` — aplicações e interface pública.
- `src/boot.js` — inicia login real apenas com `VITE_DCS_MODE=homologacao`, sem fallback para contas fictícias.
- `src/backend.js`, `src/model.js` — cliente Supabase, eventos, tarefas, Auth, administração.
- `src/requesters.js`, `src/venues.js`, `src/teams.js`, `src/eventflow.js`, `src/checklist-models.js` — fluxos operacionais.
- `src/knowledge.js`, `src/admin.js` — revista interna, documentos e perfis.
- `supabase/migrations/202611180001_*.sql` a `202611180007_*.sql` — **já aplicadas**, não executar novamente.
- `supabase/migrations/202611190008_dcs_authorities_bridge.sql` — **já aplicada**; consulta protegida para o HUB, sem conceder SELECT direto à tabela original.
- `supabase/migrations/202611190009_collaboration_meetings_tasks.sql` — **já aplicada**; reuniões e execução segura de tarefas/checklist.
- `supabase/migrations/202611190010_task_collaboration.sql` — **já aplicada**; aceite, comentários e lembrete diário protegido.
- `supabase/migrations/202611190011_gabinete_briefing_participants.sql` — **já aplicada**; registro compartilhado das respostas do gabinete e composição da mesa.
- `supabase/migrations/202611190012_event_materials_review.sql` e `202611190013_material_blocks_validation.sql` — **já aplicadas**; rascunhos Word, aprovação e validação do documento.
- `supabase/migrations/202611190014_protocol_materials.sql` e `202611190015_prismas_consistency.sql` — **já aplicadas**; ordem de mesa e validação dos prismas por participante.
- `.github/workflows/build-homologacao.yml` — compila o login real com **chave publicável**, publica exclusivamente o caminho `/homologacao/`; o site raiz continua sendo demonstração.
- `.github/workflows/ci.yml` — testes e build.

## Segurança e boas práticas

O projeto usa o **mesmo Supabase e Auth** do Autoridades SP, com isolamento **lógico**, não físico. Não foram alterados `public.autoridades`, `public.perfis_usuarios`, regras existentes ou o gatilho de novos usuários do Autoridades SP. O login permite autenticação pela conta existente; acesso ao HUB exige perfil próprio em `public.profiles`. A chave publishable pode estar no frontend, mas **nunca** divulgar chaves secretas nem senhas.

Os Supabase Advisors identificaram avisos anteriores de funções `SECURITY DEFINER` públicas no Autoridades SP e outros pontos de segurança. Eles precisam ser revisados em conjunto, sem mudanças bruscas que interrompam a aplicação existente. Antes de dados institucionais, validar também políticas de retenção, LGPD, auditoria, aprovação TI e alternativas de SSO/MFA.

**Leia também:**
- [Nominatas e prismas (0.14)](docs/NOMINATAS_PRISMAS_014.md)
- [Gerador Word, revisão Cerimonial e exportação (0.13)](docs/GERADOR_DOCUMENTOS_013.md)
- [Visão rápida e perfil Servidor (0.12)](docs/VISAO_RAPIDA_012.md)
- [Ficha do Gabinete, pessoas e mesa (0.11)](docs/GABINETE_011.md)
- [Aceite, comentários e lembretes (0.10)](docs/COLABORACAO_10.md)
- [Fluxo colaborativo de reuniões e tarefas (0.9)](docs/COLABORACAO_09.md)
- [Banco compartilhado e primeiro login](docs/BANCO_COMPARTILHADO.md)
- [Guia dos eventos e checklists](docs/OPERACOES_08.md)
- [Manual de Administração](docs/ADMINISTRACAO.md)
- [Acesso demonstrativo](docs/ACESSO_PROTOTIPO.md)
