import React,{useEffect,useState} from 'react';

export function ListScrollButtons({selecting}:{selecting:boolean}){
 const [layout,setLayout]=useState({long:false,barHeight:0});
 useEffect(()=>{
  const bar=document.querySelector('.selection-bar');
  const update=()=>setLayout({long:document.documentElement.scrollHeight>window.innerHeight+160,barHeight:bar?.getBoundingClientRect().height||0});
  const observer=new ResizeObserver(update);
  observer.observe(document.body);
  if(bar)observer.observe(bar);
  window.addEventListener('resize',update);
  update();
  return()=>{observer.disconnect();window.removeEventListener('resize',update);};
 },[selecting]);
 function jump(end:boolean){
  window.scrollTo({top:end?document.documentElement.scrollHeight:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }
 if(!layout.long)return null;
 return <div className="list-scroll-buttons" role="group" aria-label="In der Kartonliste springen" style={{bottom:layout.barHeight?layout.barHeight+12:undefined}}>
  <button type="button" aria-label="Zum Anfang springen" title="Zum Anfang springen" onClick={()=>jump(false)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h14M6 13l6-6 6 6M12 7v13"/></svg></button>
  <button type="button" aria-label="Zum Ende springen" title="Zum Ende springen" onClick={()=>jump(true)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 20h14M6 11l6 6 6-6M12 17V4"/></svg></button>
 </div>;
}
