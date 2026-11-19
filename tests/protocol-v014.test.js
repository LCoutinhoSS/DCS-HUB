import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {TextEncoder,TextDecoder} from 'node:util';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const builder=read('../src/material-builder.js');
const exporter=read('../src/docx-export.js');
const prism=read('../src/prismas-pptx.js');
const ui=read('../src/event-materials.js');
const briefing=read('../src/event-briefing.js');
const backend=read('../src/backend.js');
const migration=read('../supabase/migrations/202611190014_protocol_materials.sql');

const people=[
 {full_name:'Convidado A',role_title:'Representante institucional',honorific:'Senhor',
  participation:'mesa',invitation_status:'confirmed',protocol_order:2,active:true},
 {full_name:'Convidada B',role_title:'Deputada Estadual',honorific:'Senhora Deputada',
  participation:'mesa',invitation_status:'confirmed',protocol_order:1,active:true,represented_for:'Presidência Exemplo'},
 {full_name:'Convidado C',role_title:'Secretário',honorific:'Senhor Secretário',
  participation:'mesa',invitation_status:'invited',protocol_order:3,active:true},
 {full_name:'Pessoa fora da mesa',role_title:'Palestrante',honorific:'Doutora',
  participation:'palestrante',invitation_status:'confirmed',active:true}
];
const event={id:'e1',t:'Sessão Solene Exemplo',kind:'sessao_solene',
 d:new Date('2026-12-01T22:00:00Z'),requester_name:'Gabinete Exemplo'};
function init(){
 const w={};vm.runInNewContext(builder,{window:w,Date});
 vm.runInNewContext(exporter,{window:w,TextEncoder,Blob,Date});
 vm.runInNewContext(prism,{window:w,Blob});
 return w;
}
function unzipParts(buffer){
 const v=new DataView(buffer),decoder=new TextDecoder(),files={};let offset=0;
 while(offset+30<=v.byteLength&&v.getUint32(offset,true)===0x04034b50){
  const len=v.getUint32(offset+18,true),nameLen=v.getUint16(offset+26,true),extra=v.getUint16(offset+28,true);
  assert.equal(v.getUint16(offset+8,true),0,'ZIP não compactado');
  const name=decoder.decode(new Uint8Array(buffer,offset+30,nameLen));
  const start=offset+30+nameLen+extra;
  files[name]=decoder.decode(new Uint8Array(buffer,start,len));
  offset=start+len;
 }
 assert.equal(v.getUint32(offset,true),0x02014b50,'diretório central presente');
 return files;
}
test('nominata usa ordem manual, representa autoridades e sinaliza convite não confirmado',()=>{
 const w=init(),blocks=w.DCS_MATERIAL_BUILDER.build('nominata',event,{participants:people},[],[],[]);
 const text=blocks.map(b=>b.text).join('\n');
 assert.ok(text.indexOf('Convidada B')<text.indexOf('Convidado A'),'ordem 1 antes de 2');
 assert.match(text,/neste ato representando Presidência Exemplo/i);
 assert.match(text,/PRESENÇA A CONFIRMAR/);
 assert.match(text,/TRATAMENTO A CONFIRMAR|Doutora/);
 assert.match(text,/SAUDAÇÃO GERAL/);
 assert.equal(w.DCS_DOCX.filename('nominata',event.t).startsWith('Nominata_'),true);
});
test('prismas usam apenas mesa confirmada; tratamento, nome e cargo em trios',()=>{
 const w=init(),blocks=w.DCS_MATERIAL_BUILDER.build('prismas',event,{participants:people},[],[],[]);
 assert.equal(blocks.length,8,'2 metadados + 3 para cada integrante confirmado');
 const txt=blocks.map(x=>x.text).join('\n');
 assert.doesNotMatch(txt,/Convidado C/,'convidado não confirmado fica fora da impressão');
 assert.doesNotMatch(txt,/Pessoa fora da mesa/);
 assert.ok(txt.indexOf('CONVIDADA B')<txt.indexOf('CONVIDADO A'));
 assert.deepEqual(blocks.slice(2,5).map(x=>x.kind),['heading','title','text']);
});
test('PowerPoint editável é pacote OOXML com uma folha de duas faces por pessoa',async()=>{
 const w=init(),blocks=w.DCS_MATERIAL_BUILDER.build('prismas',event,{participants:people},[],[],[]);
 const blob=w.DCS_PRISMA_PPTX.create(blocks);
 assert.equal(blob.type,'application/vnd.openxmlformats-officedocument.presentationml.presentation');
 const z=unzipParts(await blob.arrayBuffer());
 for(const p of ['[Content_Types].xml','ppt/presentation.xml','ppt/slideMasters/slideMaster1.xml',
  'ppt/slideLayouts/slideLayout1.xml','ppt/theme/theme1.xml','ppt/slides/slide1.xml','ppt/slides/slide2.xml']){
  assert.ok(z[p],p);
 }
 assert.match(z['ppt/presentation.xml'],/cx="6858000" cy="9906000"/);
 assert.match(z['ppt/slides/slide1.xml'],/CONVIDADA B/);
 assert.match(z['ppt/slides/slide2.xml'],/CONVIDADO A/);
 const slide=z['ppt/slides/slide1.xml'];
 assert.equal((slide.match(/rot="10800000"/g)||[]).length,3,'três caixas de texto da face superior giradas 180°');
 assert.equal((slide.match(/CONVIDADA B/g)||[]).length,2,'nome repetido nas duas faces');
 assert.match(slide,/Linha de dobra/);
 assert.doesNotMatch(slide,/brasão|SÃO PAULO OFICIAL|embed/i);
 assert.throws(()=>w.DCS_PRISMA_PPTX.create(blocks.slice(0,5).concat([{kind:'note',text:'Alteração estrutural'}])),/Estrutura|Cada prisma/);
});
test('banco requer ordem única, tratamento, cargo e confirmação antes da aprovação',()=>{
 assert.match(migration,/add column honorific/);
 assert.match(migration,/add column protocol_order/);
 assert.match(migration,/add column represented_for/);
 assert.match(migration,/grant update\(honorific,protocol_order,represented_for\)/);
 assert.match(migration,/nominata','prismas/);
 assert.match(migration,/role in \('admin','manager','ceremonial'\)/);
 assert.match(migration,/p\.invitation_status not in \('confirmed','declined'\)/);
 assert.match(migration,/p\.protocol_order is null/);
 assert.match(migration,/having count\(\*\)>1/);
 assert.doesNotMatch(migration,/grant .* on public\.autoridades/);
});
test('UI fornece campos e os dois formatos apenas após aprovação',()=>{
 assert.match(briefing,/name="protocol_order"/);
 assert.match(briefing,/honorific/);
 assert.match(briefing,/represented_for/);
 assert.match(backend,/honorific,protocol_order,represented_for/);
 assert.match(ui,/nominata:'Nominata e saudações'/);
 assert.match(ui,/prismas:'Prismas da mesa \(PowerPoint\)'/);
 assert.match(ui,/window\.DCS_PRISMA_PPTX\.create/);
 assert.match(ui,/DCS_DOCX\.download/);
 assert.match(ui,/canApprove/);
 assert.match(ui,/Há alterações não salvas/);
 for(const f of ['../index.html','../demo.html']){
  const html=read(f);
  assert.match(html,/prismas-pptx\.js/);
  assert.match(html,/event-materials\.js/);
 }
});
