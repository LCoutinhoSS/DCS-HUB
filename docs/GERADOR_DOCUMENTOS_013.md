# DCS HUB 0.13 — Gerador Word: Roteiro e Resumo da Reunião

Atualização de 19/11/2026. Foram aplicadas ao Supabase compartilhado as migrações 012 e 013. As tabelas e permissões do Autoridades SP permanecem intactas.

## Como funciona

Em **Gestão de eventos → selecione um evento → Materiais para impressão**, escolha **Roteiro do evento** ou **Resumo da reunião**.

O gerador aproveita o que está registrado em Ficha do Gabinete, Pessoas e mesa, Reuniões preparatórias e Tarefas. Os horários intermediários, integrantes da mesa, presença e atos não confirmados aparecem como **A CONFIRMAR**. Não assume precedência nem afirma que uma reunião aconteceu sem registro.

Os documentos são editáveis dentro do HUB: você altera cada trecho, escolhe título, seção, texto, item de lista, horário, observação ou metadado, e pode acrescentar, retirar e reordenar partes. Clique em **Salvar rascunho** para persistir a versão.

## Revisão do Cerimonial e exportação

1. Servidor DCS, Servidor Cerimonial, Gestor ou Administrador prepara e salva o rascunho.
2. Servidor Cerimonial, Gestor ou Administrador confere o conteúdo, marca a declaração de revisão e clica em **Aprovar versão**.
3. O HUB registra quem aprovou, quando e qual número de versão. Somente a versão aprovada pode ser baixada como **Word (.docx)**.
4. O navegador cria um arquivo Word editável a partir da versão aprovada recuperada do banco; o conteúdo não é enviado a um serviço externo para conversão.
5. Uma nova edição do rascunho revoga a validade operacional da aprovação anterior. Mudanças posteriores no evento, briefing, participantes ou reunião tornam a exportação desatualizada e exigem nova revisão.
6. Leitor consulta os materiais e exporta apenas versões aprovadas; não pode criar nem aprovar.

A aprovação representa revisão registrada no DCS HUB. **Não é assinatura digital nem homologação oficial da ALESP**.

## Testar como servidor comum

Demonstração pública: https://lcoutinhoss.github.io/DCS-HUB/

Acesso fictício Servidor DCS: **usuario@demo.dcs-hub.invalid** / **DCSdemo2026!**. Abra uma Sessão Solene de demonstração, vá a Materiais, gere e salve o rascunho. Saia e selecione **Servidor Cerimonial** ou **Gestor** no login demonstrativo (mesma senha fictícia), revise e aprove a versão para testar o download. Os rascunhos do modo demonstrativo não sobrevivem ao recarregamento da página.

Homologação com dados reais (primeiro, use apenas eventos fictícios): https://lcoutinhoss.github.io/DCS-HUB/homologacao/ . É necessário login Supabase Auth, perfil ativo e permissão DCS apropriada. As informações da versão real ficam persistidas na tabela específica de materiais do HUB.

## Sobre os modelos enviados

- **ROTEIRO BASE.docx** e **ROTEIRO BASE(1).docx**: estrutura de recepção, abertura, mesa, hino, falas, vídeo, homenagem e encerramento.
- **RESUMO REUNIÃO.docx**: encaminhamentos e decisões de gabinete, incluindo convites, público, mesa, roteiro, vídeo e pendências.
- **MODELO NOMINATAS.doc** e **PRISMAS - MESA(1).pptx**: serão tratados na próxima etapa, usando a lista Pessoas e mesa.

**Nenhum arquivo original foi publicado no GitHub público.** O Word gerado tem aparência profissional, mas é um documento novo: não reproduz exatamente o timbre, as marcas ou o layout original da ALESP. Aplicar timbre oficial e gerar nominatas/prismas fica condicionado à aprovação do Cerimonial.

O arquivo Word é baixado no computador que fizer a exportação. Não é enviado automaticamente ao SharePoint, Teams ou Outlook.

## Segurança e verificações

As migrações criam a tabela de materiais com RLS de leitura para membros ativos, sem escrita direta, e três funções controladas:
- Salvar rascunho, mediante papel editor;
- Aprovar versão, restrito a Cerimonial/Gestor/Administrador e com verificação de alterações;
- Exportar apenas versão aprovada e ainda atual.

A segunda migração valida obrigatoriamente o tipo, o texto e o tamanho dos trechos no PostgreSQL.

Testes automatizados verificam a estrutura OOXML do Word, texto e XML escapados, limites e permissões. Testes em transações SQL revertidas validaram bloqueio de aprovação por servidor DCS, expiração após nova versão e bloqueio de exportação após mudança posterior no briefing. Nenhum registro fictício foi mantido.

**Próximas fases:** nominatas e prismas automáticos com conferência de nome/cargo/ordem; modelos com identidade visual institucional autorizada; SharePoint e calendário Outlook/Teams quando a TI aprovar credenciais e permissões.
