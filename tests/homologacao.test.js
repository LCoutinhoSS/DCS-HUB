import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=x=>fs.readFileSync(new URL(x,import.meta.url),'utf8');
const boot=read('../src/boot.js');
const backend=read('../src/backend.js');
const example=read('../.env.example');
const html=read('../index.html');

test('homologação exige Supabase configurado e nunca retorna ao login fictício',()=>{
 assert.match(boot,/VITE_DCS_MODE==='homologacao'/);
 assert.match(boot,/if\(stage\)\{/);
 assert.match(boot,/if\(!configured\)showBootError/);
 assert.match(boot,/else\s*\{\s*const \{backend\}=await import\('\.\/backend\.js'\)/);
 assert.match(boot,/document\.documentElement\.dataset\.authMode='real'/);
 assert.match(boot,/button\.disabled=true/);
 const stageBranch=boot.slice(boot.indexOf('if(stage){'),boot.indexOf("}else if(location.hostname.endsWith"));
 assert.doesNotMatch(stageBranch,/import\('\.\/demo-auth\.js'\)/);
});

test('site público permanece em modo fictício e isolado do banco',()=>{
 assert.match(boot,/location\.hostname\.endsWith\('\.github\.io'\)/);
 assert.match(boot,/await import\('\.\/demo-auth\.js'\)/);
 assert.match(html,/src\/boot\.js/);
});

test('backend aceita chave pública moderna e atribuição à própria pessoa',()=>{
 assert.match(backend,/VITE_SUPABASE_PUBLISHABLE_KEY \|\| import\.meta\.env\.VITE_SUPABASE_ANON_KEY/);
 assert.match(backend,/if\(label==='Você'\)return profile\?\.id\|\|null/);
 assert.match(backend,/supabase\.auth\.signInWithPassword/);
 assert.match(backend,/await supabase\.auth\.signOut\(\)/);
});

test('documentação nunca orienta uso de chave secreta no frontend',()=>{
 assert.match(example,/VITE_DCS_MODE=homologacao/);
 assert.match(example,/VITE_SUPABASE_PUBLISHABLE_KEY=/);
 assert.doesNotMatch(example,/VITE_SUPABASE_ANON_KEY=/);
 assert.doesNotMatch(example,/^.*(sb_secret_[a-z0-9]{10,}|service_role.*eyJ[a-z0-9]{20,}).*$/mi);
});
