import{test,expect}from'@playwright/test'
import{readFile}from'node:fs/promises'
import{docx,pptx}from'./sample-documents.mjs'
test.beforeEach(async({request})=>{const response=await request.post('/__academic_test',{data:{reset:true}});expect((await response.json()).data.reset).toBe(true)})

test('Materials Studio drops an Office batch, saves private records, searches and downloads exact local bytes',async({page,request})=>{
  // HTTPS is a sentinel only. No external Storage/TLS service is contacted.
  await page.context().route(/^https:\/\/academic-fixture\.invalid\/__academic_test_file\//,async route=>{
    const localURL='http://127.0.0.1:5197'+new URL(route.request().url()).pathname
    const response=await request.get(localURL)
    await route.fulfill({status:response.status(),headers:response.headers(),body:await response.body()})
  })
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto('/tests/browser/fixture.html?mode=teacher-materials')
  await page.waitForFunction(()=>window.testReady===true)
  await page.getByRole('combobox',{name:'Recipient',exact:true}).selectOption('20000000-0000-4000-8000-000000000001')
  await page.getByLabel('Language',{exact:true}).fill('French')
  await page.getByLabel('Level',{exact:true}).fill('A2')
  const samples=[{name:'personal-expression.docx',type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',bytes:[...docx]},{name:'meeting-slides.pptx',type:'application/vnd.openxmlformats-officedocument.presentationml.presentation',bytes:[...pptx]}]
  await page.locator('[data-material-drop]').evaluate((drop,samples)=>{
    const transfer=new DataTransfer()
    for(const sample of samples)transfer.items.add(new File([Uint8Array.from(sample.bytes)],sample.name,{type:sample.type}))
    drop.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}))
    drop.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}))
  },samples)
  await expect(page.locator('[data-material-entry]')).toHaveCount(2)
  await page.locator('[data-material-title]').nth(0).fill('Personal expression document')
  await page.locator('[data-material-title]').nth(1).fill('First meeting presentation')
  await page.getByRole('button',{name:'Upload and save batch',exact:true}).click()
  await expect(page.locator('[data-material-status]')).toHaveText('2 material(s) confirmed saved.')
  await expect(page.locator('[data-material-library] article')).toHaveCount(2)
  await page.getByLabel('Search saved materials',{exact:true}).fill('personal expression')
  await expect(page.locator('[data-material-library] article')).toHaveCount(1)
  await page.getByRole('button',{name:'Prepare private download',exact:true}).click()
  const link=page.getByRole('link',{name:'Open file',exact:true})
  await expect(link).toBeVisible()
  let listener,popup
  const downloaded=new Promise(resolve=>{
    const done=download=>resolve(download)
    page.once('download',done)
    listener=tab=>{popup=tab;tab.once('download',done)};page.context().once('page',listener)
  })
  await link.click()
  const download=await downloaded
  expect(await readFile(await download.path())).toEqual(docx)
  if(popup&&!popup.isClosed())await popup.close()
  page.context().removeListener('page',listener)
  const records=await page.evaluate(async()=>(await window.testClient.from('materials').select('*')).data)
  expect(records).toHaveLength(2)
  for(const actor of['teacher2','student2']){
    const denied=await request.post('/__academic_test',{data:{actor,storage:'signedUrl',bucket:'materials',path:records[0].file_path}})
    expect((await denied.json()).error.message).toContain('access denied')
  }
  await page.reload()
  await expect(page.locator('[data-material-library] article')).toHaveCount(2)
  expect(errors).toEqual([])
})
