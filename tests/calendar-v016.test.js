import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {TextEncoder} from 'node:util';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
function setup(){
 const w={DCS_BRIDGE:{E:[],S:{},toast(){}}},events={};
 vm.runInNewContext(read('../src/calendar-bridge.js'),{
  window:w,document:{addEventListener:(n,fn)=>{events[n]=fn;}},Date,TextEncoder,Blob
 });
 return w.DCS_CALENDAR;
}
const ev=(st='Confirmado')=>({id:'abc-123',t:'Sessão Solene — Homenagem, São Paulo; Assembleia',st,
 d:new Date('2026-12-01T22:00:00.000Z'),de:new Date('2026-12-01T23:30:00.000Z'),
 loc:'Plenário Juscelino Kubitschek; ALESP',briefing:{contact:'Privado, não exportar'},who:['Contato Restrito']});
test('download ICS segue RFC 5545, timezone UTC e UID estável',()=>{
 const c=setup(),ics=c.buildIcs([ev()],new Date('2026-11-19T18:00:00.000Z'));
 assert.match(ics,/BEGIN:VCALENDAR\r\nVERSION:2.0/);
 assert.match(ics,/UID:abc-123@dcs-hub.invalid/);
 assert.match(ics,/DTSTART:20261201T220000Z/);
 assert.match(ics,/DTEND:20261201T233000Z/);
 assert.match(ics,/SUMMARY:Sessão Solene/);
 assert.match(ics,/\r\n /);
 assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
 assert.doesNotMatch(ics,/Privado|Contato Restrito/);
 for(const line of ics.split('\r\n').filter(Boolean))assert.ok(Buffer.byteLength(line,'utf8')<=75,JSON.stringify(line));
});
test('pendentes/cancelados não entram em exportação de agenda',()=>{
 const c=setup();
 const val=c.buildIcs([ev(),ev('Pendente'),ev('Cancelado')]);
 assert.equal((val.match(/BEGIN:VEVENT/g)||[]).length,1);
 assert.equal(c.eligible(ev('Pendente')),false);
 assert.throws(()=>c.dates({...ev(),de:new Date('2026-12-01T21:00:00Z')}),/término inválido/);
});
test('UI deixa integração Graph clara e permite exportação só depois de confirmação',()=>{
 const c=setup();
 assert.match(c.renderEvent(ev()),/data-calendar-one/);
 assert.match(c.renderEvent(ev('Pendente')),/download individual fica disponível somente após confirmação/);
 assert.doesNotMatch(c.renderEvent(ev('Pendente')),/data-calendar-one/);
 assert.match(c.renderEvent(ev()),/não cria link de reunião do Teams/);
});
test('HTMLs carregam módulo e oferecem aba Outlook / Teams e agenda conjunta',()=>{
 for(const p of ['../index.html','../demo.html']){
  const html=read(p);
  assert.match(html,/src\/calendar-bridge.js/);
  assert.match(html,/'Outlook \/ Teams'/);
  assert.match(html,/DCS_CALENDAR\.renderEvent/);
  assert.match(html,/DCS_CALENDAR\.openAgendaDialog/);
 }
});
