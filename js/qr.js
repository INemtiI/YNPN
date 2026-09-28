'use strict';
/* ===== собственный генератор QR-кодов (байтовый режим, уровень M, версии 1–10) =====
   Работает без внешних библиотек, поэтому QR строится даже при блокировке CDN. */
const QR=(()=>{
  const ECC=[0,10,16,26,18,24,16,18,22,22,26];
  const BLK=[0,1,1,1,2,2,4,4,4,5,5];
  const gmul=(x,y)=>{let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11D);z^=((y>>>i)&1)*x;}return z&255;};
  function rawModules(v){let r=(16*v+128)*v+64;if(v>=2){const na=Math.floor(v/7)+2;r-=(25*na-10)*na-55;if(v>=7)r-=36;}return r;}
  const dataCw=v=>Math.floor(rawModules(v)/8)-ECC[v]*BLK[v];
  function rsDivisor(deg){const r=new Array(deg).fill(0);r[deg-1]=1;let root=1;
    for(let i=0;i<deg;i++){for(let j=0;j<r.length;j++){r[j]=gmul(r[j],root);if(j+1<r.length)r[j]^=r[j+1];}root=gmul(root,2);}return r;}
  function rsRem(data,div){const r=new Array(div.length).fill(0);
    for(const b of data){const f=b^r.shift();r.push(0);div.forEach((c,i)=>r[i]^=gmul(c,f));}return r;}
  function alignPos(v){if(v===1)return[];const na=Math.floor(v/7)+2;const step=Math.ceil((v*4+4)/(na*2-2))*2;
    const r=[6];for(let p=v*4+17-7;r.length<na;p-=step)r.splice(1,0,p);return r;}
  function encode(text){
    const bytes=[...new TextEncoder().encode(text)];
    let v=1;for(;v<=10;v++){const cc=v<10?8:16;if(4+cc+bytes.length*8<=dataCw(v)*8)break;}
    if(v>10)throw new Error('Слишком длинная строка для QR');
    const bits=[];const put=(val,n)=>{for(let i=n-1;i>=0;i--)bits.push((val>>>i)&1);};
    put(4,4);put(bytes.length,v<10?8:16);bytes.forEach(b=>put(b,8));
    const cap=dataCw(v)*8;put(0,Math.min(4,cap-bits.length));while(bits.length%8)bits.push(0);
    for(let p=0xEC;bits.length<cap;p^=0xEC^0x11)put(p,8);
    const data=[];for(let i=0;i<bits.length;i+=8){let b=0;for(let j=0;j<8;j++)b=b<<1|bits[i+j];data.push(b);}
    // блоки + коррекция + чередование
    const nb=BLK[v],ecl=ECC[v],raw=Math.floor(rawModules(v)/8),nShort=nb-raw%nb,shortLen=Math.floor(raw/nb);
    const div=rsDivisor(ecl),blocks=[];
    for(let i=0,k=0;i<nb;i++){const dat=data.slice(k,k+shortLen-ecl+(i<nShort?0:1));k+=dat.length;
      const ec=rsRem(dat,div);if(i<nShort)dat.push(0);blocks.push(dat.concat(ec));}
    const all=[];for(let i=0;i<blocks[0].length;i++)blocks.forEach((b,j)=>{if(i!==shortLen-ecl||j>=nShort)all.push(b[i]);});
    // матрица
    const size=v*4+17,M=[...Array(size)].map(()=>new Array(size).fill(false)),F=[...Array(size)].map(()=>new Array(size).fill(false));
    const set=(x,y,d)=>{M[y][x]=d;F[y][x]=true;};
    for(let i=0;i<size;i++){set(6,i,i%2===0);set(i,6,i%2===0);}
    const finder=(cx,cy)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy)),x=cx+dx,y=cy+dy;
      if(x>=0&&x<size&&y>=0&&y<size)set(x,y,d!==2&&d!==4);}};
    finder(3,3);finder(size-4,3);finder(3,size-4);
    const ap=alignPos(v),na=ap.length;
    for(let i=0;i<na;i++)for(let j=0;j<na;j++){
      if((i===0&&j===0)||(i===0&&j===na-1)||(i===na-1&&j===0))continue;
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(ap[i]+dx,ap[j]+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);
    }
    const drawFormat=mask=>{
      const d=(0<<3)|mask;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);
      const b=((d<<10)|r)^0x5412,bit=i=>((b>>>i)&1)===1;
      for(let i=0;i<=5;i++)set(8,i,bit(i));
      set(8,7,bit(6));set(8,8,bit(7));set(7,8,bit(8));
      for(let i=9;i<15;i++)set(14-i,8,bit(i));
      for(let i=0;i<8;i++)set(size-1-i,8,bit(i));
      for(let i=8;i<15;i++)set(8,size-15+i,bit(i));
      set(8,size-8,true);
    };
    drawFormat(0);
    if(v>=7){let r=v;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);const b=v<<12|r;
      for(let i=0;i<18;i++){const bt=((b>>>i)&1)===1,a=size-11+i%3,c=Math.floor(i/3);set(a,c,bt);set(c,a,bt);}}
    let i=0;
    for(let right=size-1;right>=1;right-=2){
      if(right===6)right=5;
      for(let vert=0;vert<size;vert++)for(let j=0;j<2;j++){
        const x=right-j,up=((right+1)&2)===0,y=up?size-1-vert:vert;
        if(!F[y][x]&&i<all.length*8){M[y][x]=((all[i>>>3]>>>(7-(i&7)))&1)===1;i++;}
      }
    }
    const MASKS=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,
      (x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>x*y%2+x*y%3===0,
      (x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
    const applyMask=m=>{for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(!F[y][x]&&MASKS[m](x,y))M[y][x]=!M[y][x];};
    const penalty=()=>{let p=0,dark=0;
      for(let y=0;y<size;y++){let run=1;for(let x=1;x<size;x++){if(M[y][x]===M[y][x-1]){run++;if(run===5)p+=3;else if(run>5)p++;}else run=1;}}
      for(let x=0;x<size;x++){let run=1;for(let y=1;y<size;y++){if(M[y][x]===M[y-1][x]){run++;if(run===5)p+=3;else if(run>5)p++;}else run=1;}}
      for(let y=0;y<size-1;y++)for(let x=0;x<size-1;x++){const c=M[y][x];if(c===M[y][x+1]&&c===M[y+1][x]&&c===M[y+1][x+1])p+=3;}
      M.forEach(r=>r.forEach(c=>{if(c)dark++;}));
      p+=Math.floor(Math.abs(dark*20-size*size*10)/(size*size))*10;return p;};
    let best=0,bp=Infinity;
    for(let m=0;m<8;m++){applyMask(m);drawFormat(m);const p=penalty();if(p<bp){bp=p;best=m;}applyMask(m);}
    applyMask(best);drawFormat(best);
    return{size,modules:M};
  }
  function toCanvas(canvas,text,{dark='#1f2a44',light='#f6f8fb',quiet=3}={}){
    const q=encode(text),n=q.size+quiet*2,ctx=canvas.getContext('2d');
    const W=canvas.width,cell=Math.floor(W/n),off=Math.floor((W-cell*n)/2);
    ctx.fillStyle=light;ctx.fillRect(0,0,W,canvas.height);ctx.fillStyle=dark;
    for(let y=0;y<q.size;y++)for(let x=0;x<q.size;x++)if(q.modules[y][x])ctx.fillRect(off+(x+quiet)*cell,off+(y+quiet)*cell,cell,cell);
    return q;
  }
  return{encode,toCanvas};
})();
if(typeof module!=='undefined')module.exports={QR};
