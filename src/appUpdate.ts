// Keep the check independent of React so retries and editing protection can be tested.
export function createUpdateCheck({buildId,fetchVersion,canReload,reload}:{buildId:string;fetchVersion:()=>Promise<unknown>;canReload:()=>boolean;reload:()=>void}){
 let checking=false,reloading=false;
 return async()=>{
  if(checking||reloading)return;
  checking=true;
  try{
   const version=await fetchVersion();
   if(version&&typeof version==='object'&&'buildId' in version&&typeof version.buildId==='string'&&version.buildId&&version.buildId!==buildId&&canReload()){
    reloading=true;reload();
   }
  }catch{/* Offline or deploying: try again at the next check. */}
  finally{checking=false;}
 };
}
