'use strict';
/* ===== сечения, классификация и построение методом следов ===== */
function polyName(k){return{3:'треугольник',4:'четырёхугольник',5:'пятиугольник',6:'шестиугольник',7:'семиугольник',8:'восьмиугольник'}[k]||k+'-угольник';}
function planeFrom3(p){
  if(p.length<3||p.some(q=>!q))return null;
  const n0=cross(sub(p[1],p[0]),sub(p[2],p[0]));
  if(len(n0)<1e-6)return null;
  const n=nrm(n0);return{n,d:-dot(n,p[0])};
}
function orderPoly(poly,n){
  const c=polyCentroid(poly),up=Math.abs(n.z)<0.9?V(0,0,1):V(1,0,0);
  const u=nrm(cross(up,n)),v=cross(n,u),a=p=>Math.atan2(dot(sub(p,c),v),dot(sub(p,c),u));
  return poly.slice().sort((p,q)=>a(p)-a(q));
}
function secMesh(fig,plane){
  const{n,d}=plane,raw=[];
  for(const[a,b]of fig.edges){
    const A=fig.verts[a],B=fig.verts[b],da=dot(n,A)+d,db=dot(n,B)+d,za=Math.abs(da)<1e-7,zb=Math.abs(db)<1e-7;
    if(za)raw.push(A);if(zb)raw.push(B);
    if(!za&&!zb&&da*db<0)raw.push(lerp3(A,B,da/(da-db)));
  }
  const poly=[];for(const p of raw)if(!poly.some(q=>dist2(q,p)<1e-8))poly.push(p);
  return{poly:poly.length>=3?orderPoly(poly,n):[],raw:poly};
}
function secSphere(fig,plane){
  const{n,d}=plane,R=fig.r;
  if(Math.abs(d)>=R-1e-6)return{poly:[],raw:[]};
  const c=mul(n,-d),rr=Math.sqrt(R*R-d*d),up=Math.abs(n.z)<0.9?V(0,0,1):V(1,0,0);
  const u=nrm(cross(up,n)),v=cross(n,u),poly=[];
  for(let i=0;i<72;i++){const a=i/72*TAU;poly.push(add(c,add(mul(u,rr*Math.cos(a)),mul(v,rr*Math.sin(a)))));}
  return{poly,raw:[],center:c,radius:rr};
}
function quadName(p){
  const s=[0,1,2,3].map(i=>sub(p[(i+1)%4],p[i])),L=s.map(len),p1=isPar(s[0],s[2]),p2=isPar(s[1],s[3]);
  if(p1&&p2){const right=Math.abs(dot(nrm(s[0]),nrm(s[1])))<1e-4,eq=Math.abs(L[0]-L[1])<1e-4;
    return right?(eq?'квадрат':'прямоугольник'):(eq?'ромб':'параллелограмм');}
  if(p1||p2){const[a,b]=p1?[1,3]:[0,2];
    const right=[0,1,2,3].some(i=>Math.abs(dot(nrm(s[i]),nrm(s[(i+1)%4])))<1e-4);
    return Math.abs(L[a]-L[b])<1e-4?'равнобедренная трапеция':right?'прямоугольная трапеция':'трапеция';}
  return 'четырёхугольник';
}
function triName(p){
  const L=[0,1,2].map(i=>len(sub(p[(i+1)%3],p[i]))).sort((a,b)=>a-b);
  const iso=Math.abs(L[0]-L[1])<1e-4||Math.abs(L[1]-L[2])<1e-4,right=Math.abs(L[0]**2+L[1]**2-L[2]**2)<1e-3;
  if(Math.abs(L[0]-L[2])<1e-4)return 'правильный треугольник';
  if(right)return iso?'прямоугольный равнобедренный треугольник':'прямоугольный треугольник';
  return iso?'равнобедренный треугольник':'треугольник';
}
function secName(fig,poly){
  const k=poly.length;
  if(k<3)return 'нет';
  if(fig.kind==='sph')return 'окружность';
  if(fig.smooth&&k>6){
    const zs=poly.map(p=>p.z);
    if(Math.max(...zs)-Math.min(...zs)<1e-6)return 'круг';
    const touch=poly.some(p=>Math.abs(p.z-fig.baseZ)<1e-6||(fig.family==='cyl'&&Math.abs(p.z-fig.topZ)<1e-6));
    return touch?'часть эллипса':'эллипс';
  }
  if(k===3)return triName(poly);
  if(k===4)return quadName(poly);
  if(k===6){const L=poly.map((p,i)=>len(sub(poly[(i+1)%6],p)));if(Math.max(...L)-Math.min(...L)<1e-4)return 'правильный шестиугольник';}
  return polyName(k);
}
function computeSection(fig,plane){
  if(!plane)return{poly:[],raw:[],name:'нет'};
  const s=fig.kind==='sph'?secSphere(fig,plane):secMesh(fig,plane);
  s.name=secName(fig,s.poly);return s;
}
/* подписи вершин сечения: имена пользовательских точек, вершины тела, иначе свободные буквы */
function labelSection(fig,poly,userPts){
  if(fig.kind==='sph'||poly.length>10)return poly.map(()=>'');
  const taken=new Set([...(fig.labels||[]),...userPts.map(u=>u.name),'S','T','X','Y','O']);
  const pool=['K','L','M','N','E','F','G','H','U','W','Z','I','J'].filter(l=>!taken.has(l));
  let pi=0;
  return poly.map(p=>{
    const u=userPts.find(q=>dist2(q.p,p)<1e-8);if(u)return u.name;
    if(fig.labeled){const vi=fig.verts.findIndex(v=>dist2(v,p)<1e-8);if(vi>=0)return fig.labels[vi];}
    return pool[pi++]||'';
  });
}
function faceLabel(fig,fi){
  if(!fig.labeled)return fig.faces[fi].length>4?'основания':'боковой грани';
  let ids=fig.faces[fi].slice();const m=ids.indexOf(Math.min(...ids));
  ids=ids.slice(m).concat(ids.slice(0,m));
  if(ids.length>2&&ids[ids.length-1]<ids[1])ids=[ids[0],...ids.slice(1).reverse()];
  return ids.map(i=>fig.labels[i]).join('');
}
const vlab=(fig,i)=>fig.labeled?fig.labels[i]:'';

