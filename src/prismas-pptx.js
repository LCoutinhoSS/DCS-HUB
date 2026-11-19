/* DCS HUB 0.14 — Prisma de mesa em PowerPoint editável.
 * Folha vertical 7,5×10,83 pol; duas faces por pessoa, a superior girada
 * 180 graus para dobrar, conforme a lógica observada no modelo enviado.
 * Sem brasão ou arte institucional original.
 */
(function(){
'use strict';
const ns='http://schemas.openxmlformats.org/drawingml/2006/main';
const rns='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const pns='http://schemas.openxmlformats.org/presentationml/2006/main';
const rtype='http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
const zipns='http://schemas.openxmlformats.org/package/2006/relationships';
const esc=s=>window.DCS_DOCX?.escapeXml?window.DCS_DOCX.escapeXml(s):String(s??'');
const inch=x=>Math.round(x*914400);
const header='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
function textBox(id,label,txt,x,y,w,h,rot,size,bold=false,color='162D48'){
 const xfrm='<a:xfrm'+(rot?' rot="10800000"':'')+'><a:off x="'+inch(x)+'" y="'+inch(y)+'"/>'+
  '<a:ext cx="'+inch(w)+'" cy="'+inch(h)+'"/></a:xfrm>';
 return '<p:sp><p:nvSpPr><p:cNvPr id="'+id+'" name="'+esc(label)+'"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>'+
 '<p:spPr>'+xfrm+'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>'+
 '<p:txBody><a:bodyPr wrap="square" lIns="91440" tIns="0" rIns="91440" bIns="0" anchor="ctr"><a:normAutofit/></a:bodyPr><a:lstStyle/>'+
 '<a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="pt-BR" sz="'+size+'" b="'+(bold?'1':'0')+'">'+
 '<a:solidFill><a:srgbClr val="'+color+'"/></a:solidFill><a:latin typeface="Aptos"/></a:rPr><a:t>'+esc(txt)+'</a:t></a:r>'+
 '<a:endParaRPr lang="pt-BR"/></a:p></p:txBody></p:sp>';
}
function line(id,y,dash){
 return '<p:sp><p:nvSpPr><p:cNvPr id="'+id+'" name="'+(dash?'Linha de dobra':'Linha de referência')+'"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'+
 '<p:spPr><a:xfrm><a:off x="'+inch(.45)+'" y="'+inch(y)+'"/><a:ext cx="'+inch(6.6)+'" cy="0"/></a:xfrm>'+
 '<a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="7620"><a:solidFill><a:srgbClr val="C1C9D1"/></a:solidFill>'+
 (dash?'<a:prstDash val="dash"/>':'')+'</a:ln></p:spPr></p:sp>';
}
function slideXml(p){
 const title=String(p.title),name=String(p.name),role=String(p.role);
 let id=2;
 const shaped=[];
 for(const rotate of [true,false]){
  const base=rotate?1.88:6.18;
  shaped.push(textBox(id++,'Tratamento '+(rotate?'face invertida':'face frontal'),title,.58,base,6.32,.60,rotate,1800,false,'66788C'));
  shaped.push(textBox(id++,'Nome '+(rotate?'face invertida':'face frontal'),name,.58,base+.69,6.32,.76,rotate,
    name.length>42?1950:name.length>28?2450:3050,true,'142A43'));
  shaped.push(textBox(id++,'Cargo '+(rotate?'face invertida':'face frontal'),role,.58,base+1.50,6.32,.76,rotate,
    role.length>85?1300:role.length>50?1550:1950,false,'364D66'));
 }
 shaped.push(line(id++,5.4167,true));
 return header+'<p:sld xmlns:p="'+pns+'" xmlns:a="'+ns+'" xmlns:r="'+rns+'"><p:cSld><p:spTree>'+
  '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'+
  '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'+
  shaped.join('')+'</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
}
function extract(blocks){
 if(!Array.isArray(blocks)||blocks.length<5||blocks.length>140)throw Error('Prismas sem pessoas confirmadas');
 const groups=blocks.slice(2);
 if(groups.length%3!==0||blocks[0].kind!=='meta'||blocks[1].kind!=='meta')
  throw Error('Estrutura de prismas alterada. Regere a partir da lista Pessoas e mesa');
 const out=[];
 for(let i=0;i<groups.length;i+=3){
  const a=groups.slice(i,i+3);
  if(a.map(x=>x.kind).join(',')!=='heading,title,text'||a.some(x=>!x.text||!x.text.trim()))
   throw Error('Cada prisma exige tratamento, nome e cargo. Regere a partir da lista de mesa');
  out.push({title:a[0].text,name:a[1].text,role:a[2].text});
 }
 return out;
}
function presentationXml(count){
 return header+'<p:presentation xmlns:p="'+pns+'" xmlns:a="'+ns+'" xmlns:r="'+rns+'">'+
 '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>'+
 '<p:sldIdLst>'+Array.from({length:count},(_,i)=>'<p:sldId id="'+(256+i)+'" r:id="rId'+(2+i)+'"/>').join('')+'</p:sldIdLst>'+
 '<p:sldSz cx="6858000" cy="9906000" type="custom"/><p:notesSz cx="6858000" cy="9906000"/>'+
 '<p:defaultTextStyle><a:defPPr><a:defRPr lang="pt-BR"/></a:defPPr></p:defaultTextStyle></p:presentation>';
}
function rels(items){return header+'<Relationships xmlns="'+zipns+'">'+items.map((x,i)=>
 '<Relationship Id="rId'+(i+1)+'" Type="'+rtype+x[0]+'" Target="'+x[1]+'"/>').join('')+'</Relationships>';}
function master(){
 return header+'<p:sldMaster xmlns:a="'+ns+'" xmlns:r="'+rns+'" xmlns:p="'+pns+'">'+
 '<p:cSld name="DCS HUB"><p:spTree>'+
 '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>'+
 '<p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" '+
 'bg1="lt1" bg2="lt2" tx1="dk1" tx2="dk2" hlink="hlink" folHlink="folHlink"/>'+
 '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>'+
 '<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>';
}
const layout=header+'<p:sldLayout xmlns:a="'+ns+'" xmlns:r="'+rns+'" xmlns:p="'+pns+'" type="blank" preserve="1">'+
 '<p:cSld name="Em branco"><p:spTree>'+
 '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'+
 '<p:grpSpPr/></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>';
const theme=header+'<a:theme xmlns:a="'+ns+'" name="DCS HUB neutro"><a:themeElements>'+
 '<a:clrScheme name="DCS neutro"><a:dk1><a:sysClr val="windowText" lastClr="162D48"/></a:dk1>'+
 '<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>'+
 '<a:dk2><a:srgbClr val="162D48"/></a:dk2><a:lt2><a:srgbClr val="F6F7F8"/></a:lt2>'+
 ['4477AA','AA8844','566C85','B9A483','6D879A','8C8C8C'].map((c,i)=>'<a:accent'+(i+1)+'><a:srgbClr val="'+c+'"/></a:accent'+(i+1)+'>').join('')+
 '<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>'+
 '<a:fontScheme name="Aptos"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont>'+
 '<a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme>'+
 '<a:fmtScheme name="DCS simples"><a:fillStyleLst><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:fillStyleLst>'+
 '<a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:ln></a:lnStyleLst>'+
 '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>'+
 '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:bgFillStyleLst>'+
 '</a:fmtScheme></a:themeElements></a:theme>';
function create(blocks){
 const persons=extract(blocks),files={};
 files['[Content_Types].xml']=header+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
 '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
 '<Default Extension="xml" ContentType="application/xml"/>'+
 '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>'+
 '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>'+
 '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>'+
 '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'+
 persons.map((_,i)=>'<Override PartName="/ppt/slides/slide'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>').join('')+
 '</Types>';
 files['_rels/.rels']=header+'<Relationships xmlns="'+zipns+'"><Relationship Id="rId1" Type="'+rtype+'officeDocument" Target="ppt/presentation.xml"/></Relationships>';
 files['ppt/presentation.xml']=presentationXml(persons.length);
 files['ppt/_rels/presentation.xml.rels']=rels([['slideMaster','slideMasters/slideMaster1.xml'],...persons.map((_,i)=>['slide','slides/slide'+(i+1)+'.xml'])]);
 files['ppt/slideMasters/slideMaster1.xml']=master();
 files['ppt/slideMasters/_rels/slideMaster1.xml.rels']=rels([['slideLayout','../slideLayouts/slideLayout1.xml'],['theme','../theme/theme1.xml']]);
 files['ppt/slideLayouts/slideLayout1.xml']=layout;
 files['ppt/slideLayouts/_rels/slideLayout1.xml.rels']=rels([['slideMaster','../slideMasters/slideMaster1.xml']]);
 files['ppt/theme/theme1.xml']=theme;
 persons.forEach((p,i)=>{
  files['ppt/slides/slide'+(i+1)+'.xml']=slideXml(p);
  files['ppt/slides/_rels/slide'+(i+1)+'.xml.rels']=rels([['slideLayout','../slideLayouts/slideLayout1.xml']]);
 });
 const blob=window.DCS_DOCX.packageZip(files);
 return new Blob([blob],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
}
window.DCS_PRISMA_PPTX={create,extract,version:'0.14'};
})();