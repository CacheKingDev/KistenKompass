import {Icon} from './Icon';
export function BoxHandlingIcons({fragile,heavy}:{fragile:boolean;heavy:boolean}){
 if(!fragile&&!heavy)return null;
 return <span className="box-handling-icons">{fragile&&<span role="img" aria-label="Zerbrechlich" title="Zerbrechlich"><Icon name="fragile"/></span>}{heavy&&<span role="img" aria-label="Schwer" title="Schwer"><Icon name="heavy"/></span>}</span>;
}
