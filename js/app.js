'use strict';
/* ===== ЯНПН: состояние, интерфейс, события ===== */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const dpr=Math.min(window.devicePixelRatio||1,2);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- иконки ---------- */
const ICONS={
  move:'<path d="M5 3l14 8-6 1.5L10 19z"/>',
  point:'<circle cx="12" cy="12" r="3.5" fill="currentColor"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  cut:'<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z"/><path d="M4 13.5 20 8.5 20 11 12 16.5 4 16z" fill="currentColor" fill-opacity=".85" stroke="none"/>',
  angle:'<path d="M4 20h16M4 20 15 5"/><path d="M10 20a6 6 0 0 0-1.8-4.3"/>',
  holo:'<path d="M12 3 21 20H3z"/><path d="M12 3v17M7.5 11.5h9"/>',
  steps:'<path d="M4 18h5v-5h5V8h5"/><circle cx="19" cy="8" r="1.6" fill="currentColor"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  iso:'<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z"/><path d="M12 12 20 7.5M12 12v9M12 12 4 7.5"/>',
  front:'<rect x="5" y="5" width="14" height="14" rx="1"/>',
  top:'<rect x="5" y="5" width="14" height="14" rx="1"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
  updown:'<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  full:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  ruler:'<path d="m3 17 14-14 4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
  left:'<path d="m15 5-7 7 7 7"/>',right:'<path d="m9 5 7 7-7 7"/>',
  play:'<path d="M8 5v14l11-7z" fill="currentColor"/>',pause:'<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  extend:'<path d="M3 12h18"/><path d="M8 12h8" stroke-width="3.2"/>',
  download:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  sliders:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  hand:'<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5V4.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-5-2.7L3 14.5a1.6 1.6 0 0 1 2.6-1.8L8 15"/>'
};
function paintIcons(root=document){
  root.querySelectorAll('i[data-i]').forEach(el=>{
    if(el.dataset.done===el.dataset.i)return;el.dataset.done=el.dataset.i;
    el.innerHTML=`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[el.dataset.i]||''}</svg>`;
  });
}

/* ---------- состояние ---------- */
const DEF_BODY={color:'#2c2c30',alpha:0.06};
const S={
  spec:{key:'cube'},fig:null,taskIndex:0,
  points:[],secIds:[null,null,null],nextId:1,activeId:null,
  plane:null,sec:{poly:[],raw:[],name:'нет'},secLab:[],steps:[],traceLine:null,drawPts:[],
  yaw:0.62,pitch:-0.45,zoom:1,panX:0,panY:0,view:null,autoRot:false,
  stepsOn:false,step:1,stepProg:1,playing:false,
  showSec:true,showPlane:false,showVtx:true,showGrid:true,showTrace:false,showDrops:true,originA:false,origin:V(0,0,0),
  sel:null,hover:null,anglePicks:[],angleArc:null,
  bodyStyle:{...DEF_BODY},faceStyle:{},extEdges:new Set(),extSection:false,
  tool:'move',planeSlot:0,zDrag:false,tab:'obj',padB:0,
  picks:{verts:[],edges:[],faces:[]},
  custom:{type:'prism',n:6,a:2,h:3,b:1},
};
const viewCv=$('#viewCv'),vctx=viewCv.getContext('2d'),stage=$('#stage'),tip=$('#tip');
const ptById=id=>S.points.find(p=>p.id===id);
const rel=p=>sub(p,S.origin);
const vName=i=>S.fig.labeled?S.fig.labels[i]:'v'+subNum(i+1);

/* ---------- точки ---------- */
function posOf(pt){
  const d=pt.def,f=S.fig;
  if(d.type==='free')return V(d.x,d.y,d.z);
  if(d.type==='edge'){if(f.kind!=='poly'||!f.verts[d.a]||!f.verts[d.b])return null;return lerp3(f.verts[d.a],f.verts[d.b],d.t);}
  if(d.type==='param'){const T=TASKS[d.task];return T&&T.pts[d.j]&&T.pts[d.j].fn?T.pts[d.j].fn(d.t):null;}
  return null;
}
function nextName(){
  const taken=new Set([...(S.fig.labels||[]),...S.points.map(p=>p.name),'S','T','X','Y','O','ℓ']);
  for(const c of 'PQRUVWKLMNEFGHIJZ')if(!taken.has(c))return c;
  for(let i=1;;i++)for(const c of 'PQRKLM'){const n=c+subNum(i);if(!taken.has(n))return n;}
}
function addPoint(def,name,opts={}){
  const pt={id:S.nextId++,name:name||nextName(),def,visible:true};
  S.points.push(pt);if(!opts.silent)S.activeId=pt.id;
  return pt;
}
/* где лежит точка: на прямой ребра, на грани, внутри/вне тела */
function lineInfo(pt,p){
  const f=S.fig;if(f.kind!=='poly'||!p)return null;
  if(pt&&pt.def.type==='edge'){const d=pt.def;return{a:d.a,b:d.b,t:d.t,inside:d.t>-1e-9&&d.t<1+1e-9,isEdge:f.edges.some(([u,w])=>(u===d.a&&w===d.b)||(u===d.b&&w===d.a))};}
  let best=null;
  for(const[a,b]of f.edges){
    const A=f.verts[a],B=f.verts[b],AB=sub(B,A),t=dot(sub(p,A),AB)/dot(AB,AB);
    if(dist2(add(A,mul(AB,t)),p)<1e-9){const inside=t>-1e-9&&t<1+1e-9;if(!best||(inside&&!best.inside))best={a,b,t,inside,isEdge:true};if(inside)break;}
  }
  return best;
}
function describe(pt,p){
  const f=S.fig;if(!p)return '';
  if(f.kind==='sph'){const r=len(p);return Math.abs(r-f.r)<1e-6?'на сфере':r<f.r?'внутри шара':'вне шара';}
  const n=esc(pt.name);
  const vi=f.verts.findIndex(v=>dist2(v,p)<1e-9);
  if(vi>=0)return `совпадает с вершиной <b>${vName(vi)}</b>`;
  const li=lineInfo(pt,p);
  if(li&&f.labeled){
    const A=vName(li.a),B=vName(li.b),t=li.t,what=li.isEdge?'ребре':'прямой';
    if(li.inside){
      const mid=Math.abs(t-.5)<1e-6?' · середина':'';
      return `на ${what} <b>${A}${B}</b>${mid} <span class="ratio">${A}${n} : ${n}${B} = ${ratioAB(t,1-t)}</span>`;
    }
    if(t>1)return `на продолжении <b>${A}${B}</b> за ${B} <span class="ratio">${B}${n} = ${fracText(t-1)}·${A}${B}</span>`;
    return `на продолжении <b>${A}${B}</b> за ${A} <span class="ratio">${A}${n} = ${fracText(-t)}·${A}${B}</span>`;
  }
  const onF=f.faces.map((_,i)=>i).filter(i=>Math.abs(dot(f.fn[i],p)+f.fd[i])<1e-6);
  if(onF.length){
    const fi=onF[0],ids=f.faces[fi],inside=ids.every((id,k)=>{const A=f.verts[id],B=f.verts[ids[(k+1)%ids.length]];return dot(cross(sub(B,A),sub(p,A)),f.fn[fi])>=-1e-9;});
    return (inside?'на грани ':'в плоскости грани ')+`<b>${faceLabel(f,fi)}</b>`;
  }
  return f.fn.every((nn,i)=>dot(nn,p)+f.fd[i]<-1e-9)?'внутри тела':'вне тела';
}
function snapT(t){for(const n of[-1,-.5,-1/3,0,.25,1/3,.5,2/3,.75,1,4/3,1.5,2])if(Math.abs(t-n)<0.03)return n;return Math.round(t*1000)/1000;}
function snapG(v){const r=Math.round(v*4)/4;return Math.abs(v-r)<0.07?r:Math.round(v*100)/100;}

/* ---------- загрузка тел и задач ---------- */
function setFigure(spec,{keepView=false}={}){
  S.spec=JSON.parse(JSON.stringify(spec));
  S.fig=buildFig(S.spec);
  S.faceStyle={};S.extEdges.clear();S.extSection=false;S.sel=null;S.hover=null;S.anglePicks=[];
  if(!keepView){S.zoom=1;S.panX=0;S.panY=0;}
  $$('.fbtn').forEach(b=>b.classList.toggle('on',b.dataset.k===S.spec.key));
  $('#cbOrigin').disabled=!(S.fig.labeled&&S.fig.labIdx.A!==undefined);
  if($('#cbOrigin').disabled)S.originA=false;
  updOrigin();renderVerts();renderBodyFacts();
}
function setPoints(defs,names){
  S.points=[];S.nextId=1;
  defs.forEach((d,i)=>addPoint(d,names&&names[i],{silent:true}));
  S.secIds=[0,1,2].map(i=>S.points[i]?S.points[i].id:null);
  S.activeId=null;S.planeSlot=0;
}
function loadTask(i,{silent=false}={}){
  const t=TASKS[i];S.taskIndex=i;
  setFigure({key:t.f});
  setPoints(t.pts.map((p,j)=>Array.isArray(p)?{type:'edge',a:S.fig.labIdx[p[0]],b:S.fig.labIdx[p[1]],t:p[2]}:{type:'param',task:i,j,t:p.t}),t.names||['P','Q','R']);
  S.step=1;S.stepProg=0;
  renderObjs();recompute();
  if(!silent)syncOut();
}
function loadFigureKey(k){const i=TASKS.findIndex(t=>t.f===k);loadTask(i>=0?i:0);}
function defaultDefs(fig){
  const E=fig.edges,m=E.length;
  const mk=(e,t)=>({type:'edge',a:E[e][0],b:E[e][1],t});
  let defs=[mk(0,.5),mk(Math.floor(m*2/3),.4),mk(m-1,.6)];
  const ok=ds=>{const P=ds.map(d=>lerp3(fig.verts[d.a],fig.verts[d.b],d.t)),pl=planeFrom3(P);return pl&&computeSection(fig,pl).poly.length>=3;};
  for(let k=0;k<60&&!ok(defs);k++)defs=randomDefs(fig);
  return defs;
}
function randomDefs(fig){
  const E=fig.edges,pick=new Set(),nice=[.25,1/3,.5,2/3,.75];
  while(pick.size<3)pick.add(Math.floor(Math.random()*E.length));
  return[...pick].map(e=>({type:'edge',a:E[e][0],b:E[e][1],t:nice[Math.floor(Math.random()*nice.length)]}));
}
function loadSpec(spec){
  setFigure(spec);S.taskIndex=-1;
  setPoints(defaultDefs(S.fig));
  S.step=1;renderObjs();recompute();syncOut();
}
function updOrigin(){S.origin=(S.originA&&S.fig.labeled&&S.fig.labIdx.A!==undefined)?S.fig.verts[S.fig.labIdx.A]:V(0,0,0);}

