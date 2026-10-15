import {roomSymbols} from './roomSymbols.js';
import express from 'express';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {Store} from './store.js';
import {Accounts} from './accounts.js';
import {configureProxy} from './proxy.js';
const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT muss eine ganze Zahl zwischen 1 und 65535 sein');
const log=(message:string)=>console.log(`${new Date().toISOString()} [KistenKompass] ${message}`);
const directory=process.env.DATA_DIR||'data';mkdirSync(directory,{recursive:true});const store=new Store(resolve(directory,'kistenkompass.sqlite')),accounts=new Accounts(store);
const app=express();
app.use((req,res,next)=>{const started=Date.now();res.on('finish',()=>{if(res.statusCode>=400||(!['GET','HEAD'].includes(req.method)&&req.path.startsWith('/api/')))log(`${req.method} ${req.route?.path||'/api'}: HTTP ${res.statusCode} (${Date.now()-started} ms)`);});next();});
const deployment=configureProxy(app);app.use(express.json({limit:'9mb'}));
const token=(req:express.Request)=>req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('kk_session='))?.slice(11)||'';
const cookie=(req:express.Request,value:string)=>`kk_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${value?604800:0}${deployment.secureCookies||req.secure?'; Secure':''}`;
app.get('/api/health',(_req,res)=>res.json({ok:true}));
app.get('/api/session',(req,res)=>res.json({user:accounts.user(token(req))||null,setup:accounts.users().length===0,publicUrl:deployment.publicUrl}));
const attempts=new Map<string,{count:number,until:number}>();
app.post('/api/login',(req,res)=>{const key=req.ip||'',now=Date.now();let a=attempts.get(key);if(!a||a.until<now){a={count:0,until:now+600000};attempts.set(key,a);}if(++a.count>10)return res.status(429).json({error:'Zu viele Versuche. Bitte in zehn Minuten erneut anmelden.'});try{const t=accounts.login(req.body.username,req.body.password);attempts.delete(key);res.setHeader('Set-Cookie',cookie(req,t));res.json({ok:true});}catch(e){res.status(401).json({error:(e as Error).message});}});
app.post('/api/setup',(req,res)=>{if(accounts.users().length)return res.status(409).json({error:'Einrichtung bereits abgeschlossen'});try{accounts.saveUser({...req.body,role:'admin',active:true});res.json({ok:true});}catch(e){res.status(400).json({error:(e as Error).message});}});
app.use('/api',(req,res,next)=>{const user=accounts.user(token(req));if(!user)return res.status(401).json({error:'Bitte anmelden'});res.locals.user=user;next();});
app.post('/api/logout',(req,res)=>{store.db.prepare('DELETE FROM sessions WHERE token=?').run(accounts.digest(token(req)));res.setHeader('Set-Cookie',cookie(req,''));res.json({ok:true});});
app.put('/api/profile',(req,res)=>{try{accounts.saveProfile(req.body,token(req));res.json({ok:true});}catch(e){res.status(400).json({error:(e as Error).message});}});
const admin:express.RequestHandler=(_req,res,next)=>{if(res.locals.user.role!=='admin')return res.status(403).json({error:'Administrator erforderlich'});next();};
app.get('/api/users',admin,(_req,res)=>res.json(accounts.users()));
for(const method of ['post','put'] as const)app[method]('/api/users'+(method==='put'?'/:id':''),admin,(req,res)=>{try{res.json({id:accounts.saveUser(req.body,method==='put'?String(req.params.id):undefined)});}catch(e){res.status(400).json({error:(e as Error).message});}});
app.delete('/api/moves/:id',admin,(req,res)=>{try{accounts.deleteMove(String(req.params.id),res.locals.user);res.json({ok:true});}catch(e){const message=(e as Error).message;res.status(message==='Umzug nicht gefunden'?404:400).json({error:message});}});
app.get('/api/moves',(_req,res)=>res.json(accounts.moves(res.locals.user)));
for(const method of ['post','put'] as const)app[method]('/api/moves'+(method==='put'?'/:id':''),(req,res)=>{try{res.json({id:accounts.saveMove(req.body,res.locals.user,method==='put'?String(req.params.id):undefined)});}catch(e){res.status(400).json({error:(e as Error).message});}});
app.use('/api',(req,res,next)=>{const move=String(req.query.move||'initial');if(!accounts.moves(res.locals.user).some(m=>m.id===move))return res.status(403).json({error:'Kein Zugriff auf diesen Umzug'});res.locals.move=move;next();});
app.delete('/api/rooms/:id',(req,res)=>{
 const id=String(req.params.id),move=res.locals.move;
 if(!store.db.prepare('SELECT id FROM rooms WHERE id=? AND moveId=?').get(id,move))return res.status(404).json({error:'Raum nicht gefunden'});
 store.db.exec('BEGIN');
 try{store.db.prepare('UPDATE boxes SET roomId=NULL WHERE roomId=? AND moveId=?').run(id,move);store.db.prepare('DELETE FROM rooms WHERE id=? AND moveId=?').run(id,move);store.db.exec('COMMIT');res.json({ok:true});}
 catch{store.db.exec('ROLLBACK');res.status(409).json({error:'Raum konnte nicht gelöscht werden. Bitte erneut versuchen.'});}
});
app.get('/api/data',(_req,res)=>res.json({rooms:store.rooms(res.locals.move),boxes:store.boxes(res.locals.move),boxTypeDetails:store.boxTypeDetails(),volume:store.volumeSummary(res.locals.move)}));
for(const method of ['post','put'] as const)app[method]('/api/box-types'+(method==='put'?'/:name':''),admin,(req,res)=>{try{res.json(store.saveBoxType(req.body,method==='put'?String(req.params.name):undefined));}catch(e){res.status(400).json({error:(e as Error).message});}});
for(const method of ['post','put'] as const)app[method]('/api/rooms'+(method==='put'?'/:id':''),(req,res)=>{
 const {name,color,symbol}=req.body;
 if(typeof name!=='string'||!name.trim()||typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color))return res.status(400).json({error:'Name und gültige Raumfarbe erforderlich'});
 if(symbol!==undefined&&(typeof symbol!=='string'||(symbol!==''&&!roomSymbols.some(item=>item.id===symbol))))return res.status(400).json({error:'Ungültiges Raumsymbol'});
 const id=method==='put'?String(req.params.id):crypto.randomUUID();
 if(method==='put'){
  const result=store.db.prepare('UPDATE rooms SET name=?,color=?,symbol=COALESCE(?,symbol) WHERE id=? AND moveId=?').run(name.trim(),color,symbol??null,id,res.locals.move);
  if(!result.changes)return res.status(404).json({error:'Raum nicht gefunden'});
 }else store.db.prepare('INSERT INTO rooms(id,name,color,moveId,symbol) VALUES(?,?,?,?,?)').run(id,name.trim(),color,res.locals.move,symbol??'');
 res.json({id});
});
for(const method of ['post','put'] as const)app[method]('/api/boxes'+(method==='put'?'/:id':''),(req,res)=>{try{res.json({id:store.saveBox(req.body,method==='put'?String(req.params.id):undefined,res.locals.move)});}catch(e){res.status(400).json({error:(e as Error).message});}});
app.get('/api/boxes/:boxId/photos/:id',(req,res)=>{const photo=store.photo(String(req.params.id),String(req.params.boxId),res.locals.move);if(!photo)return res.status(404).json({error:'Foto nicht gefunden'});res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.type(String(photo.mime)).send(Buffer.from(photo.data as Uint8Array));});
app.patch('/api/boxes/bulk',(req,res)=>{try{res.json({updated:store.updateBoxes(req.body?.ids,req.body?.changes,res.locals.move)});}catch(e){res.status(400).json({error:(e as Error).message});}});
app.patch('/api/boxes/:id/handling',(req,res)=>{try{store.setBoxHandling(String(req.params.id),req.body,res.locals.move);res.json({ok:true});}catch(e){res.status(400).json({error:(e as Error).message});}});
app.delete('/api/boxes/:id',(req,res)=>{try{store.deleteBox(String(req.params.id),res.locals.move);res.json({ok:true});}catch(e){res.status(404).json({error:(e as Error).message});}});
app.use((error:any,_req:express.Request,res:express.Response,next:express.NextFunction)=>{if(error?.type==='entity.too.large')return res.status(413).json({error:'Fotos sind zu groß. Bitte weniger Fotos hinzufügen.'});next(error);});
app.use('/api',(_req,res)=>res.status(404).json({error:'Endpunkt nicht gefunden'}));
app.use(express.static(resolve('dist')));app.get('/{*path}',(_req,res)=>res.sendFile(resolve('dist/index.html')));
const server=app.listen(port,'0.0.0.0',()=>{
 log(`Server bereit: HTTP auf 0.0.0.0:${port}`);
 log(`Betriebsmodus: ${process.env.NODE_ENV==='production'?'Produktion':'Entwicklung'}`);
 log(`Datenbank: ${resolve(directory,'kistenkompass.sqlite')}`);
 log(`HTTPS-Adresse: ${deployment.publicUrl||'nicht konfiguriert'}`);
 log(`Vertrauenswürdige Proxies: ${process.env.TRUST_PROXY||'keine'}`);
 log(`Einrichtung: ${accounts.users().length?'abgeschlossen':'Administratorkonto beim ersten Aufruf einrichten'}`);
});
server.on('error',(error:NodeJS.ErrnoException)=>{log(`Serverstart fehlgeschlagen: ${error.code||'Fehler'} auf Port ${port}`);store.db.close();process.exit(1);});
let stopping=false;
for(const signal of ['SIGTERM','SIGINT'] as const)process.on(signal,()=>{
 if(stopping)return;stopping=true;log(`${signal}: Server wird beendet`);
 const timeout=setTimeout(()=>{log('Zeitlimit beim Beenden überschritten');process.exit(1);},25000);timeout.unref();
 server.close(()=>{clearTimeout(timeout);store.db.close();log('Server beendet; Datenbank geschlossen');process.exit(0);});
});
