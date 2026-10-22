import type {Box} from './BoxDetails';
import {RoomSymbol} from './RoomSymbol';

type Room={id:string;name:string;color:string;symbol?:string};
export const withoutRoom='__without_room__';
export const typeKey=(name:string)=>name.trim().toLocaleLowerCase('de');

export function RoomOverview({rooms,boxes,boxTypes,onOpen}:{rooms:Room[];boxes:Box[];boxTypes:{name:string}[];onOpen:(roomId:string,type:string|null)=>void}){
 const types=new Map(boxTypes.map(type=>[typeKey(type.name),type.name]));
 for(const box of boxes)if(!types.has(typeKey(box.type)))types.set(typeKey(box.type),box.type.trim()||'Ohne Kartonart');
 const columns=[...types].filter(([key])=>boxes.some(box=>typeKey(box.type)===key));
 const assigned=new Set(rooms.map(room=>room.id));
 const rows=[...rooms,...(boxes.some(box=>!assigned.has(box.roomId))?[{id:withoutRoom,name:'Ohne Raum',color:'#677970'}]:[])].map(room=>{
  const contents=boxes.filter(box=>room.id===withoutRoom?!assigned.has(box.roomId):box.roomId===room.id);
  const counts=new Map<string,number>();
  for(const box of contents){const key=typeKey(box.type);counts.set(key,(counts.get(key)||0)+1);}
  return {...room,total:contents.length,counts};
 });
 const countButton=(room:Pick<Room,'id'|'name'>,count:number,type:string|null,label:string)=>count>0?<button type="button" className="overview-count" aria-label={`${room.name}: ${count} ${label} anzeigen`} onClick={()=>onOpen(room.id,type)}>{count}</button>:<span className="muted">0</span>;
 const roomName=(room:typeof rows[number])=><span className="overview-room-name"><RoomSymbol symbol={room.symbol} color={room.color}/><span>{room.name}</span></span>;
 return <section className="room-overview" aria-labelledby="room-overview-title">
  <div className="settings-intro"><h2 id="room-overview-title" tabIndex={-1}>Übersicht</h2><p className="muted">{boxes.length} Kartons · {rooms.length} Räume</p><p className="muted">Kartonarten je Raum. Tippe auf eine Anzahl, um die passenden Kartons anzusehen.</p></div>
  {!boxes.length&&<p className="empty-state">Noch keine Kartons erfasst.</p>}
  {rows.length>0&&<>
   <div className={`overview-table${columns.length>5?' overview-table-many':''}`}><table><caption className="sr-only">Anzahl der Kartons nach Raum und Kartonart</caption><thead><tr><th scope="col">Raum</th>{columns.map(([key,name])=><th scope="col" key={key}>{name}</th>)}<th scope="col">Gesamt</th></tr></thead><tbody>{rows.map(room=><tr key={room.id}><th scope="row">{roomName(room)}</th>{columns.map(([key,name])=><td key={key}>{countButton(room,room.counts.get(key)||0,key,`Kartons der Art ${name}`)}</td>)}<td>{countButton(room,room.total,null,'Kartons')}</td></tr>)}</tbody><tfoot><tr><th scope="row">Gesamt</th>{columns.map(([key,name])=><td key={key}>{countButton({id:'',name:'Alle Räume'},rows.reduce((sum,room)=>sum+(room.counts.get(key)||0),0),key,`Kartons der Art ${name}`)}</td>)}<td>{countButton({id:'',name:'Alle Räume'},boxes.length,null,'Kartons')}</td></tr></tfoot></table></div>
   <div className={`overview-room-cards${columns.length>5?' overview-room-cards-many':''}`}>{rows.map(room=><article key={room.id}><h3>{roomName(room)}</h3><div className="overview-card-total"><span>Gesamt</span>{countButton(room,room.total,null,'Kartons')}</div><dl>{columns.filter(([key])=>room.counts.has(key)).map(([key,name])=><div key={key}><dt>{name}</dt><dd>{countButton(room,room.counts.get(key)!,key,`Kartons der Art ${name}`)}</dd></div>)}</dl>{!room.total&&<p className="muted">Noch keine Kartons in diesem Raum.</p>}</article>)}</div>
  </>}
 </section>;
}
