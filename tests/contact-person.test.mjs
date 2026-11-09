import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveContactPerson } from '../lib/contact-person.mjs';
// Fixture hanya untuk tes. Bukan daftar divisi/nomor CP sebenarnya.
const config = {
  CP_1_DIVISIONS: 'UJI01,UJI02,UJI03,UJI04,UJI05',
  CP_2_DIVISIONS: 'UJI06,UJI07,UJI08,UJI09,UJI10,UJI11',
  CP_1_WHATSAPP: '628000000001',
  CP_2_WHATSAPP: '628000000002'
};
for(let i=1;i<=11;i++) test(`division fixture ${i} uses CP ${i<=5?1:2}`,()=>{
  assert.equal(resolveContactPerson(`UJI${String(i).padStart(2,'0')}`,config)?.whatsapp,i<=5?config.CP_1_WHATSAPP:config.CP_2_WHATSAPP);
});
test('empty config never creates a contact',()=>assert.equal(resolveContactPerson('UJI01',{}),null));
test('unknown division has no fallback CP',()=>assert.equal(resolveContactPerson('UNKNOWN',config),null));
test('case and edge spaces normalize',()=>assert.equal(resolveContactPerson(' uji06 ',config)?.whatsapp,config.CP_2_WHATSAPP));
for(const [key,value] of [
  ['CP_1_DIVISIONS','UJI01,UJI02,UJI03,UJI04'],
  ['CP_2_DIVISIONS','UJI06,UJI07,UJI08,UJI09,UJI10'],
  ['CP_1_DIVISIONS','UJI01,UJI01,UJI03,UJI04,UJI05'],
  ['CP_2_DIVISIONS','UJI01,UJI07,UJI08,UJI09,UJI10,UJI11'],
  ['CP_1_WHATSAPP',''], ['CP_1_WHATSAPP','08123456789'],
  ['CP_1_WHATSAPP','https://wa.me/628000000001'],
  ['CP_2_WHATSAPP',config.CP_1_WHATSAPP]
]) test(`invalid ${key}: ${value}`,()=>assert.equal(resolveContactPerson('UJI01',{...config,[key]:value}),null));
