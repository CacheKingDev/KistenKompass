// Repeatable Docker smoke test; uses only newly created disposable test resources.
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const suffix=Date.now().toString(),name='kk-smoke-'+suffix,volume=name+'-data';let created=false,container=false;
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
try{
 docker('volume','create',volume);created=true;
 docker('run','-d','--name',name,'--init','-p','127.0.0.1::3000','-v',volume+':/data','-e','PUBLIC_URL=https://umzug.example.com','-e','TRUST_PROXY=192.0.2.2','kistenkompass:local');container=true;
 const port=docker('port',name,'3000/tcp').split(':').pop();let base='http://127.0.0.1:'+port;let cookie='';
 async function ready(){for(let i=0;i<40;i++){try{if((await fetch(base+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw Error('Container nicht erreichbar');}
 async function api(path,body){const r=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://umzug.example.com','Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};}
 await ready();assert.equal(docker('exec',name,'id','-u'),'1000');assert.equal((await api('session')).data.publicUrl,'https://umzug.example.com');assert.equal((await api('data')).status,401);
 const credentials={name:'Test Admin',username:'admin',password:'docker-test-password'};assert.equal((await api('setup',credentials)).status,200);const login=await api('login',credentials);assert.equal(login.status,200);assert.match(login.cookie,/; Secure/);cookie=login.cookie.split(';')[0];
 const room=(await api('rooms',{name:'Küche',color:'#123456'})).data.id;
 const box=(await api('boxes',{name:'Docker-Testkarton',roomId:room,items:['Tasse'],type:'Umzugskarton',status:'Gepackt',fragile:true,heavy:false})).data.id;
 assert.ok(box);assert.equal((await api('data')).data.boxes[0].id,box);assert.equal((await fetch(base+'/')).status,200);
 docker('restart',name);base='http://127.0.0.1:'+docker('port',name,'3000/tcp').split(':').pop();await ready();assert.equal((await api('session')).data.setup,false);assert.equal((await api('data')).data.boxes[0].id,box);
 const config=JSON.parse(docker('inspect',name))[0];assert.ok(config.Config.Healthcheck);docker('exec',name,'node','-e',"fetch('http://localhost:3000/api/health').then(r=>{if(!r.ok)process.exit(1)})");
 console.log('Docker geprüft: UID 1000, HTTPS-Cookie, Anmeldung, Räume/Kartons, Volume nach Neustart und Healthcheck.');
}finally{if(container)docker('rm','-f',name);if(created)docker('volume','rm',volume);}
