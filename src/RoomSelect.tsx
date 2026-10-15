import {useId} from 'react';
type Room={id:string;name:string;color:string;symbol?:string};
export function RoomSelect({rooms,value,onChange}:{rooms:Room[];value:string;onChange:(id:string)=>void}){
 const id=useId(),selected=rooms.find(room=>room.id===value);
 return <div className="room-select-field"><label htmlFor={id}>Raum</label><div className={`room-native-select${selected?' has-room-color':''}`}>
  {selected&&<i className="room-swatch" style={{background:selected.color}} aria-hidden="true"/>}
  <select id={id} required value={selected?.id||''} onChange={event=>onChange(event.target.value)}>
   <option value="" disabled>{rooms.length?'Raum wählen':'Zuerst einen Raum anlegen'}</option>
   {rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}
  </select>
 </div></div>;
}
