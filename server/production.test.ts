import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('Produktionsserver hinter NPM: Domain, Secure-Cookie, Client-Limit und Neustart',async()=>{const dir=mkdtempSync(join(tmpdir(),'kk-production-'));let child:ReturnType<typeof spawn>|undefined;
 async function start(){child=spawn(process.execPath,['build-server/index.js'],{env:{...process.env,NODE_ENV:'production',PUBLIC_URL:'https://kisten.example.de',TRUST_PROXY:'loopback',DATA_DIR:dir,PORT:'3199'},stdio:['ignore','pipe','pipe']});await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Serverstart abgebrochen')),10000);child!.stdout!.once('data',()=>{clearTimeout(timer);resolve();});child!.once('exit',code=>{clearTimeout(timer);reject(Error('Server beendet: '+code));});child!.once('error',reject);});}
 async function stop(){if(child&&child.exitCode===null){const ended=new Promise<void>(resolve=>child!.once('exit',()=>resolve()));child.kill();await ended;}}
 async function request(path:string,body?:unknown,ip='198.51.100.1',origin='https://kisten.example.de'){return fetch('http://localhost:3199/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:origin,'X-Forwarded-Proto':'https','X-Forwarded-For':ip},body:body===undefined?undefined:JSON.stringify(body)});}
 try{await start();assert.equal((await request('session').then(r=>r.json())).publicUrl,'https://kisten.example.de');const credentials={name:'Admin',username:'admin',password:'test-password'};assert.equal((await request('setup',credentials)).status,200);assert.equal((await request('login',credentials,'198.51.100.1','https://evil.example')).status,403);const login=await request('login',credentials);assert.equal(login.status,200);assert.match(login.headers.get('set-cookie')!,/HttpOnly; SameSite=Strict; Path=\/; Max-Age=604800; Secure/);for(let i=0;i<10;i++)assert.equal((await request('login',{username:'admin',password:'wrong'},'198.51.100.2')).status,401);assert.equal((await request('login',credentials,'198.51.100.2')).status,429);assert.equal((await request('login',credentials,'198.51.100.3')).status,200);await stop();await start();assert.equal((await request('session').then(r=>r.json())).setup,false);assert.equal((await request('login',credentials)).status,200);assert.equal((await request('health')).status,200);
 }finally{await stop();rmSync(dir,{recursive:true,force:true});}
});
