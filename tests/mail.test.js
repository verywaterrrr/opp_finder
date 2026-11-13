import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractMessage,createMailService} from '../server/mail.js';
test('mail extraction keeps message private and does not store body text',()=>{let r=extractMessage({id:'abc',subject:'HKUST hackathon',bodyPreview:'Hong Kong secret extra information',webLink:'https://outlook.office.com/mail/id/abc'});assert.equal(r.private,true);assert.equal(r.category,'Hackathons');assert.equal(JSON.stringify(r).includes('secret extra information'),false)});
test('unrelated, explicitly postgraduate, and unsafe links are rejected',()=>{assert.equal(extractMessage({id:'a',subject:'Shopping',bodyPreview:'HKUST'}),null);assert.equal(extractMessage({id:'a',subject:'PhD workshop HKUST',webLink:'https://outlook.office.com/mail/a'}),null);assert.equal(extractMessage({id:'a',subject:'HKUST workshop',webLink:'https://attacker.test/'}),null)});
test('connection requires application configuration',()=>{let s=createMailService({},{});assert.equal(s.status().status,'unconfigured');assert.throws(()=>s.connect())});
