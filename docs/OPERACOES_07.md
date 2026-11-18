# DCS HUB 0.7 — Editorial, Espaços ALESP, Equipes e Notificações

**Escopo:** código e protótipo público de demonstração. O GitHub Pages não autentica servidores nem envia mensagens entre computadores. A produção do Autoridades SP não foi modificada.

## 1. Wiki em formato de matéria jornalística

Na **Wiki DCS**, cada artigo tem título, editoria, resumo, texto com parágrafos e intertítulos, foto de capa, galeria, legenda, crédito, tags e versões. Use ## Intertítulo e **destaque** no corpo do texto. HTML livre é escapado.

Ao editar, escolha imagens JPEG, PNG ou WebP do computador, ou informe URLs HTTPS públicas. É possível reunir até seis imagens por matéria; a primeira é capa e as demais formam uma galeria. Cada fotografia pode ter legenda e crédito.

Na prévia pública, arquivos escolhidos são lidos apenas no navegador (máximo 2 MB por imagem). Os dados se perdem ao restaurar a demonstração. Após instalar a migração 005 em um **novo Supabase separado**, o backend poderá armazenar fotos em bucket privado dcs-editorial (até 5 MB por imagem), com regras RLS conforme o status do artigo, o autor e o gestor. **Este fluxo real não foi homologado ainda.**

## 2. Catálogo de espaços ALESP

O cadastro de eventos exige selecionar um espaço cadastrado, não digitar seu nome. Há 20 opções iniciais, entre plenários, auditórios, salões, espaços culturais, salas de reuniões e estacionamento. Administradores podem criar novos espaços, corrigir nomes ou desativar locais. A desativação preserva os registros históricos, inclusive em eventos já cadastrados.

Fontes consultadas:

- https://www.al.sp.gov.br/institucional/assembleia/plenarios-auditorios/
- https://www.al.sp.gov.br/repositorio/legislacao/ato.da.mesa/2023/ato.da.mesa-24-25.05.2023.html
- https://www.al.sp.gov.br/noticia/?id=514524

**A seleção NÃO reserva o espaço nem confirma disponibilidade ou autorização.** As competências variam entre Presidência, SGP e DCS, conforme o Ato da Mesa 24/2023; locais sem responsável confirmado estão marcados como pendentes de conferência.

## 3. Grupos de trabalho

A tela **Equipes** separa **DCS** e **Cerimonial** pelo campo de setor do usuário, que o Administrador pode editar em Administração. Ao criar uma tarefa, escolha a equipe e, em seguida, um servidor ativo daquele grupo, ou deixe sem responsável individual. O Kanban permite filtrar por equipe.

Com banco real, o PostgreSQL verifica se o responsável está ativo, se pode trabalhar em tarefas e se pertence à equipe correta. Alterar o grupo de um servidor redistribui suas tarefas; desativá-lo deixa suas tarefas abertas sem responsável.

## 4. Notificações de tarefas

**Sistema real (preparado no código, não implantado):** a migração 005 cria task_notifications e um trigger que registra um aviso por destinatário ao atribuir ou reatribuir tarefas. O RLS impede outros usuários de ler essas mensagens. O HUB consulta novas mensagens quando o servidor entra e a cada 30 segundos enquanto estiver conectado; o sino permite marcar como lidas.

**Versão pública:** conta fictícia recebe aviso apenas ao alternar para o destinatário **na mesma aba e no mesmo navegador**, simulando o fluxo. Não há envio para outra máquina.

**E-mail, Outlook, Teams e push fora do site NÃO estão integrados.** Isso depende da TI e do Microsoft Graph/Entra ID. Atribuir uma tarefa à opção "Equipe (sem responsável individual)" não gera aviso pessoal.

## 5. Ativação do Supabase em ambiente novo

Aplique SOMENTE num Supabase exclusivo para o DCS HUB, na ordem:

1. supabase/migrations/202611180001_core.sql
2. supabase/migrations/202611180002_templates.sql
3. supabase/migrations/202611180003_admin_users.sql
4. supabase/migrations/202611180004_knowledge.sql
5. supabase/migrations/202611180005_venues_teams_editorial.sql

A quinta migração acrescenta catálogo de espaços, vínculos nos eventos, equipes nas tarefas, avisos internos, mídia editorial, bucket privado e RLS. Eventos antigos continuam visíveis mesmo sem local padronizado.

**Status atual:** nenhuma migração 005 foi aplicada, nem houve testes reais de upload ou envio de avisos entre computadores. A única instância Supabase encontrada na conexão era BUSCA AUTORIDADE, que não foi alterada.

## 6. Roteiro de apresentação

1. Entre como Administrador fictício e abra **Espaços ALESP** para consultar e editar a lista de demonstração.
2. Crie uma atividade escolhendo o espaço padronizado no formulário.
3. Abra **Equipes** para ver as pessoas da DCS e do Cerimonial.
4. Crie uma tarefa para Bruno L., selecionando a equipe Cerimonial.
5. Saia e entre como Servidor Cerimonial, **na mesma aba**, e consulte o sino e Minhas tarefas.
6. Abra a **Wiki DCS**, edite uma matéria de exemplo e adicione fotografia, legenda e crédito.
7. Use **Restaurar demonstração** como Administrador para descartar dados fictícios.

**Não utilize informações institucionais reais na prévia pública.**
