import {RoomSymbol} from './RoomSymbol';
import {useEffect,useId,useRef,useState} from 'react';
import {Modal} from './Modal';
import {Icon} from './Icon';
type Room={id:string;name:string;color:string;symbol?:string};
export function ManagedRoom({room,onEdit,onDelete}:{room:Room;onEdit:()=>void;onDelete:()=>void}){
 const [open,setOpen]=useState(false),id=useId();
 const trigger=useRef<HTMLButtonElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),start=useRef<{x:number;y:number}|null>(null);
 function cancel(){if(timer.current!==null)clearTimeout(timer.current);timer.current=null;start.current=null;}
 function show(){cancel();trigger.current?.focus();setOpen(true);}
 function close(){setOpen(false);requestAnimationFrame(()=>trigger.current?.focus());}
 useEffect(()=>{const stop=()=>cancel();window.addEventListener('scroll',stop,true);return()=>{cancel();window.removeEventListener('scroll',stop,true);};},[]);
 return <><div className="managed-room managed-room-compact" onContextMenu={event=>{event.preventDefault();show();}} onPointerDown={event=>{cancel();if(event.pointerType==='mouse'||!event.isPrimary||(event.target as Element).closest('button'))return;start.current={x:event.clientX,y:event.clientY};timer.current=setTimeout(show,550);}} onPointerMove={event=>{if(start.current&&Math.hypot(event.clientX-start.current.x,event.clientY-start.current.y)>10)cancel();}} onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel}>
 <RoomSymbol symbol={room.symbol} color={room.color}/><span>{room.name}</span><button ref={trigger} className="room-actions-trigger" type="button" aria-label={`Aktionen für Raum ${room.name}`} title="Raumaktionen" aria-haspopup="dialog" aria-expanded={open} onClick={show}>···</button>
 </div>{open&&<Modal titleId={id} className="room-actions-sheet" onClose={close}><h2 id={id}>{room.name}</h2><button type="button" onClick={()=>{setOpen(false);onEdit();}}><Icon name="edit"/>Raum bearbeiten</button><button type="button" className="room-remove-action" onClick={()=>{setOpen(false);onDelete();}}>Raum löschen</button><button type="button" onClick={close}>Abbrechen</button></Modal>}</>;
}
