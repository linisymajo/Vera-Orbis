import {test,expect} from '@playwright/test'
const S='20000000-0000-4000-8000-000000000001'
test('teacher manages only own enrollment, preserves inactive history and confirms each action',async({page,request})=>{
 await request.post('/__academic_test',{data:{reset:true}});await request.post('/__academic_test',{data:{seedManagement:true}})
 await page.goto('/tests/browser/fixture.html?mode=teacher-management');await page.waitForFunction(()=>window.testReady)
 const card=page.locator('[data-managed-student="'+S+'"]');await expect(card).toBeVisible();await expect(page.locator('[data-managed-student]')).toHaveCount(1);await expect(page.locator('[data-delete-student]')).toHaveCount(0)
 await page.locator('[data-manage-search]').fill('does not exist');await expect(card).toHaveCount(0);await page.locator('[data-manage-search]').fill('Safe Test');await expect(card).toBeVisible();await page.locator('[data-manage-search]').fill('')
 const initial=await page.evaluate(async S=>(await window.testClient.rpc('get_managed_student_history',{p_student_id:S})).data.profile,S)
 await card.getByRole('button',{name:'Deactivate Student',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();await expect(card).toContainText('active')
 await card.getByRole('button',{name:'Deactivate Student',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Confirm Deactivate Student',exact:true}).click();await expect(card).toHaveCount(0)
 await page.locator('[data-manage-state]').selectOption('inactive');await expect(card).toBeVisible();await card.getByRole('button',{name:'Academic history & profile',exact:true}).click();await expect(page.locator('[data-managed-history]')).toContainText('Safe Test Student')
 await card.getByRole('button',{name:'Reactivate Student',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Confirm Reactivate Student',exact:true}).click();await page.locator('[data-manage-state]').selectOption('all');await expect(card).toContainText('active')
 await expect(page.locator('[data-managed-history]')).toBeEmpty()
 const act=async(action,completed=false)=>{await card.getByRole('button',{name:action,exact:true}).click();const dialog=page.getByRole('dialog');if(completed)await dialog.locator('[name=completed]').check();await dialog.getByRole('button',{name:'Confirm '+action,exact:true}).click();await expect(dialog).not.toBeVisible()}
 await act('Mark course completed',true);await expect(card).toContainText('completed');await act('Archive completed student',true);await expect(card).toContainText('archived');await act('Reactivate Student');await expect(card).toContainText('active')
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.temp/student-management-mobile.png',fullPage:true})
 const final=await page.evaluate(async S=>(await window.testClient.rpc('get_managed_student_history',{p_student_id:S})).data.profile,S);expect(final).toEqual(initial)
 await act('Remove from my roster');await expect(card).toHaveCount(0)
 const lost=await page.evaluate(async S=>await window.testClient.rpc('get_managed_student_history',{p_student_id:S}),S);expect(lost.error).toBeTruthy()
})

test('synthetic administrator sees exact identity and irreversible consequences; wrong confirmation cannot delete',async({page,request})=>{
 await request.post('/__academic_test',{data:{reset:true}});await request.post('/__academic_test',{data:{seedManagement:true,admin:true}})
 await page.goto('/tests/browser/fixture.html?mode=teacher-management&actor=teacher2');await page.waitForFunction(()=>window.testReady)
 const card=page.locator('[data-managed-student="'+S+'"]');await card.getByRole('button',{name:'Delete Student Permanently',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText(S+'@example.test');await expect(dialog).toContainText('irreversible');await expect(dialog).toContainText('Related records affected')
 await dialog.locator('[name=retention]').check();await dialog.locator('[name=shared]').check();await dialog.locator('[name=confirmation]').fill('DELETE wrong@example.test');await dialog.getByRole('button',{name:'Permanently delete this exact account',exact:true}).click();await expect(dialog.locator('[role=status]')).toContainText('not confirmed');await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(card).toBeVisible()
 const history=await page.evaluate(async S=>await window.testClient.rpc('get_managed_student_history',{p_student_id:S}),S);expect(history.data.profile.id).toBe(S)
})
