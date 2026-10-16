// Prepare audio inside the scan button's user gesture for iPhone Safari.
export function prepareScanSound(){
 let context:AudioContext|undefined;
 try{
  context=new AudioContext();
  void context.resume().catch(()=>{});
 }catch{/* Audio is optional; camera scanning must remain available. */}
 return {
  play(){
   if(!context||context.state!=='running')return;
   try{
    const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
    oscillator.frequency.value=1800;
    gain.gain.setValueAtTime(0,now);
    gain.gain.linearRampToValueAtTime(0.15,now+0.005);
    gain.gain.setValueAtTime(0.15,now+0.08);
    gain.gain.linearRampToValueAtTime(0,now+0.12);
    oscillator.connect(gain);gain.connect(context.destination);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    oscillator.start(now);oscillator.stop(now+0.13);
   }catch{/* A blocked sound must not interrupt opening the box. */}
  },
  dispose(){
   const audio=context;context=undefined;
   // Allow the confirmation to finish when the scanner closes immediately.
   if(audio)setTimeout(()=>{void audio.close().catch(()=>{});},200);
  }
 };
}
