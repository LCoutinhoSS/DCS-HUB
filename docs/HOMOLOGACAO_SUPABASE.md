# Homologação DCS HUB com o mesmo Supabase do Autoridades SP

**Status verificado em 18/11/2026:** o Supabase **BUSCA AUTORIDADE** já recebeu as sete migrações `dcs_hub_001`–`dcs_hub_007`. A versão anterior deste documento previa criar outro projeto, mas essa decisão foi alterada pelo usuário.

O DCS HUB usa **o mesmo Auth e o mesmo projeto Supabase**, porém com **seus próprios perfis, tabelas e RLS**. As tabelas originais `public.autoridades`, `public.perfis_usuarios` e o gatilho existente de Auth foram preservados. Não execute novamente as migrações.

**Acessos**
- [Demonstração pública, contas fictícias](https://lcoutinhoss.github.io/DCS-HUB/)
- [Homologação real, login Supabase](https://lcoutinhoss.github.io/DCS-HUB/homologacao/)

O login real usa a mesma conta Supabase já existente no Autoridades SP, mas **não concede acesso ao DCS automaticamente**. O primeiro administrador precisa já ter `administracao` no Autoridades SP; os demais usuários iniciam com perfil DCS `reader`, `active=false`, e aguardam autorização pelo administrador do HUB.

A validação no banco confirmou: 150 autoridades, 94 deputados estaduais e 6 perfis originais mantidos; 20 espaços cadastrados no HUB, sem eventos nem perfis DCS criados automaticamente. Testes transacionais revertidos comprovaram que um administrador pré-existente pode assumir a administração inicial do DCS e que uma conta comum continua inativa; **não houve login real interativo pela interface**.

**Cuidados:** o site de homologação é acessível pela internet e exige login. Use apenas dados fictícios até testes com duas contas, auditoria RLS e aprovação da TI. Não introduza credenciais ou dados restritos no GitHub Pages de demonstração. Avisos dos Supabase Advisors sobre funções `SECURITY DEFINER` preexistentes devem ser revisados antes de uso institucional; não alteramos as funções do Autoridades SP.

Leia o [registro da arquitetura compartilhada](BANCO_COMPARTILHADO.md) para as tabelas, limitações, primeira entrada e plano de limpeza segura.
