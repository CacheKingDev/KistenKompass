import {roomSymbols} from '../server/roomSymbols';
import {Icon} from './Icon';
import {useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Modal} from './Modal';
import {roomSymbolColor} from './roomSymbolColor';

export function RoomSymbol({symbol,color}:{symbol?:string;color?:string}){
 const entry=roomSymbols.find(item=>item.id===symbol);
 if(!entry&&!color)return null;
 return <span className={`room-symbol${color?' room-badge':''}`} style={color?{background:color,color:roomSymbolColor(color)}:undefined} aria-hidden="true">{entry&&<Icon name={entry.id}/>}</span>;
}
export function RoomSymbolPicker({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false),id=useId(),trigger=useRef<HTMLButtonElement>(null);
 const selected=roomSymbols.find(item=>item.id===value);
 function close(){setOpen(false);requestAnimationFrame(()=>trigger.current?.focus());}
 function choose(symbol:string){onChange(symbol);close();}
 return <div className="room-symbol-field"><span id={id+'-label'}>Raumsymbol</span>
  <button ref={trigger} className="room-symbol-trigger" type="button" aria-labelledby={id+'-label '+id+'-value'} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}>
   {selected?<Icon name={selected.id}/>:<span className="room-symbol-none" aria-hidden="true">—</span>}<span id={id+'-value'}>{selected?.name||'Ohne Symbol'}</span><span className="room-symbol-change">Auswählen</span>
  </button>
  {open&&createPortal(<Modal titleId={id+'-title'} className="room-symbol-dialog" onClose={close}>
   <header className="room-symbol-heading"><h2 id={id+'-title'}>Raumsymbol auswählen</h2><button type="button" onClick={close}>Schließen</button></header>
   <div className="room-symbol-options"><fieldset className="room-symbol-picker"><legend>Symbole</legend><div>
    <button type="button" autoFocus={!selected} aria-pressed={!value} onClick={()=>choose('')}><span className="room-symbol-none" aria-hidden="true">—</span><span>Ohne Symbol</span></button>
    {roomSymbols.map(item=><button key={item.id} type="button" autoFocus={value===item.id} aria-pressed={value===item.id} onClick={()=>choose(item.id)}><Icon name={item.id}/><span>{item.name}</span></button>)}
   </div></fieldset></div>
  </Modal>,document.body)}
 </div>;
}
