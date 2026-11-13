import {PublicClientApplication} from '@azure/msal-node';
import {createHash} from 'node:crypto';
const scopes=['User.Read','Mail.Read'];
export function extractMessage(m){
 const subject=(m.subject||'').trim(), text=`${subject} ${m.bodyPreview||''}`;
 if(!/hackathon|case competition|internship|workshop|career fair|volunteer|networking|competition/i.test(subject)||/postgraduate|phd|doctoral/i.test(subject))return null;
 const cities=[];if(/hong kong|hkust|香港/i.test(text))cities.push('Hong Kong');if(/shenzhen|深圳/i.test(text))cities.push('Shenzhen');if(!cities.length)return null;
 const category=/hackathon/i.test(text)?'Hackathons':/case competition/i.test(text)?'Case competitions':/internship/i.test(text)?'Internships':/workshop/i.test(text)?'Workshops':/career fair|networking/i.test(text)?'Networking':/volunteer/i.test(text)?'Volunteering':'Other';
 let link;try{const u=new URL(m.webLink);if(u.protocol==='https:'&&['outlook.office.com','outlook.office365.com'].includes(u.hostname))link=u.href}catch{}if(!link||!subject)return null;
 return {id:'mail-'+createHash('sha256').update(m.id).digest('hex').slice(0,24),cities,category,title:subject,org:'HKUST mailbox',tags:[],status:'Unknown',sourceUrl:link,verified:new Date().toISOString(),private:true};
}
export function createMailService(store,config={}){
 const clientId=config.clientId||process.env.MS_CLIENT_ID, owner=(config.owner||process.env.MAIL_OWNER||'').toLowerCase();
 const client=clientId?new PublicClientApplication({auth:{clientId,authority:`https://login.microsoftonline.com/${config.tenant||process.env.MS_TENANT_ID||'organizations'}`}}):null;
 let state={status:client&&owner?'disconnected':'unconfigured'}, account=null;
 function status(){return state}
 function connect(){
  if(!client||!owner)throw Error('Set MS_CLIENT_ID and MAIL_OWNER in .env first');
  if(state.status==='waiting')return;
  state={status:'waiting'};
  client.acquireTokenByDeviceCode({scopes,deviceCodeCallback:response=>{state={status:'waiting',userCode:response.userCode,verificationUri:response.verificationUri,expiresIn:response.expiresIn}}}).then(async result=>{
   if(!result?.account||result.account.username.toLowerCase()!==owner){state={status:'error',error:'The signed-in account does not match the configured mailbox.'};return}
   account=result.account;state={status:'connected'};
  }).catch(()=>{state={status:'error',error:'Mailbox sign-in was not completed.'}});
 }
 async function sync(){
  if(!account)throw Error('Connect your mailbox first');
  const run=store.start('HKUST mailbox');
  try{
   const auth=await client.acquireTokenSilent({account,scopes});
   const since=new Date(Date.now()-30*86400000).toISOString();
   let url=`https://graph.microsoft.com/v1.0/me/messages?$select=id,subject,bodyPreview,webLink,receivedDateTime&$filter=receivedDateTime ge ${since}&$top=100`, count=0,pages=0;
   while(url&&pages++<5){const u=new URL(url);if(u.origin!=='https://graph.microsoft.com')throw Error('Unexpected mailbox paging URL');const response=await fetch(url,{headers:{Authorization:`Bearer ${auth.accessToken}`},signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`Mailbox request failed (${response.status})`);const result=await response.json();for(const message of result.value||[]){const item=extractMessage(message);if(item){store.upsert(item,'private');count++}}url=result['@odata.nextLink']||null}
   store.finish(run,null);return count;
  }catch(error){store.finish(run,String(error.message).slice(0,200));throw error}
 }
 async function disconnect(){if(account&&client)await client.getTokenCache().removeAccount(account);account=null;state={status:client&&owner?'disconnected':'unconfigured'}}
 return {status,connect,sync,disconnect};
}
