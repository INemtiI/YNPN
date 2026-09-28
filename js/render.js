'use strict';
/* ===== ортографическая проекция и отрисовка сцены =====
   Стиль как у логотипа: тушь на тёплой бумаге, сечение — графит с белыми линиями. */
const COL={
  paper:'#f4f3ef',ink:'#19191c',ink2:'#5d5c63',ink3:'#8e8d94',hidden:'rgba(25,25,28,.34)',
  grid:'rgba(25,25,28,.075)',graphite:'rgba(44,44,48,.80)',plane:'rgba(44,44,48,.09)',planeLine:'rgba(44,44,48,.35)',
  accent:'#e4492c',accentSoft:'rgba(228,73,44,.10)',blue:'#2b59d1',green:'#1d8f57',
  past:'#6d6c73',ax:['#d4462f','#1d8f57','#2b59d1']
};
const LABEL_FONT=(w,s)=>`italic ${w} ${s}px "PT Serif", Georgia, serif`;
function mkProj(yaw,pitch,cx,cy,s,C=V(0,0,0)){
  const ca=Math.cos(yaw),sa=Math.sin(yaw),cb=Math.cos(pitch),sb=Math.sin(pitch);
  const rot=p=>{const y0=p.x*sa+p.y*ca;return{x:p.x*ca-p.y*sa,y2:y0*cb+p.z*sb,z2:p.z*cb-y0*sb};};
  const pr=p=>{const r=rot(sub(p,C));return{x:cx+r.x*s,y:cy-r.z2*s,d:r.y2};};
  const inv=(xr,y2,z2)=>{const y0=y2*cb-z2*sb,z=y2*sb+z2*cb;return V(xr*ca+y0*sa,-xr*sa+y0*ca,z);};
  const ray=(sx,sy)=>({o:add(inv((sx-cx)/s,0,-(sy-cy)/s),C),d:inv(0,1,0)});
  /* точка на вертикали через (x,y), попадающая в экранную y */
  const zAt=(p,sy)=>{if(Math.abs(cb)<0.08)return null;const q=sub(p,C),y0=q.x*sa+q.y*ca,z2=-(sy-cy)/s;return C.z+(z2+y0*sb)/cb;};
  return{pr,rot,s,ray,zAt};
}
function rayPlane(r,n,d){const den=dot(n,r.d);if(Math.abs(den)<1e-6)return null;return add(r.o,mul(r.d,-(dot(n,r.o)+d)/den));}
function line2(ctx,a,b){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
function line3(ctx,P,a,b){line2(ctx,P.pr(a),P.pr(b));}
function haloText(ctx,txt,x,y,color,halo){ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle=halo;ctx.strokeText(txt,x,y);ctx.fillStyle=color;ctx.fillText(txt,x,y);}
function polyPath(ctx,pp){ctx.beginPath();pp.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();}

function drawGridAxes(ctx,P,fig,origin){
  const c=fig.center,G=Math.max(3,Math.ceil(fig.R)+1),z=fig.baseZ;
  const x0=Math.floor(c.x-G),x1=Math.ceil(c.x+G),y0=Math.floor(c.y-G),y1=Math.ceil(c.y+G);
  ctx.lineWidth=1;ctx.strokeStyle=COL.grid;
  for(let i=x0;i<=x1;i++)line3(ctx,P,V(i,y0,z),V(i,y1,z));
  for(let j=y0;j<=y1;j++)line3(ctx,P,V(x0,j,z),V(x1,j,z));
  const o=P.pr(origin),AX=[V(1,0,0),V(0,1,0),V(0,0,1)],labs=['x','y','z'];
  AX.forEach((u,k)=>{
    const e=P.pr(add(origin,mul(u,G+0.4)));
    ctx.strokeStyle=COL.ax[k];ctx.lineWidth=1.3;line2(ctx,o,e);
    const dx=e.x-o.x,dy=e.y-o.y,l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l;
    ctx.fillStyle=COL.ax[k];ctx.beginPath();ctx.moveTo(e.x,e.y);
    ctx.lineTo(e.x-ux*9-uy*3.5,e.y-uy*9+ux*3.5);ctx.lineTo(e.x-ux*9+uy*3.5,e.y-uy*9-ux*3.5);ctx.closePath();ctx.fill();
    if(l>14){ctx.font=LABEL_FONT(700,14);ctx.fillText(labs[k],e.x+ux*12-4,e.y+uy*12+5);}
    ctx.font='10px "JetBrains Mono", monospace';ctx.globalAlpha=.65;
    for(let i=1;i<=G;i++){const t=P.pr(add(origin,mul(u,i)));ctx.fillText(String(i),t.x+5,t.y+12);}
    ctx.globalAlpha=1;
  });
  ctx.fillStyle=COL.ink2;ctx.font=LABEL_FONT(400,12);ctx.fillText('O',o.x-13,o.y+14);
}
function drawSphere(ctx,P,fig,holo,hc){
  const R=fig.r,N=60,c=P.pr(V(0,0,0));
  ctx.beginPath();ctx.arc(c.x,c.y,R*P.s,0,TAU);
  if(!holo){ctx.fillStyle='rgba(44,44,48,.05)';ctx.fill();ctx.strokeStyle=COL.ink;ctx.lineWidth=1.7;ctx.stroke();}
  else{ctx.strokeStyle=hc.color;ctx.lineWidth=hc.line*1.2;ctx.stroke();}
  const seg=(a,b)=>{
    const front=P.rot(mul(add(a,b),.5)).y2<0,p1=P.pr(a),p2=P.pr(b);
    ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);
    if(holo){ctx.globalAlpha=front?.85:.25;ctx.strokeStyle=hc.color;ctx.lineWidth=hc.line*.8;}
    else{ctx.strokeStyle=front?'rgba(25,25,28,.5)':'rgba(25,25,28,.15)';ctx.lineWidth=1;if(!front)ctx.setLineDash([3,4]);}
    ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
  };
  for(const zl of[-0.6,0,0.6]){const z=zl*R,rr=Math.sqrt(R*R-z*z);
    for(let i=0;i<N;i++){const a1=i/N*TAU,a2=(i+1)/N*TAU;seg(V(rr*Math.cos(a1),rr*Math.sin(a1),z),V(rr*Math.cos(a2),rr*Math.sin(a2),z));}}
  for(let k=0;k<3;k++){const ph=k*Math.PI/3;
    for(let i=0;i<N;i++){const t1=i/N*TAU,t2=(i+1)/N*TAU;
      seg(V(R*Math.cos(t1)*Math.cos(ph),R*Math.cos(t1)*Math.sin(ph),R*Math.sin(t1)),V(R*Math.cos(t2)*Math.cos(ph),R*Math.cos(t2)*Math.sin(ph),R*Math.sin(t2)));}}
}
/* плоскость целиком: квадрат вокруг сечения */
function planeQuad(fig,plane,sec){
  const n=plane.n,c0=sec.poly.length?polyCentroid(sec.poly):sub(fig.center,mul(n,dot(n,fig.center)+plane.d));
  const up=Math.abs(n.z)<0.9?V(0,0,1):V(1,0,0),u=nrm(cross(up,n)),v=cross(n,u),h=fig.R*1.35;
  return[add(c0,add(mul(u,h),mul(v,h))),add(c0,add(mul(u,-h),mul(v,h))),add(c0,add(mul(u,-h),mul(v,-h))),add(c0,add(mul(u,h),mul(v,-h)))];
}
function drawSection(ctx,P,pts,labels,holo,hc,prog=1,showLabels=true){
  const pp=pts.map(p=>P.pr(p)),m=pp.length;if(m<3)return;
  ctx.save();
  ctx.globalAlpha=Math.min(1,prog*1.4);
  polyPath(ctx,pp);ctx.fillStyle=holo?hexToRgba(hc.sec,.22):COL.graphite;ctx.fill();
  ctx.globalAlpha=1;
  ctx.strokeStyle=holo?hc.sec:COL.paper;ctx.lineWidth=holo?hc.line*1.4:2;ctx.lineJoin='round';
  const k=prog*m;ctx.beginPath();ctx.moveTo(pp[0].x,pp[0].y);
  for(let i=0;i<m;i++){const A=pp[i],B=pp[(i+1)%m];if(k>=i+1)ctx.lineTo(B.x,B.y);else if(k>i){const f=k-i;ctx.lineTo(A.x+(B.x-A.x)*f,A.y+(B.y-A.y)*f);break;}else break;}
  if(prog>=1)ctx.closePath();ctx.stroke();
  if(!holo){ctx.strokeStyle=COL.ink;ctx.lineWidth=0.8;polyPath(ctx,pp);ctx.globalAlpha=.6;ctx.stroke();}
  ctx.restore();
  if(prog>=1&&labels&&showLabels&&m<=10){
    const cx=pp.reduce((s,q)=>s+q.x,0)/m,cy=pp.reduce((s,q)=>s+q.y,0)/m;
    ctx.font=LABEL_FONT(700,15);
    pp.forEach((q,i)=>{
      if(!labels[i])return;
      if(!holo){ctx.beginPath();ctx.arc(q.x,q.y,3.2,0,TAU);ctx.fillStyle=COL.paper;ctx.fill();ctx.lineWidth=1.4;ctx.strokeStyle=COL.ink;ctx.stroke();}
      const dx=q.x-cx,dy=q.y-cy,l=Math.hypot(dx,dy)||1;
      haloText(ctx,labels[i],q.x+dx/l*14-5,q.y+dy/l*14+5,holo?hc.sec:COL.ink,holo?'#050608':COL.paper);
    });
  }
}
/* элементы шага построения. phase: 'cur' — текущий шаг (акцент), 'past' — прошлые (приглушённо) */
function drawItems(ctx,P,fig,items,prog,phase,holo,hc,showLabels=true){
  const cur=phase==='cur',halo=holo?'#050608':COL.paper;
  const col=holo?(cur?hc.sec:hc.color):(cur?COL.accent:COL.past);
  for(const it of items){
    if(it.k==='face'){
      if(!cur||holo)continue;
      const pp=fig.faces[it.fi].map(i=>P.pr(fig.verts[i]));
      ctx.save();ctx.globalAlpha=Math.min(1,prog*2);polyPath(ctx,pp);ctx.fillStyle=COL.accentSoft;ctx.fill();ctx.restore();
    }else if(it.k==='seg'||it.k==='line'){
      const a=P.pr(it.a),b0=P.pr(it.b),b={x:a.x+(b0.x-a.x)*prog,y:a.y+(b0.y-a.y)*prog};
      ctx.save();ctx.lineCap='round';
      switch(it.style){
        case 'side':ctx.strokeStyle=holo?col:(cur?COL.accent:COL.ink);ctx.lineWidth=holo?hc.line*1.5:(cur?3.2:2.6);break;
        case 'trace':ctx.strokeStyle=col;ctx.lineWidth=holo?hc.line:(cur?2.2:1.6);ctx.setLineDash([12,6]);break;
        case 'proj':ctx.strokeStyle=col;ctx.globalAlpha=cur?.85:.45;ctx.lineWidth=1;ctx.setLineDash([2,4]);break;
        case 'ext':ctx.strokeStyle=col;ctx.lineWidth=cur?1.8:1.1;ctx.setLineDash([4,4]);break;
        default:ctx.strokeStyle=col;ctx.globalAlpha=cur?.95:.55;ctx.lineWidth=holo?hc.line*.8:(cur?1.6:1.1);ctx.setLineDash([7,5]);
      }
      line2(ctx,a,b);ctx.restore();
      if(it.label&&prog>=1&&showLabels){ctx.font=LABEL_FONT(700,17);haloText(ctx,it.label,b0.x+6,b0.y-6,col,halo);}
    }else if(it.k==='pt'){
      if(prog<0.3)continue;
      const q=P.pr(it.p),main=it.role==='main';
      ctx.beginPath();ctx.arc(q.x,q.y,main?5.5:it.role==='new'?4.6:4,0,TAU);
      if(holo){ctx.fillStyle=main?hc.sec:col;ctx.fill();}
      else if(main){ctx.fillStyle=COL.blue;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=COL.paper;ctx.stroke();}
      else if(it.role==='proj'){ctx.fillStyle=COL.paper;ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle=col;ctx.stroke();}
      else{ctx.fillStyle=cur?COL.accent:(it.role==='new'?COL.ink:COL.past);ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle=COL.paper;ctx.stroke();}
      if(it.label&&showLabels){
        ctx.font=LABEL_FONT(700,main?16:15);
        haloText(ctx,it.label,q.x+8,q.y-8,holo?col:(main?COL.blue:cur?COL.accent:it.role==='new'?COL.ink:COL.past),halo);
      }
    }else if(it.k==='poly')drawSection(ctx,P,it.pts,it.labels,holo,hc,prog,showLabels);
  }
}

