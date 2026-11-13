import * as cheerio from 'cheerio';
import { createHash } from 'node:crypto';
const origin='https://calendar.hkust.edu.hk';
export function parseCalendar(html, verified=new Date().toISOString()) {
 const $=cheerio.load(html), seen=new Set(), items=[];
 $('a[href^="/events/"]').each((_,el)=>{
  const a=$(el), title=a.text().replace(/\s+/g,' ').trim(), href=a.attr('href').split('?')[0];
  if(title.length<15||seen.has(href)||!/hackathon|case competition|internship|career fair|workshop|competition/i.test(title)||/postgraduate|phd|doctoral|competition schedule/i.test(title))return;
  seen.add(href);
  const category=/hackathon/i.test(title)?'Hackathons':/case competition/i.test(title)?'Case competitions':/internship/i.test(title)?'Internships':/workshop/i.test(title)?'Workshops':/career fair/i.test(title)?'Networking':'Other';
  items.push({id:'hkust-'+createHash('sha256').update(href).digest('hex').slice(0,16),cities:['Hong Kong'],category,title,org:'HKUST University Event Calendar',tags:[],status:'Unknown',sourceUrl:origin+href,verified});
 }); return items;
}
export async function refreshCalendar(store,fetcher=fetch) {
 const run=store.start('HKUST event calendar');
 try { const response=await fetcher(origin+'/events',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);const html=await response.text();if(!html.includes('University Event Calendar'))throw new Error('Unexpected calendar page');const items=parseCalendar(html);const existing=store.list();for(const item of items){if(existing.some(x=>x.id!==item.id&&x.title.toLowerCase()===item.title.toLowerCase()))continue;try{const detail=await fetcher(item.sourceUrl,{signal:AbortSignal.timeout(15000)});if(detail.ok)store.upsert(parseCalendarDetail(item,await detail.text()));else if(!existing.some(x=>x.id===item.id))store.upsert(item)}catch{if(!existing.some(x=>x.id===item.id))store.upsert(item)}}store.finish(run,null);return items.length; }
 catch(error){store.finish(run,String(error.message).slice(0,200));throw error}
}
export function parseShenzhen(html, verified=new Date().toISOString()) {
 const $=cheerio.load(html), items=[], seen=new Set();
 $('a[href^="/hackathon/"]').each((_,el)=>{
  const a=$(el), href=a.attr('href'), title=a.find('h3').first().text().trim(), text=a.text().replace(/\s+/g,' ').trim();
  if(!title||!href||seen.has(href)||/青少年|高中|中学生|postgraduate|博士/i.test(title))return;
  seen.add(href);
  const status=/已结束/.test(text)?'Closed':/报名中/.test(text)?'Open':'Unknown';
  const date=a.find('span').filter((_,x)=>/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/.test($(x).text())).first().text().trim();
  const startDate=parseEnglishStartDate(date);
  items.push({id:'hackertrip-'+createHash('sha256').update(href).digest('hex').slice(0,16),cities:['Shenzhen'],category:'Hackathons',title,org:'HackerTrip',date:date||undefined,startDate,tags:[],status,sourceUrl:'https://hackertrip.space'+href,verified});
 });return items;
}
export async function refreshShenzhen(store,fetcher=fetch){
 const run=store.start('HackerTrip Shenzhen');
 try{const response=await fetcher('https://hackertrip.space/hackathon/city/shenzhen',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(`HTTP ${response.status}`);const html=await response.text();const items=parseShenzhen(html);if(!items.length)throw Error('No listings found in source');for(const item of items){if(item.status==='Open'){try{const detail=await fetcher(item.sourceUrl,{signal:AbortSignal.timeout(15000)});if(detail.ok){const registrationUrl=parseRegistrationLink(await detail.text());if(registrationUrl)item.registrationUrl=registrationUrl}}catch{}}store.upsert(item)}store.finish(run,null);return items.length}
 catch(error){store.finish(run,String(error.message).slice(0,200));throw error}
}
export function parseCalendarDetail(item,html){
 const $=cheerio.load(html), times=$('main time[datetime]').toArray();if(times.length!==1)return item;
 const day=$(times[0]).attr('datetime')?.slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(day||''))return item;
 const label=$(times[0]).text().replace(/\s+/g,' ').trim(), text=$('main').text().replace(/\s+/g,' ');
 const match=text.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)\s*[-–]\s*(\d{1,2}):(\d{2})\s*(am|pm)\b/i);
 const output={...item,date:label,startDate:day};if(!match)return output;
 const minutes=(h,m,part)=>(Number(h)%12+(part.toLowerCase()==='pm'?12:0))*60+Number(m);
 const start=minutes(match[1],match[2],match[3]),end=minutes(match[4],match[5],match[6]);if(end<=start)return output;
 // Midnight in Hong Kong is the previous UTC day; compute the weekday from the calendar date itself.
 const localDay=new Date(day+'T12:00:00Z').getUTCDay();
 output.time=`${match[1]}:${match[2]}${match[3]} – ${match[4]}:${match[5]}${match[6]}`;
 output.schedule=[{day:localDay,startSlot:Math.floor(start/30),endSlot:Math.ceil(end/30)}];
 output.endsAt=`${day}T${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}:00+08:00`;
 return output;
}

