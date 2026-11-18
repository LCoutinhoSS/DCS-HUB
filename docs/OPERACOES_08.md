# DCS HUB v0.8 — Solicitantes, eventos, modelos ALESP e matérias

**Estado:** protótipo GitHub Pages com dados fictícios e código de backend separado, ainda não homologado. O login público continua demonstrativo. **O Supabase BUSCA AUTORIDADE / Autoridades SP não foi alterado.**

## 1. Solicitante não é responsável

O novo campo **Solicitante** do evento vem de um catálogo próprio com 94 parlamentares da **20ª Legislatura (2023–2027)**, capturado como referência para 18/11/2026 no portal oficial https://www.al.sp.gov.br/deputado/dados/. A lista de eleitos para a 21ª Legislatura (posse em 2027) **não substitui** os deputados em exercício antes da posse.

O administrador pode acrescentar **setores/órgãos e outros solicitantes**, editar e inativar registros. O nome fica armazenado também como fotografia histórica do pedido. Sem exclusão física de solicitantes associados a eventos. O usuário seleciona por lista, sem escrever a grafia manualmente.

A lista é uma **cópia de referência**, não uma sincronização automática com a ALESP ou com o projeto Autoridades SP. Antes de implantar, validar titularidade, suplências e mudanças de legislatura.

## 2. Assistente de criação de eventos (quatro passos)

1. **Tipo e solicitante:** escolha sessão solene, audiência pública, cursos e palestras, recepção, velório, reunião, exposição, visita ou comunicação visual. Informe o solicitante e a equipe organizadora.
2. **Data, espaço e pauta:** escolha local do catálogo ALESP, horários de início/término, contatos operacionais e público. Se for uma reunião, preencha modalidade, duração, objetivo, pauta, participantes, recursos, responsável pela ata, decisões e encaminhamentos.
3. **Checklist e delegação:** cada tipo usa um modelo diferente, com etapas agrupadas; marque o que se aplica, escolha uma pessoa da equipe e defina um prazo, quando necessário.
4. **Conferência:** resumo antes de cadastrar; a atividade fica inicialmente **Pendente**.

**Regra de UX:** checklist não é igual a tarefa. Itens sem responsável ficam no checklist. Quando um gestor confirma o evento, apenas os itens aplicáveis **atribuídos a uma pessoa** geram cartões de trabalho e notificações de tarefa. Isso evita criar dezenas de cartões sem dono no Kanban.

A área de um evento oferece **Ficha geral**, **Checklist**, **Tarefas**, **Histórico**, **Documentos** e **Pauta e reunião** (para reuniões). É possível delegar um item do checklist após criar o evento; também é possível atualizar pauta e decisões e criar uma tarefa manual a partir da reunião.

Selecionar o espaço no HUB **não faz reserva**, e a aprovação interna do evento **não substitui autorização de uso de plenários e auditórios**.

## 3. Origem dos modelos de checklist

Os títulos e as etapas foram **adaptados das planilhas fornecidas**, priorizando preservação da lógica de trabalho e substituindo grafias longas por rótulos de interface quando necessário. Não é uma transcrição literal integral de cada célula; observações e caminhos locais não foram copiados para o site.

| Planilha enviada | Modelo no HUB | Exemplos de tarefas específicas |
| --- | --- | --- |
| Sessão Solene | Sessão solene | Mesa solene, tribuna de honra, homenageados, hino, honrarias, sinalização |
| Audiência Pública | Audiência pública | Inscrições, grupos a favor e contra, tempos de fala, assentos, avaliação |
| Cursos e Palestras | Cursos e palestras | Currículo dos palestrantes, mesa, apoio, apresentações, avaliação |
| Recepção de Comitivas e Autoridades | Recepção de autoridades | Comitiva, idioma, protocolo, segurança, fotógrafo, livro de honra |
| Velório | Velório | Familiares, câmara ardente, coroas de flores, fluxo de público, pós-evento |

