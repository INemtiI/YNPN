'use strict';
/* ===== векторная математика, форматирование, разбор ввода ===== */
const V=(x,y,z)=>({x,y,z});
const sub=(a,b)=>V(a.x-b.x,a.y-b.y,a.z-b.z);
const add=(a,b)=>V(a.x+b.x,a.y+b.y,a.z+b.z);
const mul=(a,k)=>V(a.x*k,a.y*k,a.z*k);
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>V(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
const len=a=>Math.hypot(a.x,a.y,a.z);
const nrm=a=>{const l=len(a)||1;return mul(a,1/l);};
const lerp3=(a,b,t)=>V(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t);
const dist2=(a,b)=>{const d=sub(a,b);return dot(d,d);};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TAU=Math.PI*2;
const deg=r=>r*180/Math.PI;
const isPar=(u,w)=>len(cross(nrm(u),nrm(w)))<1e-5;

function polyArea3D(pts){let s=V(0,0,0);for(let i=0;i<pts.length;i++)s=add(s,cross(pts[i],pts[(i+1)%pts.length]));return len(s)/2;}
function polyCentroid(pts){return mul(pts.reduce(add,V(0,0,0)),1/pts.length);}
function polyPerimeter3D(pts){let p=0;for(let i=0;i<pts.length;i++)p+=len(sub(pts[i],pts[(i+1)%pts.length]));return p;}
function hexToRgba(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}

const fmt=(v,d=2)=>{
  if(!Number.isFinite(v))return '·';
  let r=(Math.abs(v)<1e-9?0:v).toFixed(d);
  if(r.includes('.'))r=r.replace(/0+$/,'').replace(/\.$/,'');
  if(r==='-0')r='0';
  return r.replace('.',',').replace('-','−');
};
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b];}return a;}
/* 0.333 → «1/3», 1.5 → «3/2», иначе десятичная */
function fracText(x){
  if(Math.abs(x-Math.round(x))<1e-6)return fmt(Math.round(x));
  for(let q=2;q<=12;q++){const p=Math.round(x*q);if(Math.abs(x-p/q)<1e-5){const g=gcd(p,q);return (p<0?'−':'')+Math.abs(p/g)+'/'+(q/g);}}
  return fmt(x);
}
/* отношение a:b в целых числах, если получается */
function ratioAB(a,b){
  if(b<1e-9)return '∞';
  const r=a/b;
  for(let n=1;n<=12;n++){const m=Math.round(r*n);if(m>0&&Math.abs(m/n-r)<1e-5){const g=gcd(m,n);return (m/g)+':'+(n/g);}}
  return fmt(r)+':1';
}
const fmtC=p=>`(${fmt(p.x)}; ${fmt(p.y)}; ${fmt(p.z)})`;
const SUBS='₀₁₂₃₄₅₆₇₈₉';
const subNum=n=>String(n).split('').map(c=>SUBS[+c]).join('');
const toSub=s=>String(s).replace(/[0-9]/g,d=>SUBS[+d]);
function niceRoot(v){
  if(!Number.isFinite(v)||v<1e-9)return '';
  if(Math.abs(v-Math.round(v))<1e-6)return '';
  for(let k=1;k<=12;k++)for(const r of [2,3,5,6,7,10,11,13]){
    if(Math.abs(v-k*Math.sqrt(r))<2e-4)return (k===1?'':k)+'√'+r;
    if(Math.abs(v-k*Math.sqrt(r)/2)<2e-4)return (k===1?'':k)+'√'+r+'/2';
    if(Math.abs(v-k*Math.sqrt(r)/4)<2e-4)return (k===1?'':k)+'√'+r+'/4';
  }
  const f=fracText(v);return f.includes('/')?f:'';
}
/* число из строки: «1/2», «−1,5», «√2», «2√3/3» */
function parseNum(s){
  if(s==null)return NaN;
  let t=String(s).trim().replace(/−/g,'-').replace(/,/g,'.').replace(/\s+/g,'');
  if(!t)return NaN;
  if(!/^[0-9+\-*/().√]+$/.test(t))return NaN;
  t=t.replace(/(\d|\))√/g,'$1*√').replace(/√(\d+(\.\d+)?|\([^)]*\))/g,'Math.sqrt($1)');
  try{const v=Function('"use strict";return ('+t+')')();return Number.isFinite(v)?v:NaN;}catch(e){return NaN;}
}

function ptSegT(px,py,x1,y1,x2,y2,unclamped){
  const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;
  const t=l2?((px-x1)*dx+(py-y1)*dy)/l2:0;
  return unclamped?t:clamp(t,0,1);
}
function ptSegDist(px,py,x1,y1,x2,y2){const t=ptSegT(px,py,x1,y1,x2,y2);return Math.hypot(px-(x1+(x2-x1)*t),py-(y1+(y2-y1)*t));}
function pointInPoly(px,py,pts){
  let inside=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y;
    if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}
