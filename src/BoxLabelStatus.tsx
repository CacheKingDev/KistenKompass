import {Icon} from './Icon';
export function BoxLabelStatus({hasLabel}:{hasLabel?:boolean}){
 if(!hasLabel)return null;
 return <span className="box-label-status" role="img" aria-label="Etikett vorhanden" title="Etikett vorhanden"><Icon name="label"/></span>;
}