A planilha de **Velório** contém referências a caminhos internos de documentos da rede, omitidas do protótipo. O texto explicativo da planilha de **Recepção** contém referências à Câmara Municipal de São Paulo que precisam ser revistas por equipe técnica antes de oficializar o procedimento. Alguns checklists mencionam documentos pessoais e placas de veículos; **não guardá-los em campos livres do site público**. O banco institucional deverá prever acesso mínimo, retenção e LGPD.

As categorias **Exposição**, **Visita guiada**, **Comunicação visual** e **Reunião** receberam versões iniciais enxutas, **não extraídas dessas cinco planilhas**. Validar com cada unidade antes de usar como padrão oficial.

## 4. Matérias em página inteira

As matérias agora têm endereço próprio no frontend, por exemplo **#materia/<id>**, com capa, linha fina, texto em coluna, imagens, legendas, crédito, editoria e conteúdos relacionados. A leitura **não abre mais como pop-up**. A referência visual é um portal de notícias moderno, sem copiar identidade ou conteúdo do g1.

Editar uma matéria ainda ocorre em formulário; não há workflow completo de revisão editorial, programação de publicação ou aprovação por editor. Na demonstração, fotos são temporárias. Em ambiente real, a mídia precisa de armazenamento privado, autorização de uso das fotografias e controle de acesso.

## 5. Backend preparado — ainda não instalado

A migração **supabase/migrations/202611180006_requesters_eventflow.sql** acrescenta:
- Tabela de solicitantes com 94 deputados e cadastro administrativo, protegida por RLS.
- Campos próprios no evento para tipo, solicitante, snapshot, equipe e ficha operacional.
- Planejamento do checklist com fase, aplicabilidade, pessoa, equipe, prazo e prioridade.
- Função atômica **create_planned_event** para salvar evento + checklist com verificações de autorização.
- Confirmação que gera tarefas somente para itens atribuídos; evita duplicar tarefas de origem.
- Função de delegação posterior de etapa, que pode atualizar/criar tarefa e acionar a notificação interna.

**Não executar no Supabase BUSCA AUTORIDADE.** Criar um projeto isolado DCS HUB, aplicar migrações 001–006 e homologar autenticação, RLS e os fluxos com contas distintas. Este arquivo ainda não foi aplicado num banco real.

## 6. Recomendações críticas para próximas versões

1. **Painel de solicitações / triagem:** pedido recebido, documentos pendentes, viabilidade, parecer, aprovação, programação, realização e encerramento. Hoje o status ainda é simplificado.
2. **Vincular reuniões preparatórias a eventos principais**, com atas, decisões, responsáveis e prazos automáticos (não tratar reunião como atividade solta).
3. **Validação de conflito de espaço** antes de registrar horários e integração futura com a agenda de reservas oficial. A lista de espaços evita erro de grafia, mas não evita dupla reserva.
4. **Edição e versionamento de modelos por administradores** e controle do que é obrigatório, opcional ou não aplicável.
5. **Caixa de entrada por pessoa**, com ciência da atribuição, mudanças, comentários, prazo e lembretes, acessível em diferentes computadores via banco compartilhado.
6. **Revisão editorial** antes de publicar matéria, permissões e direitos sobre imagens.
7. **Tratamento rigoroso de eventos sensíveis**, especialmente velórios e dados de autoridades: não transformar informações de segurança, dados pessoais ou contatos privados em conteúdos públicos.

## Roteiro para testar a versão publicada

Entre com a conta fictícia Administrador, abra **Solicitantes**, confira a lista parlamentar e adicione um setor de teste. Em **Nova atividade**, escolha **Reunião**, descreva objetivo, pauta, participantes e espaço. Distribua algumas tarefas para DCS ou Cerimonial e confira o resumo. Salve o evento. Na área do evento, clique em **Checklist → Delegar** ou **Pauta e reunião → Editar pauta e decisões**. Confirme o evento como Gestor para gerar tarefas delegadas. Na **Wiki DCS**, abra uma matéria para verificar a página inteira.

Ao final, use **Restaurar demonstração**. Não utilize dados institucionais reais no GitHub Pages.
