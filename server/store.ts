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
 boxes(moveId?:string){return (moveId?this.db.prepare('SELECT * FROM boxes WHERE moveId=? ORDER BY number').all(moveId):this.db.prepare('SELECT * FROM boxes ORDER BY number').all()).map(b=>({...b,id:String(b.id),number:Number(b.number),status:String(b.status),type:String(b.type),items:JSON.parse(String(b.items)) as string[],fragile:!!b.fragile,heavy:!!b.heavy}));}
 deleteBox(id:string,moveId:string){if(!this.db.prepare('DELETE FROM boxes WHERE id=? AND moveId=?').run(id,moveId).changes)throw Error('Karton nicht gefunden');}
 saveBox(b:any,id?:string,moveId?:string){
 if(moveId){if(id&&!this.db.prepare('SELECT id FROM boxes WHERE id=? AND moveId=?').get(id,moveId))throw Error('Karton nicht gefunden');if(b.roomId&&!this.db.prepare('SELECT id FROM rooms WHERE id=? AND moveId=?').get(b.roomId,moveId))throw Error('Raum gehört zu einem anderen Umzug');}
 if(!b || typeof b.name!=='string'|| !b.name.trim() || !Array.isArray(b.items)||b.items.some((i:any)=>typeof i!=='string')|| !['In Vorbereitung','Gepackt','Transportiert','Angekommen','Ausgepackt'].includes(b.status)||typeof b.type!=='string'|| typeof b.fragile!=='boolean'||typeof b.heavy!=='boolean')throw new Error('Ungültige Kartondaten');
 const values=[b.name.trim(),b.roomId||null,JSON.stringify(b.items),b.type,b.fragile?1:0,b.heavy?1:0,b.status,String(b.transporter||''),String(b.departed||'')];
 if(id){const result=this.db.prepare('UPDATE boxes SET name=?,roomId=?,items=?,type=?,fragile=?,heavy=?,status=?,transporter=?,departed=? WHERE id=?').run(...values,id);if(!result.changes)throw new Error('Karton nicht gefunden');return id;}
 this.db.exec('BEGIN IMMEDIATE');try{const targetMove=moveId||'initial';const row=this.db.prepare('WITH candidates(number) AS (SELECT 1 UNION ALL SELECT number+1 FROM boxes WHERE moveId=?) SELECT MIN(number) AS value FROM candidates WHERE NOT EXISTS (SELECT 1 FROM boxes WHERE moveId=? AND boxes.number=candidates.number)').get(targetMove,targetMove)!;const key=crypto.randomUUID();this.db.prepare('INSERT INTO boxes(name,roomId,items,type,fragile,heavy,status,transporter,departed,id,number,moveId) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(...values,key,Number(row.value),targetMove);this.db.exec('COMMIT');return key;}catch(e){this.db.exec('ROLLBACK');throw e;}
 }
}
