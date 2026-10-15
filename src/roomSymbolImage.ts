import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {roomSymbols} from '../server/roomSymbols';
import {Icon} from './Icon';
import {roomSymbolColor} from './roomSymbolColor';

export async function roomSymbolImage(symbol:string|undefined,color:string){
 const entry=roomSymbols.find(item=>item.id===symbol);
 if(!entry)return undefined;
 // Reuse the actual UI artwork; 512 px keeps this 14 mm print icon crisp.
 const svg=renderToStaticMarkup(createElement(Icon,{name:entry.id}))
  .replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ')
  .replace('width="20"','width="512"').replace('height="20"','height="512"')
  .replaceAll('currentColor',roomSymbolColor(color));
 const image=new Image();
 await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(Error('Raumsymbol konnte nicht geladen werden'));image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);});
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
 const context=canvas.getContext('2d');if(!context)throw Error('Raumsymbol konnte nicht gezeichnet werden');
 context.drawImage(image,0,0);return canvas.toDataURL('image/png');
}