/* ---------- пересчёт ---------- */
function recompute(){
  const f=S.fig;
  const pos=new Map(S.points.map(pt=>[pt.id,posOf(pt)]));
  const ids=S.secIds,uniq=new Set(ids.filter(Boolean));
  const P=ids.map(id=>id?pos.get(id):null),names=ids.map(id=>id&&ptById(id)?ptById(id).name:'?');
  S.plane=(uniq.size===3&&P.every(Boolean))?planeFrom3(P):null;
  S.sec=computeSection(f,S.plane);
  const userPts=S.points.map(pt=>({p:pos.get(pt.id),name:pt.name})).filter(u=>u.p);
  S.secLab=labelSection(f,S.sec.poly,userPts);
  S.steps=P.every(Boolean)?buildSteps(f,S.plane,P,names,S.sec,S.secLab):[];
  if(S.step>S.steps.length)S.step=Math.max(1,S.steps.length);
  S.traceLine=traceLine(f,S.plane);
  S.drawPts=S.points.map(pt=>{
    const p=pos.get(pt.id);if(!p)return null;
    const u={p,name:pt.name,visible:pt.visible,inSec:ids.includes(pt.id),active:pt.id===S.activeId};
    if(S.showDrops&&f.kind==='poly'&&pt.def.type==='free'&&p.z>f.baseZ+1e-6)u.drop=V(p.x,p.y,f.baseZ);
    const li=lineInfo(pt,p);
    if(li&&!li.inside){const A=f.verts[li.a],B=f.verts[li.b];u.ext=li.t>1?[B,p]:[A,p];}
    return u;
  }).filter(Boolean);
  S._pos=pos;
  updObjValues();updSecUi();updSteps();updInspector();updAngle();
}

/* ---------- список объектов ---------- */
function edgeOptions(d){
  const f=S.fig,opts=f.edges.map(([a,b])=>[a+'_'+b,vName(a)+vName(b)]);
  const cur=d.a+'_'+d.b;
  if(!opts.some(o=>o[0]===cur||o[0]===d.b+'_'+d.a))opts.unshift([cur,vName(d.a)+vName(d.b)]);
  const val=opts.find(o=>o[0]===cur)?cur:d.b+'_'+d.a;
  return{html:opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join(''),val};
}
function rowHtml(pt){
  const d=pt.def,f=S.fig,poly=f.kind==='poly'&&f.labeled;
  const typeOpts=`<option value="free">по координатам</option>`+(poly?`<option value="edge">на прямой ребра</option>`:'')+(d.type==='param'?`<option value="param">на поверхности</option>`:'');
  let body='';
  if(d.type==='free')body=`<div class="xyz">${['x','y','z'].map(k=>`<label><span>${k}</span><input data-k="${k}" inputmode="decimal" aria-label="${k}"></label>`).join('')}</div>`;
  else if(d.type==='edge'){const eo=edgeOptions(d);body=`<div class="edge-def"><select class="obj-edge" aria-label="Прямая">${eo.html}</select><input type="range" class="obj-tr" min="-1" max="2" step="0.001" aria-label="Положение"><input type="text" class="obj-t" aria-label="t" title="t: 0 — первая вершина, 1 — вторая, <0 или >1 — продолжение"></div>`;}
  else if(d.type==='param')body=`<div class="edge-def"><span class="obj-coord">${esc(TASKS[d.task].pts[d.j].hint)}</span><input type="range" class="obj-tr" min="0" max="1" step="0.001"><span></span></div>`;
  return `<li class="obj${pt.id===S.activeId?' active':''}" data-id="${pt.id}">
    <div class="obj-gut"><button class="obj-dot${pt.visible?'':' off'}${S.secIds.includes(pt.id)?' sec':''}" title="Показать/скрыть" aria-label="Видимость ${esc(pt.name)}"></button></div>
    <div class="obj-main">
      <div class="obj-head"><input class="obj-name" value="${esc(pt.name)}" aria-label="Имя точки"><span class="obj-eq">=</span>
        <select class="obj-type" aria-label="Способ задания">${typeOpts}</select><button class="obj-del" title="Удалить" aria-label="Удалить ${esc(pt.name)}">✕</button></div>
      ${body}
      <div class="obj-desc"></div>
      ${d.type!=='free'?'<div class="obj-coord"></div>':''}
    </div></li>`;
}
function renderObjs(){
  const list=$('#objList');
  list.innerHTML=S.points.length?S.points.map(rowHtml).join(''):'<li class="hint" style="padding:12px 0">Точек нет. Добавь через строку ввода или инструментом «Точка».</li>';
  S.points.forEach(pt=>{const row=list.querySelector(`[data-id="${pt.id}"]`);if(!row)return;row.querySelector('.obj-type').value=pt.def.type;
    const es=row.querySelector('.obj-edge');if(es&&pt.def.type==='edge')es.value=edgeOptions(pt.def).val;});
  renderSecSelects();updObjValues();
}
function updObjValues(){
  const list=$('#objList'),act=document.activeElement;
  S.points.forEach(pt=>{
    const row=list.querySelector(`[data-id="${pt.id}"]`);if(!row)return;
    const p=S._pos?S._pos.get(pt.id):posOf(pt),d=pt.def;
    row.classList.toggle('active',pt.id===S.activeId);
    const dot_=row.querySelector('.obj-dot');dot_.classList.toggle('sec',S.secIds.includes(pt.id));dot_.classList.toggle('off',!pt.visible);
    if(d.type==='free'&&p){const r=rel(p);row.querySelectorAll('.xyz input').forEach(inp=>{if(inp!==act){inp.value=fracText(r[inp.dataset.k]).replace('/','/');inp.classList.remove('bad');}});}
    if(d.type==='edge'||d.type==='param'){
      const tr=row.querySelector('.obj-tr');if(tr&&tr!==act)tr.value=d.t;
      const ti=row.querySelector('.obj-t');if(ti&&ti!==act)ti.value=fracText(d.t);
    }
    row.querySelector('.obj-desc').innerHTML=describe(pt,p);
    const c=row.querySelector('.obj-coord:last-child');if(c&&d.type!=='free'&&p)c.textContent=fmtC(rel(p));
  });
}
function renderSecSelects(){
  const opts=S.points.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  $$('.sec-sel').forEach((s,i)=>{s.innerHTML='<option value="">·</option>'+opts;s.value=S.secIds[i]||'';});
}
function updSecUi(){
  const has=S.sec.poly.length>=3;
  $('#secState').textContent=!S.plane?(new Set(S.secIds.filter(Boolean)).size<3?'выбери три разные точки':'точки на одной прямой'):has?'сечение: '+S.sec.name:'плоскость не пересекает тело';
  $('#stepsBtn').disabled=!S.plane;
}
$$('.sec-sel').forEach((s,i)=>s.addEventListener('change',()=>{S.secIds[i]=+s.value||null;S.step=1;S.stepProg=0;renderObjs();recompute();syncOut();}));

