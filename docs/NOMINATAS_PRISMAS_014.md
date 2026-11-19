# DCS HUB 0.14 — Nominatas e prismas automatizados

**Atualização de 19/11/2026.** Migrações 014 e 015 aplicadas ao Supabase compartilhado. O Autoridades SP não teve registros nem permissões alterados.

## Origem e limites dos modelos

Foram conferidos os arquivos reais enviados:
- **MODELO NOMINATAS.doc**: campos de nome/cargo, saudações, autoridades genéricas e a fórmula "Neste ato representando…".
- **PRISMAS - MESA(1).pptx**: folha vertical com **duas faces para cada integrante da mesa**; a face superior está rotacionada 180 graus para a dobra; a face inferior está na orientação normal. O modelo contém brasão/arte institucional, **não publicados no GitHub**.

A geração é nova, inspirada na estrutura. Não é reprodução exata do timbre ou do design da ALESP; os documentos precisam de homologação visual pelo Cerimonial antes do uso institucional.

## 1. Preparar a mesa

Abra **Gestão de eventos → evento → Pessoas e mesa**.

Para cada pessoa que ocupará a mesa, informe:
- Nome completo e cargo/função, conforme confirmado pelo gabinete.
- Participação = **Composição da mesa**.
- Situação do convite = **Confirmado**, quando realmente houver confirmação.
- **Tratamento/título** para impressão (por exemplo, Senhora Deputada ou Doutor; o sistema não presume tratamento).
- **Ordem na mesa/nominata**, número de 1 a 99, definido manualmente pelo Cerimonial.
- **Neste ato representando**, somente quando houver essa informação confirmada.

No topo da lista, o quadro **Ordem de mesa para nominatas e prismas** mostra pessoas, posição, situação e pendências.

**Atenção:** a ordem de cadastro, a ordem alfabética e o Diretório Autoridades SP não substituem a precedência protocolar. O HUB não calcula precedência nem disposição física à mesa. Essa conferência continua com o Cerimonial.

## 2. Nominata editável em Word

Abra a aba **Materiais para impressão → Nominata e saudações**.

O rascunho usa a lista ordenada da mesa para:
- Relacionar nomes, tratamentos e cargos.
- Indicar casos de representação.
- Separar autoridades e outros convidados a cumprimentar.
- Incluir a saudação geral com **"Em nome de quem?" a confirmar**. O sistema não escolhe automaticamente a autoridade a ser mencionada.
- Sinalizar claramente "presença a confirmar" para pessoas ainda não confirmadas.

Os textos podem ser editados e rearranjados no HUB. Salve o rascunho, solicite revisão pelo Cerimonial e exporte **Nominata_*.docx** somente depois da aprovação.

## 3. Prismas em PowerPoint editável

Abra a aba **Materiais para impressão → Prismas da mesa (PowerPoint)**.

O gerador inclui **somente pessoas com participação mesa e presença confirmada**. Uma página/slide por integrante, em formato vertical **7,5 × 10,83 polegadas**, com duas faces: superior invertida 180° e inferior normal, com linha guia de dobra. Cada face exibe título/tratamento, nome e cargo, em caixas de texto editáveis.

Para corrigir qualquer nome/cargo/tratamento, volte à aba **Pessoas e mesa**, faça a alteração e clique **Regerar a partir do HUB**. Não se edita o conteúdo de um prisma diretamente no editor da aba Materiais, para evitar divergências com a lista central. O **arquivo PowerPoint (.pptx)** permanece editável após ser baixado.

Por segurança, não são inseridos brasão, logomarca ou informações institucionais não aprovadas no repositório público. As dimensões e o estilo devem ser validados em impressão de ensaio.

## 4. Aprovação e segurança

O fluxo das versões 0.13/0.14 foi mantido:

1. Servidor DCS/Cerimonial ou Gestor salva o rascunho.
2. **Cerimonial/Gestor/Administrador** revisa os nomes, cargos, tratamentos, ordem e representações, marca a declaração de conferência e aprova.
3. Somente a **versão aprovada** pode ser exportada. O servidor confere a aprovação novamente em cada solicitação.
4. Alterações posteriores em evento, briefing, participantes ou reunião invalidam a aprovação anterior para exportação, exigindo nova revisão.

Para **nominatas e prismas**, a aprovação é bloqueada quando falta alguma das seguintes condições: pelo menos um integrante confirmado na mesa; todos os integrantes ativos não recusados da mesa confirmados; tratamento, cargo e ordem definidos para todos os confirmados; ordens sem repetição.

Para **prismas**, o PostgreSQL confere também a **quantidade e os valores de cada face gerada** contra os participantes, na ordem registrada: tratamento, nome e cargo devem corresponder ao banco. Se não corresponder, o revisor deve corrigir a ficha e regerar.

A autorização no HUB **não é assinatura digital** nem aprovação formal de diagramação da ALESP. Não há upload automático dos arquivos para SharePoint/Outlook/Teams.

## 5. Testar com a equipe

- **Demonstração:** https://lcoutinhoss.github.io/DCS-HUB/ — dados e credenciais fictícios. Perfil Servidor DCS: `usuario@demo.dcs-hub.invalid` / `DCSdemo2026!`.
- **Homologação com banco:** https://lcoutinhoss.github.io/DCS-HUB/homologacao/ — use contas Supabase Auth ativas e dados fictícios até aprovação da TI.

Na demonstração, abra um evento de Sessão Solene, informe ao menos duas pessoas **confirmadas na mesa**, com tratamento, cargo e ordem 1/2. Gere primeiro uma Nominata Word e depois os Prismas PowerPoint. Verifique o bloqueio ao tentar aprovar com posições duplicadas ou tratamento faltante. Entre como Cerimonial/Gestor para aprovar. Baixe os arquivos e abra no Word/PowerPoint para conferir a apresentação.

**Limites conhecidos:** testes de formato ZIP/OOXML e de regras de banco foram automatizados, mas a impressão real dos prismas e a conferência visual em PowerPoint precisam ser realizadas pela equipe antes do uso. A identidade visual original e os brasões devem ser incorporados apenas por fluxo institucional autorizado.

## 6. Próximos avanços

- Reordenar a mesa por arraste, com trilha de alterações e prevenção de conflitos.
- Opção de imprimir fichas com os padrões visuais autorizados pelo Cerimonial.
- Anexar versões finais ao SharePoint com controle de acesso e retenção institucional.
- Integrar eventos confirmados ao calendário Outlook/Teams, mediante autorização da TI.
