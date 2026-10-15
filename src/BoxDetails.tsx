import {useId,useRef,useState} from 'react';
import {Modal} from './Modal';
import {PhotoGallery} from './PhotoGallery';
import type {Photo} from './BoxPhotos';

export type Box={photos?:Photo[];id?:string;number?:number;name:string;roomId:string;items:string[];type:string;fragile:boolean;heavy:boolean;status:string;transporter:string;departed:string};
export function BoxDetails({box,room,move,onClose,onEdit}:{box:Box;room?:{name:string;color:string};move:string;onClose:()=>void;onEdit:()=>void}){
 const [tab,setTab]=useState<'content'|'photos'|'details'>('content');
 const id=useId(),panel=useRef<HTMLDivElement>(null);
 const tabs=[{id:'content',label:'Inhalt'},{id:'photos',label:'Fotos'},{id:'details',label:'Details'}] as const;
 function selectTab(next:typeof tab){setTab(next);if(panel.current)panel.current.scrollTop=0;}
 const departed=box.departed?new Date(box.departed):null;
 return <Modal titleId="box-details-title" className="box-details" onClose={onClose}>
  <div className="box-details-top"><span className="box-number">Karton #{String(box.number).padStart(3,'0')}</span><button type="button" onClick={onClose}>Schließen</button></div>
  <div className="box-details-tabs" role="tablist" aria-label="Kartonbereiche">{tabs.map((item,index)=><button key={item.id} id={id+'-tab-'+item.id} type="button" role="tab" aria-selected={tab===item.id} aria-controls={id+'-panel'} tabIndex={tab===item.id?0:-1} onClick={()=>selectTab(item.id)} onKeyDown={event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();selectTab(tabs[next].id);document.getElementById(id+'-tab-'+tabs[next].id)?.focus();}}>{item.label}{item.id==='photos'&&<span className="box-tab-count">{box.photos?.length||0}</span>}</button>)}</div>
  <div ref={panel} className="box-details-panel" id={id+'-panel'} role="tabpanel" aria-labelledby={id+'-tab-'+tab} tabIndex={0}>
  <h2 id="box-details-title">{box.name}</h2>
  {tab==='content'&&<><div className="box-detail-tags"><span className="box-room"><i style={{background:room?.color||'#ddd'}} aria-hidden="true"/>{room?.name||'Ohne Raum'}</span><span>{box.status}</span>{box.fragile&&<span>Zerbrechlich</span>}{box.heavy&&<span>Schwer</span>}</div>
  <section className="box-details-content"><h3>Inhalt</h3>{box.items.some(item=>item.trim())?<ul>{box.items.filter(item=>item.trim()).map((item,index)=><li key={index}>{item}</li>)}</ul>:<p className="muted">Noch kein Inhalt erfasst.</p>}</section></>}
  {tab==='photos'&&<section className="box-details-photos"><h3>Fotos <span className="count">{box.photos?.length||0}</span></h3>{box.photos?.length?<PhotoGallery photos={box.photos} boxId={box.id} move={move}/>:<p className="muted">Noch keine Fotos vorhanden.</p>}</section>}
  {tab==='details'&&<dl className="box-detail-facts"><div><dt>Kartonart</dt><dd>{box.type}</dd></div><div><dt>Transporteur</dt><dd>{box.transporter||'Noch offen'}</dd></div><div><dt>Abtransportiert am</dt><dd>{departed&&!Number.isNaN(departed.getTime())?departed.toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'}):'Noch offen'}</dd></div></dl>}
  </div>
  <div className="box-details-actions"><button type="button" className="primary" onClick={onEdit}>Karton bearbeiten</button></div>
 </Modal>;
}
