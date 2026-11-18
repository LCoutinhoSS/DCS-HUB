import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sql=fs.readFileSync(new URL('../supabase/migrations/202611180001_core.sql',import.meta.url),'utf8');

test('HTML mantém camada visual e integração explicitamente comutada',()=>{
 assert.match(html,/Central Inteligente de Operações/);
 assert.match(html,/window\.DCS_BACKEND\?\.enabled/);
 assert.match(html,/DCS_BRIDGE/);
 assert.match(html,/src\/backend\.js/);
});
test('script clássico da interface não tem erro sintático',()=>{
 const code=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(code);assert.doesNotThrow(()=>new Function(code));
});
test('todas as tabelas expostas têm RLS ativada',()=>{
 for(const table of ['profiles','event_templates','template_items','events','event_checklist','tasks','documents','event_authorities','event_history']) {
   assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`));
 }
});
test('confirmação possui verificação de gestor e unicidade de origem do checklist',()=>{
 assert.match(sql,/if not public\.is_manager\(\)/);
 assert.match(sql,/source_checklist_id uuid unique/);
 assert.match(sql,/on conflict \(source_checklist_id\) do nothing/);
});
test('conta recém-criada não vira administradora',()=>{
 assert.match(sql,/role text not null default 'reader'/);
 assert.match(sql,/active boolean not null default false/);
});
