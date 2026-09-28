'use strict';
/* ===== общие комнаты на PeerJS (WebRTC) =====
   Хост создаёт peer с id по коду комнаты, гости подключаются к нему.
   Хост пересылает сообщения каждого гостя остальным, поэтому управлять можно с любого устройства. */
const Room=(()=>{
  const PREFIX='hologran-v2-';
  const ALPH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const OPTS={debug:0,config:{iceServers:[
    {urls:'stun:stun.l.google.com:19302'},
    {urls:'stun:stun1.l.google.com:19302'},
    {urls:'stun:global.stun.twilio.com:3478'}
  ]}};
  let peer=null,conns=[],role=null,code='',retries=0,joinTimer=0;
  const h={};
  const emit=(ev,...a)=>h[ev]&&h[ev](...a);
  const status=(t,k='')=>emit('status',t,k);
  const rand=()=>Array.from({length:6},()=>ALPH[Math.floor(Math.random()*ALPH.length)]).join('');
  const clean=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);

  function ready(){
    if(window.Peer)return true;
    status('Не загрузилась библиотека связи PeerJS. Проверь интернет или блокировщик рекламы.','error');
    return false;
  }
  function attach(conn){
    conn.on('open',()=>{
      clearTimeout(joinTimer);
      if(!conns.includes(conn))conns.push(conn);
      emit('change');
      if(role==='host'){status(`Комната ${code} · подключено устройств: ${conns.length}`,'ready');emit('peer-joined',conn);}
      else{status(`Подключено к комнате ${code}`,'ready');emit('joined');}
    });
    conn.on('data',d=>{
      if(role==='host')conns.forEach(c=>{if(c!==conn&&c.open)c.send(d);});
      emit('data',d,conn);
    });
    const drop=()=>{
      const had=conns.includes(conn);
      conns=conns.filter(c=>c!==conn);
      if(!had)return;
      emit('change');
      if(role==='host')status(conns.length?`Комната ${code} · подключено устройств: ${conns.length}`:`Комната ${code} · ждём подключения…`,'ready');
      else status('Связь с комнатой потеряна. Попробуй войти снова.','error');
    };
    conn.on('close',drop);
    conn.on('error',drop);
  }
  function onError(err){
    const t=err&&err.type;
    if(t==='unavailable-id'&&role==='host'&&retries<3){retries++;create(true);return;}
    const msg={
      'peer-unavailable':'Комната с таким кодом не найдена. Проверь код: возможно, хост закрыл вкладку.',
      'network':'Нет связи с сервером комнат. Проверь интернет.',
      'server-error':'Сервер комнат недоступен, попробуй через минуту.',
      'browser-incompatible':'Этот браузер не поддерживает WebRTC.',
      'socket-error':'Соединение с сервером прервалось.',
      'disconnected':'Соединение с сервером прервалось.'
    }[t]||'Не удалось подключиться: '+(err&&err.message||t||'неизвестная ошибка');
    status(msg,'error');
    if(role==='guest'||t==='browser-incompatible'){leave(true);}
    emit('change');
  }
  function bindPeer(){
    peer.on('error',onError);
    peer.on('disconnected',()=>{try{if(peer&&!peer.destroyed)peer.reconnect();}catch(e){}});
  }
  function create(isRetry){
    if(!ready())return;
    if(!isRetry){leave(true);retries=0;}
    else if(peer){try{peer.destroy();}catch(e){}}
    code=rand();role='host';
    status('Создаём комнату…');
    peer=new Peer(PREFIX+code,OPTS);
    bindPeer();
    peer.on('open',()=>{status(`Комната ${code} · ждём подключения…`,'ready');emit('change');});
    peer.on('connection',attach);
    emit('change');
  }
  function join(raw){
    if(!ready())return;
    const c=clean(raw);
    if(c.length<6){status('Код комнаты: 6 символов.','error');return;}
    leave(true);
    code=c;role='guest';
    status(`Подключаемся к ${code}…`);
    peer=new Peer(OPTS);
    bindPeer();
    peer.on('open',()=>{attach(peer.connect(PREFIX+code,{reliable:true,serialization:'json'}));});
    clearTimeout(joinTimer);
    joinTimer=setTimeout(()=>{if(role==='guest'&&!conns.length){status('Не получилось подключиться за 15 секунд. Проверь код и что оба устройства в интернете.','error');leave(true);emit('change');}},15000);
    emit('change');
  }
  function leave(silent){
    clearTimeout(joinTimer);
    conns.forEach(c=>{try{c.close();}catch(e){}});conns=[];
    if(peer){try{peer.destroy();}catch(e){}}
    peer=null;role=null;code='';
    if(!silent){status('Комната не создана');emit('change');}
  }
  function send(obj){conns.forEach(c=>{if(c.open)try{c.send(obj);}catch(e){}});}
  function sendTo(c,obj){if(c&&c.open)try{c.send(obj);}catch(e){}}
  return{
    on:(ev,fn)=>{h[ev]=fn;},create:()=>create(false),join,leave:()=>leave(false),send,sendTo,
    get role(){return role;},get code(){return code;},get count(){return conns.length;},
    get active(){return !!role;},get connected(){return conns.length>0;},clean
  };
})();