/* ================= метод следов =================
   Шаг: {title,text,why,items,known}. Элементы текущего шага рисуются акцентом, прошлых — приглушённо.
   Порядок как в школьном решении:
   1) соединяем точки, которые уже лежат в одной грани;
   2) строим след ℓ секущей плоскости на плоскости основания;
   3) для каждой следующей грани: продлеваем её ребро основания до ℓ → точка T, соединяем T с известной точкой грани;
      для граней, параллельных основанию (или с ребром ∥ ℓ), проводим прямую ∥ ℓ. */
function buildSteps(fig,plane,P,names,sec,secLab){
  const steps=[];
  steps.push({title:'Секущая плоскость',
    text:`Даны точки ${names.join(', ')}. Через них проводим секущую плоскость α. Дальше ищем, по каким отрезкам α пересекает грани тела.`,
    why:'Через три точки, не лежащие на одной прямой, проходит плоскость, и притом только одна.',
    items:P.map((p,i)=>({k:'pt',p,label:names[i],role:'main'})),known:[...names]});
  if(!plane){steps[0].text='Точки лежат на одной прямой (или совпадают): плоскость через них не определена. Передвинь одну из точек.';steps[0].why='';return steps;}

  if(fig.kind==='sph'){
    const O=V(0,0,0),d=Math.abs(plane.d),C=mul(plane.n,-plane.d);
    steps.push({title:'Центр окружности',text:`Опускаем перпендикуляр из центра сферы O на плоскость α. Его основание C — центр окружности сечения, OC = d = ${fmt(d)}.`,
      why:'Все точки сечения равноудалены от C: это следует из теоремы Пифагора для треугольников OCM.',
      items:[{k:'pt',p:O,label:'O',role:'aux'},{k:'seg',a:O,b:C,style:'aux'},{k:'pt',p:C,label:'C',role:'aux'}]});
    if(sec.poly.length){
      const r=sec.radius;
      steps.push({title:'Радиус',text:`Для любой точки M сечения: OM = R, OC ⟂ CM, значит r = CM = √(R² − d²) = √(${fmt(fig.r)}² − ${fmt(d)}²) = ${fmt(r)}.`,
        why:'Теорема Пифагора в треугольнике OCM.',items:[{k:'seg',a:O,b:sec.poly[0],style:'aux'},{k:'seg',a:C,b:sec.poly[0],style:'side'},{k:'pt',p:sec.poly[0],label:'M',role:'new'}]});
      steps.push({title:'Окружность',text:`Сечение сферы плоскостью — окружность с центром C и радиусом ${fmt(r)}. Длина ${fmt(TAU*r)}, площадь круга ${fmt(Math.PI*r*r)}.`,why:'',items:[{k:'poly',pts:sec.poly}]});
    }else steps.push({title:'Нет пересечения',text:'d ≥ R: плоскость не пересекает сферу.',why:'',items:[]});
    return steps;
  }
  const nP=sec.poly.length;
  if(nP<3){steps.push({title:'Нет сечения',text:'Плоскость α не пересекает тело. Передвинь точки.',why:'',items:[]});return steps;}

  const coFace=fig.faces.findIndex((_,i)=>{const c=dot(fig.fn[i],plane.n);return Math.abs(Math.abs(c)-1)<1e-9&&Math.abs(fig.fd[i]-Math.sign(c)*plane.d)<1e-6;});
  if(coFace>=0){
    const fl=faceLabel(fig,coFace);
    steps.push({title:'α — плоскость грани',text:`Все три точки лежат в плоскости грани ${fl}. Значит, α совпадает с этой плоскостью, и сечение — сама грань ${fl} (${sec.name}).`,
      why:'Через три точки, не лежащие на одной прямой, проходит только одна плоскость.',items:[{k:'face',fi:coFace},{k:'poly',pts:sec.poly,labels:secLab}],known:[...names]});
    return steps;
  }
  const zb=fig.baseZ,EPS=1e-6;
  const onBase=p=>Math.abs(p.z-zb)<EPS;
  const inFace=(p,fi)=>Math.abs(dot(fig.fn[fi],p)+fig.fd[fi])<1e-6;
  const baseFi=fig.faces.findIndex((ids,i)=>fig.fn[i].z<-0.999&&Math.abs(fig.verts[ids[0]].z-zb)<EPS);
  const baseName=baseFi>=0?faceLabel(fig,baseFi):'';
  const bw=baseName?' '+baseName:'';
  const W={acc:'плоскость основания'+bw,loc:'плоскости основания'+bw};
  const K=[];
  const known=p=>K.find(k=>dist2(k.p,p)<1e-9);
  const addK=(p,label)=>{if(!known(p))K.push({p,label});};
  P.forEach((p,i)=>addK(p,names[i]));
  const snap=()=>K.map(k=>k.label).filter(Boolean);
  const L=i=>secLab[i]||'';
  const sides=[];
  for(let i=0;i<nP;i++){
    const A=sec.poly[i],B=sec.poly[(i+1)%nP];
    const faces=fig.faces.map((_,fi)=>fi).filter(fi=>inFace(A,fi)&&inFace(B,fi));
    sides.push({A,B,la:L(i),lb:L((i+1)%nP),faces,done:false});
  }
  const sideName=s=>(s.la&&s.lb)?s.la+s.lb:'сторона';
  const newPts=s=>[[s.A,s.la],[s.B,s.lb]].filter(([p])=>!known(p));
  const extent=(pts,dir,pad=0.45)=>{const o=pts[0],ts=pts.map(p=>dot(sub(p,o),dir));return[add(o,mul(dir,Math.min(...ts)-pad)),add(o,mul(dir,Math.max(...ts)+pad))];};
  const finishSide=(s,items,text,why,title)=>{
    const np=newPts(s);
    np.forEach(([p,l])=>items.push({k:'pt',p,label:l,role:'new'}));
    items.push({k:'seg',a:s.A,b:s.B,style:'side'});
    const hit=np.length?` Она пересекает рёбра грани в ${np.length>1?'точках':'точке'} ${np.map(q=>q[1]).join(' и ')}.`:'';
    s.done=true;addK(s.A,s.la);addK(s.B,s.lb);
    steps.push({title,text:text+hit+` Отрезок ${sideName(s)} — сторона сечения.`,why,items,known:snap()});
  };
  const pickTwo=kn=>{let best=[kn[0],kn[1]],bd=-1;for(let i=0;i<kn.length;i++)for(let j=i+1;j<kn.length;j++){const d=dist2(kn[i].p,kn[j].p);if(d>bd){bd=d;best=[kn[i],kn[j]];}}return best;};

  /* 1) две известные точки в одной грани */
  const tryDirect=()=>{
    for(const s of sides){
      if(s.done)continue;
      for(const fi of s.faces){
        const kn=K.filter(k=>inFace(k.p,fi));
        if(kn.length<2)continue;
        const[k1,k2]=pickTwo(kn);
        if(dist2(k1.p,k2.p)<1e-9)continue;
        const dir=nrm(sub(s.B,s.A)),[a,b]=extent([s.A,s.B,k1.p,k2.p],dir);
        const fl=faceLabel(fig,fi);
        const isBase=fi===baseFi;
        finishSide(s,[{k:'face',fi},{k:'line',a,b,style:'aux'}],
          `Точки ${k1.label} и ${k2.label} лежат в одной ${isBase?'плоскости — основании':'грани'} ${fl}, поэтому сразу соединяем их прямой.`,
          'Если две точки прямой лежат в плоскости, то вся прямая лежит в этой плоскости.',`Грань ${fl}`);
        return true;
      }
    }
    return false;
  };
  while(tryDirect());

  const horizontal=Math.hypot(plane.n.x,plane.n.y)<1e-6;
  let l0=null,dL=null;
  if(sides.some(s=>!s.done)&&!horizontal){
    dL=nrm(V(-plane.n.y,plane.n.x,0));
    /* 2) след: сначала точки, которые уже лежат в основании */
    const TR=[];
    K.forEach(k=>{if(onBase(k.p)&&TR.length<2&&!TR.some(t=>dist2(t.p,k.p)<1e-9))TR.push(k);});
    const prItems=[],prNotes=[],trItems=[],trText=[];
    const knownTr=TR.length?`${TR.map(t=>t.label).join(' и ')} ${TR.length>1?'лежат':'лежит'} и в α, и в ${W.loc}, то есть на следе.`:'';
    if(TR.length<2){
      const central=fig.proj.type==='central',apex=central?fig.proj.apex:null;
      const src=P.map((p,i)=>({p,label:names[i]})).filter(q=>!onBase(q.p));
      const proj=q=>{
        if(central){if(Math.abs(q.p.z-apex.z)<EPS)return null;const k=(zb-apex.z)/(q.p.z-apex.z);return add(apex,mul(sub(q.p,apex),k));}
        return V(q.p.x,q.p.y,zb);
      };
      src.forEach(q=>{q.pr=proj(q);
        if(!q.pr){prNotes.push(`${q.label} на высоте вершины, её проекция не нужна`);return;}
        prItems.push({k:'seg',a:central?apex:q.p,b:q.pr,style:'proj'},{k:'pt',p:q.pr,label:q.label+'′',role:'proj'});
      });
      if(prItems.length)steps.push({title:'Проекции точек',
        text:(central?`Проецируем точки на ${W.acc} из вершины: через вершину и каждую точку проводим прямую до основания. `
          :fig.proj.type==='par'?`Проецируем точки на ${W.acc} параллельно боковым рёбрам. `
          :`Опускаем из точек перпендикуляры на ${W.acc}. `)
          +`Получаем ${src.filter(q=>q.pr).map(q=>q.label+'′').join(', ')}.`+(prNotes.length?' '+prNotes.join('; ')+'.':''),
        why:'Проекция нужна, чтобы найти, где прямая, лежащая в α, «протыкает» плоскость основания.',items:prItems,known:snap()});
      const lab=['X','Y'];let li=0;
      const withPr=src.filter(q=>q.pr);
      for(let i=0;i<withPr.length&&TR.length<2;i++)for(let j=i+1;j<withPr.length&&TR.length<2;j++){
        const a=withPr[i],b=withPr[j];
        if(Math.abs(a.p.z-b.p.z)<EPS)continue;
        const X=lerp3(a.p,b.p,(zb-a.p.z)/(b.p.z-a.p.z));
        if(TR.some(t=>dist2(t.p,X)<1e-8))continue;
        if(dist2(a.pr,b.pr)<1e-9)continue;
        const l=lab[li++];TR.push({p:X,label:l});
        const far=dist2(a.p,X)>dist2(b.p,X)?a.p:b.p,farPr=dist2(a.pr,X)>dist2(b.pr,X)?a.pr:b.pr;
        trItems.push({k:'seg',a:far,b:X,style:'aux'},{k:'seg',a:farPr,b:X,style:'aux'},{k:'pt',p:X,label:l,role:'aux'});
        trText.push(`${l} = ${a.label}${b.label} ∩ ${a.label}′${b.label}′`);
      }
      if(trItems.length)steps.push({title:'Точки следа',
        text:(knownTr?knownTr+' ':'')+`Прямая из α и её проекция лежат в одной плоскости и пересекаются в точке, которая принадлежит и α, и основанию: ${trText.join('; ')}.`,
        why:'Прямая, лежащая в α, пересекает плоскость основания в точке, которая принадлежит следу.',items:trItems,known:snap()});
    }
    let traceText;
    if(TR.length>=2){
      l0=TR[0].p;
      traceText=(knownTr&&!trItems.length?knownTr+' ':'')+`Через ${TR[0].label} и ${TR[1].label} проводим прямую ℓ — след секущей плоскости: по ней α пересекает ${W.acc}.`;
    }else{
      const n=plane.n,d=plane.d;
      l0=Math.abs(n.x)>Math.abs(n.y)?V(-(d+n.z*zb)/n.x,0,zb):V(0,-(d+n.z*zb)/n.y,zb);
      if(TR.length===1){l0=TR[0].p;traceText=`Точка ${TR[0].label} на следе уже есть, а направление даёт горизонтальная прямая из α (она параллельна основанию). Проводим ℓ через ${TR[0].label}.`;}
      else traceText=`Проводим ℓ — прямую, по которой α пересекает ${W.acc}.`;
      if(TR.length===0)TR.push({p:l0,label:''});
    }
    TR.forEach(t=>addK(t.p,t.label));
    /* длина следа: покрыть все будущие точки T */
    const cand=[l0,...TR.map(t=>t.p)];
    sides.forEach(s=>s.faces.forEach(fi=>{const T=faceTrace(fi);if(T&&len(sub(T,fig.center))<fig.R*6)cand.push(T);}));
    const[ta,tb]=extent(cand,dL,0.8);
    steps.push({title:'След ℓ',text:traceText,why:'Две пересекающиеся плоскости пересекаются по прямой. Чтобы её провести, достаточно двух общих точек.',
      items:[...(baseFi>=0?[{k:'face',fi:baseFi}]:[]),{k:'line',a:ta,b:tb,style:'trace',label:'ℓ'}],known:snap(),trace:true});
  }
  function baseEdgeOf(fi){
    const ids=fig.faces[fi];
    for(let q=0;q<ids.length;q++){const u=ids[q],w=ids[(q+1)%ids.length];if(onBase(fig.verts[u])&&onBase(fig.verts[w]))return[u,w];}
    return null;
  }
  function faceLine(fi){ // прямая пересечения плоскости грани с плоскостью основания
    const n=fig.fn[fi];if(Math.abs(n.z)>0.999)return null;
    const dM=nrm(cross(n,V(0,0,1))),be=baseEdgeOf(fi);
    if(be)return{m0:fig.verts[be[0]],dM,be};
    const d=fig.fd[fi];
    return{m0:Math.abs(n.x)>Math.abs(n.y)?V(-(d+n.z*zb)/n.x,0,zb):V(0,-(d+n.z*zb)/n.y,zb),dM,be:null};
  }
  function faceTrace(fi){
    if(!dL)return null;const fl=faceLine(fi);if(!fl||isPar(fl.dM,dL))return null;
    const det=-dL.x*fl.dM.y+dL.y*fl.dM.x;if(Math.abs(det)<1e-9)return null;
    const rx=fl.m0.x-l0.x,ry=fl.m0.y-l0.y,s=(rx*(-fl.dM.y)+ry*fl.dM.x)/det;
    return V(l0.x+dL.x*s,l0.y+dL.y*s,zb);
  }

  /* 3) по граням, опираясь на след */
  let tN=0;
  for(let guard=0;guard<40&&sides.some(s=>!s.done);guard++){
    if(tryDirect())continue;
    let progress=false;
    outer:for(const s of sides){
      if(s.done)continue;
      for(const fi of s.faces){
        const kn=K.filter(k=>inFace(k.p,fi)&&k.label);
        if(!kn.length)continue;
        const fl=faceLabel(fig,fi),n=fig.fn[fi],dirS=nrm(sub(s.B,s.A));
        if(fi===baseFi||(Math.abs(n.z)>0.999&&Math.abs(fig.verts[fig.faces[fi][0]].z-zb)<EPS)){
          if(!dL)continue;
          const k=kn[0],[a,b]=extent([s.A,s.B,k.p],dirS);
          finishSide(s,[{k:'face',fi},{k:'line',a,b,style:'aux'}],`Основание ${fl}: сторона сечения в нём лежит прямо на следе ℓ (через ${k.label}).`,
            'След — это и есть прямая пересечения α с плоскостью основания.',`Основание ${fl}`);
          progress=true;break outer;
        }
        const parTop=Math.abs(n.z)>0.999;
        const fLine=faceLine(fi);
        const parallelCase=parTop||horizontal||(dL&&fLine&&isPar(fLine.dM,dL));
        if(parallelCase){
          const k=kn[0],[a,b]=extent([s.A,s.B,k.p],dirS);
          let text,why;
          if(parTop){text=`Грань ${fl} параллельна основанию. Через ${k.label} проводим в ней прямую, параллельную ${horizontal?'стороне основания':'следу ℓ'}.`;
            why='Если две параллельные плоскости пересечены третьей, то линии пересечения параллельны.';}
          else if(horizontal){const be=fLine&&fLine.be?vlab(fig,fLine.be[0])+vlab(fig,fLine.be[1]):'';
            text=`Плоскость α параллельна основанию, поэтому в грани ${fl} проводим через ${k.label} прямую, параллельную ${be||'линии основания'}.`;
            why='Если две параллельные плоскости пересечены третьей, то линии пересечения параллельны.';}
          else{const be=fLine.be?vlab(fig,fLine.be[0])+vlab(fig,fLine.be[1]):'';
            text=`Грань ${fl} пересекает основание по прямой ${be||'m'}, а она параллельна ℓ. Значит, и сторона сечения в этой грани параллельна ℓ: проводим через ${k.label} прямую ∥ ℓ.`;
            why='Если прямая параллельна плоскости, то любая плоскость, проходящая через эту прямую и пересекающая данную, пересекает её по параллельной прямой.';}
          finishSide(s,[{k:'face',fi},{k:'line',a,b,style:'aux'}],text,why,`Грань ${fl}`);
          progress=true;break outer;
        }
        if(!dL)continue;
        const T=faceTrace(fi);if(!T)continue;
        const k=kn.find(q=>dist2(q.p,T)>1e-8);if(!k)continue;
        let ex=known(T),tl;
        if(ex&&ex.label)tl=ex.label;else{tl='T'+subNum(++tN);addK(T,tl);}
        const items=[{k:'face',fi}];
        let how;
        if(fLine.be){
          const[u,w]=fLine.be,U=fig.verts[u],W=fig.verts[w],near=dist2(U,T)<dist2(W,T)?U:W;
          if(dist2(near,T)>1e-8)items.push({k:'seg',a:near,b:T,style:'ext'});
          how=ex&&ex.label?`Прямая ${vlab(fig,u)}${vlab(fig,w)} (ребро основания этой грани) проходит через ${tl} на следе ℓ.`
            :`Продлеваем ребро ${vlab(fig,u)}${vlab(fig,w)} (оно лежит и в грани, и в основании) до пересечения со следом ℓ — получаем точку ${tl}.`;
        }else how=`Находим прямую, по которой плоскость грани пересекает основание, и её точку пересечения со следом ℓ — ${tl}.`;
        items.push({k:'pt',p:T,label:tl,role:'aux'});
        const[a,b]=extent([s.A,s.B,k.p,T],dirS,0.3);
        items.push({k:'line',a,b,style:'aux'});
        finishSide(s,items,`Грань ${fl}. ${how} Точки ${tl} и ${k.label} лежат и в α, и в плоскости грани, проводим прямую ${tl}${k.label}.`,
          'Две плоскости пересекаются по прямой; две их общие точки задают эту прямую.',`Грань ${fl}`);
        progress=true;break outer;
      }
    }
    if(!progress)break;
  }
  const rest=sides.filter(s=>!s.done);
  if(rest.length){
    steps.push({title:fig.smooth?'Кривая сечения':'Остальные стороны',text:fig.smooth?'Для тела вращения так же находим сколько угодно точек сечения на образующих и соединяем их плавной кривой.':`Аналогично достраиваем оставшиеся стороны: ${rest.map(sideName).join(', ')}.`,why:'',
      items:rest.map(s=>({k:'seg',a:s.A,b:s.B,style:'side'})),known:snap()});
  }
  const area=polyArea3D(sec.poly),per=polyPerimeter3D(sec.poly),nr=niceRoot(area);
  steps.push({title:'Сечение готово',text:`Многоугольник ${secLab.join('')} — это ${sec.name}. Площадь ${fmt(area)}${nr?' = '+nr:''}, периметр ${fmt(per)}.`,
    why:'Сечение — многоугольник, стороны которого лежат в гранях тела.',items:[{k:'poly',pts:sec.poly,labels:secLab}],known:snap()});
  return steps;
}
function traceLine(fig,plane){
  if(!plane||fig.kind==='sph')return null;
  const n=plane.n,d=plane.d,zb=fig.baseZ;
  if(Math.hypot(n.x,n.y)<1e-6)return null;
  const dir=nrm(V(-n.y,n.x,0)),p0=Math.abs(n.x)>Math.abs(n.y)?V(-(d+n.z*zb)/n.x,0,zb):V(0,-(d+n.z*zb)/n.y,zb);
  const c=V(fig.center.x,fig.center.y,zb),t0=dot(sub(c,p0),dir),Lh=fig.R*1.8;
  return[add(p0,mul(dir,t0-Lh)),add(p0,mul(dir,t0+Lh))];
}
if(typeof module!=='undefined')module.exports={};
