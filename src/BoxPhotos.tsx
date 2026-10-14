import React,{useRef,useState} from 'react';
export type Photo={id:string;data?:string};

async function preparePhoto(file:File):Promise<Photo>{
 if(file.size>30*1024*1024)throw Error('Bitte ein Foto mit höchstens 30 MB auswählen.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;
  try{await image.decode();}catch{throw Error('Dieses Foto kann nicht gelesen werden. Bitte JPEG, PNG oder WebP auswählen.');}
  const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context)throw Error('Foto konnte nicht vorbereitet werden.');
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  let data=canvas.toDataURL('image/jpeg',.8);
  if(data.length>1400000)data=canvas.toDataURL('image/jpeg',.55);
  if(data.length>1398100)throw Error('Das Foto ist zu groß. Bitte ein kleineres Bild auswählen.');
  return {id:crypto.randomUUID(),data};
 }finally{URL.revokeObjectURL(url);}
}

export function BoxPhotos({photos,boxId,move,onChange,onBusy,disabled}:{photos:Photo[];boxId?:string;move:string;onChange:(photos:Photo[])=>void;onBusy:(busy:boolean)=>void;disabled:boolean}){
 const library=useRef<HTMLInputElement>(null),camera=useRef<HTMLInputElement>(null),working=useRef(false);
 const [error,setError]=useState(''),[expanded,setExpanded]=useState<string|null>(null),[busy,setBusy]=useState(false);
 async function add(event:React.ChangeEvent<HTMLInputElement>){
  const files=Array.from(event.target.files||[]);event.target.value='';if(!files.length||working.current)return;
  setError('');if(files.length+photos.length>6){setError('Du kannst bis zu 6 Fotos pro Karton hinzufügen.');return;}
  working.current=true;setBusy(true);onBusy(true);
  try{const added:Photo[]=[];for(const file of files)added.push(await preparePhoto(file));onChange([...photos,...added]);}catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);onBusy(false);}
 }
 const source=(photo:Photo)=>photo.data||`/api/boxes/${encodeURIComponent(boxId!)}/photos/${encodeURIComponent(photo.id)}?move=${encodeURIComponent(move)}`;
 return <section className="box-photos" aria-labelledby="photos-title">
  <h3 id="photos-title">Fotos <span className="count">{photos.length}/6</span></h3>
  <p className="muted">Karton oder Inhalt fotografieren. Änderungen werden mit „Speichern“ übernommen.</p>
  <input ref={library} type="file" accept="image/*" multiple hidden aria-label="Fotos auswählen" onChange={add}/>
  <input ref={camera} type="file" accept="image/*" capture="environment" hidden aria-label="Foto aufnehmen" onChange={add}/>
  <div className="photo-controls"><button type="button" disabled={disabled||busy||photos.length>=6} onClick={()=>library.current?.click()}>Fotos hinzufügen</button><button type="button" disabled={disabled||busy||photos.length>=6} onClick={()=>camera.current?.click()}>Foto aufnehmen</button></div>
  {busy&&<p role="status">Fotos werden vorbereitet …</p>}{error&&<p className="error" role="alert">{error}</p>}
  <div className="photo-grid">{photos.map((photo,index)=><div key={photo.id} className="photo-item"><button className="photo-thumbnail" type="button" aria-label={`Foto ${index+1} ${expanded===photo.id?'verkleinern':'vergrößern'}`} aria-expanded={expanded===photo.id} disabled={disabled||busy} onClick={()=>setExpanded(expanded===photo.id?null:photo.id)}><img src={source(photo)} alt={`Kartonfoto ${index+1}`}/></button><button type="button" disabled={disabled||busy} onClick={()=>{onChange(photos.filter(p=>p.id!==photo.id));if(expanded===photo.id)setExpanded(null);}} aria-label={`Foto ${index+1} entfernen`}>Entfernen</button></div>)}</div>
  {expanded&&photos.some(p=>p.id===expanded)&&<div className="photo-expanded"><img src={source(photos.find(p=>p.id===expanded)!)} alt="Vergrößertes Kartonfoto"/><button type="button" onClick={()=>setExpanded(null)}>Foto schließen</button></div>}
 </section>;
}
