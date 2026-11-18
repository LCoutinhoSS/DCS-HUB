import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=(path)=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const code=read('../src/demo-auth.js');
const index=read('../index.html');
const demo=read('../demo.html');
const backend=read('../src/backend.js');
const boot=read('../src/boot.js');

function harness(){
 const instances=new Map();
 const handlers={};
 const make=(s)=>({
  value:'',hidden:false,innerHTML:'',textContent:'',dataset:{},attributes:{},id:'',
  reportValidity:()=>true,addEventListener:(type,cb)=>{handlers[s+' '+type]=cb;},
  setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},
  focus(){},appendChild(x){instances.set('#'+x.id,x);}
 });
 for(const id of ['#lf','#rl','#login','#app','#auth-error','#auth-pass','#auth-toggle','#av','#ur','#pf','#nav','#lo','.me b','.sb .pl','#lf input[type=password]','#lf input[type=email]']) instances.set(id,make(id));
 const pass=instances.get('#auth-pass');instances.set('#lf input[type=password]',pass);
 const mail=instances.get('#lf input[type=email]');
 const storage=new Map();
 let resets=0;
 const sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const bridge={S:{role:'',in:0,route:'dashboard',first:1},bell(){},route(){},toast(){}};
 const document={
  documentElement:{dataset:{}},
  querySelector:s=>instances.get(s)||null,
  createElement:tag=>make(tag),
  addEventListener:(type,callback)=>{handlers['document '+type]=callback;}
 };
 const window={DCS_BRIDGE:bridge,location:{hash:'dashboard',reload(){resets++;}},confirm:()=>true};
 vm.runInNewContext(code,{window,document,sessionStorage,localStorage:sessionStorage,Date,JSON,console});
 return {api:window.DCS_DEMO_AUTH,bridge,pass,mail,instances,storage,window,get resets(){return resets;}};
}

test('duas interfaces carregam tela de acesso e abandonam entrada sem senha',()=>{
 for(const html of [index,demo]){
  assert.match(html,/id="auth-email"/);
  assert.match(html,/id="auth-pass"/);
  assert.match(html,/src\/auth\.css/);
  assert.match(html,/DCS_DEMO_AUTH\?\.login\(\)/);
  assert.match(html,/DCS_DEMO_AUTH\?\.logout\(\)/);
  assert.doesNotMatch(html,/\bS\.role=\$\('#rl'\)\.value/);
 }
 assert.match(index,/src\/boot\.js/);
 assert.match(boot,/import\('\.\/backend\.js'\)/);
 assert.match(demo,/src\/demo-auth\.js/);
});

test('script de demonstração é válido e não se apresenta como segurança institucional',()=>{
 assert.doesNotThrow(()=>new Function(code));
 assert.match(code,/NÃO É AUTENTICAÇÃO SEGURA/);
 assert.match(code,/Supabase Auth/);
 assert.match(code,/sessionStorage/);
 assert.match(code,/window\.confirm/);
});

test('senha errada bloqueia a sessão demonstrativa',()=>{
 const h=harness();
 h.mail.value='admin@demo.dcs-hub.invalid';
 h.pass.value='senha-incorreta';
 assert.equal(h.api.login(),false);
 assert.equal(h.bridge.S.in,0);
 assert.equal(h.instances.get('#auth-error').hidden,false);
});

test('login de demonstração aceita credencial correta e atribui função',()=>{
 const h=harness();
 h.mail.value='gestor@demo.dcs-hub.invalid';
 h.pass.value='DCSdemo2026!';
 assert.equal(h.api.login(),true);
 assert.equal(h.bridge.S.in,1);
 assert.equal(h.bridge.S.role,'Gestor');
 assert.equal(h.instances.get('#app').hidden,false);
 assert.equal(h.instances.get('#login').hidden,true);
 assert.equal(h.pass.value,'');
});

test('logout encerra sessão demonstrativa; restauração recusa sessão vencida',()=>{
 const h=harness();
 h.mail.value='admin@demo.dcs-hub.invalid';
 h.pass.value='DCSdemo2026!';
 assert.equal(h.api.login(),true);
 h.api.logout();
 assert.equal(h.bridge.S.in,0);
 assert.equal(h.instances.get('#app').hidden,true);
 assert.equal(h.api.restore(),false);
});

test('restaurar teste só funciona em perfil administrador',()=>{
 const h=harness();
 h.mail.value='dcs@demo.dcs-hub.invalid';
 h.pass.value='DCSdemo2026!';
 assert.equal(h.api.login(),true);
 assert.equal(h.api.reset(),false);
 assert.equal(h.resets,0);
 h.api.logout();
 h.mail.value='admin@demo.dcs-hub.invalid';h.pass.value='DCSdemo2026!';
 assert.equal(h.api.login(),true);
 assert.equal(h.api.reset(),true);
 assert.equal(h.resets,1);
});

test('modo Supabase continua com login real e não usa credenciais fictícias',()=>{
 assert.match(boot,/if\(!backend\.enabled\)await import\('\.\/demo-auth\.js'\)/);
 assert.match(boot,/if\(stage\)/);
 assert.match(boot,/if\(!configured\)showBootError/);
 assert.match(backend,/document\.documentElement\.dataset\.authMode='real'/);
 assert.match(backend,/supabase\.auth\.signInWithPassword/);
 assert.match(backend,/Seu cadastro existe, mas aguarda ativação/);
});
