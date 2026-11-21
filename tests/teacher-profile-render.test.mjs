import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runInNewContext} from 'node:vm'

const source=(await readFile(new URL('../src/teacher-main.js',import.meta.url),'utf8'))
  .replace(/^import[\s\S]*?['"][^'"\n]+['"]\s*;?\s*$/gm,'')
  .replace(/^export\s+/gm,'')
  .replace(/^loadTeacherDashboard\(\)\s*$/m,'')
const render=runInNewContext(source+'\nrenderStudentInboxSection')
test('existing profile inbox renders stored dated messages without breaking the dossier and escapes private content',()=>{
 const html=render({name:'Synthetic learner'},[{id:'test-message',sender_role:'student',is_read:false,created_at:'2026-11-20T12:00:00Z',subject:'<script>unsafe</script>',body:'Synthetic message & question'}])
 assert.match(html,/Nov 20, 2026/)
 assert.match(html,/Synthetic message &amp; question/)
 assert.match(html,/&lt;script&gt;unsafe&lt;\/script&gt;/)
 assert.doesNotMatch(html,/<script>unsafe/)
 assert.match(html,/student-message-send-form/)
})
test('empty history and legacy missing or invalid message timestamps remain renderable',()=>{
 assert.match(render({name:'Synthetic learner'}),/No messages exchanged/)
 for(const created_at of [null,'',undefined,'invalid'])assert.match(render({name:'Synthetic learner'},[{created_at,subject:'Practice',body:'Synthetic',sender_role:'teacher',is_read:true}]),/No date recorded/)
})
