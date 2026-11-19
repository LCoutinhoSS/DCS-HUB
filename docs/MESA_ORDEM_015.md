# DCS HUB 0.15 — Organização visual da mesa

**Atualização: 19/11/2026.** A ordem protocolar continua sendo determinada pelo Cerimonial. O HUB não calcula precedência nem decide a disposição física de lugares à direita ou esquerda da presidência.

## Uso
Abra **Gestão de eventos → evento → Pessoas e mesa**. Inclua convidados como **Composição da mesa**, com nome, cargo, tratamento e situação da presença. Pessoas retiradas ou que recusaram o convite não entram na sequência.

Organize as fichas arrastando (desktop), clicando nas setas **↑ / ↓** (também no celular) ou focando uma linha e pressionando as setas do teclado. A etiqueta **Prévia não salva** aparece até usar **Salvar ordem**; existe também **Descartar**.

A sequência salva recebe posições consecutivas 1, 2, 3… até 99 e alimenta nominatas Word e prismas PowerPoint. O campo manual **Ordem na mesa / nominata** permanece na ficha de cada pessoa para ajustes pontuais.

## Segurança
A função `dcs_reorder_event_mesa` exige membro ativo com perfil editor, evento ainda aberto, lista completa e sem duplicidade, e compara o momento de atualização de cada participante. Ela grava a ordem em uma transação e registra a mudança no histórico.

Se outra conta alterar a mesa depois que a prévia começou, o servidor recusa o salvamento, atualiza a listagem e informa o conflito. Depois de alterar a mesa, regenere e solicite nova aprovação das nominatas e prismas. A base de Autoridades SP continua sem alterações.

## Homologação
Abra o mesmo evento em duas contas. Na primeira, arraste a mesa sem salvar. Na segunda, ajuste um cargo ou a ordem, e salve. Volte à primeira e tente salvar: deve aparecer um aviso de conflito. Confira a sequência atualizada e o histórico.

A impressão física continua dependente de conferência visual do Cerimonial. Outlook/Teams e SharePoint ainda não estão integrados, e a homologação é acessível pela internet — use dados fictícios.
