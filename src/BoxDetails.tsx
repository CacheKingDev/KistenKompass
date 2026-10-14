import {Modal} from './Modal';
import {PhotoGallery} from './PhotoGallery';
import type {Photo} from './BoxPhotos';

export type Box={photos?:Photo[];id?:string;number?:number;name:string;roomId:string;items:string[];type:string;fragile:boolean;heavy:boolean;status:string;transporter:string;departed:string};
export function BoxDetails({box,room,move,onClose,onEdit}:{box:Box;room?:{name:string;color:string};move:string;onClose:()=>void;onEdit:()=>void}){
 const departed=box.departed?new Date(box.departed):null;
 return <Modal titleId="box-details-title" className="box-details" onClose={onClose}>
  <div className="box-details-top"><span className="box-number">Karton #{String(box.number).padStart(3,'0')}</span><button type="button" onClick={onClose}>Schließen</button></div>
  <h2 id="box-details-title">{box.name}</h2>
  <div className="box-detail-tags"><span className="box-room"><i style={{background:room?.color||'#ddd'}} aria-hidden="true"/>{room?.name||'Ohne Raum'}</span><span>{box.status}</span>{box.fragile&&<span>Zerbrechlich</span>}{box.heavy&&<span>Schwer</span>}</div>
  <section className="box-details-content"><h3>Inhalt</h3>{box.items.some(item=>item.trim())?<ul>{box.items.filter(item=>item.trim()).map((item,index)=><li key={index}>{item}</li>)}</ul>:<p className="muted">Noch kein Inhalt erfasst.</p>}</section>
  <section className="box-details-photos"><h3>Fotos <span className="count">{box.photos?.length||0}</span></h3>{box.photos?.length?<PhotoGallery photos={box.photos} boxId={box.id} move={move}/>:<p className="muted">Noch keine Fotos vorhanden.</p>}</section>
  <dl className="box-detail-facts"><div><dt>Kartonart</dt><dd>{box.type}</dd></div><div><dt>Transporteur</dt><dd>{box.transporter||'Noch offen'}</dd></div><div><dt>Abtransportiert am</dt><dd>{departed&&!Number.isNaN(departed.getTime())?departed.toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'}):'Noch offen'}</dd></div></dl>
  <div className="box-details-actions"><button type="button" className="primary" onClick={onEdit}>Karton bearbeiten</button></div>
 </Modal>;
}