/* делегирование событий списка */
const objList=$('#objList');
const rowPt=e=>{const li=e.target.closest('.obj');return li?ptById(+li.dataset.id):null;};
objList.addEventListener('input',e=>{
  const pt=rowPt(e);if(!pt)return;const d=pt.def;
  if(e.target.matches('.xyz input')){
    const v=parseNum(e.target.value);
    if(Number.isNaN(v)){e.target.classList.add('bad');return;}
    e.target.classList.remove('bad');
    const k=e.target.dataset.k;d[k]=v+S.origin[k];recompute();syncOut();
  }else if(e.target.matches('.obj-tr')){
    d.t=d.type==='edge'?snapT(+e.target.value):+e.target.value;recompute();syncOut();
  }
});
objList.addEventListener('change',e=>{
  const pt=rowPt(e);if(!pt)return;const d=pt.def;
  if(e.target.matches('.obj-name')){
    let n=normName(e.target.value.trim());
    const bad=!n||S.points.some(q=>q!==pt&&q.name===n)||(S.fig.labels||[]).includes(n);
    if(bad){toast(n?'Имя «'+n+'» уже занято':'Пустое имя');e.target.value=pt.name;return;}
    pt.name=n;renderSecSelects();recompute();syncOut();
  }else if(e.target.matches('.obj-type')){
    const p=posOf(pt),to=e.target.value;
    if(to==='free'&&p)pt.def={type:'free',x:p.x,y:p.y,z:p.z};
    else if(to==='edge'){
      let best=null;
      S.fig.edges.forEach(([a,b])=>{const A=S.fig.verts[a],B=S.fig.verts[b],AB=sub(B,A),t=p?dot(sub(p,A),AB)/dot(AB,AB):.5,q=add(A,mul(AB,t)),dd=p?dist2(q,p):0;
        if(!best||dd<best.dd)best={a,b,t:snapT(clamp(t,-1,2)),dd};});
      pt.def={type:'edge',a:best.a,b:best.b,t:best.t};
    }
    renderObjs();recompute();syncOut();
  }else if(e.target.matches('.obj-edge')){
    const[a,b]=e.target.value.split('_').map(Number);d.a=a;d.b=b;recompute();syncOut();
  }else if(e.target.matches('.obj-t')){
    const v=parseNum(e.target.value);if(Number.isNaN(v)){e.target.value=fracText(d.t);return;}
    d.t=clamp(v,-5,6);recompute();syncOut();
  }
});
objList.addEventListener('click',e=>{
  const pt=rowPt(e);if(!pt)return;
  if(e.target.closest('.obj-dot')){pt.visible=!pt.visible;recompute();syncOut();return;}
  if(e.target.closest('.obj-del')){removePoint(pt.id);return;}
  if(S.activeId!==pt.id){S.activeId=pt.id;recompute();}
});
function removePoint(id){
  S.points=S.points.filter(p=>p.id!==id);
  S.secIds=S.secIds.map(s=>s===id?null:s);
  if(S.activeId===id)S.activeId=null;
  renderObjs();recompute();syncOut();
}
$('#addFree').onclick=()=>{const c=S.fig.center;addPoint({type:'free',x:snapG(c.x),y:snapG(c.y),z:snapG(S.fig.topZ+0.5)});afterAdd();};
$('#addEdge').onclick=()=>{if(S.fig.kind!=='poly'||!S.fig.labeled){toast('У этого тела нет подписанных рёбер');return;}const[a,b]=S.fig.edges[0];addPoint({type:'edge',a,b,t:.5});afterAdd();};
function afterAdd(){fillEmptySlot(S.activeId);renderObjs();recompute();syncOut();openTab('obj');
  const row=objList.querySelector(`[data-id="${S.activeId}"]`);if(row)row.scrollIntoView({block:'nearest',behavior:'smooth'});}
function fillEmptySlot(id){const i=S.secIds.findIndex(s=>!s||!ptById(s));if(i>=0)S.secIds[i]=id;}

/* ---------- строка ввода, как в GeoGebra ---------- */
const LAT={'А':'A','В':'B','С':'C','Е':'E','Н':'H','К':'K','М':'M','О':'O','Р':'P','Т':'T','Х':'X','Д':'D','Ф':'F','Г':'G','Л':'L','Ы':'S'};
function normName(s){
  if(!s)return '';
  s=s.replace(/[А-ЯЁа-яё]/g,c=>LAT[c.toUpperCase()]||c).replace(/'/g,'′');
  return toSub(s.charAt(0).toUpperCase()+s.slice(1));
}
function vertsOf(str){
  const clean=normName(str.replace(/[\s,;()]/g,''));
  const toks=clean.match(/[A-Z][₀-₉′]*/g)||[];
  if(toks.join('')!==clean)return null;
  const ids=toks.map(t=>S.fig.labIdx[t]);
  return ids.some(i=>i===undefined)?null:ids;
}
function parseCmd(str){
  let s=str.trim().replace(/−/g,'-');if(!s)return null;
  let name=null;const m=s.match(/^([A-Za-zА-Яа-я][0-9₀-₉′']*)\s*=\s*(.+)$/);
  if(m){name=normName(m[1]);s=m[2].trim();}
  const inner=s.replace(/^\(|\)$/g,'');
  if(/^[\d\s.,;√\/+\-*()]+$/.test(inner)){
    const parts=inner.includes(';')?inner.split(';'):inner.split(',');
    const c=parts.map(parseNum);
    if(c.length===3&&c.every(v=>!Number.isNaN(v)))return{name,def:{type:'free',x:c[0]+S.origin.x,y:c[1]+S.origin.y,z:c[2]+S.origin.z}};
    return{err:'Координаты: три числа через «;», например (1; 0; 2,5)'};
  }
  if(S.fig.kind!=='poly'||!S.fig.labeled)return{err:'У этого тела нет вершин с именами: задай точку координатами'};
  let mm=s.match(/^(?:середина|сер\.?|mid)\s*(.+)$/i);
  if(mm){const v=vertsOf(mm[1]);if(!v||v.length!==2)return{err:'Не нашёл отрезок: '+mm[1]};return{name,def:{type:'edge',a:v[0],b:v[1],t:.5}};}
  mm=s.match(/^(\S+?)\s+([\d.,\/√]+)\s*:\s*([\d.,\/√]+)$/);
  if(mm){const v=vertsOf(mm[1]),a=parseNum(mm[2]),b=parseNum(mm[3]);if(!v||v.length!==2||!(a>=0&&b>=0&&a+b>0))return{err:'Пример: AB 1:2'};return{name,def:{type:'edge',a:v[0],b:v[1],t:a/(a+b)}};}
  mm=s.match(/^(\S+?)\s*(?:t\s*=\s*|\(\s*)([^)]+)\)?$/);
  if(mm){const v=vertsOf(mm[1]),t=parseNum(mm[2]);if(v&&v.length===2&&!Number.isNaN(t))return{name,def:{type:'edge',a:v[0],b:v[1],t}};}
  const v=vertsOf(s);
  if(v&&v.length===1){const e=S.fig.edges.find(([a,b])=>a===v[0]||b===v[0]);return{name,def:{type:'edge',a:v[0],b:e[0]===v[0]?e[1]:e[0],t:0}};}
  return{err:'Не понял. Примеры: (1; 0; 2), AB 1:2, AB t=1,5, середина AC'};
}
$('#cmdForm').addEventListener('submit',e=>{
  e.preventDefault();
  const r=parseCmd($('#cmdIn').value);if(!r)return;
  if(r.err){$('#cmdForm').classList.add('err');$('#cmdHelp').textContent=r.err;$('#cmdHelp').classList.add('err');return;}
  if(r.name&&(S.fig.labels||[]).includes(r.name)){$('#cmdForm').classList.add('err');$('#cmdHelp').textContent=`«${r.name}» — вершина тела, возьми другое имя`;return;}
  const ex=r.name&&S.points.find(p=>p.name===r.name);
  if(ex){ex.def=r.def;S.activeId=ex.id;toast('Точка '+ex.name+' переопределена');renderObjs();recompute();syncOut();}
  else{addPoint(r.def,r.name||undefined);afterAdd();toast('Добавлена точка '+ptById(S.activeId).name);}
  $('#cmdIn').value='';$('#cmdForm').classList.remove('err');$('#cmdHelp').classList.remove('err');
  $('#cmdHelp').innerHTML='Можно: <code>(x; y; z)</code>, <code>AB 1:2</code>, <code>AB t=1,5</code> (продолжение), <code>середина AC</code>, <code>C1</code>.';
});
$('#cmdIn').addEventListener('input',()=>$('#cmdForm').classList.remove('err'));

/* ---------- вершины тела ---------- */
function renderVerts(){
  const f=S.fig,box=$('#vertsBox');
  if(f.kind!=='poly'||!f.labeled){box.hidden=true;return;}
  box.hidden=false;
  $('#vertList').innerHTML=f.verts.map((v,i)=>`<dt>${vName(i)}</dt><dd>${fmtC(rel(v))}</dd>`).join('')+
    '<dt></dt><dd><button class="btn btn-soft sm" id="editVerts">Изменить вершины</button></dd>';
  $('#editVerts').onclick=()=>{
    $('#hullText').value=f.verts.map((v,i)=>`${vName(i).replace(/[₀-₉]/g,c=>SUBS.indexOf(c))} = (${fmt(v.x)}; ${fmt(v.y)}; ${fmt(v.z)})`).join('\n');
    openTab('body');$('#hullBox').open=true;$('#hullText').focus();toast('Поправь координаты и нажми «Построить»');
  };
}

/* ---------- тело ---------- */
function baseRenderState(){return{showGrid:false,extEdges:new Set(),faceStyle:{},bodyStyle:{color:'#2c2c30',alpha:.07},sec:{poly:[]},secLab:[],steps:[],stepsOn:false,showSec:false,showVtx:false,anglePicks:[],drawPts:[]};}
function buildFigGrid(){
  $('#figGrid').innerHTML=FIGKEYS.map(([k,n],i)=>`<button class="fbtn" data-k="${k}" title="${n} (${i+1})"><canvas width="128" height="96"></canvas><span>${n}</span></button>`).join('');
  $$('.fbtn').forEach(b=>{
    const c=b.querySelector('canvas'),x=c.getContext('2d'),f=buildFig(b.dataset.k);
    renderScene(x,128,96,{fig:f,st:baseRenderState(),yaw:0.62,pitch:-0.42,cx:64,cy:50,scale:34/f.R,theme:'light'});
    b.onclick=()=>loadFigureKey(b.dataset.k);
  });
}
function renderBodyFacts(){
  const f=S.fig,Vv=figVolume(f),Sf=figSurface(f),rows=[['Объём',fmt(Vv)+(niceRoot(Vv)?' = '+niceRoot(Vv):'')],['Площадь поверхности',fmt(Sf)+(niceRoot(Sf)?' = '+niceRoot(Sf):'')]];
  if(f.kind==='poly'&&!f.smooth)rows.push(['Вершин · рёбер · граней',`${f.verts.length} · ${f.edges.length} · ${f.faces.length}`]);
  if(f.dims)rows.push(['Размеры',Object.entries(f.dims).map(([k,v])=>k+' = '+fmt(v)).join(', ')]);
  const html=rows.map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  $('#bodyFacts').innerHTML=html;$('#iBody').innerHTML=html;
  $('#hudFig').textContent=f.name;
}
(function bindBody(){
  const c=S.custom;
  $('#cType').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;c.type=b.dataset.v;$$('#cType button').forEach(x=>x.classList.toggle('on',x===b));$('#cBRow').hidden=c.type!=='frustum';});
  $$('.stepper button').forEach(b=>b.onclick=()=>{c.n=clamp(c.n+ +b.dataset.d,3,8);$('#cN').textContent=c.n;});
  [['cA','a'],['cB','b'],['cH','h']].forEach(([id,k])=>$('#'+id).addEventListener('input',e=>{c[k]=+e.target.value;$('#'+id+'v').textContent=fmt(c[k]);}));
  $('#cBuild').onclick=()=>{if(c.type==='frustum'&&c.b>=c.a){toast('Верхняя сторона должна быть меньше нижней');return;}loadSpec({key:'custom',params:{...c}});toast('Построено: '+S.fig.name.toLowerCase());};
  $('#hullPresets').innerHTML=HULL_PRESETS.map((p,i)=>`<button data-i="${i}">${p.name}</button>`).join('');
  $('#hullText').value=HULL_PRESETS[1].text;
  $('#hullPresets').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=HULL_PRESETS[+b.dataset.i];$('#hullText').value=p.text;buildHullFromText(p.name);});
  $('#hullBuild').onclick=()=>buildHullFromText();
  $('#hullFromPts').onclick=()=>{
    const fr=S.points.map(pt=>({pt,p:posOf(pt)})).filter(q=>q.p);
    if(fr.length<4){toast('Нужно минимум 4 точки в списке');return;}
    $('#hullText').value=fr.map(q=>`${q.pt.name.replace(/[₀-₉]/g,c=>SUBS.indexOf(c))} = (${fmt(q.p.x)}; ${fmt(q.p.y)}; ${fmt(q.p.z)})`).join('\n');
    buildHullFromText('Тело по точкам');
  };
})();
function buildHullFromText(name){
  const msg=$('#hullMsg'),r=parseVertexList($('#hullText').value);
  msg.classList.remove('err');
  if(r.errs.length){msg.textContent='Не разобрал строки: '+r.errs.join(', ')+'. Формат: A = (0; 0; 0)';msg.classList.add('err');return;}
  const names=r.list.map(q=>q.name);
  if(new Set(names).size!==names.length){msg.textContent='Имена вершин повторяются';msg.classList.add('err');return;}
  if(r.list.length<4){msg.textContent='Нужно минимум 4 вершины';msg.classList.add('err');return;}
  const f=buildHull(Object.assign(r.list.slice(),{name}));
  if(!f){msg.textContent='Все точки лежат в одной плоскости, тело не построить';msg.classList.add('err');return;}
  loadSpec({key:'hull',verts:r.list,name:name||'Тело по точкам'});
  msg.textContent=`Готово: ${f.verts.length} вершин, ${f.faces.length} граней.`+(f.dropped.length?` Внутри тела оказались и не вошли: ${f.dropped.join(', ')}.`:'');
}

