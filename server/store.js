import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
export function createStore(path='data/opportunities.sqlite') {
 if(path!==':memory:') {mkdirSync(dirname(path),{recursive:true,mode:0o700});chmodSync(dirname(path),0o700)}
 const db=new DatabaseSync(path);
 if(path!==':memory:') chmodSync(path,0o600);
 db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS opportunities (id TEXT PRIMARY KEY, payload TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'public', updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sync_runs (id INTEGER PRIMARY KEY, source TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, status TEXT NOT NULL, error TEXT);`);
 return {
  upsert(item,visibility='public'){db.prepare(`INSERT INTO opportunities(id,payload,visibility,updated_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at WHERE opportunities.visibility=excluded.visibility`).run(item.id,JSON.stringify(item),visibility,new Date().toISOString())},
  list(visibility='public'){return db.prepare('SELECT payload FROM opportunities WHERE visibility=? ORDER BY updated_at DESC').all(visibility).map(row=>JSON.parse(row.payload))},
  start(source){return Number(db.prepare('INSERT INTO sync_runs(source,started_at,status) VALUES(?,?,?)').run(source,new Date().toISOString(),'running').lastInsertRowid)},
  finish(id,error){db.prepare('UPDATE sync_runs SET finished_at=?,status=?,error=? WHERE id=?').run(new Date().toISOString(),error?'failed':'success',error||null,id)},
  runs(){return db.prepare('SELECT source,started_at,finished_at,status,error FROM sync_runs ORDER BY id DESC LIMIT 20').all()},
  clearPrivate(){db.prepare("DELETE FROM opportunities WHERE visibility='private'").run()},
  close(){db.close()}
 };
}
