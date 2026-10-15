const standardAbbreviations:Record<string,string>={archivbox:'AB',bananenkarton:'BK',umzugskarton:'UK','sonstiger karton':'SK'};
export function boxTypeAbbreviation(type:string){
 const name=type.trim();
 if(!name)return '';
 const standard=standardAbbreviations[name.toLocaleLowerCase('de')];
 if(standard)return standard;
 const words=name.split(/[\s-]+/u).filter(Boolean);
 return (words.length>1?words.map(word=>Array.from(word)[0]).join(''):Array.from(name).slice(0,2).join('')).toLocaleUpperCase('de');
}
export function BoxTypeAbbreviation({type}:{type:string}){
 const abbreviation=boxTypeAbbreviation(type);
 return abbreviation?<span className="box-type-abbreviation" aria-label={`Kartonart: ${type}`} title={type}><span className="box-type-abbreviation-text">({abbreviation})</span></span>:null;
}
