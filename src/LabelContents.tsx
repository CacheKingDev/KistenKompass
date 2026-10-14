import {useLayoutEffect,useRef} from 'react';

export function LabelContents({items}:{items:string[]}){
 const list=useRef<HTMLUListElement>(null);
 useLayoutEffect(()=>{
  const element=list.current!;
  const fit=()=>{
   const rows=Array.from(element.children) as HTMLLIElement[];
   const marker=rows.pop()!;
   rows.forEach((row,index)=>{row.hidden=false;row.textContent=items[index];});
   marker.hidden=true;
   // Hidden preview copies have no layout; keep their full contents for printing.
   if(!element.getClientRects().length||element.clientHeight===0)return;
   if(element.scrollHeight<=element.clientHeight)return;
   marker.hidden=false;
   for(let index=rows.length-1;index>=0&&element.scrollHeight>element.clientHeight;index--){
    const row=rows[index];
    const characters=Array.from(items[index]);
    let low=0,high=characters.length;
    while(low<high){
     const middle=Math.ceil((low+high)/2);
     row.textContent=characters.slice(0,middle).join('');
     if(element.scrollHeight<=element.clientHeight)low=middle;else high=middle-1;
    }
    row.textContent=characters.slice(0,low).join('');
    row.hidden=low===0;
   }
  };
  fit();
  const observer=new ResizeObserver(fit);
  observer.observe(element);
  window.addEventListener('beforeprint',fit);
  return ()=>{observer.disconnect();window.removeEventListener('beforeprint',fit);};
 },[items]);
 return <ul ref={list} className="label-contents">{items.map((item,index)=><li key={index}>{item}</li>)}<li className="label-more" hidden aria-label="Weitere Inhalte">...</li></ul>;
}
