import {jsPDF} from 'jspdf';
import type {Box} from './BoxDetails';

type Label={box:Box;qr:string;room?:{name:string;color:string}};
// Physical page geometry is independent of Safari's webpage print settings.
export function createLabelPdf(labels:Label[]){
 if(!labels.length)throw Error('Keine Etiketten ausgewählt');
 const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
 const lineHeight=4.5;
 labels.forEach(({box,qr,room},index)=>{
  if(index&&index%4===0)pdf.addPage();
  const slot=index%4,x=26+(slot%2)*125,y=5+Math.floor(slot/2)*100;
  pdf.setTextColor(0);pdf.setDrawColor(85);pdf.setLineWidth(.3);pdf.setLineDashPattern([1,1],0);
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
  pdf.setFillColor(room?.color||'#dddddd');pdf.setLineWidth(.2);pdf.rect(x+75,y+5,40,20,'FD');
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
  pdf.setFontSize(8);pdf.setDrawColor(0);let flagX=x+5;
  for(const [checked,text] of [[box.fragile,'Zerbrechlich'],[!box.fragile,'Nicht zerbrechlich'],[box.heavy,'Schwer']] as const){
   pdf.rect(flagX,y+88,3,3);if(checked){pdf.line(flagX+.5,y+88.5,flagX+2.5,y+90.5);pdf.line(flagX+2.5,y+88.5,flagX+.5,y+90.5);}
   pdf.text(text,flagX+4,y+90.5);flagX+=pdf.getTextWidth(text)+8;
  }
  pdf.setFontSize(7);pdf.text('KistenKompass',x+5,y+96);
 });
 return pdf.output('blob');
}
