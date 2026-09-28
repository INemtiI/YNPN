'use strict';
/* ===== режим псевдоголограммы: 4 (3, 1) проекции под грани пирамиды ===== */
const Holo=(()=>{
  const DEF={mode:4,size:1,gap:0.1,pitch:-0.35,spin:0.35,line:1.6,glow:12,color:'#7cf2ff',sec:'#ffb38a',
    mirror:true,flip:false,fill:true,labels:false,center:false};
  const COLORS=['#7cf2ff','#f4f7ff','#8dffb4','#ffd36e','#ff8fd8'];
  let H=load(),isOpen=false,spinYaw=0,hideTimer=0,cv,ctx,getState,onChange;
  const $=s=>document.querySelector(s);
  function load(){try{return{...DEF,...JSON.parse(localStorage.getItem('hologran.holo')||'{}')};}catch(e){return{...DEF};}}
  function save(){try{localStorage.setItem('hologran.holo',JSON.stringify(H));}catch(e){}}

  function init(stateFn,changeFn){
    getState=stateFn;onChange=changeFn;
    cv=$('#holoCv');ctx=cv.getContext('2d');
    $('#hColors').innerHTML=COLORS.map(c=>`<button style="--c:${c}" data-c="${c}" aria-label="цвет ${c}"></button>`).join('');
    bindUi();syncUi();
    addEventListener('resize',()=>isOpen&&resize());
    // жесты на голограмме
    let drag=null,pinch=0;const pts=new Map();
    cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pts.size===1)drag={x:e.clientX,y:e.clientY};else{drag=null;pinch=dist();}wake();});
    cv.addEventListener('pointermove',e=>{
      if(!pts.has(e.pointerId)){wake();return;}
      pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pts.size===2){const d=dist();if(pinch){H.size=clamp(H.size*d/pinch,0.4,1.8);syncUi();changed();}pinch=d;return;}
      if(drag){const s=getState();s.yaw+=(e.clientX-drag.x)*0.008;H.pitch=clamp(H.pitch-(e.clientY-drag.y)*0.004,-1.2,0.3);
        drag={x:e.clientX,y:e.clientY};syncUi();save();onChange('view');}
    });
    const up=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=0;if(!pts.size)drag=null;};
    cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
    cv.addEventListener('wheel',e=>{e.preventDefault();H.size=clamp(H.size*Math.exp(-e.deltaY*0.001),0.4,1.8);syncUi();changed();},{passive:false});
    function dist(){const p=[...pts.values()];return Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}
  }
  function changed(){save();onChange('holo');}
  function bindUi(){
    $('#holoClose').onclick=close;
    $('#holoGear').onclick=()=>{const p=$('#holoPanel');p.hidden=!p.hidden;$('#holoGear').setAttribute('aria-expanded',String(!p.hidden));wake();};
    $('#hMode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;H.mode=+b.dataset.v;syncUi();changed();});
    [['hSize','size'],['hGap','gap'],['hPitch','pitch'],['hSpin','spin'],['hLine','line'],['hGlow','glow']].forEach(([id,k])=>{
      $('#'+id).addEventListener('input',e=>{H[k]=+e.target.value;changed();});
    });
    [['hMirror','mirror'],['hFlip','flip'],['hFill','fill'],['hLabels','labels'],['hCenter','center']].forEach(([id,k])=>{
      $('#'+id).addEventListener('change',e=>{H[k]=e.target.checked;changed();});
    });
    $('#hColors').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;H.color=b.dataset.c;syncUi();changed();});
    $('#hReset').onclick=()=>{H={...DEF};syncUi();changed();};
    $('#holoUi').addEventListener('pointermove',wake);
  }
  function syncUi(){
    [...$('#hMode').children].forEach(b=>b.classList.toggle('on',+b.dataset.v===H.mode));
    $('#hSize').value=H.size;$('#hGap').value=H.gap;$('#hPitch').value=H.pitch;$('#hSpin').value=H.spin;$('#hLine').value=H.line;$('#hGlow').value=H.glow;
    $('#hMirror').checked=H.mirror;$('#hFlip').checked=H.flip;$('#hFill').checked=H.fill;$('#hLabels').checked=H.labels;$('#hCenter').checked=H.center;
    [...$('#hColors').children].forEach(b=>b.classList.toggle('on',b.dataset.c===H.color));
  }
  function resize(){
    const d=Math.min(devicePixelRatio||1,2);
    cv.width=Math.round(innerWidth*d);cv.height=Math.round(innerHeight*d);
  }
  function wake(){
    const ui=$('#holoUi');ui.classList.remove('idle');document.body.style.cursor='';
    clearTimeout(hideTimer);
    hideTimer=setTimeout(()=>{if($('#holoPanel').hidden){ui.classList.add('idle');}},3000);
  }
  async function open(opts={}){
    if(isOpen)return;
    isOpen=true;$('#holo').hidden=false;document.body.classList.add('holo-open');
    resize();wake();
    if(opts.fullscreen!==false){try{await $('#holo').requestFullscreen?.();}catch(e){}}
    try{await navigator.wakeLock?.request('screen');}catch(e){}
  }
  function close(){
    if(!isOpen)return;
    isOpen=false;$('#holo').hidden=true;document.body.classList.remove('holo-open');
    if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
  }
  function draw(dt){
    if(!isOpen)return;
    const st=getState(),d=Math.min(devicePixelRatio||1,2);
    const W=cv.width/d,Hh=cv.height/d;
    ctx.setTransform(d,0,0,d,0,0);
    ctx.fillStyle='#050608';ctx.fillRect(0,0,W,Hh);
    spinYaw+=dt*H.spin;
    const q=Math.min(W,Hh),cx=W/2,cy=Hh/2;
    const single=H.mode===1;
    const box=single?q*0.8*H.size:q*0.3*H.size;
    const gap=single?0:q*H.gap;
    const dirs=[[0,1,Math.PI],[1,0,Math.PI/2],[0,-1,0],[-1,0,-Math.PI/2]];
    const use=H.mode===4?[0,1,2,3]:H.mode===3?[0,1,3]:[0];
    const hc={color:H.color,sec:H.sec,line:H.line,glow:H.glow,fill:H.fill,labels:H.labels};
    for(const k of use){
      const[dx,dy,rot]=dirs[k];
      const px=single?cx:cx+dx*(gap+box/2),py=single?cy:cy+dy*(gap+box/2);
      ctx.save();
      ctx.translate(px,py);
      ctx.rotate(rot+(H.flip?Math.PI:0));
      if(H.mirror)ctx.scale(-1,1);
      renderScene(ctx,box,box,{fig:st.fig,st,yaw:st.yaw+spinYaw+k*Math.PI/2,pitch:H.pitch,cx:0,cy:0,
        scale:box*0.42/st.fig.R,theme:'holo',hc,noClear:true});
      ctx.restore();
    }
    if(H.center&&!single){
      ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1;
      const g=Math.max(6,gap);ctx.strokeRect(cx-g,cy-g,g*2,g*2);
      ctx.beginPath();ctx.moveTo(cx-10,cy);ctx.lineTo(cx+10,cy);ctx.moveTo(cx,cy-10);ctx.lineTo(cx,cy+10);ctx.stroke();
    }
  }
  return{init,open,close,draw,get isOpen(){return isOpen;},get settings(){return H;},
    setSettings(s){H={...H,...s};syncUi();save();}};
})();
