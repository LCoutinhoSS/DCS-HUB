import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {TextEncoder,TextDecoder} from 'node:util';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const builder=read('../src/material-builder.js');
const exporter=read('../src/docx-export.js');
const ui=read('../src/event-materials.js');
const schema=read('../supabase/migrations/202611190012_event_materials_review.sql');
const backend=read('../src/backend.js');
const pages=[read('../index.html'),read('../demo.html')];

function builderCtx(){
 const context={window:{}};
 vm.runInNewContext(builder,context);
 return context.window.DCS_MATERIAL_BUILDER;
}
const ev={id:'e1',t:'Sessão Solene em Homenagem a Exemplo',kind:'sessao_solene',
 d:new Date('2026-12-01T22:00:00.000Z'),de:new Date('2026-12-02T00:00:00Z'),
 loc:'Plenário exemplo',requester_name:'Gabinete Exemplo'};
const answers=[
 {question_key:'publico',answer:'200 pessoas',status:'confirmed'},
 {question_key:'hino',answer:'Banda solicitada',status:'to_confirm'},
 {question_key:'honrarias',answer:'Entrega de honraria',status:'confirmed'},
 {question_key:'mesa',answer:'5 nomes aguardando confirmação',status:'to_confirm'}
];
const participants=[{full_name:'Convidada Exemplo',role_title:'Secretária',
 organization:'Instituição Exemplo',participation:'mesa',invitation_status:'invited',active:true}];
const questions=[
 {key:'publico',title:'Expectativa de público?'},
 {key:'hino',title:'Terá execução do Hino?'},
 {key:'honrarias',title:'Qual homenagem?'},
 {key:'mesa',title:'Quem compõe a mesa?'}
];
const meeting={starts_at:'2026-11-25T14:00:00Z',status:'realizada',
 attendees:'Gabinete, Cerimonial',agenda:'Conferir nomes e vídeo',
 minutes:'Definidas providências',decisions:'Gabinete enviará nomes'};
const tasks=[{eid:'e1',t:'Solicitar currículos',w:'Servidor exemplo',due:'30/11/2026',s:'Pendente'}];

test('roteiro usa o horário real do evento e marca lacunas sem inventar presença ou banda',()=>{
 const blocks=builderCtx().build('roteiro',ev,{answers,participants},[meeting],tasks,questions);
 const text=blocks.map(x=>x.text).join('\n');
 assert.match(text,/Plenário exemplo/);
 assert.match(text,/19h00/); // 22:00Z em São Paulo, horário de verão inexistente em 2026
 assert.match(text,/Banda solicitada/);
 assert.match(text,/A CONFIRMAR/);
 assert.match(text,/Convidada Exemplo.*Convidado/);
 assert.doesNotMatch(text,/09h|09:00|Welcome Coffee \(Salão dos Espelhos\)/);
 assert.equal(blocks[0].kind,'title');
 assert.ok(blocks.every(x=>x.text.length<=2000));
});

test('Resumo da reunião distingue decisões confirmadas, pendências e tarefas atribuídas',()=>{
 const blocks=builderCtx().build('resumo_reuniao',ev,{answers,participants},[meeting],tasks,questions);
 const text=blocks.map(x=>x.text).join('\n');
 assert.match(text,/200 pessoas/);
 assert.match(text,/Banda solicitada/);
 assert.match(text,/INFORMAÇÃO PRELIMINAR/);
 assert.match(text,/Gabinete enviará nomes/);
 assert.match(text,/Solicitar currículos.*Servidor exemplo/);
 assert.match(text,/REUNIÃO: 25 de novembro de 2026/);
 assert.match(text,/Não é ata assinada/);
});

test('geração sem reunião registrada não inventa data ou participantes da reunião',()=>{
 const blocks=builderCtx().build('resumo_reuniao',ev,{answers:[],participants:[]},[],[],questions);
 const text=blocks.map(x=>x.text).join(' ');
 assert.match(text,/Não registrada no HUB/);
 assert.match(text,/Nenhuma reunião preparatória/);
 assert.match(text,/Ainda não há definições confirmadas/);
});

