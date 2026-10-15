import {jsPDF} from 'jspdf';
import type {Box} from './BoxDetails';
import {roomSymbols} from '../server/roomSymbols';

type Label={box:Box;qr:string;room?:{name:string;color:string;symbol?:string};roomSymbolImage?:string};
// Physical page geometry is independent of Safari's webpage print settings.
export function createLabelPdf(labels:Label[]){
 if(!labels.length)throw Error('Keine Etiketten ausgewählt');
 const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
 const lineHeight=4.5;
 labels.forEach(({box,qr,room,roomSymbolImage},index)=>{
  if(index&&index%4===0)pdf.addPage();
  const slot=index%4,x=26+(slot%2)*125,y=5+Math.floor(slot/2)*100;
  pdf.setTextColor(0);pdf.setDrawColor(85);pdf.setLineWidth(.1);pdf.setLineDashPattern([1,1],0);
  pdf.rect(x+1.5,y+1.5,117,97);pdf.setLineDashPattern([],0);
  pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text('KARTON',x+5,y+8);
  pdf.setFont('helvetica','bold');pdf.setFontSize(28);
  const number=String(box.number).padStart(3,'0');pdf.text(number,x+5,y+19);
  const nameX=x+5+pdf.getTextWidth(number)+3;
  // Keep even unusually long names within the header and leave room for the room name.
  function wrapped(text:string,width:number,maxLines:number){
   const lines=pdf.splitTextToSize(text,width) as string[];
   if(lines.length<=maxLines)return lines;
   const result=lines.slice(0,maxLines);let last=result[maxLines-1];
   while(last&&pdf.getTextWidth(last+'...')>width)last=last.slice(0,-1);
   result[maxLines-1]=last+'...';return result;
  }
  pdf.setFontSize(12);pdf.text(wrapped(box.name,Math.max(10,x+72-nameX),3),nameX,y+11,{lineHeightFactor:1.2});
  pdf.setFillColor(room?.color||'#dddddd');pdf.setLineWidth(.5);pdf.roundedRect(x+75.25,y+5.25,39.5,19.5,1.75,1.75,'FD');
  if(roomSymbolImage&&roomSymbols.some(item=>item.id===room?.symbol))pdf.addImage(roomSymbolImage,'PNG',x+88,y+8,14,14);
  pdf.setFontSize(11);const roomLines=wrapped(room?.name||'Ohne Raum',67,3);
  pdf.text(roomLines,x+5,y+28,{lineHeightFactor:1.2});
  const headerBottom=y+30+(roomLines.length-1)*4.7;
  pdf.setDrawColor(220);pdf.setLineWidth(.2);pdf.line(x+5,headerBottom,x+115,headerBottom);
  pdf.setFontSize(9);pdf.text('INHALT',x+5,headerBottom+6);
  pdf.addImage(qr,'PNG',x+90,headerBottom+3,25,25);
  pdf.setFont('helvetica','normal');pdf.setFontSize(10);
  const rows=box.items.filter(Boolean).flatMap(item=>(pdf.splitTextToSize(item,76) as string[]).map((text,i)=>({text,first:i===0})));
  const capacity=Math.max(0,Math.floor((y+81-(headerBottom+12))/lineHeight)+1);
  const truncated=rows.length>capacity,visible=rows.slice(0,truncated?Math.max(0,capacity-1):capacity);
  visible.forEach((row,i)=>{const top=headerBottom+12+i*lineHeight;if(row.first){pdf.setFillColor(0,0,0);pdf.circle(x+6,top-1,.5,'F');}pdf.text(row.text,x+9,top);});
  if(truncated)pdf.text('...',x+9,headerBottom+12+visible.length*lineHeight);
  pdf.line(x+5,y+85,x+115,y+85);
  pdf.setDrawColor(0);pdf.setLineWidth(.9);pdf.setLineCap('round');pdf.setLineJoin('round');
  const flags=([box.fragile?'fragile':null,box.heavy?'heavy':null] as const).filter(Boolean);
  flags.forEach((flag,index)=>{
   const left=x+115-flags.length*12-(flags.length-1)*3+index*15,top=y+85.5;
   // The same 24-unit pictograms as the preview, drawn as sharp PDF vectors.
   const line=(points:number[][])=>{for(let i=1;i<points.length;i++)pdf.line(left+points[i-1][0]/2,top+points[i-1][1]/2,left+points[i][0]/2,top+points[i][1]/2);};
   if(flag==='fragile'){
    line([[7,3],[17,3],[18,9],[16,13],[12,15],[8,13],[6,9],[7,3]]);
    line([[12,15],[12,21]]);line([[8,21],[16,21]]);line([[13,3],[11,8],[14,9],[12,14]]);
   }else{
    pdf.circle(left+6,top+2.5,1.5);line([[5,8],[19,8],[22,21],[2,21],[5,8]]);
    line([[9,12],[9,17]]);line([[15,12],[15,17]]);line([[9,14.5],[15,14.5]]);
   }
  });
  pdf.setLineCap('butt');pdf.setLineJoin('miter');
  pdf.setFontSize(7);pdf.text('KistenKompass',x+5,y+96);
 });
 return pdf.output('blob');
}
