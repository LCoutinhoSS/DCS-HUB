import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const backend=read('../src/backend.js');
const moduleCode=read('../src/autoridades-integration.js');
const index=read('../index.html');
const demo=read('../demo.html');
const sql=read('../supabase/migrations/202611180006_requesters_eventflow.sql');
const onboarding=read('../supabase/migrations/202611180007_shared_project_onboarding.sql');
const bridge=read('../supabase/migrations/202611190008_dcs_authorities_bridge.sql');

test('catálogo Autoridades SP é lido diretamente e não alterado pelo HUB',()=>{
 assert.match(backend,/supabase\.rpc\('dcs_list_authorities',\{p_kind:null\}\)/);
 assert.match(backend,/supabase\.rpc\('dcs_list_authorities',\{p_kind:'deputado_estadual'\}\)/);
 assert.doesNotMatch(backend,/\.from\('autoridades'\)/);
 assert.match(bridge,/public\.consultar_autoridades_seguras\(\)/);
 assert.match(bridge,/public\.is_member\(\)/);
 assert.match(bridge,/revoke all on function public\.dcs_list_authorities\(text\) from public, anon/);
 assert.match(bridge,/grant execute on function public\.dcs_list_authorities\(text\) to authenticated/);
 assert.doesNotMatch(bridge,/grant (select|all) on public\.autoridades/i);
 assert.match(backend,/async listAuthorities\(/);
 assert.doesNotMatch(backend,/from\('autoridades'\)\.insert/);
 assert.doesNotMatch(backend,/from\('autoridades'\)\.update/);
 assert.doesNotMatch(backend,/from\('autoridades'\)\.delete/);
});
test('painel Autoridades está disponível nas duas versões, somente leitura',()=>{
 assert.doesNotThrow(()=>new Function(moduleCode));
 for(const page of [index,demo]){
  assert.match(page,/autoridades-integration\.js/);
  assert.match(page,/DCS_AUTORIDADES\.render\(\)/);
 }
 assert.match(moduleCode,/Consulta à mesma base/);
 assert.doesNotMatch(moduleCode,/data-authorities-delete/);
});
test('solicitante deputado não é duplicado em nova tabela',()=>{
 assert.match(sql,/public\.autoridades a/);
 assert.match(sql,/requester_authority_id text references public\.autoridades/);
 assert.match(sql,/requester_name_snapshot/);
 assert.doesNotMatch(sql,/insert into public\.event_requesters\(name,kind,source\)/);
 assert.match(onboarding,/public\.perfis_usuarios/);
 assert.match(onboarding,/dcs_claim_initial_admin/);
});
