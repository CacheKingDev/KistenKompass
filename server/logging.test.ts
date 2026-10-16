import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {requestLogging,errorMessage} from './logging.js';

test('Containerlog bleibt ruhig, ordnet Benutzer zu und schützt sensible Daten',async()=>{
 const lines:string[]=[];const previousLog=console.log,previousError=console.error;
 console.log=console.error=(line:string)=>{lines.push(line);};
 const app=express();app.use(express.json());app.use(requestLogging);
 app.get('/api/health',(_req,res)=>res.json({ok:true}));
 app.post('/api/login',(_req,res)=>{res.locals.user={username:'anna\nFAKE'};res.json({ok:true});});
 app.post('/api/boxes',(_req,res)=>{res.locals.user={username:'anna'};res.status(400).json({error:'Name erforderlich'});});
 app.get('/api/broken',(_req,res)=>{const error=Object.assign(new Error('secret database content'),{code:'SQLITE_FULL'});res.status(400).json({error:errorMessage(error,res)});});
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const address=server.address();assert.ok(address&&typeof address!=='string');
 const url=`http://127.0.0.1:${address.port}`;
 try{
  await fetch(url+'/api/health');assert.equal(lines.length,0);
  await fetch(url+'/api/login',{method:'POST',headers:{'Content-Type':'application/json',Cookie:'kk_session=secret-token'},body:JSON.stringify({password:'secret-password'})});
  assert.equal(lines.length,1);assert.match(lines[0],/INFO Anmeldung erfolgreich/);assert.match(lines[0],/user="anna\\nFAKE"/);
  await fetch(url+'/api/boxes',{method:'POST'});assert.match(lines[1],/WARN Anfrage fehlgeschlagen/);assert.match(lines[1],/Name erforderlich/);assert.match(lines[1],/user="anna"/);
  assert.equal((await fetch(url+'/api/broken')).status,500);assert.match(lines[2],/ERROR/);assert.match(lines[2],/SQLITE_FULL/);
  assert.equal(lines.length,3);assert.doesNotMatch(lines.join('\n'),/secret-|secret database/);
 }finally{console.log=previousLog;console.error=previousError;await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
