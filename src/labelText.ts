import type {jsPDF} from 'jspdf';

// Standard PDF fonts cannot encode emoji. Keep grapheme clusters (including
// flags, skin tones and ZWJ families) intact during wrapping and truncation.
const segmenter=new Intl.Segmenter('de',{granularity:'grapheme'});
const graphemes=(text:string)=>Array.from(segmenter.segment(text),part=>part.segment);
export const needsBrowserText=(text:string)=>/[^\u0020-\u007e\u00a0-\u00ff\r\n]/u.test(text);

export function labelText(pdf:jsPDF){
 const scale=4,mmPerPoint=25.4/72;
 function context(){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Etikettentext konnte nicht gezeichnet werden');
  ctx.font=`${pdf.getFont().fontStyle==='bold'?'bold':'normal'} ${pdf.getFontSize()*scale}px Arial, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  return {canvas,ctx};
 }
 function measure(text:string){
  if(!needsBrowserText(text))return pdf.getTextWidth(text);
  return context().ctx.measureText(text).width/scale*mmPerPoint;
 }
 function split(text:string,width:number):string[]{
  if(!needsBrowserText(text))return pdf.splitTextToSize(text,width) as string[];
  const {ctx}=context(),limit=width/mmPerPoint*scale,lines:string[]=[];
  for(const paragraph of text.split(/\r?\n/)){
   let line='';
   for(const word of paragraph.split(/(\s+)/)){
    if(ctx.measureText(line+word).width<=limit){line+=word;continue;}
    if(line.trim()){lines.push(line.trimEnd());line='';}
    for(const cluster of graphemes(word.trimStart())){
     if(line&&ctx.measureText(line+cluster).width>limit){lines.push(line);line='';}
     line+=cluster;
    }
   }
   lines.push(line.trimEnd());
  }
  return lines;
 }
 function wrapped(text:string,width:number,maxLines:number){
  const lines=split(text,width);
  if(lines.length<=maxLines)return lines;
  const result=lines.slice(0,maxLines),last=graphemes(result[maxLines-1]);
  while(last.length&&measure(last.join('')+'...')>width)last.pop();
  result[maxLines-1]=last.join('')+'...';return result;
 }
 function draw(value:string|string[],x:number,y:number,lineHeightFactor=1.2){
  const lines=typeof value==='string'?[value]:value;
  lines.forEach((line,index)=>{
   const baseline=y+index*pdf.getFontSize()*mmPerPoint*lineHeightFactor;
   if(!line)return;
   if(!needsBrowserText(line)){pdf.text(line,x,baseline);return;}
   const {canvas,ctx}=context(),font=ctx.font,size=pdf.getFontSize()*scale;
   const metrics=ctx.measureText(line),padding=size*.25;
   const ascent=Math.max(size,metrics.actualBoundingBoxAscent),descent=Math.max(size*.3,metrics.actualBoundingBoxDescent);
   canvas.width=Math.ceil(metrics.width+padding*2);canvas.height=Math.ceil(ascent+descent+padding*2);
   ctx.font=font;ctx.fillStyle='#000';ctx.fillText(line,padding,padding+ascent);
   const unit=mmPerPoint/scale;
   pdf.addImage(canvas.toDataURL('image/png'),'PNG',x-padding*unit,baseline-(padding+ascent)*unit,canvas.width*unit,canvas.height*unit);
  });
 }
 return {split,wrapped,draw};
}
