import test from 'node:test'
import assert from 'node:assert/strict'
import {studentDirectoryMetrics,packageMetrics,directoryCounts,filterDirectory,studentInitials} from '../src/lib/studentDirectory.js'
test('recorded academic history does not consume a package or become verified attendance',()=>{
 const m=studentDirectoryMetrics({recorded_completed:3,recorded_total:100,verified_completed:1,teacher_id:'assigned',courses:[{total:100,consumed:0,status:'active'}]})
 assert.equal(m.recorded,3);assert.equal(m.recordedPercent,3);assert.equal(m.verified,1);assert.equal(m.primaryPackage.remaining,100);assert.equal(m.primaryPackage.usagePercent,0)
})
test('a package without an enrollment teacher never implies a teacher association or zero verified lessons',()=>{
 const m=studentDirectoryMetrics({teacher_id:null,verified_completed:0,courses:[{name:'Conversation',total:12,consumed:2,status:'active'}]})
 assert.equal(m.teacherLinkNeeded,true);assert.equal(m.verified,null);assert.equal(m.primaryPackage.remaining,10)
})
test('unknown, malformed and over-consumed package balances require review instead of a fabricated count',()=>{
 for(const c of [{total:12,consumed:13},{total:null,consumed:0},{total:12,consumed:null},{total:12,consumed:-1},{total:0,consumed:0},{total:12,consumed:''}]){
  const m=packageMetrics(c);assert.equal(m.remaining,null);assert.equal(m.usagePercent,null);assert.equal(m.needsReview,true)
 }
 assert.equal(packageMetrics({total:12,consumed:12}).remaining,0)
})
test('active entitlements are kept separate from cancelled, expired and exhausted packages',()=>{
 const m=studentDirectoryMetrics({courses:[{name:'Old course',total:100,consumed:7,status:'cancelled'},{name:'Current course',total:12,consumed:3,status:'active'}]})
 assert.equal(m.activePackages.length,1);assert.equal(m.primaryPackage.name,'Current course');assert.equal(m.primaryPackage.remaining,9);assert.equal(m.packages.length,2)
})
test('authorized roster counts and intersecting search/language/status filters use real rows only',()=>{
 const students=[{name:'Sofia Green',email:'synthetic@example.test',state:'active',language:'English',level:'B1',teacher_id:'teacher',courses:[{name:'Travel conversations'}]},{name:'Jules Example',state:'archived',language:'French',teacher_id:null,courses:[]}]
 assert.deepEqual(directoryCounts(students),{total:2,active:1,needsTeacher:1,archived:1})
 assert.equal(filterDirectory(students,{state:'all',search:'travel',language:'English'}).length,1)
 assert.equal(filterDirectory(students,{state:'active',language:'French'}).length,0)
 assert.equal(filterDirectory(students,{state:'all',search:' SYNTHETIC@EXAMPLE.TEST '}).length,1)
})
test('missing progress is not rendered as a completion percentage and initials support Unicode names',()=>{
 assert.equal(studentDirectoryMetrics({}).recordedPercent,null)
 assert.equal(studentDirectoryMetrics({recorded_completed:15,recorded_total:12}).recordedPercent,null)
 assert.equal(studentInitials('  Ana María Silva  '),'AM');assert.equal(studentInitials('Élodie'),'É')
})
