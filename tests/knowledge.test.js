import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=x=>fs.readFileSync(new URL(x,import.meta.url),'utf8');
const script=read('../src/knowledge.js');
const sql=read('../supabase/migrations/202611180004_knowledge.sql');

function demo(role='Administrador'){
  const view={innerHTML:''}, handlers={};
  const event={id:'event-1',t:'Sessão teste',c:'cer'};
  const bridge={
    S:{role,route:'documentos',in:1,tb:'docs'},
    E:[event,{id:'event-2',t:'Exposição demonstrativa',c:'exp'}],
    T:[{id:'task-1',t:'Tarefa de teste'}],
    toast(){},closeOv(){},rr(){}
  };
  const document={
    querySelector:s=>s==='#view'?view:null,
    addEventListener:(key,fn)=>{handlers[key]=fn;}
  };
  const window={DCS_BRIDGE:bridge};
  vm.runInNewContext(script,{window,document,URL,Date,FormData,Promise,Set,Map,console});
  return {knowledge:window.DCS_KNOWLEDGE,bridge,view};
}

test('documentos e artigos possuem navegação real em ambas as interfaces',()=>{
  for(const path of ['../index.html','../demo.html']){
    const html=read(path);
    assert.match(html,/src\/knowledge\.js/);
    assert.match(html,/src\/knowledge\.css/);
    assert.match(html,/DCS_KNOWLEDGE\.render\(r\)/);
    assert.match(html,/\['docs','Documentos'\]/);
    assert.match(html,/eventDocsHtml\(e\)/);
  }
});

test('modo demonstrativo cria acervo fictício e exibe biblioteca com filtros',async()=>{
  const {knowledge,bridge,view}=demo();
  await knowledge.ensureData();
  await knowledge.render('documentos');
  assert.match(view.innerHTML,/Central de Documentos/);
  assert.match(view.innerHTML,/Biblioteca indexada/);
  assert.match(view.innerHTML,/Exemplo sem arquivo/);
  assert.match(view.innerHTML,/Aguardar|EXEMPLO|demonstração/);
  assert.doesNotMatch(view.innerHTML,/data-k-open-doc="demo-doc-/);
  const eventHtml=knowledge.eventDocsHtml(bridge.E[0]);
  assert.match(eventHtml,/Roteiro de sessão solene/);
  assert.match(eventHtml,/Vincular documento/);
});

test('leitor consulta artigos publicados mas não vê rascunhos nem ações de edição',async()=>{
  const {knowledge,bridge,view}=demo('Leitor');
  bridge.S.route='conhecimento';
  await knowledge.render('conhecimento');
  assert.match(view.innerHTML,/Wiki DCS/);
  assert.match(view.innerHTML,/Primeiros passos/);
  assert.doesNotMatch(view.innerHTML,/Orientação em revisão/);
  assert.doesNotMatch(view.innerHTML,/data-k-add="article"/);
});

test('visão de evento de um leitor é somente consulta',async()=>{
  const {knowledge,bridge}=demo('Leitor');
  await knowledge.ensureData();
  const html=knowledge.eventDocsHtml(bridge.E[0]);
  assert.match(html,/Roteiro de sessão solene/);
  assert.doesNotMatch(html,/Vincular documento/);
  assert.doesNotMatch(html,/data-k-edit-doc/);
});

test('migração restringe rascunhos e versões; arquivos externos não são copiados',()=>{
  assert.match(sql,/knowledge_articles_read[\s\S]*status='published'/);
  assert.match(sql,/author_id=\(select auth.uid\(\)\)/);
  assert.match(sql,/knowledge_article_revisions_read[\s\S]*a.author_id=\(select auth.uid\(\)\)/);
  assert.match(sql,/enable row level security/);
  assert.doesNotMatch(sql,/create bucket|storage\.buckets/i);
  assert.match(script,/host\.endsWith\('\.sharepoint\.com'\)/);
  assert.match(script,/url\.protocol!=='https:'|url.protocol!=='https:'|url.protocol !== 'https:'/);
  assert.match(script,/window\.open\(url,'_blank','noopener,noreferrer'\)/);
});

test('scripts do acervo são sintaticamente válidos',()=>{
  assert.doesNotThrow(()=>new Function(script));
});
