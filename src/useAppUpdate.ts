import {useEffect,useLayoutEffect} from 'react';
import {createUpdateCheck} from './appUpdate';
declare const __BUILD_ID__:string;
const blockers=new Set<symbol>();
export function canManuallyReload(){
 return blockers.size===0&&!document.querySelector('dialog[open],.overlay,.label-overlay,.profile-menu,input:focus,textarea:focus,select:focus,[contenteditable="true"]:focus');
}

export function useUpdateProtection(blocked:boolean){
 useLayoutEffect(()=>{
  if(!blocked)return;
  const key=Symbol();blockers.add(key);
  return()=>{blockers.delete(key);};
 },[blocked]);
}

export function useAppUpdate(){
 useEffect(()=>{
  let disposed=false;
  const check=createUpdateCheck({
   buildId:__BUILD_ID__,
   fetchVersion:async()=>{
    const response=await fetch('/version.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('Version unavailable');
    return response.json();
   },
   canReload:()=>!disposed&&!document.hidden&&blockers.size===0&&!document.querySelector('input:focus,textarea:focus,select:focus,[contenteditable="true"]:focus'),
   reload:()=>location.reload(),
  });
  const resume=()=>{if(!document.hidden)void check();};
  const timer=setInterval(resume,60000);
  document.addEventListener('visibilitychange',resume);
  window.addEventListener('pageshow',resume);
  window.addEventListener('online',resume);
  resume();
  return()=>{disposed=true;clearInterval(timer);document.removeEventListener('visibilitychange',resume);window.removeEventListener('pageshow',resume);window.removeEventListener('online',resume);};
 },[]);
}