/* ---------- шаги ---------- */
let playTimer=0;
function updSteps(){
  const on=S.stepsOn&&S.steps.length>0;
  $('#player').hidden=!on;
  $('#stepsBtn').classList.toggle('on',S.stepsOn);
  $('#stepsBtn span').textContent=S.stepsOn?'Скрыть построение':'Построить методом следов';
  S.padB=on?($('#player').offsetHeight||0):0;
  if(!on)return;
  const n=S.steps.length,k=Math.min(S.step,n),cur=S.steps[k-1],prev=k>1?S.steps[k-2].known||[]:[];
  $('#stNum').textContent=`Шаг ${k} из ${n}`;
  $('#stTitle').textContent=cur.title;
  $('#stTxt').textContent=cur.text;
  $('#stWhy').textContent=cur.why||'';
  $('#stKnown').innerHTML=cur.known&&cur.known.length?'Известные точки: '+cur.known.map(l=>`<i class="${prev.includes(l)?'':'new'}">${esc(l)}</i>`).join(''):'';
  $('#stPrev').disabled=k<=1;$('#stNext').disabled=k>=n;
  $('#stDots').innerHTML=S.steps.map((s,i)=>`<button class="${i===k-1?'cur':i<k-1?'done':''}" data-i="${i}" title="${esc(s.title)}" aria-label="Шаг ${i+1}"></button>`).join('');
  const pi=$('#stPlay i');pi.dataset.i=S.playing?'pause':'play';paintIcons($('#player'));
  requestAnimationFrame(()=>{S.padB=$('#player').offsetHeight||0;});
}
function goStep(k){
  const n=S.steps.length,nk=clamp(k,1,n);
  if(nk!==S.step){S.step=nk;S.stepProg=0;}
  if(S.step>=n)stopPlay();
  updSteps();syncOut();
}
function setStepsOn(on){S.stepsOn=on&&!!S.plane;S.step=1;S.stepProg=0;stopPlay();updSteps();syncOut();}
function stopPlay(){S.playing=false;clearInterval(playTimer);}
function togglePlay(){
  if(S.playing){stopPlay();updSteps();return;}
  if(S.step>=S.steps.length)S.step=0;
  S.playing=true;goStep(S.step+1);
  playTimer=setInterval(()=>{if(S.step>=S.steps.length){stopPlay();updSteps();return;}goStep(S.step+1);},3600);
  updSteps();
}
$('#stepsBtn').onclick=()=>setStepsOn(!S.stepsOn);
$('#stPrev').onclick=()=>{stopPlay();goStep(S.step-1);};
$('#stNext').onclick=()=>{stopPlay();goStep(S.step+1);};
$('#stPlay').onclick=togglePlay;
$('#stClose').onclick=()=>setStepsOn(false);
$('#stDots').addEventListener('click',e=>{const b=e.target.closest('button');if(b){stopPlay();goStep(+b.dataset.i+1);}});

/* ---------- переключатели вида ---------- */
const bindCb=(id,key,after)=>{$('#'+id).onchange=e=>{S[key]=e.target.checked;after&&after();syncOut();};};
bindCb('cbSec','showSec');bindCb('cbPlane','showPlane');bindCb('cbTrace','showTrace');bindCb('cbExtSec','extSection');
bindCb('cbGrid','showGrid');bindCb('cbVtx','showVtx');bindCb('cbAuto','autoRot');
bindCb('cbDrops','showDrops',()=>recompute());
bindCb('cbOrigin','originA',()=>{updOrigin();renderVerts();recompute();});
function syncChecks(){
  [['cbSec','showSec'],['cbPlane','showPlane'],['cbTrace','showTrace'],['cbExtSec','extSection'],['cbGrid','showGrid'],['cbVtx','showVtx'],['cbAuto','autoRot'],['cbDrops','showDrops'],['cbOrigin','originA']]
    .forEach(([id,k])=>$('#'+id).checked=!!S[k]);
}
const SWATCHES=['#2c2c30','#2b59d1','#e4492c','#1d8f57','#e0a526','#8a4fd6','#16a3b0'];
$('#swatches').innerHTML=SWATCHES.map((c,i)=>`<button style="--c:${c}" data-c="${c}" class="${i===0?'on':''}" aria-label="Цвет ${c}"></button>`).join('')+'<label class="sw-custom" title="Свой цвет"><input type="color" id="colIn" value="#2c2c30"></label>';
let paintColor='#2c2c30';
$('#swatches').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;paintColor=b.dataset.c;$('#colIn').value=paintColor;$$('#swatches button').forEach(x=>x.classList.toggle('on',x===b));
  if(+$('#alpIn').value<12&&paintColor!=='#2c2c30'){$('#alpIn').value=22;$('#alpVal').textContent='22%';}});
$('#colIn').addEventListener('input',e=>{paintColor=e.target.value;$$('#swatches button').forEach(x=>x.classList.remove('on'));});
$('#alpIn').oninput=e=>$('#alpVal').textContent=e.target.value+'%';
$('#btnFace').onclick=()=>{if(S.sel&&S.sel.type==='face'){S.faceStyle[S.sel.index]={color:paintColor,alpha:+$('#alpIn').value/100};syncOut();}};
$('#btnBody').onclick=()=>{S.bodyStyle={color:paintColor,alpha:+$('#alpIn').value/100};S.faceStyle={};syncOut();};
$('#btnClear').onclick=()=>{S.faceStyle={};S.bodyStyle={...DEF_BODY};S.extEdges.clear();S.extSection=false;S.sel=null;$('#alpIn').value=6;$('#alpVal').textContent='6%';syncChecks();updInspector();syncOut();};
$('#btnExtEdge').onclick=()=>toggleExtEdge();
function toggleExtEdge(sel=S.sel){
  if(!sel||sel.type!=='edge')return;
  const k=Math.min(sel.a,sel.b)+'_'+Math.max(sel.a,sel.b);
  S.extEdges.has(k)?S.extEdges.delete(k):S.extEdges.add(k);
  updInspector();syncOut();
  if(S.extEdges.has(k))toast('Ребро продлено: инструментом «Точка» можно ставить точки прямо на продолжении');
}

