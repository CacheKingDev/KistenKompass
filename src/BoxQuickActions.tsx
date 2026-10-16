import {useEffect,useId,useRef,useState,type HTMLAttributes} from 'react';
import {Modal} from './Modal';
import {Icon} from './Icon';
import type {Box} from './BoxDetails';

export function useBoxQuickActions(enabled:boolean){
 const [boxId,setBoxId]=useState<string|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),start=useRef<{x:number;y:number}|null>(null),consumed=useRef(false),trigger=useRef<HTMLElement|null>(null);
 function cancel(){if(timer.current!==null)clearTimeout(timer.current);timer.current=null;start.current=null;}
 function open(id:string,element:HTMLElement){cancel();trigger.current=element.matches('.box-quick-trigger')?element:element.querySelector<HTMLElement>('.box-quick-trigger')||element;trigger.current?.focus();setBoxId(id);}
 function close(){setBoxId(null);requestAnimationFrame(()=>trigger.current?.focus());}
 useEffect(()=>{const stop=()=>cancel();window.addEventListener('scroll',stop,true);return()=>{cancel();window.removeEventListener('scroll',stop,true);};},[]);
 useEffect(()=>{if(!enabled){cancel();setBoxId(null);}},[enabled]);
 function handlers(id:string):HTMLAttributes<HTMLElement>{return enabled?{
  onPointerDown:event=>{cancel();consumed.current=false;if(event.pointerType==='mouse'||!event.isPrimary||(event.target as Element).closest('input,label,.box-quick-trigger'))return;start.current={x:event.clientX,y:event.clientY};const element=event.currentTarget;timer.current=setTimeout(()=>{consumed.current=true;open(id,element);},550);},
  onPointerMove:event=>{if(start.current&&Math.hypot(event.clientX-start.current.x,event.clientY-start.current.y)>10)cancel();},
  onPointerUp:cancel,onPointerCancel:cancel,onPointerLeave:cancel,
  onClickCapture:event=>{if(consumed.current){consumed.current=false;event.preventDefault();event.stopPropagation();}},
  onKeyDown:event=>{if(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10')){event.preventDefault();open(id,event.currentTarget);}},
  onContextMenu:event=>{event.preventDefault();consumed.current=true;open(id,event.currentTarget);}
 }:{};}
 return {boxId,open,close,handlers};
}

export function BoxQuickActions({box,onClose,onChange,onStatusChange}:{box:Box;onClose:()=>void;onChange:(field:'fragile'|'heavy',value:boolean)=>Promise<void>;onStatusChange:(status:string)=>Promise<void>}){
 const id=useId(),busy=useRef(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
 async function toggle(field:'fragile'|'heavy'){
  if(busy.current)return;busy.current=true;setSaving(true);setError('');
  try{await onChange(field,!box[field]);}catch(error){setError(error instanceof Error?error.message:'Speichern fehlgeschlagen');}finally{busy.current=false;setSaving(false);}
 }
 async function changeStatus(status:string){
  if(busy.current||status===box.status)return;busy.current=true;setSaving(true);setError('');
  try{await onStatusChange(status);}catch(error){setError(error instanceof Error?error.message:'Speichern fehlgeschlagen');}finally{busy.current=false;setSaving(false);}
 }
 return <Modal titleId={id} className="box-quick-sheet" onClose={()=>{if(!busy.current)onClose();}}>
  <small>Karton #{String(box.number).padStart(3,'0')} · {box.name}</small><h2 id={id}>Quickmenü</h2>
  <p className="muted">Status und Kennzeichnungen direkt ändern.</p>
  {error&&<p role="alert" className="error">{error}</p>}
  <label htmlFor={id+'-status'}>Status<select id={id+'-status'} disabled={saving} value={box.status} onChange={event=>void changeStatus(event.target.value)}>{['In Vorbereitung','Gepackt','Transportiert','Angekommen','Ausgepackt'].map(status=><option key={status}>{status}</option>)}</select></label>
  <div className="box-quick-toggles">{(['fragile','heavy'] as const).map(field=><button key={field} type="button" aria-pressed={box[field]} disabled={saving} onClick={()=>toggle(field)}><Icon name={field}/><span>{field==='fragile'?'Zerbrechlich':'Schwer'}</span><span className="box-quick-state" aria-hidden="true">{box[field]?'✓':'–'}</span></button>)}</div>
  <p className="box-quick-status" role="status">{saving?'Wird gespeichert …':'Änderungen werden sofort gespeichert.'}</p>
  <button type="button" className="box-quick-done" disabled={saving} onClick={onClose}>Fertig</button>
 </Modal>;
}
