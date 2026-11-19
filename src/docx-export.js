/* DCS HUB v0.13 — exportador OOXML editável, sem dependências externas.
 * Não incorpora logotipos nem arquivos-modelo oficiais.
 */
(function(){
'use strict';
const MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const enc=new TextEncoder();
const xml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))
 .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc32=bytes=>{let c=0xffffffff;for(const n of bytes)c=crcTable[(c^n)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
const hdr=n=>new DataView(new ArrayBuffer(n));
const bview=v=>new Uint8Array(v.buffer);
function zip(files){
 const chunks=[],central=[];let offset=0;
 for(const [name,content] of Object.entries(files)){
  const fname=enc.encode(name),bytes=enc.encode(content),crc=crc32(bytes);
  const local=hdr(30);
  local.setUint32(0,0x04034b50,true);local.setUint16(4,20,true);
  local.setUint32(14,crc,true);local.setUint32(18,bytes.length,true);
  local.setUint32(22,bytes.length,true);local.setUint16(26,fname.length,true);
  chunks.push(bview(local),fname,bytes);
  const cd=hdr(46);
  cd.setUint32(0,0x02014b50,true);cd.setUint16(4,20,true);
  cd.setUint16(6,20,true);cd.setUint32(16,crc,true);
  cd.setUint32(20,bytes.length,true);cd.setUint32(24,bytes.length,true);
  cd.setUint16(28,fname.length,true);cd.setUint32(42,offset,true);
  central.push(bview(cd),fname);
  offset+=30+fname.length+bytes.length;
 }
 const centralSize=central.reduce((n,b)=>n+b.length,0),end=hdr(22);
 end.setUint32(0,0x06054b50,true);
 end.setUint16(8,Object.keys(files).length,true);end.setUint16(10,Object.keys(files).length,true);
 end.setUint32(12,centralSize,true);end.setUint32(16,offset,true);
 return new Blob([...chunks,...central,bview(end)],{type:MIME});
}
function para(content,style,center=false){
 const pr='<w:pPr><w:pStyle w:val="'+style+'"/>'+
  (center?'<w:jc w:val="center"/>':'')+
  (['Title','Subtitle','Heading1'].includes(style)?'<w:keepNext/>':'')+
  (style==='DCSBullet'?'<w:ind w:left="700" w:hanging="280"/>':'')+
  '<w:spacing w:after="145" w:line="340" w:lineRule="auto"/></w:pPr>';
 return '<w:p>'+pr+'<w:r><w:t xml:space="preserve">'+xml(content)+'</w:t></w:r></w:p>';
}
const styleFor={title:'Title',subtitle:'Subtitle',heading:'Heading1',text:'Normal',bullet:'DCSBullet',time:'DCSTime',meta:'DCSMeta',note:'DCSNote'};
function documentXml(blocks,metadata={}){
 const status=metadata.status==='approved'?'VERSÃO REVISADA NO DCS HUB'+(metadata.version?' · VERSÃO '+metadata.version:''):'MINUTA PARA CONFERÊNCIA';
 const reviewed=metadata.reviewedAt?'Revisão registrada em '+new Date(metadata.reviewedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'';
 const body=para('DCS HUB  |  DIVISÃO DE COMUNICAÇÃO SOCIAL','DCSMeta')+
  para(status,'DCSNote')+
  (reviewed?para(reviewed,'DCSNote'):'')+
  blocks.map(b=>para(b.kind==='bullet'?'•  '+b.text:b.text,styleFor[b.kind]||'Normal',b.kind==='title'||b.kind==='subtitle')).join('')+
  para('Informações provenientes do HUB. Confirmar dados e autorização de uso antes da circulação.','DCSNote');
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
 '<w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'+
 '<w:pgMar w:top="1280" w:right="1180" w:bottom="1270" w:left="1180" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'+
 '</w:body></w:document>';
}
const styles=[
 '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
 '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
 '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="21"/><w:color w:val="1B304A"/></w:rPr></w:rPrDefault></w:docDefaults>',
 '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>',
 '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="31"/><w:color w:val="10243A"/></w:rPr></w:style>',
 '<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="18"/><w:color w:val="64768A"/></w:rPr></w:style>',
 '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:outlineLvl w:val="0"/><w:rPr><w:b/><w:sz w:val="25"/><w:color w:val="12385C"/></w:rPr></w:style>',
 '<w:style w:type="paragraph" w:styleId="DCSMeta"><w:name w:val="DCS Meta"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="20"/></w:rPr></w:style>',
 '<w:style w:type="paragraph" w:styleId="DCSBullet"><w:name w:val="DCS Bullet"/><w:basedOn w:val="Normal"/></w:style>',
 '<w:style w:type="paragraph" w:styleId="DCSTime"><w:name w:val="DCS Time"/><w:basedOn w:val="Normal"/><w:rPr><w:b/></w:rPr></w:style>',
 '<w:style w:type="paragraph" w:styleId="DCSNote"><w:name w:val="DCS Note"/><w:basedOn w:val="Normal"/><w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="7D6A4A"/></w:rPr></w:style>',
 '</w:styles>'
].join('');
const contentTypes='<?xml version="1.0" encoding="UTF-8"?>'+
 '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
 '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
 '<Default Extension="xml" ContentType="application/xml"/>'+
 '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
 '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'+
 '</Types>';
const rels='<?xml version="1.0" encoding="UTF-8"?>'+
 '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
 '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
 '</Relationships>';
const docRels='<?xml version="1.0" encoding="UTF-8"?>'+
 '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
 '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
 '</Relationships>';
function create(blocks,metadata){
 if(!Array.isArray(blocks)||!blocks.length||blocks.length>140)
  throw new Error('Não é possível exportar documento vazio ou grande demais');
 return zip({
  '[Content_Types].xml':contentTypes,
  '_rels/.rels':rels,
  'word/_rels/document.xml.rels':docRels,
  'word/document.xml':documentXml(blocks,metadata),
  'word/styles.xml':styles
 });
}
function filename(kind,title){
 const prefix=kind==='roteiro'?'Roteiro':'Resumo_Reuniao';
 const normalized=String(title||'evento').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-zA-Z0-9 _-]/g,'').trim().replace(/\s+/g,'_').slice(0,55)||'evento';
 return prefix+'_'+normalized+'.docx';
}
function download(blob,name){
 if(typeof URL==='undefined'||!URL.createObjectURL||!document?.createElement)
  throw new Error('Download indisponível neste navegador');
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),15000);
}
window.DCS_DOCX={create,download,filename,version:'0.13'};
})();