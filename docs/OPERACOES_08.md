# DCS HUB v0.8 — Solicitantes, eventos, modelos ALESP e matérias

**Estado:** a demonstração na raiz continua fictícia. A rota **/homologacao/** usa o mesmo Supabase e Auth do Autoridades SP, mas com perfis e tabelas próprias do HUB. As migrações 001–007 já foram instaladas no projeto BUSCA AUTORIDADE e verificadas, sem alterar as estruturas originais de autoridades/perfis. **Falta testar login interativo e colaboração com contas autorizadas.**

## 1. Solicitante não é responsável

O novo campo **Solicitante** tem 94 deputados estaduais da **20ª Legislatura (2023–2027)**, agora consultados **diretamente na tabela `public.autoridades` do Autoridades SP**, sem duplicação de nomes. O vínculo e a fotografia histórica do nome são registrados no evento. A lista de eleitos para 2027 não substitui os deputados em exercício antes da posse.

O administrador pode acrescentar **setores/órgãos e outros solicitantes**, editar e inativar registros. O nome fica armazenado também como fotografia histórica do pedido. Sem exclusão física de solicitantes associados a eventos. O usuário seleciona por lista, sem escrever a grafia manualmente.

A lista agora vem do **mesmo banco do Autoridades SP** e reflete suas atualizações ao recarregar. Não é sincronização direta com o site da ALESP: validar titularidade, suplências e mudanças de legislatura na aplicação de origem.

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

### Complemento da Sessão Solene (segunda aba)

A planilha de Sessão Solene tem **duas abas**. Além da reunião preparatória, foram incorporadas etapas da aba **CheckList Planejamento**: impressões, roteiro, nominatas, honrarias, salas de apoio, recepção, precedência, distribuição de rádios, execução, devolução de materiais e avaliação pós-evento. O modelo atual oferece **73 itens**, divididos em fases recolhíveis; as equipes DCS/Cerimonial e o responsável podem ser definidos individualmente. Os dados de homenagem do arquivo de exemplo foram excluídos.

A planilha de **Velório** contém referências a caminhos internos de documentos da rede, omitidas do protótipo. O texto explicativo da planilha de **Recepção** contém referências à Câmara Municipal de São Paulo que precisam ser revistas por equipe técnica antes de oficializar o procedimento. Alguns checklists mencionam documentos pessoais e placas de veículos; **não guardá-los em campos livres do site público**. O banco institucional deverá prever acesso mínimo, retenção e LGPD.

As categorias **Exposição**, **Visita guiada**, **Comunicação visual** e **Reunião** receberam versões iniciais enxutas, **não extraídas dessas cinco planilhas**. Validar com cada unidade antes de usar como padrão oficial.

## 4. Matérias em página inteira

As matérias agora têm endereço próprio no frontend, por exemplo **#materia/<id>**, com capa, linha fina, texto em coluna, imagens, legendas, crédito, editoria e conteúdos relacionados. A leitura **não abre mais como pop-up**. A referência visual é um portal de notícias moderno, sem copiar identidade ou conteúdo do g1.

Editar uma matéria ainda ocorre em formulário; não há workflow completo de revisão editorial, programação de publicação ou aprovação por editor. Na demonstração, fotos são temporárias. Em ambiente real, a mídia precisa de armazenamento privado, autorização de uso das fotografias e controle de acesso.

## 5. Banco compartilhado e acesso de homologação

As sete migrações estão **aplicadas** no Supabase existente. A tabela de deputados **não foi duplicada** e a tabela `public.perfis_usuarios` permanece independente dos perfis `public.profiles` do DCS HUB. O site real usa o mesmo login Supabase, mas requer a ativação de permissão específica no HUB.

Para acessar: https://lcoutinhoss.github.io/DCS-HUB/homologacao/

O primeiro administrador DCS precisa ter autorização `administracao` no Autoridades SP. Todos os demais começam como `reader` inativo no HUB. Nenhuma conta DCS foi criada automaticamente na aplicação inicial. Veja [BANCO_COMPARTILHADO.md](BANCO_COMPARTILHADO.md).

**Segurança:** a versão de homologação permanece disponível pela internet e deve conter somente dados de teste até validação com contas reais e autorização da TI. A demonstração na raiz não compartilha dados.

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
