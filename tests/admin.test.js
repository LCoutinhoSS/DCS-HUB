import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const admin=read('../src/admin.js');
const backend=read('../src/backend.js');
const sql=read('../supabase/migrations/202611180003_admin_users.sql');

test('administração carrega nas duas versões da interface',()=>{
 for(const path of ['../index.html','../demo.html']){
  const html=read(path);
  assert.match(html,/src\/admin\.css/);
  assert.match(html,/src\/admin\.js/);
  assert.match(html,/r==='admin'&&window\.DCS_ADMIN/);
 }
});
test('script administrativo é sintaticamente válido e não embute credenciais',()=>{
 assert.doesNotThrow(()=>new Function(admin));
 assert.doesNotMatch(admin,/service_role|supabase\.auth\.admin|createClient\s*\(/);
 assert.match(admin,/Ambiente demonstrativo|Novo usuário demonstrativo|demoSeed/);
});
test('apenas administradores conseguem mudar perfil no backend',()=>{
 assert.match(backend,/async updateAdminProfile\(data\)/);
 assert.match(backend,/profile\.role!=='admin'/);
 assert.match(backend,/supabase\.rpc\('admin_update_profile'/);
});
test('migração restringe escrita, cria auditoria e bloqueia autoelevação',()=>{
 assert.match(sql,/revoke update\(role,department,active,full_name\)/);
 assert.match(sql,/create function public\.admin_update_profile/);
 assert.match(sql,/if not public\.is_admin\(\)/);
 assert.match(sql,/p_profile_id = auth\.uid\(\)/);
 assert.match(sql,/alter table public\.profile_admin_audit enable row level security/);
 assert.match(sql,/grant select on public\.profile_admin_audit to authenticated/);
 assert.doesNotMatch(sql,/grant (insert|update|delete) on public\.profile_admin_audit to authenticated/);
});
