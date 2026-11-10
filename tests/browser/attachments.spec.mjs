import { test,expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// A complete one-page PDF fixture. Only byte transport is simulated locally;
// reservation, metadata confirmation, submissions, revisions and RLS use real SQL.
function pdfFixture(text) {
  const stream=`BT /F1 14 Tf 20 200 Td (${text}) Tj ET`
  const objects=['<</Type/Catalog/Pages 2 0 R>>','<</Type/Pages/Kids[3 0 R]/Count 1>>','<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 300]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',`<</Length ${Buffer.byteLength(stream)}>>\nstream\n${stream}\nendstream`,'<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>']
  let textPDF='%PDF-1.4\n';const offsets=[0]
  objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(textPDF));textPDF+=`${i+1} 0 obj\n${object}\nendobj\n`})
  const xref=Buffer.byteLength(textPDF)
  textPDF+=`xref\n0 ${offsets.length}\n0000000000 65535 f \n`
  offsets.slice(1).forEach(offset=>{textPDF+=`${String(offset).padStart(10,'0')} 00000 n \n`})
  return Buffer.from(textPDF+`trailer\n<</Root 1 0 R/Size ${offsets.length}>>\nstartxref\n${xref}\n%%EOF\n`)
}
const firstPDF=pdfFixture('Listen. Repeat. Personalize. Use.')
const revisedPDF=pdfFixture('My revised personal example in a real situation.')
const file=(name,buffer=firstPDF)=>({name,mimeType:'application/pdf',buffer})

test.beforeEach(async({request})=>{
  const response=await request.post('/__academic_test',{data:{reset:true}})
  expect((await response.json()).data.reset).toBe(true)
})

async function publishActivity(page,{mode,title,revisions=false}) {
  await page.goto('/tests/browser/fixture.html')
  await page.getByRole('button',{name:'Create activity',exact:true}).click()
  await page.getByLabel('Title',{exact:true}).fill(title)
  await page.getByRole('combobox',{name:'Student files',exact:true}).selectOption(mode)
  if(revisions)await page.getByLabel('Allow file revisions before the deadline',{exact:true}).check()
  await page.getByLabel('Prompt',{exact:true}).fill('Choose a greeting and personalize it in your file.')
  await page.getByLabel('Options (one per line)',{exact:true}).fill('Bonjour\nAu revoir')
  await page.getByLabel('Correct option (private)',{exact:true}).fill('Bonjour')
  await page.getByRole('button',{name:'Preview activity',exact:true}).click()
  await page.getByRole('button',{name:'Select students',exact:true}).click()
  await page.getByRole('checkbox',{name:/^Safe Test Student/}).check()
  await page.getByRole('button',{name:'Review publication',exact:true}).click()
  await page.getByRole('button',{name:'Publish and assign',exact:true}).click()
  await expect(page.locator('[data-form-status]')).toContainText('1 saved assignment')
}

async function downloadedBytes(page,button) {
  const pending=new Promise(resolve=>page.context().once('page',popup=>popup.once('download',download=>resolve({download,popup}))))
  await button.click()
  const {download,popup}=await pending
  const bytes=await readFile(await download.path())
  await popup.close()
  return{bytes,name:download.suggestedFilename()}
}

test('optional files persist, teacher downloads exact bytes, revisions retain both file versions',async({page,browser,request})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await publishActivity(page,{mode:'optional',title:'Optional personal response',revisions:true})
  const student=await browser.newPage();student.on('pageerror',error=>errors.push(error.message))
  await student.goto('/tests/browser/fixture.html?actor=student')
  await student.getByLabel('Bonjour',{exact:true}).check()
  await student.locator('[name="academic_files"]').setInputFiles(file('personal-response.pdf'))
  await student.getByRole('button',{name:'Submit attempt',exact:true}).click()
  await expect(student.locator('[data-exercise-status]')).toHaveText('Attempt submitted for teacher review.')
  const assignmentId=await student.locator('[data-exercise-assignment]').getAttribute('data-exercise-assignment')
  const listed=await student.evaluate(async id=>(await window.testClient.rpc('list_exercise_attachments',{p_assignment_id:id})).data,assignmentId)
  expect(listed).toHaveLength(1)
  for(const actor of ['student2','teacher2']){
    const denied=await request.post('/__academic_test',{data:{actor,storage:'signedUrl',bucket:'academic-submissions',path:listed[0].file_path}})
    expect((await denied.json()).error.message).toContain('access denied')
  }
  await page.reload()
  const firstDownload=await downloadedBytes(page,page.getByRole('button',{name:'personal-response.pdf',exact:true}))
  expect(firstDownload.name).toBe('personal-response.pdf');expect(firstDownload.bytes).toEqual(firstPDF)
  await student.reload()
  await expect(student.getByRole('button',{name:'Submitted for review',exact:true})).toBeDisabled()
  await student.getByText('Revise submitted files',{exact:true}).click()
  await student.locator('[data-attachment-revision] [name="academic_files"]').setInputFiles(file('revised-response.pdf',revisedPDF))
  await student.getByRole('button',{name:'Save file revision',exact:true}).click()
  await expect(student.locator('[data-revision-status]')).toHaveText('File revision 2 saved.')
  await page.reload()
  await expect(page.locator('[data-attachment-files] li').filter({has:page.getByRole('button',{name:'personal-response.pdf',exact:true})})).toContainText('Earlier files')
  await expect(page.locator('[data-attachment-files] li').filter({has:page.getByRole('button',{name:'revised-response.pdf',exact:true})})).toContainText('Current files')
  const secondDownload=await downloadedBytes(page,page.getByRole('button',{name:'revised-response.pdf',exact:true}))
  expect(secondDownload.bytes).toEqual(revisedPDF)
  expect(errors).toEqual([]);await student.close()
})

