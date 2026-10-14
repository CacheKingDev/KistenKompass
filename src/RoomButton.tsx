import {useEffect,useRef,useState} from 'react';
type Room={id:string;name:string;color:string};
export function RoomButton({room,count,selected,onSelect,onEdit}:{room:Room;count:number;selected:boolean;onSelect:()=>void;onEdit:()=>void}){
 const [menu,setMenu]=useState<{x:number;y:number}|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const start=useRef<{x:number;y:number}|null>(null);
 const consumed=useRef(false),trigger=useRef<HTMLButtonElement>(null),action=useRef<HTMLButtonElement>(null);
 function cancel(){if(timer.current!==null)clearTimeout(timer.current);timer.current=null;start.current=null;}
 function open(x:number,y:number){cancel();consumed.current=true;setMenu({x:Math.max(8,Math.min(x,window.innerWidth-208)),y:Math.max(8,Math.min(y,window.innerHeight-72))});}
 function close(){setMenu(null);trigger.current?.focus();}
 useEffect(()=>()=>cancel(),[]);
 useEffect(()=>{if(!menu)return;action.current?.focus();const dismiss=()=>close();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close();}};window.addEventListener('resize',dismiss);window.addEventListener('scroll',dismiss,true);window.addEventListener('keydown',key);return()=>{window.removeEventListener('resize',dismiss);window.removeEventListener('scroll',dismiss,true);window.removeEventListener('keydown',key);};},[menu]);
 return <><button ref={trigger} className={`room-trigger ${selected?'selected':''}`} aria-haspopup="menu" aria-expanded={!!menu} title="Lange drücken oder Rechtsklick zum Bearbeiten" onClick={e=>{if(consumed.current&&e.detail!==0){consumed.current=false;e.preventDefault();return;}onSelect();}} onContextMenu={e=>{e.preventDefault();open(e.clientX,e.clientY);}} onKeyDown={e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();const r=e.currentTarget.getBoundingClientRect();open(r.left,r.bottom);}}} onPointerDown={e=>{cancel();consumed.current=false;if(e.pointerType==='mouse'||!e.isPrimary)return;start.current={x:e.clientX,y:e.clientY};const x=e.clientX,y=e.clientY;timer.current=setTimeout(()=>open(x,y),550);}} onPointerMove={e=>{if(start.current&&Math.hypot(e.clientX-start.current.x,e.clientY-start.current.y)>10)cancel();}} onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel}><i style={{background:room.color}}/>{room.name} · {count}</button>{menu&&<div className="room-menu-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)close();}} onContextMenu={e=>{e.preventDefault();close();}}><div role="menu" aria-label={`${room.name}: Aktionen`} className="room-menu" style={{left:menu.x,top:menu.y}}><button ref={action} role="menuitem" onClick={()=>{close();onEdit();}}>Raum bearbeiten</button></div></div>}</>;
}
