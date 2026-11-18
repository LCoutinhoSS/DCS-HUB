/* DCS HUB 0.7 — notificações locais para demonstrar atribuições.
   Não envia mensagens para outros computadores e não é um serviço de push. */
(function(){
'use strict';
const roles={
 'Administrador':{email:'admin@demo.dcs-hub.invalid',name:'Marina S.'},
 'Gestor':{email:'gestor@demo.dcs-hub.invalid',name:'Rafael T.'},
 'Servidor DCS':{email:'dcs@demo.dcs-hub.invalid',name:'Camila A.'},
 'Servidor Cerimonial':{email:'cerimonial@demo.dcs-hub.invalid',name:'Bruno L.'},
 'Leitor':{email:'leitor@demo.dcs-hub.invalid',name:'Júlia M.'}
};
const key='dcs-hub-v07-notifications-demo';
let notices={},currentEmail=null;
function read(){try{notices=JSON.parse(sessionStorage.getItem(key)||'{}')||{};}catch(_){notices={};}}
function save(){try{sessionStorage.setItem(key,JSON.stringify(notices));}catch(_){}}
function targetFor(label){
 if(label==='Equipe')return null;
 if(label==='Você')return roles[window.DCS_BRIDGE?.S.role]?.email||null;
 const entry=Object.values(roles).find(x=>x.name===label);
 return entry?.email||null;
}
function render(){
 const bridge=window.DCS_BRIDGE;
 if(!bridge||!currentEmail)return;
 const items=notices[currentEmail]||[];
 bridge.N.splice(0,bridge.N.length,...items.map(x=>({...x})));
 bridge.bell();
 if(bridge.S.route==='dashboard'&&document.querySelector('#tk'))bridge.refresh();
}
function switchAccount(email){
 if(window.DCS_BACKEND?.enabled)return;
 currentEmail=email;
 read();render();
}
function assigned(task,label){
 if(window.DCS_BACKEND?.enabled)return;
 const to=targetFor(label);if(!to)return;
 const entry={t:'Nova tarefa atribuída: '+task.t,w:'agora · '+(task.team||'DCS'),u:1,task_id:task.id};
 read();
 notices[to]=notices[to]||[];
 notices[to].unshift(entry);
 notices[to]=notices[to].slice(0,35);
 save();render();
}
function markRead(){
 if(!currentEmail)return;
 const current=notices[currentEmail]||[];
 current.forEach(x=>x.u=0);
 save();render();
}
function logout(){currentEmail=null;window.DCS_BRIDGE?.N.splice(0);}
function reset(){notices={};currentEmail=null;try{sessionStorage.removeItem(key);}catch(_){}}
function isMine(name){
 return name==='Você'||roles[window.DCS_BRIDGE?.S.role]?.name===name;
}
window.DCS_DEMO_NOTIFY={switchAccount,assigned,markRead,logout,reset,isMine};
if(window.DCS_DEMO_AUTH?.currentEmail()&&window.DCS_BRIDGE?.S?.in)switchAccount(window.DCS_DEMO_AUTH.currentEmail());
})();