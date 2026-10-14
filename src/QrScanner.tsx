import {useEffect,useRef,useState} from 'react';
import {Modal} from './Modal';

export function isIPhoneHomeScreen(){
 return /iPhone/.test(navigator.userAgent)&&((navigator as Navigator&{standalone?:boolean}).standalone===true||matchMedia('(display-mode: standalone)').matches);
}

export function QrScanner({publicUrl,onOpen,onClose}:{publicUrl:string;onOpen:(move:string,box:string,signal:AbortSignal)=>Promise<void>;onClose:()=>void}){
 const video=useRef<HTMLVideoElement>(null),open=useRef(onOpen);open.current=onOpen;
 const [message,setMessage]=useState('Kamera wird gestartet …'),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  let cancelled=false,stream:MediaStream|undefined,timer:ReturnType<typeof setTimeout>|undefined,lastCode='';
  const stop=()=>{stream?.getTracks().forEach(track=>track.stop());};
  const hide=()=>{if(document.hidden){stop();setError('Scan pausiert. Starte die Kamera erneut.');}};
  document.addEventListener('visibilitychange',hide);
  async function start(){
   setError('');setMessage('Kamera wird gestartet …');
   try{
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Die Kamera benötigt eine sichere HTTPS-Verbindung.');
    const decoder=await import('jsqr');
    if(cancelled)return;
    stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
    if(cancelled||document.hidden){stop();if(!cancelled)setError('Scan pausiert. Starte die Kamera erneut.');return;}
    const element=video.current!;element.srcObject=stream;await element.play();
    if(cancelled)return;
    setMessage('Halte den QR-Code auf dem Etikett ruhig vor die Kamera.');
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true})!;
    async function scan(){
     if(cancelled||document.hidden)return;
     if(element.readyState>=2&&element.videoWidth){
      canvas.width=Math.min(element.videoWidth,800);canvas.height=Math.round(element.videoHeight*canvas.width/element.videoWidth);
      context.drawImage(element,0,0,canvas.width,canvas.height);
      const pixels=context.getImageData(0,0,canvas.width,canvas.height),code=decoder.default(pixels.data,canvas.width,canvas.height);
      if(code&&code.data!==lastCode){
       lastCode=code.data;
       try{
        const url=new URL(code.data),allowed=new URL(publicUrl||location.origin);
        if(![location.origin,allowed.origin].includes(url.origin)||url.pathname!=='/'||!url.searchParams.get('move')||!url.searchParams.get('box'))throw Error('Das ist kein KistenKompass-Etikett dieser Anwendung.');
        setMessage('Karton wird geöffnet …');setError('');
        await open.current(url.searchParams.get('move')!,url.searchParams.get('box')!,controller.signal);
        if(!cancelled){stop();onClose();}return;
       }catch(e){if(!cancelled){setError((e as Error).message);setMessage('Halte ein anderes Etikett vor die Kamera oder starte erneut.');}}
      }
     }
     if(!cancelled)timer=setTimeout(()=>{void scan();},250);
    }
    void scan();
   }catch(e){stop();if(!cancelled){const name=(e as Error).name;setError(name==='NotAllowedError'?'Kamerazugriff nicht erlaubt. Erlaube den Zugriff in den iPhone-Einstellungen und versuche es erneut.':name==='NotFoundError'?'Keine Kamera gefunden.':name==='NotReadableError'?'Die Kamera ist gerade nicht verfügbar. Schließe andere Kamera-Anwendungen und versuche es erneut.':(e as Error).message);setMessage('Scan konnte nicht gestartet werden.');}}
  }
  void start();
  return()=>{cancelled=true;controller.abort();clearTimeout(timer);stop();document.removeEventListener('visibilitychange',hide);};
 },[publicUrl,attempt]);
 return <Modal titleId="qr-scanner-title" className="qr-scanner" onClose={onClose}><div className="qr-scanner-heading"><h2 id="qr-scanner-title">QR-Code scannen</h2><button autoFocus onClick={onClose}>Schließen</button></div><video ref={video} muted playsInline autoPlay aria-label="Kameravorschau für Etikettenscan"/><p role="status">{message}</p>{error&&<><p className="error" role="alert">{error}</p><button onClick={()=>setAttempt(value=>value+1)}>Erneut versuchen</button></>}</Modal>;
}