/* главный кадр. o = {fig, st, yaw, pitch, cx, cy, scale, theme, hc, picksOut, noClear} */
function renderScene(ctx,W,H,o){
  const fig=o.fig,st=o.st,holo=o.theme==='holo',hc=o.hc||{};
  if(!o.noClear)ctx.clearRect(0,0,W,H);
  const P=mkProj(o.yaw,o.pitch,o.cx,o.cy,o.scale,fig.center);
  const pk=o.picksOut;if(pk){pk.verts=[];pk.edges=[];pk.faces=[];pk.proj=P;}
  const halo=holo?'#050608':COL.paper;
  const labelsOn=!holo||hc.labels;
  const steps=st.stepsOn&&st.steps&&st.steps.length?st.steps:null;
  const finalStep=steps&&st.step>=steps.length;
  if(holo&&hc.glow){ctx.shadowColor=hc.color;ctx.shadowBlur=hc.glow;}
  if(!holo&&st.showGrid)drawGridAxes(ctx,P,fig,st.origin||V(0,0,0));

  /* плоскость целиком (как на логотипе) */
  if(!holo&&st.showPlane&&st.plane&&(!steps||finalStep)){
    const q=planeQuad(fig,st.plane,st.sec).map(p=>P.pr(p));
    polyPath(ctx,q);ctx.fillStyle=COL.plane;ctx.fill();ctx.strokeStyle=COL.planeLine;ctx.lineWidth=1;ctx.stroke();
  }
  /* продолжения рёбер: заданные вручную и автоматически для точек на продолжении */
  if(!holo&&fig.kind==='poly'){
    ctx.save();ctx.strokeStyle=COL.ink2;ctx.lineWidth=1.1;ctx.setLineDash([3,5]);
    for(const k of st.extEdges||[]){
      const[a,b]=k.split('_').map(Number),A=fig.verts[a],B=fig.verts[b],d=nrm(sub(B,A)),Lx=fig.R*2.4;
      line3(ctx,P,sub(A,mul(d,Lx)),add(B,mul(d,Lx)));
    }
    ctx.setLineDash([5,4]);ctx.strokeStyle=COL.blue;ctx.globalAlpha=.7;
    for(const u of st.drawPts||[])if(u.visible&&u.ext)line3(ctx,P,u.ext[0],u.ext[1]);
    ctx.restore();
  }

  let pv=null;const vis=[];
  if(fig.kind==='sph')drawSphere(ctx,P,fig,holo,hc);
  else{
    pv=fig.verts.map(p=>P.pr(p));
    if(pk)fig.verts.forEach((v,i)=>pk.verts.push({x:pv[i].x,y:pv[i].y,idx:i}));
    const order=fig.faces.map((f,i)=>{let d=0;f.forEach(id=>d+=pv[id].d);return[i,d/f.length];}).sort((a,b)=>b[1]-a[1]);
    for(const[i,d]of order){
      const front=P.rot(fig.fn[i]).y2<0;vis[i]=front;
      if(pk)pk.faces.push({poly:fig.faces[i].map(id=>({x:pv[id].x,y:pv[id].y})),idx:i,d,front});
      if(!front)continue;
      if(holo&&!hc.fill)continue;
      const fs=holo?{color:hc.color,alpha:.07}:((st.faceStyle&&st.faceStyle[i])||st.bodyStyle||{color:'#2c2c30',alpha:.05});
      let al=fs.alpha;
      if(!holo){const lit=-P.rot(fig.fn[i]).y2;al*=0.75+0.5*lit;}
      if(!holo&&st.sel&&st.sel.type==='face'&&st.sel.index===i)al=Math.min(1,al+0.12);
      polyPath(ctx,fig.faces[i].map(id=>pv[id]));ctx.fillStyle=hexToRgba(fs.color,al);ctx.fill();
    }
    const segs=[];
    for(const[a,b]of fig.edges){
      const fl=fig.ef[Math.min(a,b)+'_'+Math.max(a,b)]||[],evis=fl.length?fl.some(i=>vis[i]):true;
      if(fig.smooth){const ring=Math.abs(fig.verts[a].z-fig.verts[b].z)<1e-9,sil=fl.length===2&&vis[fl[0]]!==vis[fl[1]];if(!ring&&!sil)continue;}
      segs.push({a,b,evis});
    }
    if(pk)segs.forEach(s=>pk.edges.push({x1:pv[s.a].x,y1:pv[s.a].y,x2:pv[s.b].x,y2:pv[s.b].y,a:s.a,b:s.b}));
    const drawSeg=s=>{
      ctx.beginPath();ctx.moveTo(pv[s.a].x,pv[s.a].y);ctx.lineTo(pv[s.b].x,pv[s.b].y);
      if(holo){ctx.globalAlpha=s.evis?1:.32;ctx.strokeStyle=hc.color;ctx.lineWidth=hc.line;}
      else if(!s.evis){ctx.setLineDash([5,5]);ctx.strokeStyle=COL.hidden;ctx.lineWidth=1.2;}
      else{ctx.strokeStyle=COL.ink;ctx.lineWidth=1.9;}
      ctx.lineCap='round';ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
    };
    segs.filter(s=>!s.evis).forEach(drawSeg);
    /* сечение между невидимыми и видимыми рёбрами — как на логотипе */
    if(!steps&&st.showSec&&st.sec&&st.sec.poly.length>=3)drawSection(ctx,P,st.sec.poly,st.showVtx?st.secLab:null,holo,hc,1,labelsOn);
    segs.filter(s=>s.evis).forEach(drawSeg);
  }
  if(fig.kind==='sph'&&!steps&&st.showSec&&st.sec&&st.sec.poly.length>=3)drawSection(ctx,P,st.sec.poly,null,holo,hc,1,labelsOn);

  if(!holo&&!steps&&st.showTrace&&st.traceLine)drawItems(ctx,P,fig,[{k:'line',a:st.traceLine[0],b:st.traceLine[1],style:'trace',label:'ℓ'}],1,'past',false,hc);
  if(steps){
    const n=Math.min(st.step,steps.length);
    for(let i=0;i<n;i++)drawItems(ctx,P,fig,steps[i].items,i===n-1?st.stepProg:1,i===n-1&&!finalStep?'cur':'past',holo,hc,labelsOn);
  }
  if(!holo&&st.extSection&&st.sec&&st.sec.poly.length>=3&&st.sec.poly.length<=10){
    ctx.save();ctx.strokeStyle='rgba(44,44,48,.45)';ctx.lineWidth=1;ctx.setLineDash([6,5]);
    const pl=st.sec.poly,m=pl.length;
    for(let i=0;i<m;i++){const A=pl[i],B=pl[(i+1)%m],d=nrm(sub(B,A));line3(ctx,P,sub(A,mul(d,fig.R*1.6)),add(B,mul(d,fig.R*1.6)));}
    ctx.restore();
  }
  ctx.shadowBlur=0;

  if(!holo&&pv){
    if(st.hover&&st.hover.edge){
      const[a,b]=st.hover.edge;ctx.save();ctx.strokeStyle='rgba(43,89,209,.35)';ctx.lineWidth=7;ctx.lineCap='round';line2(ctx,pv[a],pv[b]);ctx.restore();
    }
    if(st.sel){
      ctx.save();ctx.strokeStyle=COL.blue;
      if(st.sel.type==='face'){polyPath(ctx,fig.faces[st.sel.index].map(id=>pv[id]));ctx.lineWidth=2.4;ctx.lineJoin='round';ctx.stroke();}
      else if(st.sel.type==='edge'){ctx.lineWidth=4;ctx.lineCap='round';line2(ctx,pv[st.sel.a],pv[st.sel.b]);}
      else if(st.sel.type==='vertex'){const q=pv[st.sel.index];ctx.beginPath();ctx.arc(q.x,q.y,7,0,TAU);ctx.lineWidth=2.2;ctx.stroke();}
      ctx.restore();
    }
    if(st.anglePicks&&st.anglePicks.length){
      ctx.save();ctx.strokeStyle=COL.green;ctx.lineWidth=3.2;ctx.lineCap='round';ctx.lineJoin='round';
      st.anglePicks.forEach(p=>{
        if(p.type==='edge')line2(ctx,pv[p.a],pv[p.b]);
        else if(p.type==='face'){polyPath(ctx,fig.faces[p.index].map(id=>pv[id]));ctx.stroke();ctx.fillStyle='rgba(29,143,87,.12)';ctx.fill();}
        else if(p.type==='section'&&st.sec.poly.length>=3){polyPath(ctx,st.sec.poly.map(q=>P.pr(q)));ctx.stroke();}
      });
      if(st.angleArc){
        const{c,u,w}=st.angleArc,C=P.pr(c),U=P.pr(add(c,u)),Wp=P.pr(add(c,w));
        const a1=Math.atan2(U.y-C.y,U.x-C.x);let da=Math.atan2(Wp.y-C.y,Wp.x-C.x)-a1;
        while(da>Math.PI)da-=TAU;while(da<-Math.PI)da+=TAU;
        ctx.lineWidth=2;ctx.beginPath();ctx.arc(C.x,C.y,24,a1,a1+da,da<0);ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* пользовательские точки */
  const dp=st.drawPts||[];
  if(!holo){
    for(const u of dp){
      if(!u.visible||!u.drop)continue;
      ctx.save();ctx.strokeStyle=COL.blue;ctx.globalAlpha=.45;ctx.lineWidth=1;ctx.setLineDash([2,3]);
      const a=P.pr(u.p),b=P.pr(u.drop);line2(ctx,a,b);ctx.setLineDash([]);
      ctx.beginPath();ctx.ellipse(b.x,b.y,4,2.2,0,0,TAU);ctx.fillStyle=COL.blue;ctx.fill();ctx.restore();
    }
  }
  if(st.hover&&st.hover.ghost&&!holo){
    const g=P.pr(st.hover.ghost);ctx.beginPath();ctx.arc(g.x,g.y,6,0,TAU);ctx.fillStyle='rgba(43,89,209,.35)';ctx.fill();
    ctx.lineWidth=1.5;ctx.strokeStyle=COL.blue;ctx.stroke();
  }
  for(const u of dp){
    if(!u.visible)continue;
    if(steps&&u.inSec)continue;
    const q=P.pr(u.p);
    ctx.beginPath();ctx.arc(q.x,q.y,u.inSec?5.5:4.8,0,TAU);
    if(holo){if(!u.inSec)continue;ctx.fillStyle=hc.sec;ctx.fill();}
    else if(u.inSec){ctx.fillStyle=u.color||COL.blue;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=COL.paper;ctx.stroke();}
    else{ctx.fillStyle=COL.paper;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=u.color||COL.blue;ctx.stroke();}
    if(u.active&&!holo){ctx.beginPath();ctx.arc(q.x,q.y,10,0,TAU);ctx.lineWidth=1.5;ctx.strokeStyle=u.color||COL.blue;ctx.globalAlpha=.5;ctx.stroke();ctx.globalAlpha=1;}
    if(labelsOn){ctx.font=LABEL_FONT(700,16);haloText(ctx,u.name,q.x+8,q.y-8,holo?hc.sec:(u.color||COL.blue),halo);}
  }

  /* подписи вершин */
  if(fig.labeled&&st.showVtx&&pv&&labelsOn){
    let cx=0,cy=0;pv.forEach(q=>{cx+=q.x;cy+=q.y;});cx/=pv.length;cy/=pv.length;
    ctx.font=LABEL_FONT(400,15);
    pv.forEach((q,i)=>{
      if(!holo){ctx.fillStyle=COL.ink;ctx.beginPath();ctx.arc(q.x,q.y,2.3,0,TAU);ctx.fill();}
      const used=dp.some(u=>u.visible&&dist2(u.p,fig.verts[i])<1e-8);
      const dx=q.x-cx,dy=q.y-cy,l=Math.hypot(dx,dy)||1,off=used?24:15;
      haloText(ctx,fig.labels[i],q.x+dx/l*off-5,q.y+dy/l*off+5,holo?hc.color:COL.ink,halo);
    });
  }
  return P;
}
