import {useState} from 'react';
import {Modal} from './Modal';
import {RoomSymbolPicker} from './RoomSymbol';

type Room={id:string;name:string;color:string;symbol?:string};
export function RoomEditor({room,error,onChange,onSave,onClose}:{room:Room;error:string;onChange:(room:Room)=>void;onSave:()=>Promise<boolean>;onClose:()=>void}){
 const [saving,setSaving]=useState(false);
 return <Modal titleId="room-edit-title" className="room-editor" onClose={()=>{if(!saving)onClose();}}>
  <form onSubmit={async event=>{event.preventDefault();if(saving)return;setSaving(true);try{if(await onSave())onClose();}finally{setSaving(false);}}}>
   <header className="room-editor-heading"><h2 id="room-edit-title">Raum bearbeiten</h2></header>
   <div className="room-editor-body">
    <div className="room-editor-basics">
     <label className="room-editor-name">Raumname<input autoFocus required value={room.name} onChange={event=>onChange({...room,name:event.target.value})}/></label>
     <label className="room-editor-color">Farbe<span className="room-editor-swatch" style={{background:room.color}}><input aria-label="Raumfarbe" type="color" value={room.color} onChange={event=>onChange({...room,color:event.target.value})}/></span></label>
    </div>
    <RoomSymbolPicker value={room.symbol||''} onChange={symbol=>onChange({...room,symbol})}/>
    {error&&<p role="alert" className="error">{error}</p>}
   </div>
   <footer className="room-editor-actions"><button type="button" disabled={saving} onClick={onClose}>Abbrechen</button><button className="room-editor-save" disabled={saving}>{saving?'Wird gespeichert …':'Speichern'}</button></footer>
  </form>
 </Modal>;
}
