import {test} from 'node:test';
import assert from 'node:assert/strict';
import {statusOf,eligibleFor,matchesSchedule,filterOpportunities} from '../src/lib/opportunities.js';
const record={id:'1',cities:['Hong Kong'],category:'Hackathons',title:'Example',org:'Org',tags:[],status:'Unknown'};
const base={city:'Hong Kong',category:'All',savedOnly:false,saved:[],format:'All',requirement:'All',status:'Open & upcoming',personal:true,profile:{year:'Year 1'},scheduleOnly:true,slots:{},query:''};
test('unknown eligibility, schedule and status remain visible',()=>assert.equal(filterOpportunities([record],base).length,1));
test('explicit year exclusion is filtered only with profile matching',()=>{const r={...record,eligibleYears:['Year 2']};assert.equal(eligibleFor(r,base.profile),'ineligible');assert.equal(filterOpportunities([r],base).length,0);assert.equal(filterOpportunities([r],{...base,personal:false}).length,1)});
test('schedule requires all event slots and leaves unstated times unknown',()=>{const r={...record,schedule:[{day:0,startSlot:42,endSlot:44}]};assert.equal(matchesSchedule(r,{'0-42':'available'}),'conflict');assert.equal(matchesSchedule(r,{'0-42':'available','0-43':'available'}),'match');assert.equal(matchesSchedule(record,{}),'unknown')});
test('past deadline closes listing and all statuses can include it',()=>{const r={...record,deadline:'2026-10-28T23:59:00+08:00',status:'Open'};let now=new Date('2026-11-12T00:00:00+08:00');assert.equal(statusOf(r,now),'Closed');assert.equal(filterOpportunities([r],base,now).length,0);assert.equal(filterOpportunities([r],{...base,status:'All statuses'},now).length,1)});
test('city is explicit and never inferred from online format',()=>assert.equal(filterOpportunities([{...record,format:'Online'}],{...base,city:'Shenzhen'}).length,0));

test('an old open claim becomes unknown',()=>assert.equal(statusOf({...record,status:'Open',verified:'2026-11-01T00:00:00Z'},new Date('2026-11-12T00:00:00Z')),'Unknown'));

test('date filters match known event dates and omit undated records',()=>{let dated={...record,startDate:'2026-11-17'};assert.equal(filterOpportunities([dated,record],{...base,dateFrom:'2026-11-15',dateTo:'2026-11-20'}).length,1);assert.equal(filterOpportunities([dated],{...base,dateFrom:'2026-11-18'}).length,0)});

test('mail duplicates and press releases do not appear as opportunities',()=>{const a={...record,id:'a',private:true,title:'Appointment *Workshop has been updated (course)'};const b={...a,id:'b',title:'Appointment Workshop is available for signup (course)'};const c={...a,id:'c',title:'[Press Release] Old hackathon'};assert.equal(filterOpportunities([a,b,c],base).length,1)});

test('public duplicate records combine schedule and deadline before filtering',()=>{const a={...record,id:'a',deadline:'2026-12-01T23:59:00+08:00'};const b={...record,id:'b',schedule:[{day:0,startSlot:42,endSlot:43}]};assert.equal(filterOpportunities([a,b],{...base,slots:{}},new Date('2026-11-13')).length,0);assert.equal(filterOpportunities([a,b],{...base,slots:{'0-42':'available'}},new Date('2026-11-13')).length,1)});