function getZipParts(buffer){
 const data=new DataView(buffer),decoder=new TextDecoder();
 const parts={};let offset=0;
 while(offset<data.byteLength&&data.getUint32(offset,true)===0x04034b50){
  const method=data.getUint16(offset+8,true),size=data.getUint32(offset+18,true);
  const nameLength=data.getUint16(offset+26,true),extra=data.getUint16(offset+28,true);
  assert.equal(method,0,'O DOCX local usa ZIP sem compressão');
  const nameStart=offset+30;
  const name=decoder.decode(new Uint8Array(buffer,nameStart,nameLength));
  const start=nameStart+nameLength+extra;
  parts[name]=decoder.decode(new Uint8Array(buffer,start,size));
  offset=start+size;
 }
 assert.equal(data.getUint32(offset,true),0x02014b50);
 return parts;
}
test('DOCX é arquivo ZIP OOXML válido com estilos e texto escapado',async()=>{
 const win={};vm.runInNewContext(exporter,{window:win,TextEncoder,Blob});
 const blocks=[{kind:'title',text:'Homenagem & Cerimônia'},
  {kind:'heading',text:'1. Definições'},
  {kind:'bullet',text:'Convidada <Exemplo> — Secretária'},
  {kind:'note',text:'A CONFIRMAR presença'}];
 const blob=win.DCS_DOCX.create(blocks,{status:'approved'});
 assert.equal(blob.type,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
 const parts=getZipParts(await blob.arrayBuffer());
 for(const name of ['[Content_Types].xml','_rels/.rels','word/_rels/document.xml.rels','word/document.xml','word/styles.xml']){
  assert.ok(parts[name],name+' deve existir no DOCX');
 }
 assert.match(parts['word/document.xml'],/Homenagem &amp; Cerimônia/);
 assert.match(parts['word/document.xml'],/Convidada &lt;Exemplo&gt;/);
 assert.match(parts['word/document.xml'],/VERSÃO REVISADA NO DCS HUB/);
 assert.match(parts['word/styles.xml'],/w:styleId="Heading1"/);
 assert.doesNotMatch(parts['word/document.xml'],/Convidada <Exemplo>/);
 assert.match(win.DCS_DOCX.filename('roteiro','Evento de Condecoração'),/^Roteiro_.*\.docx$/);
});

test('revisão e exportação têm verificação no banco, não apenas um botão',()=>{
 assert.match(schema,/create table public\.event_materials/);
 assert.match(schema,/alter table public\.event_materials enable row level security/);
 assert.match(schema,/grant select on public\.event_materials to authenticated/);
 assert.match(schema,/create function public\.dcs_save_material/);
 assert.match(schema,/create function public\.dcs_approve_material/);
 assert.match(schema,/role in \('admin','manager','ceremonial'\)/);
 assert.match(schema,/m\.version is distinct from p_version/);
 assert.match(schema,/public\.dcs_material_is_stale\(p_event,m\.saved_at\)/);
 assert.match(schema,/create function public\.dcs_export_material/);
 assert.match(schema,/m\.approved_version is distinct from m\.version/);
 assert.match(schema,/public\.dcs_material_is_stale\(p_event,m\.approved_at\)/);
 assert.match(schema,/revoke all on public\.event_materials from public,anon,authenticated/);
 assert.match(backend,/async listEventMaterials/);
 assert.match(backend,/async saveEventMaterial/);
 assert.match(backend,/async approveEventMaterial/);
 assert.match(backend,/async exportEventMaterial/);
 assert.match(ui,/window\.DCS_BACKEND\.exportEventMaterial/);
 assert.match(ui,/window\.DCS_DOCX\.create/);
});

test('validação no servidor rejeita tipo inválido e trechos sem texto',()=>{
 const hardening=read('../supabase/migrations/202611190013_material_blocks_validation.sql');
 assert.match(hardening,/create function public\.dcs_valid_material_blocks/);
 assert.match(hardening,/jsonb_typeof\(b->'text'\) is distinct from 'string'/);
 assert.match(hardening,/event_materials_blocks_valid/);
 assert.match(hardening,/revoke all on function public\.dcs_valid_material_blocks/);
});

test('aba Materiais integra as duas telas e deixa a revisão fora de popup',()=>{
 assert.doesNotThrow(()=>new Function(ui));
 for(const page of pages){
  assert.match(page,/event-materials\.js/);
  assert.match(page,/material-builder\.js/);
  assert.match(page,/docx-export\.js/);
  assert.match(page,/event-materials\.css/);
  assert.match(page,/\['materiais','Materiais para impressão'\]/);
  assert.match(page,/DCS_MATERIALS\.render\(e\)/);
 }
 assert.match(ui,/material-review-check/);
 assert.match(ui,/data-material-generate/);
 assert.match(ui,/data-material-export/);
 assert.match(ui,/canApprove/);
 assert.doesNotMatch(ui,/document\.querySelector\('#ov'\)\.innerHTML/);
});