test('required files prevent empty submission, reject unsupported files, then save a verified upload',async({page,browser})=>{
  await publishActivity(page,{mode:'required',title:'Required final response'})
  const student=await browser.newPage()
  await student.goto('/tests/browser/fixture.html?actor=student')
  // Hold a real SQL autosave response until after submission validation.
  let releaseSave,markSaveStarted,held=false
  const saveStarted=new Promise(resolve=>{markSaveStarted=resolve})
  const release=new Promise(resolve=>{releaseSave=resolve})
  await student.route('**/__academic_test',async route=>{
    if(route.request().postDataJSON()?.rpc!=='save_exercise_progress'||held)return route.continue()
    held=true
    const response=await route.fetch()
    markSaveStarted();await release
    await route.fulfill({response})
  })
  await student.getByLabel('Bonjour',{exact:true}).check()
  await saveStarted
  await student.getByRole('button',{name:'Submit attempt',exact:true}).click()
  await expect(student.locator('[data-exercise-status]')).toHaveText('Add the required attachment before submitting.')
  releaseSave()
  await expect(student.locator('[data-progress-status]')).toHaveText('Progress saved.')
  await expect(student.locator('[data-exercise-status]')).toHaveText('Add the required attachment before submitting.')
  expect(await page.evaluate(async()=> (await window.testClient.from('exercise_attempts').select('*')).data.length)).toBe(0)
  const assignmentId=await student.locator('[data-exercise-assignment]').getAttribute('data-exercise-assignment')
  const denied=await student.evaluate(async id=>window.testClient.rpc('submit_exercise',{p_assignment_id:id,p_answers:[{index:0,answer:'Bonjour'}],p_request_id:crypto.randomUUID()}),assignmentId)
  expect(denied.error.message).toContain('requires an attachment')
  await student.locator('[name="academic_files"]').setInputFiles({name:'unsupported.exe',mimeType:'application/pdf',buffer:firstPDF})
  await student.getByRole('button',{name:'Submit attempt',exact:true}).click()
  await expect(student.locator('[data-exercise-status]')).toContainText('supported academic file')
  await expect(student.getByLabel('Bonjour',{exact:true})).toBeChecked()
  await expect(student.getByRole('button',{name:'Submit attempt',exact:true})).toBeEnabled()
  await student.locator('[name="academic_files"]').setInputFiles(file('required-response.pdf'))
  await student.getByRole('button',{name:'Submit attempt',exact:true}).click()
  await expect(student.locator('[data-exercise-status]')).toHaveText('Attempt submitted for teacher review.')
  await page.reload()
  await expect(page.getByRole('button',{name:'required-response.pdf',exact:true})).toBeVisible()
  expect((await downloadedBytes(page,page.getByRole('button',{name:'required-response.pdf',exact:true}))).bytes).toEqual(firstPDF)
  await student.close()
})

test('disabled files show answers only and reservation RPC cannot bypass the teacher setting',async({page,browser})=>{
  await publishActivity(page,{mode:'none',title:'Answers without files'})
  const student=await browser.newPage()
  await student.goto('/tests/browser/fixture.html?actor=student')
  await expect(student.locator('[name="academic_files"]')).toHaveCount(0)
  const assignmentId=await student.locator('[data-exercise-assignment]').getAttribute('data-exercise-assignment')
  const denied=await student.evaluate(async id=>window.testClient.rpc('reserve_exercise_attachment',{p_assignment_id:id,p_file_name:'bypass.pdf',p_mime_type:'application/pdf',p_size_bytes:128,p_request_id:crypto.randomUUID()}),assignmentId)
  expect(denied.error.message).toContain('disabled')
  await student.getByLabel('Bonjour',{exact:true}).check()
  await student.getByRole('button',{name:'Submit attempt',exact:true}).click()
  await expect(student.locator('[data-exercise-status]')).toHaveText('Attempt submitted for teacher review.')
  await page.reload();await expect(page.locator('[data-attachment-files]')).toHaveText('No submitted files.')
  await student.close()
})
