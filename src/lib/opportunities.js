export const opportunities = [
  { id:'sieia-shenzhen-2026', cities:['Shenzhen'], category:'Other', title:'2026中国互联网发展创新与投资大赛（深圳）', org:'深圳市互联网创业创新服务促进会', deadline:'2026-11-14T23:59:59+08:00', deadlineLabel:'14 Nov 2026', tags:[], eligibility:'创客组欢迎拥有科技创新成果和创业计划的团队或个人，包括大学生创业团队；项目需符合大赛条件', status:'Unknown', sourceUrl:'https://sieia.cn/index/index/activity_details.html?id=88', registrationUrl:'https://sieia.cn/index/index/activity_details.html?id=88', verified:'13 Nov 2026' },
  { id:'hkpc-act-2027', cities:['Hong Kong'], category:'Other', title:'ACT Student Development Programme 2027', org:'Hong Kong Productivity Council', date:'January – June 2027', deadline:'2026-11-20T23:59:59+08:00', deadlineLabel:'20 Nov 2026', format:'In person', tags:['All years welcome'], eligibility:'Students pursuing a bachelor’s degree or below in Computer Science or Cybersecurity at a Hong Kong higher education institution', eligibleYears:['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6'], status:'Open', sourceUrl:'https://careers.hkpc.org/job/ACT-Student-Development-Programme-2027/1369616166/', registrationUrl:'https://careers.hkpc.org/job/ACT-Student-Development-Programme-2027/1369616166/', verified:'12 Nov 2026' },
  { id:'wfeo-2027', cities:['Hong Kong','Shenzhen'], category:'Hackathons', title:'2027 WFEO Hackathon on Sustainable Transport Engineering', org:'World Federation of Engineering Organizations', date:'Submissions due 12 Dec 2026', format:'Online', tags:['Engineering students'], eligibility:'Engineering students, young engineers and multidisciplinary teams', status:'Open', sourceUrl:'https://calendar.hkust.edu.hk/events/2027-wfeo-hackathon-sustainable-transport-engineering', registrationUrl:'https://worldengineeringday.net/hackathon/', verified:'12 Nov 2026' },
  { id:'zhihu-s3', cities:['Shenzhen'], category:'Hackathons', title:'知乎黑客松 S3 · 湾区共创季', org:'知乎', date:'2026', format:null, tags:[], eligibility:'面向全球青年开发者', status:'Unknown', sourceUrl:'https://hackathon-s3.event.zhihu.com/', registrationUrl:'https://www.zhihu.com/hackathon/register?activity_code=zhihu_hackathon_2026_p3', verified:'12 Nov 2026' },
  { id:'pmi-2027', cities:['Hong Kong'], category:'Case competitions', title:'Project Management Case Competition 2027', org:'PMI Hong Kong Student Club', date:'Late Nov 2026 – Feb 2027', deadline:'2026-10-28T23:59:00+08:00', deadlineLabel:'28 Oct 2026', format:'In person', tags:[], eligibility:'Undergraduate students at institutions in Hong Kong', status:'Closed', sourceUrl:'https://pmihkstudentclub.org.hk/events/project-management-case-competition-2027', verified:'12 Nov 2026' },
];
export function statusOf(item, now=new Date()) {
  if (item.endsAt && new Date(item.endsAt).getTime() < now.getTime()) return 'Closed';
  if (item.deadline && new Date(item.deadline).getTime() < now.getTime()) return 'Closed';
  if(item.status==='Open' && item.verified && now.getTime()-Date.parse(item.verified)>7*86400000) return 'Unknown';
  return item.status || 'Unknown';
}
export function eligibleFor(item, profile) {
  if (!item.eligibleYears || !profile?.year || profile.year==='Other') return 'unknown';
  return item.eligibleYears.includes(profile.year) ? 'eligible' : 'ineligible';
}
export function matchesSchedule(item, slots) {
  if (!item.schedule?.length) return 'unknown';
  return item.schedule.every(({day,startSlot,endSlot}) => {
    for(let slot=startSlot;slot<endSlot;slot++) if(slots[`${day}-${slot}`] !== 'available') return false;
    return true;
  }) ? 'match' : 'conflict';
}
export function combinePublicDuplicates(items) {
 const results=[],byTitle=new Map();
 for(const item of items){if(item.private){results.push(item);continue}const key=item.title.toLowerCase().replace(/\s+/g,' ').trim()+'|'+[...item.cities].sort().join(',');const existing=byTitle.get(key);if(!existing){const copy={...item};byTitle.set(key,copy);results.push(copy);continue}for(const field of ['deadline','deadlineLabel','date','startDate','endsAt','time','schedule','eligibility','eligibleYears','registrationUrl','format'])if(existing[field]==null&&item[field]!=null)existing[field]=item[field];if(!existing.evidenceUrl&&item.sourceUrl!==existing.sourceUrl)existing.evidenceUrl=item.sourceUrl;}
 return results;
}
export function filterOpportunities(items, f, now=new Date()) {
 const filtered=combinePublicDuplicates(items).filter(item => item.cities.includes(f.city)
  && (f.category==='All'||item.category===f.category)
  && (!f.savedOnly||f.saved.includes(item.id))
  && (f.format==='All'||item.format===f.format)
  && (f.requirement==='All'||item.tags.includes(f.requirement))
  && (!f.dateFrom || (item.startDate && item.startDate >= f.dateFrom))
  && (!f.dateTo || (item.startDate && item.startDate <= f.dateTo))
  && (f.status==='All statuses'||statusOf(item,now)!=='Closed')
  && (!f.personal||eligibleFor(item,f.profile)!=='ineligible')
  && (!f.scheduleOnly||matchesSchedule(item,f.slots)!=='conflict')
  && `${item.title} ${item.org} ${item.tags.join(' ')} ${item.eligibility||''}`.toLowerCase().includes(f.query.toLowerCase()));
 const seen=new Set();return filtered.filter(item=>{if(!item.private)return true;if(/\[press release\]/i.test(item.title))return false;const key=item.title.toLowerCase().replace(/^appointment\s*/, '').replace(/\s+(has been updated|is available for signup).*$/, '').replace(/[\"'*]/g,'').replace(/\s+/g,' ').trim();if(seen.has(key))return false;seen.add(key);return true});
}