/* ---------- углы ---------- */
const pickKey=p=>p.type==='edge'?'e'+Math.min(p.a,p.b)+'_'+Math.max(p.a,p.b):p.type==='face'?'f'+p.index:p.type;
function entityName(e){
  const f=S.fig;
  if(e.type==='section')return 'α';
  if(e.type==='vertex')return vName(e.index);
  if(e.type==='edge')return f.labeled?vName(e.a)+vName(e.b):'ребро';
  if(e.type==='face')return f.labeled?faceLabel(f,e.index):(f.faces[e.index].length>4?'основание':'грань');
  return 'объект';
}
const lineOf=p=>({p:S.fig.verts[p.a],u:sub(S.fig.verts[p.b],S.fig.verts[p.a])});
const planeN=p=>p.type==='section'?S.plane.n:S.fig.fn[p.index];
function angleResult(){
  S.angleArc=null;
  if(S.anglePicks.length<2)return null;
  const[a,b]=S.anglePicks,isL=x=>x.type==='edge',isP=x=>x.type==='face'||x.type==='section';
  if([a,b].some(x=>x.type==='section')&&!S.plane)return{kind:'Нет плоскости α',val:null};
  if(isL(a)&&isL(b)){
    const common=[a.a,a.b].find(v=>v===b.a||v===b.b);
    if(common!==undefined){
      const ao=a.a===common?a.b:a.a,bo=b.a===common?b.b:b.a,c=S.fig.verts[common],u=sub(S.fig.verts[ao],c),w=sub(S.fig.verts[bo],c);
      S.angleArc={c,u:mul(nrm(u),0.01),w:mul(nrm(w),0.01)};
      return{kind:'Плоский угол '+vName(ao)+vName(common)+vName(bo),val:deg(Math.acos(clamp(dot(nrm(u),nrm(w)),-1,1)))};
    }
    const L1=lineOf(a),L2=lineOf(b),cr=cross(L1.u,L2.u);
    if(len(cr)<1e-7)return{kind:'Прямые параллельны',val:0};
    const dd=Math.abs(dot(nrm(cr),sub(L2.p,L1.p))),skew=dd>1e-6;
    return{kind:skew?'Угол между скрещивающимися прямыми':'Угол между прямыми',val:deg(Math.acos(clamp(Math.abs(dot(nrm(L1.u),nrm(L2.u))),0,1))),extra:skew?'расстояние между ними '+fmt(dd)+(niceRoot(dd)?' = '+niceRoot(dd):''):''};
  }
  if(isP(a)&&isP(b)){
    if(a.type==='section'||b.type==='section')return{kind:'Угол между α и гранью',val:deg(Math.acos(clamp(Math.abs(dot(planeN(a),planeN(b))),0,1)))};
    const fa=S.fig.faces[a.index],fb=S.fig.faces[b.index],shared=fa.filter(v=>fb.includes(v)),cosn=clamp(dot(S.fig.fn[a.index],S.fig.fn[b.index]),-1,1);
    if(shared.length>=2)return{kind:'Двугранный угол при ребре '+shared.map(vName).join(''),val:180-deg(Math.acos(cosn))};
    return{kind:'Угол между плоскостями граней',val:deg(Math.acos(Math.abs(cosn)))};
  }
  const Ln=isL(a)?a:b,Pp=isL(a)?b:a;
  return{kind:'Угол между прямой и плоскостью',val:deg(Math.asin(clamp(Math.abs(dot(nrm(lineOf(Ln).u),planeN(Pp))),0,1)))};
}
function updAngle(){
  $('#angleCard').hidden=S.tool!=='angle';
  if(S.tool!=='angle'){S.angleArc=null;return;}
  $('#anglePicks').innerHTML=S.anglePicks.length?S.anglePicks.map((p,i)=>`<button class="chip" data-i="${i}" title="Убрать">${esc(entityName(p))} ✕</button>`).join(''):'<span class="chip ghost">кликни по рёбрам или граням</span>';
  const r=angleResult();
  $('#angleKind').textContent=r?r.kind:(S.anglePicks.length?'Выбери второй объект':'Два ребра, две грани или ребро и грань');
  $('#angleVal').textContent=r&&r.val!==null?fmt(r.val,1)+'°':'·';
  $('#angleExtra').textContent=r&&r.extra||'';
}
function addAnglePick(p){
  if(!p||(p.type!=='edge'&&p.type!=='face'))return false;
  if(S.anglePicks.length>=2)S.anglePicks=[];
  if(!S.anglePicks.some(q=>pickKey(q)===pickKey(p)))S.anglePicks.push(p);
  updAngle();return true;
}
$('#angleClear').onclick=()=>{S.anglePicks=[];updAngle();};
$('#angleSec').onclick=()=>{if(!S.plane){toast('Сначала нужна плоскость α');return;}if(S.anglePicks.some(p=>p.type==='section'))return;if(S.anglePicks.length>=2)S.anglePicks=[];S.anglePicks.push({type:'section'});updAngle();};
$('#anglePicks').addEventListener('click',e=>{const c=e.target.closest('.chip[data-i]');if(c){S.anglePicks.splice(+c.dataset.i,1);updAngle();}});

/* ---------- инспектор ---------- */
function planeEq(pl){
  if(!pl)return '·';
  const n=pl.n,d=pl.d+dot(pl.n,S.origin),cs=[n.x,n.y,n.z].filter(v=>Math.abs(v)>1e-6).map(Math.abs),k=Math.min(...cs);
  let co=[n.x/k,n.y/k,n.z/k,d/k];
  let m=0;for(let q=1;q<=24&&!m;q++)if(co.every(v=>Math.abs(v*q-Math.round(v*q))<1e-4))m=q;
  if(m){co=co.map(v=>Math.round(v*m));const g=co.reduce((a,b)=>gcd(a,b),0)||1;co=co.map(v=>v/g);}
  else{const mx=Math.max(...co.slice(0,3).map(Math.abs));co=co.map(v=>Math.round(v/mx*100)/100);}
  const term=(v,s,first)=>{if(Math.abs(v)<1e-6)return '';const sg=v<0?'− ':(first?'':'+ '),av=Math.abs(v);return sg+(Math.abs(av-1)<1e-6&&s?'':fracText(av))+s+' ';};
  let out='',first=true;
  [[co[0],'x'],[co[1],'y'],[co[2],'z']].forEach(([v,s])=>{const t=term(v,s,first);if(t){out+=t;first=false;}});
  return (out+term(co[3],'',false)).trim()+' = 0';
}
function updInspector(){
  const sec=S.sec,has=sec.poly.length>=3;
  $('#iSecName').textContent=has?sec.name:(S.plane?'не пересекает тело':'нет плоскости');
  const rows=[];
  if(has){
    const A=S.fig.kind==='sph'?Math.PI*sec.radius**2:polyArea3D(sec.poly),Pm=S.fig.kind==='sph'?TAU*sec.radius:polyPerimeter3D(sec.poly);
    rows.push(['Площадь',fmt(A)+(niceRoot(A)?' = '+niceRoot(A):'')],['Периметр',fmt(Pm)+(niceRoot(Pm)?' = '+niceRoot(Pm):'')]);
    if(S.fig.kind==='sph')rows.push(['Радиус',fmt(sec.radius)]);
    else if(sec.poly.length<=10&&S.secLab.every(Boolean)){
      const m=sec.poly.length;
      rows.push(['Стороны',sec.poly.map((p,i)=>{const L=len(sub(sec.poly[(i+1)%m],p));return `<i class="math">${esc(S.secLab[i]+S.secLab[(i+1)%m])}</i> = ${niceRoot(L)||fmt(L)}`;}).join('<br>')]);
    }
  }
  rows.push(['Плоскость α',planeEq(S.plane)]);
  $('#iSec').innerHTML=rows.map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  const sel=S.sel;$('#iSelBox').hidden=!sel;
  if(sel){$('#iSelName').textContent=entityName(sel)+' · '+({vertex:'вершина',edge:'ребро',face:'грань'}[sel.type]||'');
    $('#iSel').innerHTML=entityFacts(sel).map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');}
  $('#btnFace').disabled=!(sel&&sel.type==='face');
  $('#btnExtEdge').disabled=!(sel&&sel.type==='edge');
  $('#paintHint').textContent=sel&&sel.type==='face'?`Выбрана грань ${entityName(sel)}.`:'Кликни по грани, чтобы выбрать её.';
  if(sel&&sel.type==='edge'){const k=Math.min(sel.a,sel.b)+'_'+Math.max(sel.a,sel.b);$('#btnExtEdge span').textContent=S.extEdges.has(k)?'Убрать продолжение':'Продлить ребро '+entityName(sel);}
  else $('#btnExtEdge span').textContent='Продлить выбранное ребро';
}
function entityFacts(e){
  const f=S.fig;
  if(e.type==='vertex'){const p=f.verts[e.index],r=[['Координаты',fmtC(rel(p))]];if(S.plane)r.push(['До плоскости α',fmt(Math.abs(dot(S.plane.n,p)+S.plane.d))]);return r;}
  if(e.type==='edge'){const a=f.verts[e.a],b=f.verts[e.b],L=len(sub(b,a));return[['Длина',fmt(L)+(niceRoot(L)?' = '+niceRoot(L):'')],['Середина',fmtC(rel(lerp3(a,b,.5)))]];}
  if(e.type==='face'){const pts=f.faces[e.index].map(i=>f.verts[i]),A=polyArea3D(pts),r=[['Площадь',fmt(A)+(niceRoot(A)?' = '+niceRoot(A):'')],['Периметр',fmt(polyPerimeter3D(pts))],['Уравнение',planeEq({n:f.fn[e.index],d:f.fd[e.index]})]];
    if(S.plane)r.push(['Угол с α',fmt(deg(Math.acos(clamp(Math.abs(dot(f.fn[e.index],S.plane.n)),0,1))),1)+'°']);return r;}
  return[];
}

/* ---------- контекстное меню ---------- */
const ctxEl=$('#ctx');
function showCtx(entity,x,y,loc){
  if(!entity){hideCtx();return;}
  S.sel=entity;updInspector();
  $('#ctxTitle').textContent=entityName(entity)+' · '+({vertex:'вершина',edge:'ребро',face:'грань'}[entity.type]);
  $('#ctxBody').innerHTML=entityFacts(entity).map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  const acts=[];
  if(loc){acts.push(['Точка здесь',()=>{addPoint(loc.def);afterAdd();}]);
    ['первая','вторая','третья'].forEach((w,i)=>acts.push([`В α: ${w}`,()=>setSlot(i,loc.def)]));}
  if(entity.type==='edge')acts.push(['Продлить',()=>toggleExtEdge(entity)]);
  if(entity.type==='face')acts.push(['Покрасить',()=>{S.faceStyle[entity.index]={color:paintColor==='#2c2c30'?'#2b59d1':paintColor,alpha:Math.max(.22,+$('#alpIn').value/100)};syncOut();}]);
  if(entity.type!=='vertex')acts.push(['Измерить угол',()=>{setTool('angle');addAnglePick(entity);}]);
  const box=$('#ctxActions');box.innerHTML='';
  acts.forEach(([t,fn])=>{const b=document.createElement('button');b.textContent=t;b.onclick=()=>{fn();hideCtx();};box.appendChild(b);});
  ctxEl.hidden=false;
  const r=ctxEl.getBoundingClientRect(),g=12;
  ctxEl.style.left=clamp(x+g+r.width>innerWidth?x-r.width-g:x+g,8,innerWidth-r.width-8)+'px';
  ctxEl.style.top=clamp(y+g+r.height>innerHeight?y-r.height-g:y+g,8,innerHeight-r.height-8)+'px';
}
function hideCtx(){ctxEl.hidden=true;}
document.addEventListener('pointerdown',e=>{if(!ctxEl.hidden&&!ctxEl.contains(e.target))hideCtx();});
function setSlot(i,def){
  const id=S.secIds[i],pt=id&&ptById(id);
  if(pt)pt.def=def;else{const np=addPoint(def,undefined,{silent:true});S.secIds[i]=np.id;}
  S.step=1;S.stepProg=0;renderObjs();recompute();syncOut();
}

/* ---------- инструменты ---------- */
const TOOL_HINT={
  move:'Двигать: тяни фон — вращение, тяни точку — перемещение (по ребру и его продолжению)',
  point:'Точка: клик по ребру, грани или полу сетки ставит новую точку',
  plane:'',angle:'Угол: выбери два ребра, две грани или ребро и грань'
};
function setTool(t){
  S.tool=t;$$('.tool').forEach(b=>b.classList.toggle('on',b.dataset.tool===t));
  stage.className=stage.className.replace(/\btool-\w+/g,'').trim()+' tool-'+t;
  if(t!=='angle')S.anglePicks=[];
  S.hover=null;updToolHint();updAngle();
}
function updToolHint(){
  const names=S.secIds.map(id=>id&&ptById(id)?ptById(id).name:'?');
  $('#hudTool').textContent=S.tool==='plane'?`Сечение: клик ${S.planeSlot+1} из 3 ставит точку ${names[S.planeSlot]}`:TOOL_HINT[S.tool];
}
$$('.tool').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));

