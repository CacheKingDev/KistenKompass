import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {Store} from './store.js';
export class Accounts {
 constructor(public store:Store){const db=store.db;const firstMigration=!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='moves'").get();db.exec('BEGIN IMMEDIATE');try{db.exec(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,username TEXT NOT NULL UNIQUE COLLATE NOCASE,password TEXT NOT NULL,role TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS user_avatars(userId TEXT PRIMARY KEY REFERENCES users(id),seed TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,userId TEXT REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS moves(id TEXT PRIMARY KEY,name TEXT NOT NULL,date TEXT NOT NULL,origin TEXT NOT NULL,destination TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS members(moveId TEXT REFERENCES moves(id),userId TEXT REFERENCES users(id),PRIMARY KEY(moveId,userId));`);
 if(firstMigration)db.exec("INSERT INTO moves VALUES('initial','Mein erster Umzug','','','');");
 for(const table of ['rooms','boxes'])if(!db.prepare(`PRAGMA table_info(${table})`).all().some(c=>c.name==='moveId'))db.exec(`ALTER TABLE ${table} ADD COLUMN moveId TEXT NOT NULL DEFAULT 'initial'`);
 db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 }
 users(){return this.store.db.prepare('SELECT id,name,username,role,active,COALESCE((SELECT seed FROM user_avatars WHERE userId=users.id),id) AS avatarSeed FROM users ORDER BY name').all();}
 saveProfile(data:any,token:string){
  const user=this.user(token);if(!user)throw Error('Bitte anmelden');
  if(data?.avatarSeed!==undefined&&(typeof data.avatarSeed!=='string'||!data.avatarSeed.trim()||data.avatarSeed.length>128))throw Error('Ungültiger Avatar');
  const db=this.store.db,session=db.prepare('SELECT * FROM sessions WHERE token=?').get(this.digest(token));
  db.exec('BEGIN IMMEDIATE');try{
   this.saveUser({...data,role:user.role,active:!!user.active},String(user.id));
   if(data.avatarSeed!==undefined)db.prepare('INSERT INTO user_avatars(userId,seed) VALUES(?,?) ON CONFLICT(userId) DO UPDATE SET seed=excluded.seed').run(user.id,data.avatarSeed);
   db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(session!.token,session!.userId,session!.expires);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
 }
 hash(password:string){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
 saveUser(data:any,id?:string){if(!data||typeof data.name!=='string'||!data.name.trim()||typeof data.username!=='string'||!data.username.trim()||!['admin','user'].includes(data.role)||typeof data.active!=='boolean')throw Error('Name, Benutzername und Rolle erforderlich');
 const previous=id?this.users().find(u=>u.id===id):undefined;if(id&&!previous)throw Error('Benutzer nicht gefunden');
 if(previous?.role==='admin'&&previous.active&&(!data.active||data.role!=='admin')&&this.users().filter(u=>u.role==='admin'&&u.active).length===1)throw Error('Mindestens ein aktiver Administrator muss erhalten bleiben');
 if(!id||data.password){if(typeof data.password!=='string'||(data.password.length<10||data.password.length>1024))throw Error('Passwort muss mindestens 10 Zeichen haben');}
 const key=id||crypto.randomUUID();try{if(id){this.store.db.prepare('UPDATE users SET name=?,username=?,role=?,active=? WHERE id=?').run(data.name.trim(),data.username.trim(),data.role,Number(data.active),id);if(data.password)this.store.db.prepare('UPDATE users SET password=? WHERE id=?').run(this.hash(data.password),id);this.store.db.prepare('DELETE FROM sessions WHERE userId=?').run(id);}else this.store.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(key,data.name.trim(),data.username.trim(),this.hash(data.password),data.role,Number(data.active));}catch(e){if(String(e).includes('UNIQUE'))throw Error('Benutzername bereits vergeben');throw e;}return key;
 }
 login(username:unknown,password:unknown){if(typeof username!=='string'||typeof password!=='string'||password.length>1024)throw Error('Anmeldung fehlgeschlagen');const u=this.store.db.prepare('SELECT * FROM users WHERE username=? AND active=1').get(username.trim());const [salt,hash]=String(u?.password||'dummy:'+ '00'.repeat(64)).split(':');if(!timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hash,'hex'))||!u)throw Error('Benutzername oder Passwort falsch');const token=randomBytes(32).toString('hex');this.store.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(this.digest(token),u.id,Date.now()+7*86400000);return token;}
 digest(token:string){return createHash('sha256').update(token).digest('hex');}
 user(token:string){return this.store.db.prepare('SELECT u.id,u.name,u.username,u.role,u.active,COALESCE((SELECT seed FROM user_avatars WHERE userId=u.id),u.id) AS avatarSeed FROM sessions s JOIN users u ON u.id=s.userId WHERE s.token=? AND s.expires>? AND u.active=1').get(this.digest(token),Date.now());}
 moves(user:any){return (user.role==='admin'?this.store.db.prepare('SELECT * FROM moves ORDER BY name').all():this.store.db.prepare('SELECT m.* FROM moves m JOIN members a ON a.moveId=m.id WHERE a.userId=? ORDER BY m.name').all(user.id)).map(m=>({...m,id:String(m.id),userIds:this.store.db.prepare('SELECT userId FROM members WHERE moveId=?').all(m.id).map(a=>a.userId)}));}
 saveMove(data:any,user:any,id?:string){if(!data||typeof data.name!=='string'||!data.name.trim()||['date','origin','destination'].some(k=>typeof data[k]!=='string')||(data.date&&!/^\d{4}-\d{2}-\d{2}$/.test(data.date)))throw Error('Gültige Umzugsdaten erforderlich');if(id&&!this.moves(user).some(m=>m.id===id))throw Error('Umzug nicht gefunden');const ids=user.role==='admin'?data.userIds:[user.id];if(!Array.isArray(ids)||ids.some(i=>!this.users().some(u=>u.id===i)))throw Error('Benutzerzuordnung ungültig');const key=id||crypto.randomUUID(),db=this.store.db;db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO moves VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,date=excluded.date,origin=excluded.origin,destination=excluded.destination').run(key,data.name.trim(),data.date,data.origin.trim(),data.destination.trim());if(user.role==='admin'||!id){db.prepare('DELETE FROM members WHERE moveId=?').run(key);for(const uid of new Set(ids))db.prepare('INSERT INTO members VALUES(?,?)').run(key,String(uid));}db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return key;}
 deleteMove(id:string,user:any){
  if(user?.role!=='admin')throw Error('Administrator erforderlich');
  const db=this.store.db;db.exec('BEGIN IMMEDIATE');
  try{
   if(!db.prepare('SELECT id FROM moves WHERE id=?').get(id))throw Error('Umzug nicht gefunden');
   db.prepare('DELETE FROM boxes WHERE moveId=?').run(id);
   db.prepare('DELETE FROM rooms WHERE moveId=?').run(id);
   db.prepare('DELETE FROM members WHERE moveId=?').run(id);
   db.prepare('DELETE FROM moves WHERE id=?').run(id);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
 }

}


