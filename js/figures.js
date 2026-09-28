'use strict';
/* ===== тела: встроенные, параметрические и «по точкам» (выпуклая оболочка) ===== */
const LETTERS='ABCDEFGH';

function faceNormal(v,ids){
  let x=0,y=0,z=0;
  for(let i=0;i<ids.length;i++){const a=v[ids[i]],b=v[ids[(i+1)%ids.length]];
    x+=(a.y-b.y)*(a.z+b.z);y+=(a.z-b.z)*(a.x+b.x);z+=(a.x-b.x)*(a.y+b.y);}
  return nrm(V(x,y,z));
}
function finalize(f){
  if(f.kind==='poly'){
    const xs=f.verts.map(p=>p.x),ys=f.verts.map(p=>p.y),zs=f.verts.map(p=>p.z);
    f.center=V((Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2,(Math.min(...zs)+Math.max(...zs))/2);
    f.R=Math.max(...f.verts.map(p=>len(sub(p,f.center))));
    const c=polyCentroid(f.verts);
    f.fn=f.faces.map(ids=>{let n=faceNormal(f.verts,ids);if(dot(n,sub(polyCentroid(ids.map(i=>f.verts[i])),c))<0)n=mul(n,-1);return n;});
    f.fd=f.faces.map((ids,i)=>-dot(f.fn[i],f.verts[ids[0]]));
    f.ef={};
    f.faces.forEach((ids,fi)=>{for(let i=0;i<ids.length;i++){const a=ids[i],b=ids[(i+1)%ids.length],k=Math.min(a,b)+'_'+Math.max(a,b);(f.ef[k]=f.ef[k]||[]).push(fi);}});
    f.baseZ=Math.min(...zs);f.topZ=Math.max(...zs);
    f.labIdx={};
    if(f.labeled)f.labels.forEach((l,i)=>f.labIdx[l]=i);
  }else{f.center=V(0,0,0);f.R=f.r;f.baseZ=-f.r;f.topZ=f.r;f.labIdx={};}
  return f;
}
function box(hx,hy,hz,name){
  const v=[V(-hx,-hy,-hz),V(hx,-hy,-hz),V(hx,hy,-hz),V(-hx,hy,-hz),V(-hx,-hy,hz),V(hx,-hy,hz),V(hx,hy,hz),V(-hx,hy,hz)];
  return finalize({kind:'poly',name,verts:v,family:'prism',proj:{type:'par'},
    faces:[[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]],
    edges:[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],
    labels:['A','B','C','D','A₁','B₁','C₁','D₁'],labeled:true});
}
function revolve(kind){
  const n=48,r=1.5,vs=[],edges=[],faces=[];
  for(let i=0;i<n;i++)vs.push(V(r*Math.cos(i*TAU/n),r*Math.sin(i*TAU/n),-1.5));
  if(kind==='cyl'){
    for(let i=0;i<n;i++)vs.push(V(r*Math.cos(i*TAU/n),r*Math.sin(i*TAU/n),1.5));
    for(let i=0;i<n;i++){const j=(i+1)%n;edges.push([i,j],[n+i,n+j],[i,n+i]);faces.push([i,j,n+j,n+i]);}
    faces.push([...Array(n).keys()],Array.from({length:n},(_,i)=>n+i));
    const f=finalize({kind:'poly',name:'Цилиндр',verts:vs,faces,edges,labels:null,labeled:false,smooth:true,family:'cyl',proj:{type:'par'}});
    f.dims={r,h:3};return f;
  }
  vs.push(V(0,0,2));
  for(let i=0;i<n;i++){const j=(i+1)%n;edges.push([i,j],[i,n]);faces.push([i,j,n]);}
  faces.push([...Array(n).keys()]);
  const f=finalize({kind:'poly',name:'Конус',verts:vs,faces,edges,labels:null,labeled:false,smooth:true,family:'cone',proj:{type:'central',apex:vs[n]}});
  f.dims={r,h:3.5};return f;
}
function buildCustom(p){
  const n=clamp(Math.round(p.n),3,8),a=+p.a,h=+p.h,type=p.type;
  const R1=a/(2*Math.sin(Math.PI/n)),off=-Math.PI/2-Math.PI/n;
  const ring=(R,z)=>Array.from({length:n},(_,i)=>V(R*Math.cos(off+i*TAU/n),R*Math.sin(off+i*TAU/n),z));
  const z0=-h/2,z1=h/2,bot=[...Array(n).keys()],L=[...LETTERS.slice(0,n)];
  let verts,faces,edges,labels,proj;
  if(type==='pyramid'){
    verts=[...ring(R1,z0),V(0,0,z1)];
    faces=[bot.slice().reverse(),...bot.map(i=>[i,(i+1)%n,n])];
    edges=[...bot.map(i=>[i,(i+1)%n]),...bot.map(i=>[i,n])];
    labels=[...L,'S'];proj={type:'central',apex:verts[n]};
  }else{
    const b=type==='frustum'?Math.min(+p.b,a-0.25):a,R2=b/(2*Math.sin(Math.PI/n));
    verts=[...ring(R1,z0),...ring(R2,z1)];
    faces=[bot.slice().reverse(),bot.map(i=>n+i),...bot.map(i=>[i,(i+1)%n,n+(i+1)%n,n+i])];
    edges=[...bot.map(i=>[i,(i+1)%n]),...bot.map(i=>[n+i,n+(i+1)%n]),...bot.map(i=>[i,n+i])];
    labels=[...L,...L.map(l=>l+'₁')];
    proj=type==='frustum'?{type:'central',apex:V(0,0,z0+h*R1/(R1-R2))}:{type:'par'};
  }
  const kind={prism:'призма',pyramid:'пирамида',frustum:'усечённая пирамида'}[type];
  const ng={3:'Треугольная',4:'Четырёхугольная',5:'Пятиугольная',6:'Шестиугольная',7:'Семиугольная',8:'Восьмиугольная'}[n];
  return finalize({kind:'poly',name:ng+' '+kind,verts,faces,edges,labels,labeled:true,proj,family:type,custom:true});
}

/* ---------- выпуклая оболочка по точкам ---------- */
function hull3(P){
  const n=P.length,planes=[],E=1e-7;
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)for(let k=j+1;k<n;k++){
    const c=cross(sub(P[j],P[i]),sub(P[k],P[i]));if(len(c)<1e-9)continue;
    let nn=nrm(c),d=-dot(nn,P[i]),pos=0,neg=0;
    for(let m=0;m<n;m++){const s=dot(nn,P[m])+d;if(s>E)pos++;else if(s<-E)neg++;if(pos&&neg)break;}
    if(pos&&neg)continue;
    if(pos){nn=mul(nn,-1);d=-d;}
    if(!planes.some(q=>dot(q.n,nn)>1-1e-9&&Math.abs(q.d-d)<1e-6))planes.push({n:nn,d});
  }
  if(planes.length<4)return null;
  const faces=planes.map(({n:nn,d})=>{
    const ids=[];for(let m=0;m<n;m++)if(Math.abs(dot(nn,P[m])+d)<1e-6)ids.push(m);
    const up=Math.abs(nn.z)<0.9?V(0,0,1):V(1,0,0),u=nrm(cross(up,nn)),w=cross(nn,u);
    const pts=ids.map(m=>({m,x:dot(P[m],u),y:dot(P[m],w)})).sort((a,b)=>a.x-b.x||a.y-b.y);
    const cr=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
    const lo=[],hi=[];
    for(const p of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=1e-9)lo.pop();lo.push(p);}
    for(const p of pts.slice().reverse()){while(hi.length>=2&&cr(hi[hi.length-2],hi[hi.length-1],p)<=1e-9)hi.pop();hi.push(p);}
    return lo.slice(0,-1).concat(hi.slice(0,-1)).map(p=>p.m);
  }).filter(f=>f.length>=3);
  const used=[...new Set(faces.flat())].sort((a,b)=>a-b),map={};used.forEach((m,i)=>map[m]=i);
  const F=faces.map(f=>f.map(m=>map[m])),es=new Set(),edges=[];
  F.forEach(f=>f.forEach((a,i)=>{const b=f[(i+1)%f.length],k=Math.min(a,b)+'_'+Math.max(a,b);if(!es.has(k)){es.add(k);edges.push([a,b]);}}));
  return{used,faces:F,edges};
}
function buildHull(list){
  const pts=list.map(q=>V(q.x,q.y,q.z));
  const h=hull3(pts);
  if(!h)return null;
  const verts=h.used.map(i=>pts[i]),labels=h.used.map(i=>list[i].name);
  const f=finalize({kind:'poly',name:list.name||'Тело по точкам',verts,faces:h.faces,edges:h.edges,labels,labeled:true,family:'hull',proj:{type:'ortho'}});
  f.dropped=list.filter((q,i)=>!h.used.includes(i)).map(q=>q.name);
  return f;
}
const HULL_PRESETS=[
  {name:'Октаэдр',text:'A = (0; 0; -2)\nB = (1,5; 0; 0)\nC = (0; 1,5; 0)\nD = (-1,5; 0; 0)\nE = (0; -1,5; 0)\nF = (0; 0; 2)'},
  {name:'Наклонная призма',text:'A = (-2; -1; -1,5)\nB = (1; -1; -1,5)\nC = (-1; 1,5; -1,5)\nA1 = (-1; -1; 1,5)\nB1 = (2; -1; 1,5)\nC1 = (0; 1,5; 1,5)'},
  {name:'Усечённая пирамида',text:'A = (-2; -2; -1,5)\nB = (2; -2; -1,5)\nC = (2; 2; -1,5)\nD = (-2; 2; -1,5)\nA1 = (-1; -1; 1,5)\nB1 = (1; -1; 1,5)\nC1 = (1; 1; 1,5)\nD1 = (-1; 1; 1,5)'},
  {name:'Клин',text:'A = (-2; -1,5; -1,5)\nB = (2; -1,5; -1,5)\nC = (2; 1,5; -1,5)\nD = (-2; 1,5; -1,5)\nE = (-1; 0; 1,5)\nF = (1; 0; 1,5)'},
  {name:'Наклонная пирамида',text:'A = (-2; -2; -1,5)\nB = (2; -2; -1,5)\nC = (2; 2; -1,5)\nD = (-2; 2; -1,5)\nS = (-2; -2; 2,5)'},
];
/* «A1 = (1; 0; 2,5)» по строкам */
function parseVertexList(text){
  const out=[],errs=[];let auto=0;
  text.split(/\n+/).map(s=>s.trim()).filter(Boolean).forEach((line,li)=>{
    const m=line.match(/^(?:([A-Za-zА-Яа-я][A-Za-zА-Яа-я]?[0-9₀-₉']*)\s*[=:]?\s*)?\(?\s*([^()]+?)\s*\)?$/);
    if(!m){errs.push(li+1);return;}
    const parts=m[2].includes(';')?m[2].split(';'):m[2].split(/[,\s]+/);
    const c=parts.map(parseNum);
    if(c.length!==3||c.some(Number.isNaN)){errs.push(li+1);return;}
    const name=m[1]?toSub(m[1].toUpperCase().replace(/'/g,'′')):'V'+subNum(++auto);
    out.push({name,x:c[0],y:c[1],z:c[2]});
  });
  return{list:out,errs};
}

function buildFig(spec){
  const key=typeof spec==='string'?spec:spec.key;
  let f;
  switch(key){
    case 'cube':f=box(1,1,1,'Куб');break;
    case 'par':f=box(2,1.5,1.5,'Параллелепипед');break;
    case 'pri':{
      const v=[V(-2,-1,-1.5),V(2,-1,-1.5),V(0,2,-1.5),V(-2,-1,1.5),V(2,-1,1.5),V(0,2,1.5)];
      f=finalize({kind:'poly',name:'Треугольная призма',verts:v,family:'prism',proj:{type:'par'},
        faces:[[0,1,2],[3,4,5],[0,1,4,3],[1,2,5,4],[2,0,3,5]],
        edges:[[0,1],[1,2],[2,0],[3,4],[4,5],[5,3],[0,3],[1,4],[2,5]],
        labels:['A','B','C','A₁','B₁','C₁'],labeled:true});break;}
    case 'pyr':{
      const v=[V(-2,-2,-1.5),V(2,-2,-1.5),V(2,2,-1.5),V(-2,2,-1.5),V(0,0,2.5)];
      f=finalize({kind:'poly',name:'Пирамида',verts:v,family:'pyramid',proj:{type:'central',apex:v[4]},
        faces:[[0,1,2,3],[0,1,4],[1,2,4],[2,3,4],[3,0,4]],
        edges:[[0,1],[1,2],[2,3],[3,0],[0,4],[1,4],[2,4],[3,4]],
        labels:['A','B','C','D','S'],labeled:true});break;}
    case 'tet':{
      const v=[V(0,0,2),V(-1.5,-1.5,-1),V(1.5,-1.5,-1),V(0,1.5,-1)];
      f=finalize({kind:'poly',name:'Тетраэдр',verts:v,family:'pyramid',proj:{type:'central',apex:v[0]},
        faces:[[1,2,3],[0,1,2],[0,2,3],[0,3,1]],
        edges:[[1,2],[2,3],[3,1],[0,1],[0,2],[0,3]],
        labels:['S','A','B','C'],labeled:true});break;}
    case 'cyl':f=revolve('cyl');break;
    case 'cone':f=revolve('cone');break;
    case 'sph':f=finalize({kind:'sph',name:'Сфера',r:1.5,labeled:false,labels:null,dims:{r:1.5},family:'sph'});break;
    case 'custom':f=buildCustom(spec.params);break;
    case 'hull':f=buildHull(Object.assign(spec.verts.slice(),{name:spec.name}))||box(1,1,1,'Куб');break;
    default:f=box(1,1,1,'Куб');
  }
  f.key=key;
  return f;
}
const FIGKEYS=[['cube','Куб'],['par','Параллелепипед'],['pri','Призма'],['pyr','Пирамида'],
  ['tet','Тетраэдр'],['cyl','Цилиндр'],['cone','Конус'],['sph','Сфера']];

function figVolume(f){
  if(f.key==='cyl')return Math.PI*f.dims.r**2*f.dims.h;
  if(f.key==='cone')return Math.PI*f.dims.r**2*f.dims.h/3;
  if(f.key==='sph')return 4/3*Math.PI*f.dims.r**3;
  let v=0;f.faces.forEach((ids,i)=>{const pts=ids.map(j=>f.verts[j]);v+=dot(f.fn[i],polyCentroid(pts))*polyArea3D(pts);});
  return Math.abs(v)/3;
}
function figSurface(f){
  if(f.key==='cyl'){const{r,h}=f.dims;return 2*Math.PI*r*(r+h);}
  if(f.key==='cone'){const{r,h}=f.dims;return Math.PI*r*(r+Math.hypot(r,h));}
  if(f.key==='sph')return 4*Math.PI*f.dims.r**2;
  return f.faces.reduce((s,ids)=>s+polyArea3D(ids.map(j=>f.verts[j])),0);
}

/* ===== библиотека задач =====
   ['A','B',t] — точка на прямой AB (t=0 в A, t=1 в B; t<0 или t>1 — на продолжении),
   {xyz:[x,y,z]} — точка по координатам, {fn,t,hint} — точка на поверхности тела вращения. */
const sphP=(thF,ph)=>t=>V(1.5*Math.sin(ph)*Math.cos(thF(t)),1.5*Math.sin(ph)*Math.sin(thF(t)),1.5*Math.cos(ph));
const th=t=>TAU*t;
const TASKS=[
  {f:'cube',tag:'ЕГЭ',title:'Через середины трёх рёбер',text:'Куб ABCDA₁B₁C₁D₁. Постройте сечение через середины рёбер AA₁, BC и C₁D₁. Какая фигура получится?',
    ans:'правильный шестиугольник',pts:[['A','A₁',.5],['B','C',.5],['C₁','D₁',.5]]},
  {f:'cube',tag:'ЕГЭ',title:'Вершина и две середины',text:'Куб ABCDA₁B₁C₁D₁. Постройте сечение через вершину B₁ и середины рёбер AD и CD.',
    ans:'пятиугольник',pts:[['B₁','B',0],['A','D',.5],['D','C',.5]]},
  {f:'cube',tag:'олимп.',title:'Точка на продолжении ребра',text:'Куб ABCDA₁B₁C₁D₁. Точка K лежит на продолжении ребра AB за точку B, BK = ½AB. Постройте сечение через K и середины рёбер A₁D₁ и CC₁.',
    ans:'пятиугольник',pts:[['A','B',1.5],['A₁','D₁',.5],['C','C₁',.5]],names:['K','M','N']},
  {f:'cube',tag:'база',title:'Диагональное сечение',text:'Куб ABCDA₁B₁C₁D₁. Постройте сечение через вершины A, C и B₁. Найдите его площадь при ребре 2.',
    ans:'правильный треугольник, S = 2√3',pts:[['A','B',0],['C','D',0],['B₁','C₁',0]]},
  {f:'par',tag:'база',title:'Параллелепипед',text:'Постройте сечение параллелепипеда через вершину A и середины рёбер B₁C₁ и C₁D₁.',
    ans:'пятиугольник',pts:[['A','B',0],['B₁','C₁',.5],['D₁','C₁',.5]]},
  {f:'pyr',tag:'ЕГЭ',title:'Сечение пирамиды',text:'Правильная пирамида SABCD. Сечение проходит через середины рёбер SA, SB и вершину D. Определите вид сечения.',
    ans:'равнобедренная трапеция',pts:[['S','A',.5],['S','B',.5],['D','C',0]]},
  {f:'pyr',tag:'олимп.',title:'След выходит за основание',text:'Пирамида SABCD. Точка K делит SA в отношении 1:2 от S, L и M — середины BC и CD. Постройте сечение KLM методом следов.',
    ans:'пятиугольник',pts:[['S','A',1/3],['B','C',.5],['C','D',.5]],names:['K','L','M']},
  {f:'pyr',tag:'олимп.',title:'Точки на боковых рёбрах',text:'Пирамида SABCD. На рёбрах SA, SB, SC взяты точки K, L, M: SK:KA = 1:1, SL:LB = 1:3, SM:MC = 2:1. Постройте сечение.',
    ans:'четырёхугольник',pts:[['S','A',.5],['S','B',.25],['S','C',2/3]],names:['K','L','M']},
  {f:'tet',tag:'база',title:'Параллельно основанию',text:'Тетраэдр SABC. Сечение через середины рёбер SA, SB и SC. Докажите, что оно параллельно плоскости ABC.',
    ans:'треугольник, подобный ABC с k = 1/2',pts:[['S','A',.5],['S','B',.5],['S','C',.5]]},
  {f:'tet',tag:'ЕГЭ',title:'Тетраэдр и след',text:'Тетраэдр SABC. Постройте сечение через середину SA, точку K на SB (SK:KB = 1:3) и середину BC.',
    ans:'четырёхугольник',pts:[['S','A',.5],['S','B',.25],['B','C',.5]]},
  {f:'pri',tag:'база',title:'Сечение призмы',text:'Треугольная призма ABCA₁B₁C₁. Постройте сечение через вершину B и середины рёбер AA₁ и CC₁.',
    ans:'треугольник',pts:[['B','C',0],['A','A₁',.5],['C','C₁',.5]]},
  {f:'cyl',tag:'база',title:'Осевое сечение цилиндра',text:'Плоскость проходит через ось цилиндра. В сечении прямоугольник. Двигайте точки и следите за формой.',
    ans:'прямоугольник',pts:[{fn:t=>V(1.5*Math.cos(th(t)),1.5*Math.sin(th(t)),1.5),t:.15,hint:'верхняя окружность'},
      {fn:t=>V(1.5*Math.cos(th(t)+Math.PI),1.5*Math.sin(th(t)+Math.PI),-1.5),t:.15,hint:'нижняя окружность'},
      {fn:t=>V(1.5*Math.cos(th(t)),1.5*Math.sin(th(t)),-1.5),t:.15,hint:'нижняя окружность'}]},
  {f:'cone',tag:'база',title:'Наклонное сечение конуса',text:'Плоскость пересекает все образующие конуса. Убедитесь, что в сечении эллипс.',
    ans:'эллипс',pts:[{fn:t=>lerp3(V(0,0,2),V(1.5*Math.cos(th(t)),1.5*Math.sin(th(t)),-1.5),.8),t:.25,hint:'образующая'},
      {fn:t=>lerp3(V(0,0,2),V(1.5*Math.cos(th(t)+2.6),1.5*Math.sin(th(t)+2.6),-1.5),.55),t:.25,hint:'образующая'},
      {fn:t=>lerp3(V(0,0,2),V(1.5*Math.cos(4.4),1.5*Math.sin(4.4),-1.5),.2+.7*t),t:.5,hint:'точка на образующей'}]},
  {f:'sph',tag:'база',title:'Сечение сферы',text:'Сфера радиуса 1,5. Плоскость не проходит через центр. Докажите, что сечение — окружность, и найдите её радиус.',
    ans:'окружность, r = √(R² − d²)',pts:[{fn:sphP(th,0.9),t:.1,hint:'точка на сфере'},
      {fn:sphP(t=>th(t)+2.1,1.55),t:.1,hint:'точка на сфере'},
      {fn:sphP(t=>th(t)+4.3,2.1),t:.1,hint:'точка на сфере'}]},
];
if(typeof module!=='undefined')module.exports={buildFig,TASKS};