/* что под курсором: вершина, ребро (и его продолжение), грань, пол */
function pickAt(x,y){
  const pk=S.picks;let best=null,bd=12;
  if(!S.fig.smooth)for(const v of pk.verts){const d=Math.hypot(v.x-x,v.y-y);if(d<bd){bd=d;best={type:'vertex',index:v.idx};}}
  if(best)return best;
  bd=8;let be=null;
  for(const e of pk.edges){const d=ptSegDist(x,y,e.x1,e.y1,e.x2,e.y2);if(d<bd){bd=d;be=e;}}
  if(be)return{type:'edge',a:be.a,b:be.b};
  for(const f of [...pk.faces].filter(f=>f.front).sort((a,b)=>a.d-b.d))if(pointInPoly(x,y,f.poly))return{type:'face',index:f.idx};
  return null;
}
function locate(x,y){
  const f=S.fig,P=S.picks.proj;if(!P)return null;
  const ent=pickAt(x,y);
  if(ent&&ent.type==='vertex'&&f.labeled){const e=f.edges.find(([a,b])=>a===ent.index||b===ent.index);
    return{ent,def:{type:'edge',a:ent.index,b:e[0]===ent.index?e[1]:e[0],t:0},label:'вершина '+vName(ent.index)};}
  if(ent&&ent.type==='edge'&&f.labeled){
    const A=P.pr(f.verts[ent.a]),B=P.pr(f.verts[ent.b]),t=snapT(ptSegT(x,y,A.x,A.y,B.x,B.y));
    return{ent,def:{type:'edge',a:ent.a,b:ent.b,t},label:vName(ent.a)+vName(ent.b)+' · '+ratioAB(t,1-t),edge:[ent.a,ent.b]};
  }
  for(const k of S.extEdges){
    const[a,b]=k.split('_').map(Number),A=P.pr(f.verts[a]),B=P.pr(f.verts[b]);
    const t=ptSegT(x,y,A.x,A.y,B.x,B.y,true),qx=A.x+(B.x-A.x)*t,qy=A.y+(B.y-A.y)*t;
    if(Math.hypot(qx-x,qy-y)<9&&(t<0||t>1)){const tt=snapT(t);return{ent:{type:'edge',a,b},def:{type:'edge',a,b,t:tt},label:`продолжение ${vName(a)}${vName(b)} · t = ${fracText(tt)}`,edge:[a,b]};}
  }
  const r=P.ray(x,y);
  if(ent&&ent.type==='face'&&f.kind==='poly'){
    const q=rayPlane(r,f.fn[ent.index],f.fd[ent.index]);
    if(q){const pr=V(Math.round(q.x*100)/100,Math.round(q.y*100)/100,Math.round(q.z*100)/100);
      const q2=Math.abs(dot(f.fn[ent.index],pr)+f.fd[ent.index])<1e-6?pr:q;
      return{ent,def:{type:'free',x:q2.x,y:q2.y,z:q2.z},label:'грань '+entityName(ent)};}
  }
  const q=rayPlane(r,V(0,0,1),-f.baseZ);
  if(q&&len(sub(q,f.center))<f.R*4)return{ent:null,def:{type:'free',x:snapG(q.x),y:snapG(q.y),z:f.baseZ},label:'плоскость основания'};
  return null;
}
function ptHit(x,y){
  const P=S.picks.proj;if(!P)return null;
  let best=null,bd=14;
  S.points.forEach(pt=>{if(!pt.visible)return;const p=S._pos&&S._pos.get(pt.id);if(!p)return;const q=P.pr(p),d=Math.hypot(q.x-x,q.y-y);if(d<bd){bd=d;best=pt;}});
  return best;
}
function dragPoint(pt,x,y,vertical){
  const P=S.picks.proj,d=pt.def,f=S.fig;
  if(d.type==='edge'){const A=P.pr(f.verts[d.a]),B=P.pr(f.verts[d.b]);d.t=snapT(clamp(ptSegT(x,y,A.x,A.y,B.x,B.y,true),-3,4));}
  else if(d.type==='free'){
    const p=V(d.x,d.y,d.z);
    if(vertical){const z=P.zAt(p,y);if(z!=null)d.z=snapG(clamp(z,f.baseZ-f.R*3,f.topZ+f.R*3));}
    else{const q=rayPlane(P.ray(x,y),V(0,0,1),-d.z);if(q&&len(sub(q,f.center))<f.R*6){d.x=snapG(q.x);d.y=snapG(q.y);}}
  }else if(d.type==='param'){
    const fn=TASKS[d.task].pts[d.j].fn;let bt=d.t,bd=Infinity;
    for(let i=0;i<=240;i++){const t=i/240,q=P.pr(fn(t)),dd=Math.hypot(q.x-x,q.y-y);if(dd<bd){bd=dd;bt=t;}}
    d.t=bt;
  }
}

