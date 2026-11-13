import {createStore} from './store.js';
import {extractMessage} from './mail.js';
import {createInterface} from 'node:readline';
const lines=createInterface({input:process.stdin});let input='';for await(const line of lines){input=line;break}
lines.close();process.stdin.pause();
const records=JSON.parse(input),store=createStore(),seen=new Set();let count=0;
for(const m of records){if(!m.id||seen.has(m.id))continue;seen.add(m.id);const sender=m.sender?.emailAddress?.address||'';const bodyPreview=(m.bodyPreview||'')+(/@(?:connect\.)?ust\.hk$/i.test(sender)?' HKUST':'');const item=extractMessage({id:m.id,subject:m.subject,bodyPreview,webLink:m.web_link});if(item){store.upsert(item,'private');count++}}
store.close();console.log(`Imported ${count} private mailbox records.`);
