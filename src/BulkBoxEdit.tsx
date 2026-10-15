import {useEffect,useId,useRef,useState} from 'react';
import {Modal} from './Modal';
import type {Box} from './BoxDetails';

export type BulkBoxChanges={currentLocation?:string;status?:string;transporter?:string};
const fields=[{key:'currentLocation',label:'Aktueller Standort',placeholder:'z. B. Transporter oder Garage'},{key:'status',label:'Status',placeholder:''},{key:'transporter',label:'Transporteur',placeholder:'Name des Transporteurs'}] as const;
export function BulkBoxEdit({boxes,hiddenCount,statuses,onClose,onSave}:{boxes:Box[];hiddenCount:number;statuses:string[];onClose:()=>void;onSave:(changes:BulkBoxChanges)=>Promise<void>}){
 const id=useId(),busy=useRef(false),errorMessage=useRef<HTMLParagraphElement>(null);
 const [enabled,setEnabled]=useState<Set<keyof BulkBoxChanges>>(new Set()),[values,setValues]=useState({currentLocation:'',status:'',transporter:''}),[saving,setSaving]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(error)errorMessage.current?.focus();},[error]);
 function toggle(key:keyof BulkBoxChanges){setEnabled(current=>{const next=new Set(current);if(next.has(key))next.delete(key);else next.add(key);return next;});}
 async function save(){if(busy.current||!enabled.size||(enabled.has('status')&&!values.status))return;busy.current=true;setSaving(true);setError('');const changes:BulkBoxChanges={};for(const field of enabled)changes[field]=values[field].trim();try{await onSave(changes);}catch(error){setError(error instanceof Error?error.message:'Änderungen konnten nicht gespeichert werden. Bitte erneut versuchen.');}finally{busy.current=false;setSaving(false);}}
 return <Modal titleId={id} className="bulk-edit" onClose={()=>{if(!busy.current)onClose();}}><form onSubmit={event=>{event.preventDefault();save();}}>
  <div className="bulk-edit-heading"><div><p className="bulk-edit-count">{boxes.length} {boxes.length===1?'Karton ausgewählt':'Kartons ausgewählt'}</p><h2 id={id}>Gemeinsam ändern</h2></div><button type="button" disabled={saving} onClick={onClose} aria-label="Mehrfachänderung schließen">×</button></div>
  <div className="bulk-edit-body">
   <p className="muted">Aktiviere nur die Angaben, die du für alle ausgewählten Kartons ändern möchtest.</p>
   {hiddenCount>0&&<p className="bulk-filter-note">Außerhalb des Filters: {hiddenCount} {hiddenCount===1?'ausgewählter Karton':'ausgewählte Kartons'}. Diese Auswahl wird ebenfalls geändert.</p>}
   <details className="bulk-boxes"><summary>Ausgewählte Kartons ansehen</summary><ul>{boxes.map(box=><li key={box.id}>#{String(box.number).padStart(3,'0')} · {box.name}</li>)}</ul></details>
   <div className="bulk-fields">{fields.map(field=><div className={`bulk-field ${enabled.has(field.key)?'is-enabled':''}`} key={field.key}>
    <label className="bulk-field-toggle"><input type="checkbox" checked={enabled.has(field.key)} disabled={saving} onChange={()=>toggle(field.key)}/><span>{field.label}<small>{enabled.has(field.key)?'Für alle ausgewählten Kartons':'Bleibt unverändert'}</small></span></label>
    {enabled.has(field.key)&&<div className="bulk-field-value"><label htmlFor={id+'-'+field.key}>Neuer {field.key==='currentLocation'?'Standort':field.label}</label>{field.key==='status'?<select id={id+'-'+field.key} disabled={saving} value={values.status} onChange={event=>setValues({...values,status:event.target.value})}><option value="" disabled>Status wählen</option>{statuses.map(status=><option key={status}>{status}</option>)}</select>:<><input id={id+'-'+field.key} type="text" maxLength={200} disabled={saving} autoComplete="off" placeholder={field.placeholder} value={values[field.key]} onChange={event=>setValues({...values,[field.key]:event.target.value})}/><p className="bulk-field-hint">{values[field.key].trim()?'Wird bei allen ausgewählten Kartons gesetzt.':'Leer lassen, um die bisherige Angabe bei allen zu entfernen.'}</p></>}</div>}
   </div>)}</div>
   {error&&<p ref={errorMessage} tabIndex={-1} role="alert" className="error">{error}</p>}
  </div>
  <div className="bulk-edit-footer"><p role="status">{enabled.size?`${enabled.size} ${enabled.size===1?'Angabe':'Angaben'} für ${boxes.length} Kartons`:'Noch keine Änderung gewählt'}</p><div><button type="button" disabled={saving} onClick={onClose}>Abbrechen</button><button className="primary" disabled={!enabled.size||saving||(enabled.has('status')&&!values.status)} type="submit">{saving?'Wird gespeichert …':`${boxes.length} ${boxes.length===1?'Karton':'Kartons'} ändern`}</button></div></div>
 </form></Modal>;
}
