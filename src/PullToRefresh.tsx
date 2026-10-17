import React,{useEffect,useState} from 'react';
import {canManuallyReload} from './useAppUpdate';

export function PullToRefresh(){
 const [distance,setDistance]=useState(0),[refreshing,setRefreshing]=useState(false);
 useEffect(()=>{
  if(!window.matchMedia('(pointer: coarse)').matches)return;
  let start:{x:number;y:number}|null=null,pull=0,loading=false;
  const reset=()=>{start=null;pull=0;setDistance(0);};
  const begin=(event:TouchEvent)=>{
   reset();
   if(loading||event.touches.length!==1||window.scrollY>0||!canManuallyReload())return;
   const target=event.target instanceof Element?event.target:null;
   if(target?.closest('button,a,input,textarea,select,[contenteditable],.photo-grid'))return;
   // Nested scroll regions own their gestures, even when at their upper edge.
   for(let element=target;element&&element!==document.body;element=element.parentElement){
    if(/auto|scroll/.test(getComputedStyle(element).overflowY)&&element.scrollHeight>element.clientHeight)return;
   }
   start={x:event.touches[0].clientX,y:event.touches[0].clientY};
  };
  const move=(event:TouchEvent)=>{
   if(!start)return;
   if(event.touches.length!==1||!canManuallyReload()||window.scrollY>0){reset();return;}
   const dy=event.touches[0].clientY-start.y,dx=Math.abs(event.touches[0].clientX-start.x);
   if(dy<0||dx>Math.max(12,dy)){reset();return;}
   if(dy<10)return;
   if(!event.cancelable){reset();return;}
   event.preventDefault();
   pull=Math.min(110,dy*0.5);setDistance(pull);
  };
  const end=()=>{
   const ready=pull>=70&&canManuallyReload();reset();
   if(ready){loading=true;setRefreshing(true);window.location.reload();}
  };
  document.documentElement.classList.add('pull-refresh-enabled');
  document.addEventListener('touchstart',begin,{passive:true});
  document.addEventListener('touchmove',move,{passive:false});
  document.addEventListener('touchend',end);
  document.addEventListener('touchcancel',reset);
  return()=>{
   document.documentElement.classList.remove('pull-refresh-enabled');
   document.removeEventListener('touchstart',begin);document.removeEventListener('touchmove',move);
   document.removeEventListener('touchend',end);document.removeEventListener('touchcancel',reset);
  };
 },[]);
 return <div className="pull-refresh-status" role="status" aria-live="polite" hidden={!distance&&!refreshing}>
  {refreshing?'Wird aktualisiert …':distance>=70?'Loslassen zum Aktualisieren':'Zum Aktualisieren weiter ziehen'}
 </div>;
}
