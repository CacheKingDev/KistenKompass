import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createUpdateCheck} from '../src/appUpdate.js';

test('App aktualisiert nur bei neuer Build-ID und wartet auf das Ende einer Bearbeitung',async()=>{
 let remote:unknown={buildId:'current'},safe=true,reloads=0;
 const check=createUpdateCheck({buildId:'current',fetchVersion:async()=>remote,canReload:()=>safe,reload:()=>{reloads++;}});
 await check();assert.equal(reloads,0);
 for(const invalid of [null,{},'<html>',{buildId:42},{buildId:''}]){remote=invalid;await check();}
 assert.equal(reloads,0);
 remote={buildId:'next'};safe=false;await check();assert.equal(reloads,0);
 safe=true;await check();assert.equal(reloads,1);
 await check();assert.equal(reloads,1);
});

test('Offlinefehler lassen erneute Versionsprüfung zu; parallele Prüfungen werden vermieden',async()=>{
 let requests=0,reloads=0,finish:((value:unknown)=>void)|undefined;
 const check=createUpdateCheck({buildId:'current',canReload:()=>true,reload:()=>{reloads++;},fetchVersion:async()=>{
  requests++;if(requests===1)throw Error('offline');
  return new Promise(resolve=>{finish=resolve;});
 }});
 await check();assert.equal(reloads,0);
 const pending=check();await check();assert.equal(requests,2);
 finish!({buildId:'next'});await pending;assert.equal(reloads,1);
});
