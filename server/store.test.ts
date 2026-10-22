import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Store} from './store.js';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
const box={name:'Kaffee',roomId:'',items:['Kaffeemaschine'],type:'Umzugskarton',fragile:true,heavy:false,status:'Gepackt',transporter:'',departed:''};

test('Raumsymbol-Migration erhält alte Räume und Symbole nach Neustart',()=>{
 const dir=mkdtempSync(join(tmpdir(),'kk-room-symbol-')),path=join(dir,'test.sqlite');
 try{
  const legacy=new DatabaseSync(path);legacy.exec("CREATE TABLE rooms(id TEXT PRIMARY KEY,name TEXT NOT NULL,color TEXT NOT NULL); INSERT INTO rooms VALUES('r','Küche','#123456')");legacy.close();
  const first=new Store(path);
  try{assert.deepEqual(first.rooms().map(room=>({...room})),[{id:'r',name:'Küche',color:'#123456',symbol:''}]);
  first.db.prepare('UPDATE rooms SET symbol=? WHERE id=?').run('kitchen','r');}finally{first.db.close();}
  const reopened=new Store(path);try{assert.equal(reopened.rooms()[0].symbol,'kitchen');assert.equal(reopened.rooms()[0].name,'Küche');}finally{reopened.db.close();}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
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
 assert.throws(()=>s!.db.prepare('INSERT INTO boxes SELECT ?,number,name,roomId,items,type,fragile,heavy,status,transporter,departed,moveId,currentLocation FROM boxes WHERE id=?').run('duplicate',removed));
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
 const before=db.prepare('SELECT * FROM boxes').all();before.forEach(row=>{row.currentLocation='';row.hasLabel=0;});db.close();s=new Store(path);
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
test('Umbenannte Standardkartonarten bleiben auch nach wiederholtem Neustart umbenannt',()=>{
 const dir=mkdtempSync(join(tmpdir(),'kk-renamed-types-')),path=join(dir,'test.sqlite');let s:Store|undefined;
 try{
 s=new Store(path);const id=s.saveBox(box);
 for(const original of ['Umzugskarton','Archivbox','Bananenkarton','Sonstiger Karton'])s.saveBoxType({name:'Neu '+original,length:60,width:40,height:30},original);
 const expected=s.boxTypeDetails();
 for(let restart=0;restart<2;restart++){
 s.db.close();s=new Store(path);
 assert.deepEqual(s.boxTypeDetails(),expected);
 assert.equal(s.boxes()[0].id,id);assert.equal(s.boxes()[0].type,'Neu Umzugskarton');
 assert.deepEqual(s.volumeSummary(),{liters:72,cubicMeters:0.072,missing:0});
 }
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

test('Fotos bleiben nach Neustart erhalten, schützen Umzugsgrenzen und werden mit dem Karton gelöscht',()=>{
 const dir=mkdtempSync(join(tmpdir(),'kk-photos-')),path=join(dir,'test.sqlite');let s:Store|undefined;
 const data='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZioAAAAASUVORK5CYII=';
 try{
 s=new Store(path);const id=s.saveBox({...box,photos:[{data}]},undefined,'a');const photo=s.boxes('a')[0].photos[0];
 assert.ok(s.photo(photo.id,id,'a'));assert.equal(s.photo(photo.id,id,'b'),undefined);
 assert.equal(s.boxes('a')[0].photos[0].id,photo.id);assert.equal('data' in photo,false);
 s.db.close();s=new Store(path);assert.ok(s.photo(photo.id,id,'a'));
 s.saveBox({...box,name:'Geändert'},id,'a');assert.equal(s.boxes('a')[0].photos.length,1);
 assert.throws(()=>s!.saveBox({...box,name:'Verworfen',photos:[{data:'data:image/png;base64,YWJj'}]},id,'a'));
 assert.equal(s.boxes('a')[0].name,'Geändert');assert.ok(s.photo(photo.id,id,'a'));
 assert.throws(()=>s!.saveBox({...box,photos:Array.from({length:7},()=>({data}))},undefined,'a'));
 assert.equal(s.boxes('a').length,1);
 const other=s.saveBox(box,undefined,'b');assert.throws(()=>s!.saveBox({...box,photos:[photo]},other,'b'));
 s.saveBox({...box,photos:[]},id,'a');assert.equal(s.photo(photo.id,id,'a'),undefined);
 s.saveBox({...box,photos:[{data}]},id,'a');s.deleteBox(id,'a');assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM box_photos').get()?.n,0);
 }finally{s?.db.close();rmSync(dir,{recursive:true,force:true});}
});

test('Abtransportdatum lässt sich löschen und erneut setzen',()=>{
 const s=new Store(':memory:');try{
 const id=s.saveBox({...box,departed:'2026-10-15T14:30'},undefined,'a');
 s.saveBox({...box,departed:''},id,'a');assert.equal(s.db.prepare('SELECT departed FROM boxes WHERE id=?').get(id)?.departed,'');
 s.saveBox({...box,departed:'2026-10-16T09:00'},id,'a');assert.equal(s.db.prepare('SELECT departed FROM boxes WHERE id=?').get(id)?.departed,'2026-10-16T09:00');
 }finally{s.db.close();}
});

test('Schnellkennzeichnungen ändern nur gewünschte Felder und bleiben nach Neustart erhalten',()=>{
 const dir=mkdtempSync(join(tmpdir(),'kistenkompass-handling-')),path=join(dir,'test.sqlite');let s:Store|undefined;
 try{
 s=new Store(path);const id=s.saveBox({...box,departed:'2026-10-15T10:30',transporter:'Anna'},undefined,'a');
 const before=s.boxes('a')[0];
 s.setBoxHandling(id,{heavy:true},'a');assert.deepEqual(s.boxes('a')[0],{...before,heavy:true});
 s.setBoxHandling(id,{fragile:false},'a');assert.deepEqual(s.boxes('a')[0],{...before,heavy:true,fragile:false});
 assert.throws(()=>s!.setBoxHandling(id,{heavy:false},'b'),/nicht gefunden/);
 for(const data of [{},null,[],{heavy:'yes'},{name:'Änderung'},{heavy:false,fragile:null}])assert.throws(()=>s!.setBoxHandling(id,data,'a'),/Ungültige/);
 s.db.close();s=new Store(path);assert.deepEqual(s.boxes('a')[0],{...before,heavy:true,fragile:false});
 s.setBoxHandling(id,{heavy:false,fragile:true},'a');assert.deepEqual(s.boxes('a')[0],before);
 }finally{s?.db.close();rmSync(dir,{recursive:true,force:true});}
});

test('Aktueller Standort bleibt bei alten Clients und Schnellaktionen erhalten, lässt sich löschen und übersteht Neustart',()=>{
 const dir=mkdtempSync(join(tmpdir(),'kistenkompass-location-')),path=join(dir,'test.sqlite');let s:Store|undefined;
 try{s=new Store(path);const id=s.saveBox({...box,currentLocation:' Garage '},undefined,'a');
 assert.equal(s.boxes('a')[0].currentLocation,'Garage');
 s.saveBox({...box,name:'Neuer Name'},id,'a');s.setBoxHandling(id,{heavy:true},'a');assert.equal(s.boxes('a')[0].currentLocation,'Garage');
 assert.throws(()=>s!.saveBox({...box,currentLocation:'Transporter'},id,'b'),/nicht gefunden/);
 assert.throws(()=>s!.saveBox({...box,currentLocation:42},id,'a'),/Standort/);
 assert.throws(()=>s!.saveBox({...box,currentLocation:'x'.repeat(201)},id,'a'),/Standort/);
 s.db.close();s=new Store(path);assert.equal(s.boxes('a')[0].currentLocation,'Garage');
 s.saveBox({...box,currentLocation:'Transporter'},id,'a');assert.equal(s.boxes('a')[0].currentLocation,'Transporter');
 s.saveBox({...box,currentLocation:''},id,'a');assert.equal(s.boxes('a')[0].currentLocation,'');
 }finally{s?.db.close();rmSync(dir,{recursive:true,force:true});}
});

test('Mehrfachänderung ist atomar, schützt andere Umzüge und erhält alle nicht gewählten Angaben',()=>{
 const s=new Store(':memory:');try{
 const a=s.saveBox({...box,currentLocation:'Keller',transporter:'Anna'},undefined,'a');
 const b=s.saveBox({...box,name:'Bücher',status:'In Vorbereitung',currentLocation:'Garage',transporter:'Ben',heavy:true},undefined,'a');
 const foreign=s.saveBox(box,undefined,'b');const before=s.boxes('a'),other=s.boxes('b');
 assert.equal(s.updateBoxes([a,b],{currentLocation:' Transporter '},'a'),2);
 assert.deepEqual(s.boxes('a'),before.map(box=>({...box,currentLocation:'Transporter'})));
 const snapshot=s.boxes('a');
 assert.throws(()=>s.updateBoxes([a,foreign],{status:'Transportiert'},'a'),/nichts geändert/);assert.deepEqual(s.boxes('a'),snapshot);assert.deepEqual(s.boxes('b'),other);
 assert.throws(()=>s.updateBoxes([a,'missing'],{transporter:'Neu'},'a'),/nichts geändert/);assert.deepEqual(s.boxes('a'),snapshot);
 for(const changes of [{},null,{name:'Nein'},{photos:[]},{status:'Unbekannt'},{currentLocation:42},{transporter:'x'.repeat(201)}])assert.throws(()=>s.updateBoxes([a,b],changes,'a'));
 for(const ids of [[],[a,a],[''],null,[a,42]])assert.throws(()=>s.updateBoxes(ids,{status:'Gepackt'},'a'));
 assert.deepEqual(s.boxes('a'),snapshot);
 s.updateBoxes([a,b],{currentLocation:'',transporter:'Chris',status:'Transportiert'},'a');
 assert.deepEqual(s.boxes('a'),before.map(box=>({...box,currentLocation:'',transporter:'Chris',status:'Transportiert'})));
 }finally{s.db.close();}
});

test('Etikettenstatus wird gespeichert, erhalten und zurückgenommen',()=>{
 const s=new Store(':memory:');try{
 const id=s.saveBox(box,undefined,'a');assert.equal(s.boxes('a')[0].hasLabel,false);
 s.saveBox({...box,hasLabel:true},id,'a');assert.equal(s.boxes('a')[0].hasLabel,true);
 s.saveBox(box,id,'a');assert.equal(s.boxes('a')[0].hasLabel,true);
 assert.throws(()=>s.saveBox({...box,hasLabel:'true'},id,'a'),/Etikettenstatus/);
 assert.throws(()=>s.saveBox({...box,hasLabel:false},id,'b'),/nicht gefunden/);
 assert.equal(s.boxes('a')[0].hasLabel,true);
 s.saveBox({...box,hasLabel:false},id,'a');assert.equal(s.boxes('a')[0].hasLabel,false);
 }finally{s.db.close();}
});
