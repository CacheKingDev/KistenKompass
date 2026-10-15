import { DatabaseSync } from 'node:sqlite';
export class Store {
 db: DatabaseSync;
 constructor(path:string){this.db=new DatabaseSync(path);this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS rooms(id TEXT PRIMARY KEY,name TEXT NOT NULL,color TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS boxes(id TEXT PRIMARY KEY,number INTEGER NOT NULL UNIQUE,name TEXT NOT NULL,roomId TEXT REFERENCES rooms(id),items TEXT NOT NULL,type TEXT NOT NULL,fragile INTEGER NOT NULL,heavy INTEGER NOT NULL,status TEXT NOT NULL,transporter TEXT NOT NULL,departed TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS counters(name TEXT PRIMARY KEY,value INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS box_types(name TEXT PRIMARY KEY COLLATE NOCASE);
 INSERT OR IGNORE INTO box_types(name) VALUES('Archivbox'),('Bananenkarton'),('Umzugskarton'),('Sonstiger Karton');
 INSERT OR IGNORE INTO counters VALUES('box',0);`);
 const columns=this.db.prepare('PRAGMA table_info(box_types)').all();
 for(const column of ['length','width','height'])if(!columns.some(c=>c.name===column))this.db.exec(`ALTER TABLE box_types ADD COLUMN ${column} REAL`);
 const defaults=this.db.prepare('UPDATE box_types SET length=?,width=?,height=? WHERE name=? AND length IS NULL AND width IS NULL AND height IS NULL');
 defaults.run(40,34,26,'Archivbox');
 defaults.run(54,39,24,'Bananenkarton');
 defaults.run(60,33,34,'Umzugskarton');
 this.migrateBoxNumbers();
 if(!this.db.prepare('PRAGMA table_info(boxes)').all().some(c=>c.name==='currentLocation'))this.db.exec("ALTER TABLE boxes ADD COLUMN currentLocation TEXT NOT NULL DEFAULT ''");
 this.db.exec('CREATE TABLE IF NOT EXISTS box_photos(id TEXT PRIMARY KEY,boxId TEXT NOT NULL REFERENCES boxes(id) ON DELETE CASCADE,mime TEXT NOT NULL,data BLOB NOT NULL)');
 }
 private migrateBoxNumbers(){
 const db=this.db;
 const globalNumberIndex=db.prepare('PRAGMA index_list(boxes)').all().some(index=>index.unique&&db.prepare('SELECT name FROM pragma_index_info(?)').all(String(index.name)).map(c=>c.name).join(',')==='number');
 if(!globalNumberIndex)return;
 const hasMove=db.prepare('PRAGMA table_info(boxes)').all().some(c=>c.name==='moveId');
 db.exec('BEGIN IMMEDIATE');try{
 db.exec(`CREATE TABLE boxes_number_migration(id TEXT PRIMARY KEY,number INTEGER NOT NULL,name TEXT NOT NULL,roomId TEXT REFERENCES rooms(id),items TEXT NOT NULL,type TEXT NOT NULL,fragile INTEGER NOT NULL,heavy INTEGER NOT NULL,status TEXT NOT NULL,transporter TEXT NOT NULL,departed TEXT NOT NULL,moveId TEXT NOT NULL DEFAULT 'initial',UNIQUE(moveId,number));
 INSERT INTO boxes_number_migration SELECT id,number,name,roomId,items,type,fragile,heavy,status,transporter,departed,${hasMove?'moveId':"'initial'"} FROM boxes;
 DROP TABLE boxes;
 ALTER TABLE boxes_number_migration RENAME TO boxes;
 INSERT OR IGNORE INTO counters(name,value) SELECT 'box:'||moveId,MAX(number) FROM boxes GROUP BY moveId;`);
 // The old global counter may include deleted numbers. Preserve its high-water
 // mark for existing moves; newly created moves start with their own zero.
 const old=Number(db.prepare("SELECT value FROM counters WHERE name='box'").get()?.value||0);
 if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='moves'").get())db.prepare("INSERT INTO counters(name,value) SELECT 'box:'||id,? FROM moves WHERE 1 ON CONFLICT(name) DO UPDATE SET value=MAX(value,excluded.value)").run(old);
 else db.prepare("INSERT INTO counters(name,value) VALUES('box:initial',?) ON CONFLICT(name) DO UPDATE SET value=MAX(value,excluded.value)").run(old);
 db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 }
 boxTypeDetails(){return this.boxTypes().map(name=>{const row=this.db.prepare('SELECT length,width,height FROM box_types WHERE name=? COLLATE NOCASE').get(name);const length=row?.length==null?null:Number(row.length),width=row?.width==null?null:Number(row.width),height=row?.height==null?null:Number(row.height);return {name,length,width,height,volumeLiters:length&&width&&height?length*width*height/1000:null};});}
 volumeSummary(moveId?:string){const types=this.boxTypeDetails();let liters=0,missing=0;for(const box of this.boxes(moveId)){const type=types.find(t=>t.name.toLocaleLowerCase('de')===box.type.trim().toLocaleLowerCase('de'));if(type?.volumeLiters!=null)liters+=type.volumeLiters;else missing++;}return {liters,cubicMeters:liters/1000,missing};}
 saveBoxType(data:any,original?:string){
 if(!data||typeof data.name!=='string'||!data.name.trim())throw new Error('Name der Kartonart erforderlich');
 const name=data.name.trim(),dimensions=[data.length,data.width,data.height];
 if(dimensions.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<=0||v>10000))throw new Error('Alle Maße müssen größer als 0 und höchstens 10.000 cm sein');
 if(original&&!this.boxTypes().includes(original))throw new Error('Kartonart nicht gefunden');
 if(this.boxTypes().some(t=>t.toLocaleLowerCase('de')===name.toLocaleLowerCase('de')&&t!==original))throw new Error('Diese Kartonart existiert bereits');
 this.db.exec('BEGIN IMMEDIATE');try{
 if(original){this.db.prepare('DELETE FROM box_types WHERE name=?').run(original);this.db.prepare('UPDATE boxes SET type=? WHERE trim(type)=? COLLATE NOCASE').run(name,original);}
 this.db.prepare('INSERT INTO box_types(name,length,width,height) VALUES(?,?,?,?)').run(name,...dimensions);
 this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}return this.boxTypeDetails().find(t=>t.name===name);
 }
 rooms(moveId?:string){return moveId?this.db.prepare('SELECT * FROM rooms WHERE moveId=? ORDER BY name').all(moveId):this.db.prepare('SELECT * FROM rooms ORDER BY name').all();}
 boxTypes(){return this.db.prepare("SELECT name FROM box_types UNION SELECT trim(type) AS name FROM boxes WHERE trim(type)<>'' ORDER BY name COLLATE NOCASE").all().map(t=>String(t.name));}
 addBoxType(name:unknown){
 if(typeof name!=='string'||!name.trim())throw new Error('Name der Kartonart erforderlich');
 const value=name.trim();
 if(this.boxTypes().some(t=>t.toLocaleLowerCase('de')===value.toLocaleLowerCase('de')))throw new Error('Diese Kartonart existiert bereits');
 this.db.prepare('INSERT INTO box_types(name) VALUES(?)').run(value);
 return value;
 }
 boxes(moveId?:string){return (moveId?this.db.prepare('SELECT * FROM boxes WHERE moveId=? ORDER BY number').all(moveId):this.db.prepare('SELECT * FROM boxes ORDER BY number').all()).map(b=>({...b,id:String(b.id),name:String(b.name),number:Number(b.number),currentLocation:String(b.currentLocation||''),status:String(b.status),type:String(b.type),photos:this.db.prepare('SELECT id FROM box_photos WHERE boxId=? ORDER BY rowid').all(b.id).map(p=>({id:String(p.id)})),items:JSON.parse(String(b.items)) as string[],fragile:!!b.fragile,heavy:!!b.heavy}));}
 updateBoxes(ids:unknown,changes:unknown,moveId:string){
 if(!Array.isArray(ids)||!ids.length||ids.length>2000||ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)throw Error('Bitte gültige Kartons auswählen (höchstens 2000).');
 if(!changes||typeof changes!=='object'||Array.isArray(changes))throw Error('Ungültige Änderungen');
 const entries=Object.entries(changes);
 if(!entries.length||entries.some(([key,value])=>!['currentLocation','status','transporter'].includes(key)||typeof value!=='string'||(key==='status'?!['In Vorbereitung','Gepackt','Transportiert','Angekommen','Ausgepackt'].includes(value):value.length>200)))throw Error('Ungültige Änderungen');
 this.db.exec('BEGIN IMMEDIATE');try{
 const statement=this.db.prepare('UPDATE boxes SET '+entries.map(([key])=>key+'=?').join(',')+' WHERE id=? AND moveId=?');
 const values=entries.map(([,value])=>(value as string).trim());
 for(const id of ids)if(!statement.run(...values,id,moveId).changes)throw Error('Mindestens ein Karton ist nicht mehr verfügbar. Es wurde nichts geändert.');
 this.db.exec('COMMIT');return ids.length;
 }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 setBoxHandling(id:string,data:unknown,moveId:string){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Ungültige Kennzeichnungen');
 const entries=Object.entries(data);
 if(!entries.length||entries.some(([key,value])=>!['fragile','heavy'].includes(key)||typeof value!=='boolean'))throw Error('Ungültige Kennzeichnungen');
 const result=this.db.prepare('UPDATE boxes SET '+entries.map(([key])=>key+'=?').join(',')+' WHERE id=? AND moveId=?').run(...entries.map(([,value])=>value?1:0),id,moveId);
 if(!result.changes)throw Error('Karton nicht gefunden');
 }
 deleteBox(id:string,moveId:string){if(!this.db.prepare('DELETE FROM boxes WHERE id=? AND moveId=?').run(id,moveId).changes)throw Error('Karton nicht gefunden');}
 photo(id:string,boxId:string,moveId:string){return this.db.prepare('SELECT p.mime,p.data FROM box_photos p JOIN boxes b ON b.id=p.boxId WHERE p.id=? AND b.id=? AND b.moveId=?').get(id,boxId,moveId);}
 saveBox(b:any,id?:string,moveId?:string){
 const db=this.db;db.exec('BEGIN IMMEDIATE');try{
 const key=this.saveBoxData(b,id,moveId);
 if(b.photos!==undefined){
 if(!Array.isArray(b.photos)||b.photos.length>6)throw Error('Höchstens 6 Fotos pro Karton erlaubt');
 const retained=new Set<string>();
 for(const photo of b.photos){
 if(photo?.data){
 const match=typeof photo.data==='string'&&/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo.data);
 if(!match)throw Error('Ungültiges Fotoformat');
 const data=Buffer.from(match[2],'base64'),format=match[1];
 const valid=format==='jpeg'?data[0]===255&&data[1]===216&&data[2]===255:format==='png'?data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP';
 if(!valid||data.length>1024*1024)throw Error('Foto ungültig oder größer als 1 MB');
 const photoId=crypto.randomUUID();db.prepare('INSERT INTO box_photos VALUES(?,?,?,?)').run(photoId,key,'image/'+format,data);retained.add(photoId);
 }else if(typeof photo?.id==='string'&&db.prepare('SELECT id FROM box_photos WHERE id=? AND boxId=?').get(photo.id,key)&&!retained.has(photo.id)){retained.add(photo.id);}else throw Error('Foto nicht gefunden');
 }
 for(const photo of db.prepare('SELECT id FROM box_photos WHERE boxId=?').all(key))if(!retained.has(String(photo.id)))db.prepare('DELETE FROM box_photos WHERE id=?').run(photo.id);
 }
 db.exec('COMMIT');return key;
 }catch(e){db.exec('ROLLBACK');throw e;}
 }
 private saveBoxData(b:any,id?:string,moveId?:string){
 if(moveId){if(id&&!this.db.prepare('SELECT id FROM boxes WHERE id=? AND moveId=?').get(id,moveId))throw Error('Karton nicht gefunden');if(b.roomId&&!this.db.prepare('SELECT id FROM rooms WHERE id=? AND moveId=?').get(b.roomId,moveId))throw Error('Raum gehört zu einem anderen Umzug');}
 if(!b || typeof b.name!=='string'|| !b.name.trim() || !Array.isArray(b.items)||b.items.some((i:any)=>typeof i!=='string')|| !['In Vorbereitung','Gepackt','Transportiert','Angekommen','Ausgepackt'].includes(b.status)||typeof b.type!=='string'|| typeof b.fragile!=='boolean'||typeof b.heavy!=='boolean')throw new Error('Ungültige Kartondaten');
 if(b.currentLocation!==undefined&&(typeof b.currentLocation!=='string'||b.currentLocation.length>200))throw Error('Standort darf höchstens 200 Zeichen enthalten');
 const currentLocation=b.currentLocation===undefined&&id?String(this.db.prepare('SELECT currentLocation FROM boxes WHERE id=?').get(id)?.currentLocation||''):String(b.currentLocation||'').trim();
 const values=[b.name.trim(),b.roomId||null,JSON.stringify(b.items),b.type,b.fragile?1:0,b.heavy?1:0,b.status,String(b.transporter||''),String(b.departed||''),currentLocation];
 if(id){const result=this.db.prepare('UPDATE boxes SET name=?,roomId=?,items=?,type=?,fragile=?,heavy=?,status=?,transporter=?,departed=?,currentLocation=? WHERE id=?').run(...values,id);if(!result.changes)throw new Error('Karton nicht gefunden');return id;}
 const targetMove=moveId||'initial';const row=this.db.prepare('WITH candidates(number) AS (SELECT 1 UNION ALL SELECT number+1 FROM boxes WHERE moveId=?) SELECT MIN(number) AS value FROM candidates WHERE NOT EXISTS (SELECT 1 FROM boxes WHERE moveId=? AND boxes.number=candidates.number)').get(targetMove,targetMove)!;const key=crypto.randomUUID();this.db.prepare('INSERT INTO boxes(name,roomId,items,type,fragile,heavy,status,transporter,departed,currentLocation,id,number,moveId) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(...values,key,Number(row.value),targetMove);return key;
 }
}
