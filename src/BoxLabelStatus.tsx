import {Icon} from './Icon';
export function BoxLabelStatus({hasLabel}:{hasLabel?:boolean}){
 return <span className="box-label-status" data-present={!!hasLabel}><Icon name="label"/><span>{hasLabel?'Etikett vorhanden':'Ohne Etikett'}</span><span aria-hidden="true">{hasLabel?'✓':'−'}</span></span>;
}
