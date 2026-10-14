import {useEffect,useRef,useState} from 'react';
import {Modal} from './Modal';
import type {Photo} from './BoxPhotos';

export function PhotoGallery({photos,boxId,move,onChange,disabled=false}:{photos:Photo[];boxId?:string;move:string;onChange?:(photos:Photo[])=>void;disabled?:boolean}){
 const [active,setActive]=useState<string|null>(null),[menu,setMenu]=useState<string|null>(null),[zoom,setZoom]=useState(false),[removed,setRemoved]=useState<{photo:Photo;index:number}|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),start=useRef<{x:number;y:number}|null>(null),consumed=useRef(false);
 function cancel(){if(timer.current)clearTimeout(timer.current);timer.current=null;start.current=null;}
 useEffect(()=>cancel,[]);
 const source=(photo:Photo)=>photo.data||`/api/boxes/${encodeURIComponent(boxId!)}/photos/${encodeURIComponent(photo.id)}?move=${encodeURIComponent(move)}`;
 const index=photos.findIndex(photo=>photo.id===active),current=photos[index];
 function open(id:string){setZoom(false);setActive(id);}
 function step(direction:number){if(!photos.length)return;setZoom(false);setActive(photos[(index+direction+photos.length)%photos.length].id);}
 return <>
  {onChange&&photos.length>0&&<p className="photo-menu-hint muted">Foto antippen zum Ansehen. Lange drücken oder ··· für Aktionen.</p>}
  <div className="photo-grid">{photos.map((photo,i)=><div key={photo.id} className="photo-item">
   <button className={`photo-thumbnail ${onChange?'photo-hold':''}`} type="button" aria-label={`Foto ${i+1} vergrößern`} aria-haspopup="dialog" disabled={disabled} onClick={event=>{if(consumed.current&&event.detail!==0){consumed.current=false;event.preventDefault();return;}open(photo.id);}}
    onContextMenu={event=>{if(onChange){event.preventDefault();cancel();consumed.current=true;setMenu(photo.id);}}}
    onPointerDown={event=>{cancel();consumed.current=false;if(!onChange||event.pointerType==='mouse'||!event.isPrimary)return;start.current={x:event.clientX,y:event.clientY};timer.current=setTimeout(()=>{cancel();consumed.current=true;setMenu(photo.id);},550);}}
    onPointerMove={event=>{if(start.current&&Math.hypot(event.clientX-start.current.x,event.clientY-start.current.y)>10)cancel();}} onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel}
    onKeyDown={event=>{if(onChange&&(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10'))){event.preventDefault();setMenu(photo.id);}}}>
    <img src={source(photo)} alt={`Kartonfoto ${i+1}`} width="320" height="320" loading="lazy" draggable={false}/>
   </button>
   {onChange&&<button className="photo-menu-trigger" type="button" aria-label={`Aktionen für Foto ${i+1}`} aria-haspopup="dialog" disabled={disabled} onClick={()=>{consumed.current=false;setMenu(photo.id);}}>···</button>}
  </div>)}</div>
  {removed&&onChange&&<div className="photo-undo" role="status"><span>Foto entfernt. Wird beim Speichern übernommen.</span><button type="button" disabled={disabled||photos.length>=6} onClick={()=>{const next=[...photos];next.splice(removed.index,0,removed.photo);onChange(next);setRemoved(null);}}>Rückgängig</button></div>}
  {menu&&onChange&&<Modal titleId="photo-actions-title" className="photo-actions-sheet" onClose={()=>setMenu(null)}><h2 id="photo-actions-title">Foto {photos.findIndex(photo=>photo.id===menu)+1}</h2><button type="button" onClick={()=>{const id=menu;setMenu(null);open(id);}}>Foto ansehen</button><button type="button" className="photo-remove-action" disabled={disabled} onClick={()=>{const i=photos.findIndex(photo=>photo.id===menu);if(i>=0){setRemoved({photo:photos[i],index:i});onChange(photos.filter(photo=>photo.id!==menu));}setMenu(null);}}>Foto entfernen</button><button type="button" onClick={()=>setMenu(null)}>Abbrechen</button></Modal>}
  {current&&<Modal titleId="photo-view-title" className="photo-viewer" onClose={()=>setActive(null)}><div className="photo-viewer-toolbar"><h2 id="photo-view-title" aria-live="polite">Foto {index+1} von {photos.length}</h2><button type="button" onClick={()=>setActive(null)}>Foto schließen</button></div><div className={`photo-viewer-stage ${zoom?'is-zoomed':''}`}><img key={current.id} src={source(current)} alt={`Vergrößertes Kartonfoto ${index+1}`} width="1600" height="1600"/></div><div className="photo-viewer-controls" onKeyDown={event=>{if(event.key==='ArrowLeft'){event.preventDefault();step(-1);}if(event.key==='ArrowRight'){event.preventDefault();step(1);}}}><button type="button" disabled={photos.length<2} onClick={()=>step(-1)} aria-label="Vorheriges Foto">←</button><button type="button" aria-pressed={zoom} onClick={()=>setZoom(!zoom)}>{zoom?'Ganzes Foto':'Vergrößern'}</button><button type="button" disabled={photos.length<2} onClick={()=>step(1)} aria-label="Nächstes Foto">→</button></div></Modal>}
 </>;
}
