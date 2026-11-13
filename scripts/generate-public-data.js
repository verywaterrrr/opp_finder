import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createStore} from '../server/store.js';
import {opportunities} from '../src/lib/opportunities.js';
import {refreshCalendar,refreshShenzhen,refreshInternships,refreshHkuCompetitions,refreshEntrepreneurshipEvents,refreshCuhk,refreshCityu} from '../server/discovery.js';
const path='public/opportunities.json',store=createStore(':memory:');
try{const prior=JSON.parse(await readFile(path,'utf8'));for(const row of prior)if(!row.private&&row.id&&row.sourceUrl&&!/competition schedule/i.test(row.title||''))store.upsert(row)}catch{}
for(const item of opportunities)if(!store.list().some(x=>x.id===item.id))store.upsert(item);
const results=await Promise.allSettled([refreshCalendar(store),refreshShenzhen(store),refreshInternships(store),refreshHkuCompetitions(store),refreshEntrepreneurshipEvents(store),refreshCuhk(store),refreshCityu(store)]);
const errors=results.filter(r=>r.status==='rejected');if(errors.length===results.length)throw Error('Every public source failed; retain the previous published data');
await mkdir('public',{recursive:true});await writeFile(path,JSON.stringify(store.list(),null,2)+'\n');
for(const [index,result] of results.entries())console.log(`Source ${index+1}: ${result.status}${result.status==='rejected'?' ('+result.reason.message+')':''}`);
console.log(`Exported ${store.list().length} public records`);store.close();
