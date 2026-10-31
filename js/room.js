'use strict';
/* Rooms use an encrypted WebSocket relay. All participants can edit. */
const Room=(()=>{
  const SERVER='wss://ynpn-sync.rodionovazarij.workers.dev';
  const ALPH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const h={}; let ws=null,role=null,code='',count=0,opened=false,stopped=true;
  let reconnectTimer=0, connectTimer=0, sendTimer=0, pending=null, lastSent=0;
  let attempt=0, generation=0, hasOpened=false;
  const emit=(ev,...a)=>h[ev]&&h[ev](...a);
  const status=(t,k='')=>emit('status',t,k);
  const clean=c=>String(c||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,12);
  function rand(){const b=new Uint8Array(12);crypto.getRandomValues(b);return Array.from(b,x=>ALPH[x%ALPH.length]).join('');}
  function connect(create){
    const g=++generation; opened=false;
    status(attempt?'Связь прервалась, переподключаемся…':'Подключаемся к комнате…');
    let s; try{s=new WebSocket(SERVER+'/room/'+code+(create?'?create=1':''));}
    catch(e){status('Не удалось открыть соединение с сервером.','error');return;}
    ws=s;
    clearTimeout(connectTimer);
    connectTimer=setTimeout(()=>{if(g===generation&&!opened)try{s.close();}catch(e){}},12000);
    s.onmessage=e=>{
      if(g!==generation)return; let m;try{m=JSON.parse(e.data);}catch(_){return;}
      if(m.kind==='welcome'){
        clearTimeout(connectTimer);opened=true;hasOpened=true;attempt=0;count=m.count||0;
        status(`Комната ${code} · устройств: ${count+1}`,'ready');emit('change');
        if(m.scene)emit('data',m.scene);
        if(role==='host'&&!m.scene)emit('peer-joined',null);
        else if(role==='guest')emit('joined');
      }else if(m.kind==='peers'){
        count=Math.max(0,(m.count||1)-1);
        status(`Комната ${code} · устройств: ${count+1}`,'ready');emit('change');
      }else if(m.kind==='scene'&&m.scene)emit('data',m.scene);
    };
    s.onerror=()=>{};
    s.onclose=()=>{
      if(g!==generation||stopped)return;
      clearTimeout(connectTimer);opened=false;count=0;emit('change');
      if(!hasOpened&&!create){status('Не удалось войти. Проверь код, интернет и что хотя бы одно устройство уже в комнате.','error');return;}
      if(!hasOpened&&create&&attempt>=2){status('Не удалось создать комнату. Проверь доступ к серверу и интернет.','error');return;}
      attempt++;
      status('Связь прервалась. Пробуем подключиться снова…','error');
      reconnectTimer=setTimeout(()=>connect(role==='host'&&(!hasOpened||attempt%2===0)),Math.min(1000*2**Math.min(attempt,4),15000));
    };
  }
  function leave(silent=false){
    stopped=true;generation++;clearTimeout(connectTimer);clearTimeout(reconnectTimer);clearTimeout(sendTimer);pending=null;lastSent=0;
    if(ws)try{ws.close();}catch(_){} ws=null;opened=false;hasOpened=false;role=null;code='';count=0;attempt=0;
    if(!silent){status('Комната не создана');emit('change');}
  }
  function create(){leave(true);role='host';code=rand();stopped=false;connect(true);emit('change');}
  function join(raw){
    const c=clean(raw);if(c.length!==12){status('Код комнаты должен содержать 12 символов. Создай новую комнату.','error');return;}
    leave(true);role='guest';code=c;stopped=false;connect(false);emit('change');
  }
  function send(d){
    if(!opened||ws?.readyState!==WebSocket.OPEN||d?.type!=='scene')return;
    pending=d;
    const flush=()=>{sendTimer=0;if(!pending||!opened||ws?.readyState!==WebSocket.OPEN)return;
      try{ws.send(JSON.stringify(pending));lastSent=Date.now();}catch(_){} pending=null;};
    const delay=Math.max(0,150-(Date.now()-lastSent));
    if(!delay){clearTimeout(sendTimer);flush();}
    else if(!sendTimer)sendTimer=setTimeout(flush,delay);
  }
  return {on:(ev,fn)=>{h[ev]=fn;},create,join,leave:()=>leave(false),send,sendTo:(_,d)=>send(d),
    get role(){return role;},get code(){return code;},get count(){return count;},
    get active(){return !!role;},get connected(){return opened;},clean};
})();