export function parseRegistrationLink(html){
 const $=cheerio.load(html);let result=null;
 $('a[href]').each((_,el)=>{if(result)return;const label=$(el).text().trim(),href=$(el).attr('href');if(!/^(前往官方报名|立即报名|register now|apply now)$/i.test(label))return;try{const url=new URL(href);if(url.protocol==='https:')result=url.href}catch{}});return result;
}

export function parseEnglishStartDate(text){
 const match=(text||'').match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}).*?\b(20\d{2})\b/i);if(!match)return undefined;const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];const month=months.indexOf(match[1].toLowerCase())+1;const allMonths=[...text.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/gi)].map(m=>months.indexOf(m[1].toLowerCase())+1);if(allMonths.length>1&&allMonths[1]<month)return undefined;const day=Number(match[2]);if(day<1||day>31)return undefined;return `${match[3]}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
export function parseInternships(html,verified=new Date().toISOString()){
 const $=cheerio.load(html),items=[];
 $('table tr').each((_,row)=>{const cells=$(row).find('td');if(cells.length<5)return;const title=$(cells[1]).text().trim(),org=$(cells[2]).text().trim(),date=$(cells[3]).text().trim(),href=$(cells[1]).find('a').attr('href');if(!/intern/i.test(title)||!/hong kong|\bhk\b|香港/i.test(title)||!href||!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
 const url=new URL(href,'https://cse.hkust.edu.hk');if(url.origin!=='https://cse.hkust.edu.hk')return;
 items.push({id:'cse-'+createHash('sha256').update(url.pathname).digest('hex').slice(0,16),cities:['Hong Kong'],category:'Internships',title,org,tags:[],status:'Unknown',deadline:date+'T23:59:59+08:00',deadlineLabel:date,sourceUrl:url.href,verified});
 });return items;
}
export async function refreshInternships(store,fetcher=fetch){
 const run=store.start('HKUST CSE internships');
 try{const response=await fetcher('https://cse.hkust.edu.hk/ug/admissions/placement/?id=listjob',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(`HTTP ${response.status}`);const html=await response.text();if(!/Closing Date/i.test(html))throw Error('Unexpected internships page');const items=parseInternships(html);for(const item of items)store.upsert(item);store.finish(run,null);return items.length}
 catch(error){store.finish(run,String(error.message).slice(0,200));throw error}
}
export function parseHkuCompetitions(html,verified=new Date().toISOString()){
 const $=cheerio.load(html),items=[];
 $('table').first().find('tr').each((_,row)=>{const cells=$(row).find('td');if(cells.length<3)return;const title=$(cells[0]).text().replace(/\s+/g,' ').trim(),eligibility=$(cells[1]).text().replace(/\s+/g,' ').trim(),deadlineText=$(cells[2]).text().replace(/\s+/g,' ').trim(),href=$(cells[0]).find('a[href]').first().attr('href');
 if(!title||!href||!/university|undergrad|tertiary|bachelor|co-organising/i.test(eligibility)||/postdoctoral|hku students only|hku student only/i.test(eligibility))return;
 let url;try{url=new URL(href,'https://tec.hku.hk');if(url.protocol!=='https:')return}catch{return}
 const match=deadlineText.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i);let deadline;if(match){const d=new Date(`${match[2]} ${match[1]}, ${match[3]} 23:59:59 GMT+0800`);if(!Number.isNaN(d.getTime()))deadline=d.toISOString()}
 const category=/hackathon|techathon/i.test(title)?'Hackathons':/case competition/i.test(title)?'Case competitions':'Other';
 items.push({id:'hku-tec-'+createHash('sha256').update(title.toLowerCase()).digest('hex').slice(0,16),cities:['Hong Kong'],category,title,org:'HKU Techno-Entrepreneurship Core',eligibility,tags:[],status:'Unknown',...(deadline?{deadline,deadlineLabel:match[0]}:{}),sourceUrl:url.href,evidenceUrl:'https://tec.hku.hk/competitions/',verified});
 });return items;
}
export function parseEntrepreneurshipEvents(html,verified=new Date().toISOString()){
 const $=cheerio.load(html),items=[],seen=new Set();
 $('a[href*="/events/"]').each((_,el)=>{const a=$(el),title=a.find('.title h3').first().text().replace(/\s+/g,' ').trim(),href=a.attr('href'),kind=a.find('.category').text().replace(/\s+/g,' ').trim();if(!title||!href||seen.has(href)||/postgraduate|phd|doctoral|secondary school|中学生/i.test(title))return;let url;try{url=new URL(href,'https://ec.hkust.edu.hk');if(url.origin!=='https://ec.hkust.edu.hk')return}catch{return}seen.add(href);
 const time=a.find('.title time[datetime]').first(), deadline=time.attr('datetime'), deadlineLabel=time.text().replace(/\s+/g,' ').trim();const category=/hackathon/i.test(title)?'Hackathons':/case competition/i.test(title)?'Case competitions':/workshop/i.test(kind+' '+title)?'Workshops':/internship/i.test(title)?'Internships':/network|mentorship/i.test(title)?'Networking':'Other';
 const cities=/shenzhen|深圳/i.test(title)?['Shenzhen']:['Hong Kong'];items.push({id:'ec-'+createHash('sha256').update(url.pathname).digest('hex').slice(0,16),cities,category,title,org:'HKUST Entrepreneurship Center',tags:[],status:'Unknown',...(deadline&&!Number.isNaN(Date.parse(deadline))?{deadline,deadlineLabel}:{}),sourceUrl:url.href,verified});
 });return items;
}
async function refreshList(store,source,url,parser,fetcher=fetch){const run=store.start(source);try{const response=await fetcher(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(`HTTP ${response.status}`);const rows=parser(await response.text());if(!rows.length)throw Error('No listings found in source');for(const row of rows)store.upsert(row);store.finish(run,null);return rows.length}catch(error){store.finish(run,String(error.message).slice(0,200));throw error}}
export function refreshHkuCompetitions(store,fetcher=fetch){return refreshList(store,'HKU entrepreneurship competitions','https://tec.hku.hk/competitions/',parseHkuCompetitions,fetcher)}
export function refreshEntrepreneurshipEvents(store,fetcher=fetch){return refreshList(store,'HKUST entrepreneurship events','https://ec.hkust.edu.hk/events',parseEntrepreneurshipEvents,fetcher)}
export function parseCuhkCandidates(html){
 const $=cheerio.load(html),out=[],seen=new Set();$('a[href*="/news-events/events/"]').each((_,el)=>{const a=$(el),title=a.text().replace(/\s+/g,' ').trim(),href=a.attr('href');if(!title||!href||seen.has(href)||!/competition|challenge|hackathon|大賽|大赛/i.test(title)||!/deadline|截止/i.test(title))return;const url=new URL(href,'https://kto.cuhk.edu.hk');if(url.origin!=='https://kto.cuhk.edu.hk')return;seen.add(href);out.push({title,url:url.href})});return out;
}
export function parseCuhkDetail(candidate,html,verified=new Date().toISOString()){
 const $=cheerio.load(html),text=$('body').text().replace(/\s+/g,' ');if(/(?:only|exclusively)\s+(?:open|available)\s+to\s+CUHK|CUHK\s+(?:students|staff)\s+only|secondary school students only/i.test(text))return null;
 const english=candidate.title.match(/(?:deadline[^:]*:\s*)(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})/i);const chinese=candidate.title.match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})[日号]/);let date;
 if(english)date=new Date(`${english[1]} 23:59:59 GMT+0800`);else if(chinese)date=new Date(`${chinese[1]}-${chinese[2].padStart(2,'0')}-${chinese[3].padStart(2,'0')}T23:59:59+08:00`);if(!date||Number.isNaN(date.getTime()))return null;
 const direct=parseRegistrationLink(html);const eligibility=text.match(/參賽條件\s*(.{15,180}?)(?=行業領域|賽程信息|$)/)?.[1]?.trim();const cities=/深圳|shenzhen/i.test(candidate.title)?['Shenzhen']:['Hong Kong'];return{id:'cuhk-'+createHash('sha256').update(candidate.url).digest('hex').slice(0,16),cities,category:/hackathon/i.test(candidate.title)?'Hackathons':/case competition/i.test(candidate.title)?'Case competitions':'Other',title:candidate.title,org:'CUHK Knowledge Transfer Office',tags:[],status:'Unknown',deadline:date.toISOString(),deadlineLabel:english?.[1]||`${chinese[1]}-${chinese[2].padStart(2,'0')}-${chinese[3].padStart(2,'0')}`,...(eligibility?{eligibility}:{}),...(direct?{registrationUrl:direct}:{}),sourceUrl:candidate.url,verified};
}
export async function refreshCuhk(store,fetcher=fetch){const run=store.start('CUHK Knowledge Transfer Office');try{const lists=await Promise.all([0,20].map(i=>fetcher(`https://kto.cuhk.edu.hk/en/news-events/events?start=${i}`,{signal:AbortSignal.timeout(15000)})));if(lists.some(r=>!r.ok))throw Error('Unable to load CUHK event directory');const candidates=(await Promise.all(lists.map(r=>r.text()))).flatMap(parseCuhkCandidates);if(!candidates.length)throw Error('No CUHK competition entries found');let count=0;for(const candidate of candidates.slice(0,12)){try{const response=await fetcher(candidate.url,{signal:AbortSignal.timeout(15000)});if(!response.ok)continue;const item=parseCuhkDetail(candidate,await response.text());if(item){store.upsert(item);count++}}catch{}}store.finish(run,null);return count}catch(error){store.finish(run,String(error.message).slice(0,200));throw error}}
export function parseCityuCandidates(html){const $=cheerio.load(html),rows=[];$('.details-panel').each((_,el)=>{const box=$(el);if(!/external event/i.test(box.find('.event-type').text()))return;const a=box.find('h3 a').first(),title=a.text().replace(/\s+/g,' ').trim(),href=a.attr('href'),date=box.find('.value').first().text().replace(/\s+/g,' ').trim();if(!title||!href||!/^news\/events\/eventDetails\/\?id=\d+$/.test(href))return;rows.push({title,url:new URL(href,'https://www.cb.cityu.edu.hk/careerdevelopment/').href,date})});return rows}
export function parseCityuDetail(candidate,html,verified=new Date().toISOString()){const $=cheerio.load(html),text=$('body').text().replace(/\s+/g,' ');if(/(?:cityu(?:hk)?|city university)\s+(?:students?\s+)?only|only\s+(?:for|open to)\s+cityu|secondary school students? only|for\s+secondary school students/i.test(text))return null;const match=candidate.date.match(/^(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})$/i);let startDate,endsAt;if(match){const day=new Date(`${match[1]} 12:00:00 GMT+0800`);if(!Number.isNaN(day.getTime())){startDate=day.toISOString().slice(0,10);endsAt=startDate+'T23:59:59+08:00'}}const deadlineMatch=text.match(/apply by\s+(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})/i);const deadline=deadlineMatch?new Date(`${deadlineMatch[1]} 23:59:59 GMT+0800`):null;let registrationUrl; $('a[href]').each((_,el)=>{const visible=$(el).text().trim();if(/^https:\/\/forms\.gle\/[A-Za-z0-9]+$/.test(visible))registrationUrl=visible});return{id:'cityu-'+createHash('sha256').update(candidate.url).digest('hex').slice(0,16),cities:['Hong Kong'],category:/hackathon/i.test(candidate.title)?'Hackathons':/case competition/i.test(candidate.title)?'Case competitions':/internship/i.test(candidate.title)?'Internships':/network|talent day/i.test(candidate.title)?'Networking':'Other',title:candidate.title,org:'CityUHK Career and Student Enrichment',tags:[],status:'Unknown',date:candidate.date,...(startDate?{startDate,endsAt}:{}),...(deadline&&!Number.isNaN(deadline.getTime())?{deadline:deadline.toISOString(),deadlineLabel:deadlineMatch[1]}:{}),...(registrationUrl?{registrationUrl}:{}),sourceUrl:candidate.url,verified}}
export async function refreshCityu(store,fetcher=fetch){const run=store.start('CityUHK external events');try{const response=await fetcher('https://www.cb.cityu.edu.hk/careerdevelopment/jobs-events/forthcomingEvents/',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(`HTTP ${response.status}`);const html=await response.text();if(!/Forthcoming Events/i.test(html))throw Error('Unexpected CityUHK event page');const candidates=parseCityuCandidates(html);let count=0;for(const candidate of candidates.slice(0,12)){try{const r=await fetcher(candidate.url,{signal:AbortSignal.timeout(15000)});if(!r.ok)continue;const item=parseCityuDetail(candidate,await r.text());if(item){store.upsert(item);count++}}catch{}}store.finish(run,null);return count}catch(error){store.finish(run,String(error.message).slice(0,200));throw error}}