/* ---------- мышь / касание ---------- */
let drag=null,lx=0,ly=0,moved=0,pinchD=0,pinchC=null,longTimer=0;
const pointers=new Map();
const localXY=e=>{const r=viewCv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top];};
function showTip(x,y,t){tip.textContent=t;tip.hidden=false;tip.style.left=(x+16)+'px';tip.style.top=(y-12)+'px';}
viewCv.addEventListener('pointerdown',e=>{
  if(e.button===2)return;
  hideCtx();viewCv.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const[x,y]=localXY(e);
  if(pointers.size===1){
    const hit=S.tool==='angle'?null:ptHit(x,y);
    drag={kind:hit?'point':(e.ctrlKey||e.metaKey||e.button===1)?'pan':'rotate',pt:hit};
    lx=e.clientX;ly=e.clientY;moved=0;
    if(hit){S.activeId=hit.id;viewCv.style.cursor='grabbing';updObjValues();}
    if(e.pointerType!=='mouse'){clearTimeout(longTimer);
      longTimer=setTimeout(()=>{if(moved<8&&pointers.size===1&&drag&&drag.kind!=='point'){drag=null;const p=pickAt(x,y);if(p){navigator.vibrate?.(12);showCtx(p,e.clientX,e.clientY,locate(x,y));}}},550);}
  }else if(pointers.size===2){
    drag=null;clearTimeout(longTimer);
    const p=[...pointers.values()];pinchD=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);pinchC={x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2};
  }
});
viewCv.addEventListener('pointermove',e=>{
  if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){
    const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),c={x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2};
    if(pinchD)S.zoom=clamp(S.zoom*d/pinchD,0.3,6);
    if(pinchC){S.panX+=c.x-pinchC.x;S.panY+=c.y-pinchC.y;}
    pinchD=d;pinchC=c;syncOut();return;
  }
  const[x,y]=localXY(e);
  if(drag){
    const dx=e.clientX-lx,dy=e.clientY-ly;moved+=Math.abs(dx)+Math.abs(dy);lx=e.clientX;ly=e.clientY;
    if(drag.kind==='point'){
      if(moved<3)return;
      dragPoint(drag.pt,x,y,S.zDrag||e.shiftKey);recompute();syncOut();
      const p=S._pos.get(drag.pt.id);showTip(x,y,drag.pt.name+' '+fmtC(rel(p)));return;
    }
    if(moved<4)return;
    if(drag.kind==='pan'){S.panX+=dx;S.panY+=dy;}
    else{S.view=null;S.yaw+=dx*0.007;S.pitch=clamp(S.pitch-dy*0.006,-1.56,1.56);if(S.autoRot){S.autoRot=false;syncChecks();}}
    syncOut();return;
  }
  hoverAt(x,y);
});
const endPointer=e=>{
  clearTimeout(longTimer);pointers.delete(e.pointerId);
  if(pointers.size<2){pinchD=0;pinchC=null;}
  if(drag&&pointers.size===0){
    const d=drag;drag=null;viewCv.style.cursor='';
    if(d.kind==='point'&&moved>=3){tip.hidden=true;return;}
    if(moved<6)handleClick(e,d);
  }
};
viewCv.addEventListener('pointerup',endPointer);
viewCv.addEventListener('pointercancel',endPointer);
viewCv.addEventListener('wheel',e=>{e.preventDefault();S.zoom=clamp(S.zoom*Math.exp(-e.deltaY*0.0012),0.3,6);syncOut();},{passive:false});
viewCv.addEventListener('pointerleave',()=>{tip.hidden=true;S.hover=null;});
viewCv.addEventListener('contextmenu',e=>{e.preventDefault();const[x,y]=localXY(e),p=pickAt(x,y);if(p)showCtx(p,e.clientX,e.clientY,locate(x,y));else{hideCtx();S.sel=null;updInspector();}});
function hoverAt(x,y){
  S.hover=null;
  const hp=S.tool!=='angle'&&ptHit(x,y);
  if(hp){viewCv.style.cursor='grab';const p=S._pos.get(hp.id);showTip(x,y,hp.name+' '+fmtC(rel(p)));return;}
  viewCv.style.cursor='';
  if(S.tool==='point'||S.tool==='plane'){
    const loc=locate(x,y);
    if(loc){S.hover={ghost:posOf({def:loc.def}),edge:loc.edge};const nm=S.tool==='plane'?(ptById(S.secIds[S.planeSlot])||{}).name||'новая':nextName();showTip(x,y,`${nm} → ${loc.label}`);}
    else tip.hidden=true;
    return;
  }
  const p=pickAt(x,y);
  if(p&&p.type==='vertex')showTip(x,y,vName(p.index)+' '+fmtC(rel(S.fig.verts[p.index])));
  else tip.hidden=true;
}
function handleClick(e,d){
  const[x,y]=localXY(e);
  if(d&&d.kind==='point'){S.activeId=d.pt.id;recompute();openTab('obj');const row=objList.querySelector(`[data-id="${d.pt.id}"]`);if(row)row.scrollIntoView({block:'nearest',behavior:'smooth'});return;}
  if(S.tool==='angle'){const p=pickAt(x,y);if(p)addAnglePick(p);return;}
  if(S.tool==='point'||S.tool==='plane'){
    const loc=locate(x,y);if(!loc)return;
    if(S.tool==='point'){addPoint(loc.def);afterAdd();toast('Точка '+ptById(S.activeId).name+': '+loc.label,1600);}
    else{setSlot(S.planeSlot,loc.def);S.planeSlot=(S.planeSlot+1)%3;updToolHint();}
    return;
  }
  const p=pickAt(x,y);S.sel=p;S.activeId=null;updInspector();recompute();
}

/* ---------- вид ---------- */
const VIEWS={iso:{yaw:0.62,pitch:-0.45},front:{yaw:0,pitch:-0.02},top:{yaw:0,pitch:-1.56}};
function setView(k){S.view={...VIEWS[k]};S.autoRot=false;syncChecks();S.panX=0;S.panY=0;}
$$('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#zoomIn').onclick=()=>{S.zoom=clamp(S.zoom*1.2,0.3,6);syncOut();};
$('#zoomOut').onclick=()=>{S.zoom=clamp(S.zoom/1.2,0.3,6);syncOut();};
$('#zDrag').onclick=()=>{S.zDrag=!S.zDrag;$('#zDrag').setAttribute('aria-pressed',String(S.zDrag));toast(S.zDrag?'Свободные точки тянутся по высоте (z)':'Свободные точки тянутся по горизонтали');};
$('#shot').onclick=()=>{
  const c=document.createElement('canvas');c.width=viewCv.width;c.height=viewCv.height;
  const x=c.getContext('2d');x.fillStyle=COL.paper;x.fillRect(0,0,c.width,c.height);x.drawImage(viewCv,0,0);
  const a=document.createElement('a');a.download=`yanpn-${S.fig.name.toLowerCase().replace(/\s+/g,'-')}.png`;a.href=c.toDataURL('image/png');a.click();toast('Картинка сохранена');
};
$('#stageFull').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen();}catch(err){stage.classList.toggle('pseudo-full');}};
$('#inspToggle').onclick=()=>$('#app').classList.toggle('insp-open');

/* ---------- вкладки ---------- */
function openTab(t){S.tab=t;$$('.tab').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));$$('.pane').forEach(p=>p.classList.toggle('on',p.dataset.pane===t));}
$$('.tab').forEach(b=>b.onclick=()=>openTab(b.dataset.tab));

/* ---------- задачи ---------- */
function buildTasks(){
  const figs=['все',...new Set(TASKS.map(t=>t.f))],nm=k=>k==='все'?'Все':FIGKEYS.find(f=>f[0]===k)[1];
  $('#taskFilter').innerHTML=figs.map((k,i)=>`<button data-f="${k}" class="${i===0?'on':''}">${nm(k)}</button>`).join('');
  const render=f=>{$('#taskList').innerHTML=TASKS.map((t,i)=>({t,i})).filter(({t})=>f==='все'||t.f===f).map(({t,i})=>`
    <li><span class="t-num">${String(i+1).padStart(2,'0')}</span>
      <div class="t-body"><div class="t-meta"><span>${nm(t.f)}</span><span class="t-tag">${t.tag}</span></div><h3>${t.title}</h3><p>${t.text}</p>
        <details class="t-ans"><summary>Ответ</summary><span>${t.ans}</span></details></div>
      <button class="btn btn-soft" data-i="${i}">Открыть</button></li>`).join('');};
  render('все');
  $('#taskFilter').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$$('#taskFilter button').forEach(x=>x.classList.toggle('on',x===b));render(b.dataset.f);});
  $('#taskList').addEventListener('click',e=>{
    const b=e.target.closest('button[data-i]');if(!b)return;
    loadTask(+b.dataset.i);openTab('obj');setStepsOn(true);
    $('#app').scrollIntoView({behavior:'smooth'});
    stage.classList.remove('flash');void stage.offsetWidth;stage.classList.add('flash');
  });
}

/* ---------- калькулятор, чек-лист ---------- */
function calc(){
  const a=+$('#pA').value,b=+$('#pB').value;
  if(!(a>0&&b>0&&b<a)){$('#pH').textContent=$('#pL').textContent=$('#pS').textContent='нужно a > b';return null;}
  const h=(a-b)/2,L=h*Math.SQRT2;
  $('#pH').textContent=fmt(h,1)+' мм';$('#pL').textContent=fmt(L,1)+' мм';$('#pS').textContent=fmt(a,0)+' мм ≈ '+fmt(a/25.4*Math.SQRT2,1)+'″ по диагонали';
  return{a,b,h,L};
}
['pA','pB'].forEach(id=>$('#'+id).addEventListener('input',calc));
$('#pSvg').onclick=()=>{
  const r=calc();if(!r)return;const{a,b,L}=r,pad=10,w=a*2+pad*3,hh=L*2+pad*3;
  const trap=(x,y)=>`<path d="M${x} ${y+L} L${x+a} ${y+L} L${x+(a+b)/2} ${y} L${x+(a-b)/2} ${y} Z" fill="none" stroke="#19191c" stroke-width="0.4"/>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${hh}mm" viewBox="0 0 ${w} ${hh}">${trap(pad,pad)}${trap(pad*2+a,pad)}${trap(pad,pad*2+L)}${trap(pad*2+a,pad*2+L)}<text x="${pad}" y="${hh-2}" font-size="4" font-family="sans-serif">ЯНПН · a=${a} мм, b=${b} мм, боковая сторона ${fmt(L,1)} мм, 45°</text></svg>`;
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),el=document.createElement('a');el.href=url;el.download=`pyramid-${a}x${b}.svg`;el.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('#pTry').onclick=()=>{Holo.setSettings({center:true,mode:4});Holo.open();};
(function(){const boxes=$$('#checklist input');let saved=[];try{saved=JSON.parse(localStorage.getItem('yanpn.check')||'[]');}catch(e){}
  const upd=()=>{$('#chkCount').textContent=boxes.filter(b=>b.checked).length+' / '+boxes.length;try{localStorage.setItem('yanpn.check',JSON.stringify(boxes.map(b=>b.checked)));}catch(e){}};
  boxes.forEach((b,i)=>{b.checked=!!saved[i];b.onchange=upd;});upd();})();
let toastT=0;
function toast(msg,ms=2200){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),ms);}

