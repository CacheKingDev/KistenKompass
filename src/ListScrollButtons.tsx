import React,{useEffect,useState,useRef,useId} from 'react';

export function ListScrollButtons({selecting}:{selecting:boolean}){
 const [expanded,setExpanded]=useState(false);
 const handle=useRef<HTMLButtonElement>(null),gesture=useRef<{x:number;y:number}|null>(null),swiped=useRef(false);
 const panelId=useId();
 function collapse(){setExpanded(false);handle.current?.focus({preventScroll:true});}
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
  collapse();
  window.scrollTo({top:end?document.documentElement.scrollHeight:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }
 if(!layout.long)return null;
 return <div className="list-scroll-buttons" role="group" aria-label="In der Kartonliste springen" style={{bottom:layout.barHeight?layout.barHeight+12:undefined}}
  onKeyDown={event=>{if(event.key==='Escape'&&expanded){event.preventDefault();event.stopPropagation();collapse();}}}
  onPointerDown={event=>{if(!event.isPrimary||event.button!==0)return;gesture.current={x:event.clientX,y:event.clientY};swiped.current=false;}}
  onPointerMove={event=>{if(!gesture.current)return;const dx=event.clientX-gesture.current.x,dy=event.clientY-gesture.current.y;if(Math.abs(dy)>20&&Math.abs(dy)>Math.abs(dx)){gesture.current=null;return;}if(Math.abs(dx)>=32&&Math.abs(dx)>Math.abs(dy)*1.5){swiped.current=true;gesture.current=null;if(dx<0)setExpanded(true);else collapse();}}}
  onPointerUp={()=>{gesture.current=null;}}
  onPointerCancel={()=>{gesture.current=null;swiped.current=false;}}
  onClickCapture={event=>{if(swiped.current&&event.detail!==0){swiped.current=false;event.preventDefault();event.stopPropagation();}}}>
  <button ref={handle} type="button" className="list-scroll-handle" aria-expanded={expanded} aria-controls={panelId} aria-label={expanded?'Sprungtasten einklappen':'Sprungtasten ausklappen'} title={expanded?'Sprungtasten einklappen':'Sprungtasten ausklappen'} onClick={()=>setExpanded(value=>!value)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={expanded?'m9 6 6 6-6 6':'m15 6-6 6 6 6'}/></svg></button>
  <div id={panelId} className="list-scroll-panel" hidden={!expanded}>
  <button type="button" aria-label="Zum Anfang springen" title="Zum Anfang springen" onClick={()=>jump(false)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h14M6 13l6-6 6 6M12 7v13"/></svg></button>
  <button type="button" aria-label="Zum Ende springen" title="Zum Ende springen" onClick={()=>jump(true)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 20h14M6 11l6 6 6-6M12 17V4"/></svg></button>
  </div>
 </div>;
}
