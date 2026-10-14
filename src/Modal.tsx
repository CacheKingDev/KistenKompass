import {useEffect,useRef,type ReactNode} from 'react';

export function Modal({titleId,onClose,className='',children}:{titleId:string;onClose:()=>void;className?:string;children:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const element=dialog.current!,overflow=document.body.style.overflow;element.showModal();document.body.style.overflow='hidden';return()=>{element.close();document.body.style.overflow=overflow;};},[]);
 return <dialog ref={dialog} className={`native-modal ${className}`} aria-labelledby={titleId} onCancel={event=>{event.stopPropagation();close.current();}} onKeyDown={event=>{
  event.stopPropagation();
  if(event.key!=='Tab')return;
  const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(element=>element.closest('dialog')===event.currentTarget&&element.getClientRects().length);
  const first=controls[0],last=controls[controls.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }} onClick={event=>{if(event.target!==event.currentTarget)return;const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close.current();}}>{children}</dialog>;
}