/* ================= общий экран ================= */
const SYNC={applying:false,last:0,timer:0};
function sceneState(){
  return{type:'scene',v:3,spec:S.spec,taskIndex:S.taskIndex,
    points:S.points.map(p=>({id:p.id,name:p.name,def:{...p.def},visible:p.visible})),secIds:S.secIds,nextId:S.nextId,
    yaw:S.yaw,pitch:S.pitch,zoom:S.zoom,autoRot:S.autoRot,
    showSec:S.showSec,showPlane:S.showPlane,showVtx:S.showVtx,showGrid:S.showGrid,showTrace:S.showTrace,showDrops:S.showDrops,originA:S.originA,
    stepsOn:S.stepsOn,step:S.step,bodyStyle:S.bodyStyle,faceStyle:S.faceStyle,extEdges:[...S.extEdges],extSection:S.extSection,holo:Holo.settings};
}
function syncOut(force){
  if(SYNC.applying||!Room.connected)return;
  const now=performance.now(),wait=50-(now-SYNC.last);clearTimeout(SYNC.timer);
  if(force||wait<=0){SYNC.last=now;Room.send(sceneState());}
  else SYNC.timer=setTimeout(()=>{SYNC.last=performance.now();Room.send(sceneState());},wait);
}
function applyScene(s){
  if(!s||s.type!=='scene'||s.v!==3)return;
  SYNC.applying=true;
  try{
    if(JSON.stringify(s.spec)!==JSON.stringify(S.spec))setFigure(s.spec,{keepView:true});
    const structural=JSON.stringify(s.points.map(p=>[p.id,p.name,p.def.type,p.def.a,p.def.b]))!==JSON.stringify(S.points.map(p=>[p.id,p.name,p.def.type,p.def.a,p.def.b]))||String(s.secIds)!==String(S.secIds);
    S.taskIndex=s.taskIndex;S.points=s.points.map(p=>({...p,def:{...p.def}}));S.secIds=s.secIds;S.nextId=s.nextId;
    if(!(S.autoRot&&s.autoRot)){S.yaw=s.yaw;S.pitch=s.pitch;}
    S.zoom=s.zoom;S.autoRot=s.autoRot;
    Object.assign(S,{showSec:s.showSec,showPlane:s.showPlane,showVtx:s.showVtx,showGrid:s.showGrid,showTrace:s.showTrace,showDrops:s.showDrops,originA:s.originA,bodyStyle:s.bodyStyle,faceStyle:s.faceStyle||{},extSection:s.extSection});
    S.extEdges=new Set(s.extEdges||[]);
    const stepChanged=s.step!==S.step||s.stepsOn!==S.stepsOn;S.stepsOn=s.stepsOn;S.step=s.step;if(stepChanged)S.stepProg=0;
    if(s.holo)Holo.setSettings(s.holo);
    updOrigin();syncChecks();if(structural)renderObjs();recompute();
  }finally{SYNC.applying=false;}
}
function roomLink(){const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('room',Room.code);return u.toString();}
function updRoomUi(){
  const live=Room.active;
  $('#roomIdle').hidden=live;$('#roomLive').hidden=!live;
  $('#roomCodeBig').textContent=Room.code||'······';
  $('#roomPill').hidden=!live;$('#roomPill').classList.toggle('ok',Room.connected||Room.role==='host');
  $('#roomPillText').textContent=Room.code?(Room.code+(Room.count?' · '+(Room.role==='host'?Room.count:'в сети'):'')):'Комната';
  const qr=$('#roomQr');qr.hidden=!(live&&Room.role==='host');
  if(live&&Room.role==='host'){try{QR.toCanvas(qr,roomLink(),{dark:'#19191c',light:'#fbfaf7'});}catch(err){qr.hidden=true;}}
}
Room.on('status',(t,k)=>{const el=$('#roomStatus');el.textContent=t;el.className='room-status '+k;if(k==='error'){toast(t,3200);if(!$('#joinSheet').hidden)$('#joinTitle').textContent='Не получилось';}});
Room.on('change',updRoomUi);
Room.on('peer-joined',c=>{Room.sendTo(c,sceneState());toast('Устройство подключилось');});
Room.on('joined',()=>{$('#joinTitle').textContent='Подключено';Room.send({type:'hello'});});
Room.on('data',(d,conn)=>{if(!d)return;if(d.type==='hello'&&Room.role==='host'){Room.sendTo(conn,sceneState());return;}if(d.type==='scene')applyScene(d);});
$('#roomCreate').onclick=()=>Room.create();
$('#roomJoin').onclick=()=>Room.join($('#roomCode').value);
$('#roomCode').addEventListener('input',e=>{e.target.value=Room.clean(e.target.value);});
$('#roomCode').addEventListener('keydown',e=>{if(e.key==='Enter')Room.join(e.target.value);});
$('#roomLeave').onclick=()=>Room.leave();
$('#roomPill').onclick=()=>{openTab('room');$('#app').scrollIntoView({behavior:'smooth'});};
$('#roomCopy').onclick=async()=>{const link=roomLink();try{await navigator.clipboard.writeText(link);toast('Ссылка скопирована');}catch(e){prompt('Ссылка на комнату:',link);}};
$('#roomHoloHere').onclick=()=>Holo.open();
if(location.protocol==='file:')$('#roomStatus').textContent='Сайт открыт как файл: комнаты и QR заработают, когда он будет опубликован (например, на GitHub Pages).';
(function(){
  const code=new URLSearchParams(location.search).get('room');if(!code)return;
  $('#joinCode').textContent=Room.clean(code);$('#joinSheet').hidden=false;openTab('room');
  const go=()=>Room.join(code);if(window.Peer)go();else addEventListener('load',go,{once:true});
  $('#joinHolo').onclick=()=>{$('#joinSheet').hidden=true;Holo.open();};
  $('#joinRemote').onclick=()=>{$('#joinSheet').hidden=true;openTab('obj');};
})();

/* ---------- клавиатура ---------- */
addEventListener('keydown',e=>{
  if(e.target.closest('input,select,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;
  const k=e.key.toLowerCase();
  if(e.key==='Escape'){if(Holo.isOpen){Holo.close();return;}hideCtx();S.sel=null;S.activeId=null;if(S.tool!=='move')setTool('move');recompute();return;}
  if(e.key==='ArrowLeft'){if(S.stepsOn){stopPlay();goStep(S.step-1);}else{S.view=null;S.yaw-=0.12;syncOut();}e.preventDefault();}
  else if(e.key==='ArrowRight'){if(S.stepsOn){stopPlay();goStep(S.step+1);}else{S.view=null;S.yaw+=0.12;syncOut();}e.preventDefault();}
  else if(e.key==='ArrowUp'){S.view=null;S.pitch=clamp(S.pitch-0.1,-1.56,1.56);syncOut();e.preventDefault();}
  else if(e.key==='ArrowDown'){S.view=null;S.pitch=clamp(S.pitch+0.1,-1.56,1.56);syncOut();e.preventDefault();}
  else if((e.key==='Delete'||e.key==='Backspace')&&S.activeId){removePoint(S.activeId);}
  else if(k==='+'||k==='='){S.zoom=clamp(S.zoom*1.15,0.3,6);syncOut();}
  else if(k==='-'||k==='_'){S.zoom=clamp(S.zoom/1.15,0.3,6);syncOut();}
  else if(k==='v'||k==='м')setTool('move');
  else if(k==='p'||k==='з')setTool('point');
  else if(k==='c'||k==='с')setTool('plane');
  else if(k==='a'||k==='ф')setTool('angle');
  else if(k==='r'||k==='к'){setView('iso');S.zoom=1;syncOut();}
  else if(k==='i'||k==='ш')setView('iso');
  else if(k==='f'||k==='а')setView('front');
  else if(k==='t'||k==='е')setView('top');
  else if(k==='h'||k==='р')Holo.isOpen?Holo.close():Holo.open();
  else if(k==='s'||k==='ы')setStepsOn(!S.stepsOn);
  else if(k===' '){if(S.stepsOn)togglePlay();else{S.autoRot=!S.autoRot;syncChecks();syncOut();}e.preventDefault();}
  else if(/^[1-8]$/.test(k))loadFigureKey(FIGKEYS[+k-1][0]);
});

/* ---------- отрисовка ---------- */
function resizeCanvas(){const r=stage.getBoundingClientRect();viewCv.width=Math.round(r.width*dpr);viewCv.height=Math.round(r.height*dpr);viewCv.style.width=r.width+'px';viewCv.style.height=r.height+'px';}
new ResizeObserver(resizeCanvas).observe(stage);
const angDiff=(a,b)=>{let d=a-b;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return d;};
let last=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000);last=now;
  if(S.autoRot&&!drag)S.yaw+=dt*0.35;
  if(S.view){const k=1-Math.pow(0.0005,dt);S.yaw+=angDiff(S.view.yaw,S.yaw)*k;S.pitch+=(S.view.pitch-S.pitch)*k;
    if(Math.abs(angDiff(S.view.yaw,S.yaw))<0.002&&Math.abs(S.view.pitch-S.pitch)<0.002){S.yaw=S.view.yaw;S.pitch=S.view.pitch;S.view=null;}syncOut();}
  if(S.stepsOn&&S.stepProg<1)S.stepProg=Math.min(1,S.stepProg+dt*1.5);
  if(!Holo.isOpen){
    const W=viewCv.width/dpr,H=viewCv.height/dpr;
    if(W>0&&H>0){
      vctx.setTransform(dpr,0,0,dpr,0,0);
      const pb=S.stepsOn?Math.min(S.padB,H*0.45):0,avail=H-pb;
      renderScene(vctx,W,H,{fig:S.fig,st:S,yaw:S.yaw,pitch:S.pitch,cx:W/2+S.panX,cy:avail/2+S.panY+6,scale:Math.min(W,avail)*0.3/S.fig.R*S.zoom,theme:'light',picksOut:S.picks});
    }
  }
  Holo.draw(dt);
  requestAnimationFrame(frame);
}

/* ---------- старт ---------- */
paintIcons();
buildFigGrid();
buildTasks();
Holo.init(()=>S,()=>syncOut());
$('#openHolo').onclick=()=>Holo.open();
loadTask(0,{silent:true});
setTool('move');openTab('obj');syncChecks();calc();updRoomUi();
resizeCanvas();
requestAnimationFrame(frame);
