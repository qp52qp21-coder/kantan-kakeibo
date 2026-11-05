// キャプチャ用のサンプルデータ(どの版にも同じものを入れる)
(function(){
  const now=new Date(), y=now.getFullYear(), m=now.getMonth();
  const d=(mo,day)=>{const t=new Date(y,m+mo,day);return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');};
  const td=now.getDate();
  const tx=[
    {type:'income',amount:80000,category:'仕送り',method:'sbi',date:d(0,1)},
    {type:'transfer',amount:20000,from:'sbi',to:'paypay',date:d(0,1)},
    {type:'expense',amount:850,category:'食費',method:'cash',date:d(0,td),memo:'ラーメン'},
    {type:'expense',amount:2400,category:'食費',method:'sbi',date:d(0,Math.max(1,td-1)),memo:'スーパー'},
    {type:'expense',amount:1200,category:'交通費',method:'suica',date:d(0,Math.max(1,td-1))},
    {type:'expense',amount:3500,category:'交際費',method:'paypay',date:d(0,Math.max(1,td-2)),memo:'友だちとカフェ'},
    {type:'expense',amount:1980,category:'趣味娯楽費',method:'paypay',date:d(0,Math.max(1,td-3))},
    {type:'expense',amount:2750,category:'教材費',method:'sbi',date:d(0,Math.max(1,td-4)),memo:'参考書'},
    {type:'expense',amount:4300,category:'通信費',method:'sbi',date:d(0,2)},
    {type:'income',amount:80000,category:'仕送り',method:'sbi',date:d(-1,1)},
    {type:'expense',amount:21000,category:'食費',method:'sbi',date:d(-1,15)},
    {type:'expense',amount:9000,category:'交際費',method:'paypay',date:d(-1,20)},
    {type:'income',amount:80000,category:'仕送り',method:'sbi',date:d(-2,1)},
    {type:'expense',amount:26000,category:'食費',method:'sbi',date:d(-2,15)},
    {type:'income',amount:80000,category:'仕送り',method:'sbi',date:d(-3,1)},
    {type:'expense',amount:31000,category:'食費',method:'sbi',date:d(-3,15)},
  ].map((t,i)=>({id:'demo'+i,createdAt:{seconds:1000-i},...t}));
  me='t1';
  txCache.t1=tx; if('t2' in txCache) txCache.t2=[];
  calcBalances=async()=>({sbi:38420,paypay:14520,suica:2800,merpay:0,cash:4150,other:0});
  try{ document.querySelectorAll('.overlay,.loading,#loading,#load-error').forEach(e=>e.style.display='none'); }catch(e){}
  showScreen('#scr-app');
  if(typeof initInputUI==='function') initInputUI();
  const who=document.querySelector('#app-who'); if(who) who.textContent='みづき';
})();
