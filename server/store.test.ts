import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Store} from './store.js';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
const box={name:'Kaffee',roomId:'',items:['Kaffeemaschine'],type:'Umzugskarton',fragile:true,heavy:false,status:'Gepackt',transporter:'',departed:''};
test('Neue Kartons füllen zuerst die kleinste Lücke; vorhandene Nummern und andere Umzüge bleiben erhalten',()=>{
 const s=new Store(':memory:');try{
 const ids=Array.from({length:5},()=>s.saveBox(box,undefined,'a'));s.saveBox(box,undefined,'b');
 s.deleteBox(ids[1],'a');s.deleteBox(ids[3],'a');
 assert.deepEqual(s.boxes('a').map(b=>b.number),[1,3,5]);
 assert.throws(()=>s.saveBox({...box,roomId:'missing'},undefined,'a'));
 const first=s.saveBox(box,undefined,'a');assert.equal(s.boxes('a').find(b=>b.id===first)?.number,2);
 const second=s.saveBox(box,undefined,'a');assert.equal(s.boxes('a').find(b=>b.id===second)?.number,4);
 const third=s.saveBox(box,undefined,'a');assert.equal(s.boxes('a').find(b=>b.id===third)?.number,6);
 assert.deepEqual(s.boxes('a').filter(b=>ids.includes(b.id)).map(b=>b.number),[1,3,5]);assert.equal(s.boxes('b')[0].number,1);
 }finally{s.db.close();}
});
test('Karton löschen schützt andere Umzüge, aktualisiert Volumen und gibt die Nummer nach Neustart frei',()=>{
 const dir=mkdtempSync(join(tmpdir(),'kistenkompass-delete-box-')),path=join(dir,'test.sqlite');let s:Store|undefined;
 try{s=new Store(path);const id=s.saveBox(box,undefined,'a'),kept=s.saveBox(box,undefined,'b');
 assert.throws(()=>s!.deleteBox(id,'b'),/nicht gefunden/);assert.equal(s.boxes('a').length,1);
 s.deleteBox(id,'a');assert.deepEqual(s.volumeSummary('a'),{liters:0,cubicMeters:0,missing:0});assert.equal(s.boxes('b')[0].id,kept);assert.throws(()=>s!.deleteBox(id,'a'),/nicht gefunden/);
 s.db.close();s=new Store(path);assert.equal(s.boxes('a').length,0);s.saveBox(box,undefined,'a');assert.equal(s.boxes('a')[0].number,1);
 }finally{s?.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('Jeder Umzug beginnt bei 001 und verwendet freie Nummern nach Löschen und Neustart',()=>{
 const dir=mkdtempSync(join(tmpdir(),'kistenkompass-numbers-')),path=join(dir,'test.sqlite');let s:Store|undefined;
 try{s=new Store(path);s.saveBox(box,undefined,'a');s.saveBox(box,undefined,'a');const removed=s.saveBox(box,undefined,'b');
 assert.deepEqual(s.boxes('a').map(b=>b.number),[1,2]);assert.equal(s.boxes('b')[0].number,1);
 assert.throws(()=>s!.db.prepare('INSERT INTO boxes SELECT ?,number,name,roomId,items,type,fragile,heavy,status,transporter,departed,moveId FROM boxes WHERE id=?').run('duplicate',removed));
 s.db.prepare('DELETE FROM boxes WHERE id=?').run(removed);s.db.close();s=new Store(path);
 s.saveBox(box,undefined,'b');s.saveBox(box,undefined,'c');assert.equal(s.boxes('b')[0].number,1);assert.equal(s.boxes('c')[0].number,1);
 assert.throws(()=>s!.saveBox({...box,roomId:'missing'},undefined,'c'));s.saveBox(box,undefined,'c');assert.deepEqual(s.boxes('c').map(b=>b.number),[1,2]);
 assert.throws(()=>s!.saveBox(box,s!.boxes('a')[0].id,'b'),/nicht gefunden/);
 }finally{s?.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('Migration erhält alte Nummern und Inhalte; freie Nummern werden wieder vergeben',()=>{
 const dir=mkdtempSync(join(tmpdir(),'kistenkompass-old-numbers-')),path=join(dir,'test.sqlite');let s:Store|undefined;
 try{const db=new DatabaseSync(path);db.exec(`CREATE TABLE rooms(id TEXT PRIMARY KEY,name TEXT NOT NULL,color TEXT NOT NULL);
 CREATE TABLE boxes(id TEXT PRIMARY KEY,number INTEGER NOT NULL UNIQUE,name TEXT NOT NULL,roomId TEXT REFERENCES rooms(id),items TEXT NOT NULL,type TEXT NOT NULL,fragile INTEGER NOT NULL,heavy INTEGER NOT NULL,status TEXT NOT NULL,transporter TEXT NOT NULL,departed TEXT NOT NULL,moveId TEXT NOT NULL DEFAULT 'initial');
 CREATE TABLE counters(name TEXT PRIMARY KEY,value INTEGER NOT NULL);INSERT INTO counters VALUES('box',7);
 CREATE TABLE moves(id TEXT PRIMARY KEY,name TEXT,date TEXT,origin TEXT,destination TEXT);INSERT INTO moves VALUES('initial','Alt','','',''),('empty','Leer','','','');
 INSERT INTO rooms VALUES('r','Küche','#123456');
 INSERT INTO boxes VALUES('old',2,'Kaffee','r','["Kaffeemaschine"]','Umzugskarton',1,0,'Gepackt','','','initial');`);
 const before=db.prepare('SELECT * FROM boxes').all();db.close();s=new Store(path);
 assert.deepEqual(s.db.prepare('SELECT * FROM boxes').all(),before);assert.deepEqual(s.db.prepare('PRAGMA foreign_key_check').all(),[]);
 s.saveBox(box,undefined,'initial');s.saveBox(box,undefined,'empty');s.saveBox(box,undefined,'new');
 assert.deepEqual(s.boxes('initial').map(b=>b.number),[1,2]);assert.equal(s.boxes('empty')[0].number,1);assert.equal(s.boxes('new')[0].number,1);
 s.db.close();s=new Store(path);s.saveBox(box,undefined,'new');assert.deepEqual(s.boxes('new').map(b=>b.number),[1,2]);
 }finally{s?.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('Standardkartonarten enthalten die vorgegebenen Maße und Volumen',()=>{
 const s=new Store(':memory:');try{
 assert.deepEqual(s.boxTypeDetails(),[
 {name:'Archivbox',length:40,width:34,height:26,volumeLiters:35.36},
 {name:'Bananenkarton',length:54,width:39,height:24,volumeLiters:50.544},
 {name:'Sonstiger Karton',length:null,width:null,height:null,volumeLiters:null},
 {name:'Umzugskarton',length:60,width:33,height:34,volumeLiters:67.32}
 ]);
 s.saveBox(box);assert.deepEqual(s.volumeSummary(),{liters:67.32,cubicMeters:67.32/1000,missing:0});
 }finally{s.db.close();}
});
test('Bestehende Kartonarten erhalten fehlende Standardmaße und behalten eigene Maße nach Neustart',()=>{
 const dir=mkdtempSync(join(tmpdir(),'kistenkompass-defaults-')),path=join(dir,'test.sqlite');let s:Store|undefined;
 try{const db=new DatabaseSync(path);db.exec("CREATE TABLE box_types(name TEXT PRIMARY KEY COLLATE NOCASE,length REAL,width REAL,height REAL); INSERT INTO box_types VALUES('Archivbox',NULL,NULL,NULL),('Bananenkarton',55,40,25),('Umzugskarton',61,NULL,NULL);");db.close();
 s=new Store(path);assert.equal(s.boxTypeDetails().find(t=>t.name==='Archivbox')?.volumeLiters,35.36);
 assert.equal(s.boxTypeDetails().find(t=>t.name==='Bananenkarton')?.length,55);
 assert.equal(s.boxTypeDetails().find(t=>t.name==='Umzugskarton')?.length,61);
 s.saveBoxType({name:'Archivbox',length:45,width:35,height:27},'Archivbox');s.db.close();s=new Store(path);
 assert.equal(s.boxTypeDetails().find(t=>t.name==='Archivbox')?.length,45);
 }finally{s?.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('Eigene Kartonarten bleiben nach Neustart verfügbar',()=>{
 const dir=mkdtempSync(join(tmpdir(),'kistenkompass-types-'));let s:Store|undefined;
 try{s=new Store(join(dir,'test.sqlite'));assert.equal(s.addBoxType('  Bücherkarton  '),'Bücherkarton');assert.throws(()=>s!.addBoxType('bücherkarton'));assert.throws(()=>s!.addBoxType('  '));assert.throws(()=>s!.addBoxType(null));s.saveBox({...box,type:'Bücherkarton'});s.saveBox({...box,type:'Alte Sonderbox'});s.db.close();s=undefined;s=new Store(join(dir,'test.sqlite'));assert.ok(s.boxTypes().includes('Bücherkarton'));assert.ok(s.boxTypes().includes('Alte Sonderbox'));assert.ok(s.boxTypes().includes('Umzugskarton'));assert.equal(s.boxes()[0].type,'Bücherkarton');}finally{s?.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('Nummern bleiben eindeutig und werden nach Löschen wiederverwendet',()=>{const s=new Store(':memory:');const id=s.saveBox(box);s.db.prepare('DELETE FROM boxes WHERE id=?').run(id);s.saveBox(box);assert.equal(s.boxes()[0].number,1);s.db.close();});
test('Bearbeitung erhält Nummer und Inhalte',()=>{const s=new Store(':memory:');const id=s.saveBox(box);s.saveBox({...box,status:'Angekommen'},id);assert.equal(s.boxes()[0].number,1);assert.equal(s.boxes()[0].status,'Angekommen');assert.deepEqual(s.boxes()[0].items,['Kaffeemaschine']);s.db.close();});
test('Ungültiger Raum verbraucht keine Nummer',()=>{const s=new Store(':memory:');assert.throws(()=>s.saveBox({...box,roomId:'missing'}));s.saveBox(box);assert.equal(s.boxes()[0].number,1);assert.throws(()=>s.saveBox({...box,status:'unknown'}));s.db.close();});
test('Volumen summiert alle Kartons und aktualisiert sich bei Maßänderung und Umbenennung',()=>{
 const s=new Store(':memory:');try{
 s.saveBoxType({name:'Umzugskarton',length:60,width:40,height:30},'Umzugskarton');
 s.saveBox(box);s.saveBox({...box,status:'Ausgepackt'});s.saveBox({...box,type:'Sonderbox'});
 assert.deepEqual(s.volumeSummary(),{liters:144,cubicMeters:0.144,missing:1});
 s.saveBoxType({name:'Großer Karton',length:60,width:40,height:50},'Umzugskarton');
 assert.equal(s.boxes()[0].type,'Großer Karton');assert.deepEqual(s.volumeSummary(),{liters:240,cubicMeters:0.24,missing:1});
 s.saveBoxType({name:'Sonderbox',length:10,width:10,height:10},'Sonderbox');
 assert.deepEqual(s.volumeSummary(),{liters:241,cubicMeters:0.241,missing:0});
 for(const length of [0,-1,NaN,Infinity,'20',null,10001])assert.throws(()=>s.saveBoxType({name:'Ungültig',length,width:20,height:20}));
 assert.throws(()=>s.saveBoxType({name:'großer karton',length:20,width:20,height:20}));
 }finally{s.db.close();}
});
test('Alte Datenbank erhält Maße ohne Datenverlust und speichert sie nach Neustart',()=>{
 const dir=mkdtempSync(join(tmpdir(),'kistenkompass-dimensions-')),path=join(dir,'test.sqlite');let s:Store|undefined;
 try{const db=new DatabaseSync(path);db.exec("CREATE TABLE box_types(name TEXT PRIMARY KEY COLLATE NOCASE); INSERT INTO box_types VALUES('Altbestand');");db.close();
 s=new Store(path);const id=s.saveBox({...box,type:'Altbestand'});assert.equal(s.boxTypeDetails().find(t=>t.name==='Altbestand')?.volumeLiters,null);
 s.saveBoxType({name:'Altbestand',length:50.5,width:40,height:30},'Altbestand');s.db.close();s=new Store(path);
 assert.equal(s.boxes()[0].id,id);assert.equal(s.boxTypeDetails().find(t=>t.name==='Altbestand')?.volumeLiters,60.6);assert.equal(s.volumeSummary().missing,0);
 }finally{s?.db.close();rmSync(dir,{recursive:true,force:true});}
});
