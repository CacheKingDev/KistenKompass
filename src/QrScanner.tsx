import {useEffect,useRef,useState} from 'react';
import {Modal} from './Modal';

export function isIPhoneHomeScreen(){
 return /iPhone/.test(navigator.userAgent)&&((navigator as Navigator&{standalone?:boolean}).standalone===true||matchMedia('(display-mode: standalone)').matches);
}

export function QrScanner({publicUrl,onOpen,onClose}:{publicUrl:string;onOpen:(move:string,box:string,signal:AbortSignal)=>Promise<void>;onClose:()=>void}){
 const video=useRef<HTMLVideoElement>(null),open=useRef(onOpen);open.current=onOpen;
 const camera=useRef<MediaStreamTrack|null>(null),lastCode=useRef(''),torchPending=useRef(false);
 const [message,setMessage]=useState('Kamera wird gestartet …'),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const [phase,setPhase]=useState<'starting'|'scanning'|'opening'|'paused'|'failed'>('starting');
 const [torchAvailable,setTorchAvailable]=useState(false),[torchOn,setTorchOn]=useState(false),[torchBusy,setTorchBusy]=useState(false),[torchError,setTorchError]=useState('');
 async function toggleTorch(){
  const track=camera.current;
  if(!track||track.readyState!=='live'||torchPending.current)return;
  torchPending.current=true;setTorchBusy(true);setTorchError('');
  try{
   const enabled=!torchOn;
   await track.applyConstraints({advanced:[{torch:enabled} as MediaTrackConstraintSet]});
   if(camera.current===track)setTorchOn(enabled);
  }catch{if(camera.current===track)setTorchError('Die Taschenlampe konnte nicht umgeschaltet werden. Versuche es erneut oder sorge für mehr Licht.');}
  finally{if(camera.current===track){torchPending.current=false;setTorchBusy(false);}}
 }
 function retry(){
  if(phase==='scanning'){
   lastCode.current='';setError('');setMessage('Halte den QR-Code erneut in den Rahmen.');
  }else setAttempt(value=>value+1);
 }
 useEffect(()=>{
  const controller=new AbortController();
  let cancelled=false,paused=false,stream:MediaStream|undefined,timer:ReturnType<typeof setTimeout>|undefined;
  const stop=()=>{if(stream?.getTracks().includes(camera.current!))camera.current=null;stream?.getTracks().forEach(track=>track.stop());};
  const pause=()=>{
   if(cancelled||paused)return;
   paused=true;controller.abort();clearTimeout(timer);stop();setTorchAvailable(false);setTorchOn(false);setPhase('paused');
   setError('Die Kamera wurde angehalten. Tippe auf „Kamera erneut starten“, um weiterzuscannen.');setMessage('Scan pausiert.');
  };
  const hide=()=>{if(document.hidden)pause();};
  document.addEventListener('visibilitychange',hide);
  async function start(){
   lastCode.current='';torchPending.current=false;
   setError('');setTorchError('');setTorchAvailable(false);setTorchOn(false);setTorchBusy(false);setPhase('starting');setMessage('Kamera wird gestartet …');
   try{
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Die Kamera benötigt eine sichere HTTPS-Verbindung.');
    const decoder=await import('jsqr');
    if(cancelled||paused)return;
    stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
    if(cancelled||paused||document.hidden){stop();if(!cancelled)pause();return;}
    const track=stream.getVideoTracks()[0];camera.current=track;
    track?.addEventListener('ended',pause,{once:true});
    try{setTorchAvailable((track?.getCapabilities?.() as MediaTrackCapabilities&{torch?:boolean})?.torch===true);}catch{/* Some browsers cannot report camera capabilities. */}
    const element=video.current!;element.srcObject=stream;await element.play();
    if(cancelled||paused)return;
    setPhase('scanning');setMessage('Halte den QR-Code auf dem Etikett ruhig in den Rahmen.');
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true})!;
    async function scan(){
     if(cancelled||paused||document.hidden)return;
     if(element.readyState>=2&&element.videoWidth){
      canvas.width=Math.min(element.videoWidth,800);canvas.height=Math.round(element.videoHeight*canvas.width/element.videoWidth);
      context.drawImage(element,0,0,canvas.width,canvas.height);
      const pixels=context.getImageData(0,0,canvas.width,canvas.height),code=decoder.default(pixels.data,canvas.width,canvas.height);
      if(code&&code.data!==lastCode.current){
       lastCode.current=code.data;
       try{
        let url:URL;
        try{
         url=new URL(code.data);const allowed=new URL(publicUrl||location.origin);
         if(![location.origin,allowed.origin].includes(url.origin)||url.pathname!=='/'||!url.searchParams.get('move')?.trim()||!url.searchParams.get('box')?.trim())throw Error();
        }catch{throw Error('Dieser QR-Code ist kein KistenKompass-Etikett dieser Anwendung. Verwende ein hier erstelltes Kartonetikett.');}
        setPhase('opening');setMessage('Karton wird geöffnet …');setError('');
        await open.current(url.searchParams.get('move')!,url.searchParams.get('box')!,controller.signal);
        if(!cancelled&&!paused){stop();onClose();}return;
       }catch(e){if(!cancelled&&!paused){setPhase('scanning');setError((e as Error).message);setMessage('Anderes Etikett scannen oder denselben Code erneut versuchen.');}}
      }
     }
     if(!cancelled&&!paused)timer=setTimeout(()=>{void scan();},250);
    }
    void scan();
   }catch(e){stop();if(!cancelled&&!paused){setTorchAvailable(false);setPhase('failed');const name=(e as Error).name;setError(name==='NotAllowedError'?'Kamerazugriff nicht erlaubt. Erlaube den Kamerazugriff in den Website- oder Geräteeinstellungen und starte erneut.':name==='NotFoundError'?'Keine Kamera gefunden. Prüfe, ob eine Kamera verfügbar und verbunden ist.':name==='NotReadableError'?'Die Kamera ist gerade nicht verfügbar. Schließe andere Kamera-Anwendungen und versuche es erneut.':(e as Error).message);setMessage('Scan konnte nicht gestartet werden.');}}
  }
  void start();
  return()=>{cancelled=true;controller.abort();clearTimeout(timer);stream?.getVideoTracks().forEach(track=>track.removeEventListener('ended',pause));stop();document.removeEventListener('visibilitychange',hide);};
 },[publicUrl,attempt]);
 return <Modal titleId="qr-scanner-title" className="qr-scanner" onClose={onClose}>
  <div className="qr-scanner-heading"><h2 id="qr-scanner-title">QR-Code scannen</h2><button autoFocus onClick={onClose}>Schließen</button></div>
  <div className="qr-camera">
   <video ref={video} muted playsInline autoPlay aria-label="Kameravorschau für Etikettenscan"/>
   <div className="qr-scan-guide" aria-hidden="true"><div className="qr-scan-frame"/><span>Etikett hier platzieren</span></div>
  </div>
  <p role="status">{message}</p>
  {error&&<p className="error" role="alert">{error}</p>}
  <div className="qr-scanner-controls">
   {error&&<button onClick={retry}>{phase==='scanning'?'Erneut scannen':'Kamera erneut starten'}</button>}
   {torchAvailable&&<button aria-pressed={torchOn} disabled={torchBusy||phase!=='scanning'} onClick={()=>void toggleTorch()}>Taschenlampe {torchOn?'ausschalten':'einschalten'}</button>}
  </div>
  {torchError&&<p className="error" role="alert">{torchError}</p>}
 </Modal>;
}
