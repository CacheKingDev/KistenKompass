import {test} from 'node:test';
import assert from 'node:assert/strict';
import {jsPDF} from 'jspdf';
import {labelText,needsBrowserText} from '../src/labelText';

test('PDF text preserves emoji clusters when wrapping, truncating and drawing',()=>{
 const painted:string[]=[];
 const ctx={font:'',fillStyle:'',measureText:(value:string)=>({width:Array.from(new Intl.Segmenter('de',{granularity:'grapheme'}).segment(value)).length*40,actualBoundingBoxAscent:40,actualBoundingBoxDescent:12}),fillText:(value:string)=>painted.push(value)};
 const original=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>ctx,toDataURL:()=>'data:image/png;base64,test'})}});
 try{
  const pdf=new jsPDF();pdf.setFontSize(10);
  let images=0;pdf.addImage=(()=>{images++;return pdf;}) as typeof pdf.addImage;
  const text=labelText(pdf),family='👨‍👩‍👧‍👦',flag='🇩🇪',tone='👍🏽';
  assert.equal(needsBrowserText('Küche, Größe & Bücher'),false);
  for(const emoji of [family,flag,tone,'❤️','📦'])assert.equal(needsBrowserText(emoji),true);
  assert.deepEqual(text.split(family+flag+tone,4),[family,flag,tone]);
  const clipped=text.wrapped(family.repeat(10),12,2);
  assert.equal(clipped.length,2);assert.ok(clipped[1].endsWith('...'));
  text.draw([family,flag,tone],10,10);
  assert.deepEqual(painted,[family,flag,tone]);assert.equal(images,3);
  text.draw('Küche',10,30);assert.equal(images,3);
 }finally{
  if(original)Object.defineProperty(globalThis,'document',original);else Reflect.deleteProperty(globalThis,'document');
 }
});
