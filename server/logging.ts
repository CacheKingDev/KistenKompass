import type {RequestHandler,Response} from 'express';

export function errorMessage(error:unknown,res:Response){
 const code=(error as {code?:unknown})?.code;
 if(typeof code==='string'){
  res.locals.errorCode=code;
  res.status(500);
  return 'Interner Serverfehler';
 }
 return error instanceof Error?error.message:'Unbekannter Fehler';
}

// JSON quoting keeps user-controlled values on one line; never log request bodies or tokens.
export function log(message:string,level:'INFO'|'WARN'|'ERROR'='INFO',fields:Record<string,unknown>={}){
 const details=Object.entries(fields).filter(([,value])=>value!==undefined).map(([key,value])=>`${key}=${JSON.stringify(String(value).slice(0,300))}`).join(' ');
 const line=`${new Date().toISOString()} [KistenKompass] ${level} ${message}${details?' | '+details:''}`;
 if(level==='ERROR')console.error(line);else console.log(line);
}

export const requestLogging:RequestHandler=(req,res,next)=>{
 const started=Date.now();let reason:string|undefined;
 const json=res.json.bind(res);
 res.json=((body:any)=>{if(res.locals.errorCode)res.status(500);if(typeof body?.error==='string')reason=body.error;return json(body);}) as typeof res.json;
 res.on('finish',()=>{
  const status=res.statusCode,route=String(req.route?.path||'/api');
  const failed=status>=400;
  const login=route==='/api/login',logout=route==='/api/logout';
  const management=['/api/setup','/api/profile','/api/users','/api/users/:id'].includes(route);
  // Keep ordinary reads, saves and health checks quiet. Deletions and account changes are auditable.
  if(!failed&&!login&&!logout&&!management&&req.method!=='DELETE')return;
  if(!failed&&!req.path.startsWith('/api/'))return;
  const event=failed?(login?(status===429?'Anmeldung vorübergehend gesperrt':'Anmeldung fehlgeschlagen'):'Anfrage fehlgeschlagen'):
   login?'Anmeldung erfolgreich':logout?'Abmeldung erfolgreich':
   route==='/api/setup'?'Administrator eingerichtet':route==='/api/profile'?'Profil aktualisiert':
   management?(req.method==='POST'?'Benutzer angelegt':'Benutzer aktualisiert'):'Löschen erfolgreich';
  log(event,status>=500||res.locals.errorCode?'ERROR':failed?'WARN':'INFO',{
   method:req.method,route,status,user:res.locals.user?.username,
   target:req.params?.id,ms:Date.now()-started,reason:failed?reason:undefined,
   code:res.locals.errorCode
  });
 });
 next();
};
