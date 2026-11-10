import { test,expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Execute the production navigation functions, not a duplicate navigation shim.
// The fixture supplies authorized identities and PostgreSQL only; production Auth,
// environment files and the Supabase connection module are never imported here.
const platformSource=readFileSync(new URL('../../src/platform-main.js',import.meta.url),'utf8')
function between(start,end){
  const first=platformSource.indexOf(start),last=platformSource.indexOf(end,first+start.length)
  if(first<0||last<first)throw new Error('Student navigation source boundaries changed; update the isolated harness.')
  return platformSource.slice(first,last)
}
const academicSource=between('async function refreshNotificationBadge()','export function renderPlatformLoadingScreen(')
const navigationSource=between('async function openPlatformView(','function openRoadmapStepCard(')
const routeSource=between('async function setupPlatformRoutes()','function setupPlatformNavigation()')
const closeSource=between('function closePlatformView(','function filterLabel(')
const globalSource=between('function setupGlobalPlatformFunctions()','\nsetupGlobalPlatformFunctions()')

test('production student navigation mounts academic views in both branches and opens a saved notification',async({page,request})=>{
  const reset=await request.post('/__academic_test',{data:{reset:true}})
  expect((await reset.json()).data.reset).toBe(true)
  const seeded=await request.post('/__academic_test',{data:{seedChallenge:true}})
  const draftId=(await seeded.json()).data.id
  const content={title:'A practical invitation',objective:'Use a personalized expression to invite a colleague.',language:'French',level:'A2',
    steps:['Listen','Repeat','Personalize','Use'].map(stage=>({stage,activity:stage+' an expression in a practical invitation.'})),exercise_type:null,questions:[],feedback:null}
  const approved=await request.post('/__academic_test',{data:{actor:'teacher',rpc:'review_academic_ai_draft',params:{p_draft_id:draftId,p_content:content,p_status:'approved'}}})
  expect((await approved.json()).error).toBeFalsy()
  const published=await request.post('/__academic_test',{data:{actor:'teacher',rpc:'publish_academic_challenge',params:{
    p_draft_id:draftId,p_student_ids:['20000000-0000-4000-8000-000000000001'],p_end_at:null,p_points:10,p_request_id:crypto.randomUUID(),
  }}})
  expect((await published.json()).error).toBeFalsy()
  const errors=[],external=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/*',route=>{
    const url=new URL(route.request().url())
    if(url.hostname!=='127.0.0.1'&&url.hostname!=='localhost'){
      external.push(url.hostname);return route.abort()
    }
    return route.continue()
  })
  await page.emulateMedia({reducedMotion:'no-preference'})
  await page.goto('/tests/browser/fixture.html?mode=student-plans#learning-plans')
  await page.waitForFunction(()=>window.testReady===true)
  await page.evaluate(async({academicSource,navigationSource,routeSource,closeSource,globalSource})=>{
    const [views,plans,notifications,finals,exercises,settings,counts,challenges,routes]=await Promise.all([
      import('/src/pages/platform.js'),import('/src/components/learningPlans.js'),
      import('/src/components/notifications.js'),import('/src/components/finals.js'),
      import('/src/components/exercises.js'),import('/src/components/settings.js'),import('/src/lib/notifications.js'),import('/src/lib/academicChallenges.js'),
      import('/src/lib/academicRoutes.js'),
    ])
    document.body.innerHTML='<nav class="platform-nav"><a href="#home" data-platform-view="home">Home</a><a href="#learning-plans" data-platform-view="learning-plans">Learning plan</a><a href="#finals" data-platform-view="finals">Finals</a><a href="#notifications" data-platform-view="notifications" id="floating-notifications">Notifications</a><span data-academic-unread hidden></span></nav><section id="platform-home" class="is-active"></section><section id="platform-internal-view" aria-hidden="true"><h2 id="platform-view-kicker"></h2><div id="platform-view-content"></div></section>'
    const make=new Function('deps',`
      const {renderPlatformView,mountLearningPlans,mountNotifications,renderFinals,setupFinals,setupExerciseForms,setupAcademicAIConsent,getUnreadNotificationCount,submitAcademicChallenge,supabase,currentStudent,isStudentView,readStudentRoute,writeStudentRoute,watchAcademicLocation}=deps;
      let platformNavigationId=0,platformLoaded=true,enrollmentServiceBlocked=false,activePlatformView='home';
      let stopPlatformRoutes=()=>{};
      const platformData={materials:[],feedback:[],challenges:[],submissions:[],exercises:[],classes:[],attendance:[],packages:[],payments:[],culture:[],messages:[],finals:[]};
      const setupScrollReveal=()=>{},setupProgressAnimations=()=>{},setupRoadmapAnimations=()=>{},setupCardMovement=()=>{},setupMaterialButtons=()=>{},initializeDynamicPlatform=()=>{},setupInboxHandlers=()=>{},openRoadmapStepCard=()=>{};
      const filterLabel=value=>value,renderFilteredMaterials=()=>'',t=value=>value;
      ${academicSource}
      ${navigationSource}
      ${routeSource}
      ${closeSource}
      ${globalSource}
      setupGlobalPlatformFunctions();
      return {openPlatformView,closePlatformView,setupPlatformRoutes};
    `)
    window.testProductionNavigation=make({
      renderPlatformView:views.renderPlatformView,mountLearningPlans:plans.mountLearningPlans,
      mountNotifications:notifications.mountNotifications,renderFinals:finals.renderFinals,setupFinals:finals.setupFinals,
      setupExerciseForms:exercises.setupExerciseForms,setupAcademicAIConsent:settings.setupAcademicAIConsent,
      getUnreadNotificationCount:counts.getUnreadNotificationCount,submitAcademicChallenge:challenges.submitAcademicChallenge,supabase:window.testClient,
      isStudentView:routes.isStudentView,readStudentRoute:routes.readStudentRoute,writeStudentRoute:routes.writeStudentRoute,watchAcademicLocation:routes.watchAcademicLocation,
      currentStudent:{id:'20000000-0000-4000-8000-000000000001',name:'Safe Test Student',language:'French',interface_language:'en'},
    })
    await window.testProductionNavigation.setupPlatformRoutes()
  },{academicSource,navigationSource,routeSource,closeSource,globalSource})
  await expect(page.locator('#platform-view-content [data-learning-plan-workspace]')).toBeVisible()
  await expect(page.getByRole('heading',{name:'My learning plan',exact:true})).toBeVisible()
  await expect(page.locator('#platform-view-content')).not.toContainText('Loading your learning information...')
  await expect(page).toHaveURL(/#learning-plans$/)
  await page.evaluate(()=>window.testProductionNavigation.openPlatformView('finals'))
  await expect(page.locator('#platform-view-content').getByRole('heading',{name:'Final assessments',exact:true})).toBeVisible()
  await expect(page.locator('#platform-view-content')).toContainText('Your teacher will assign your final assessment here.')
  await expect(page).toHaveURL(/#finals$/)
  await expect(page.locator('[data-platform-view="finals"]')).toHaveAttribute('aria-current','page')
  await page.goBack()
  await expect(page).toHaveURL(/#learning-plans$/)
  await expect(page.locator('#platform-view-content [data-learning-plan-workspace]')).toBeVisible()
  await page.goForward()
  await expect(page).toHaveURL(/#finals$/)
  await expect(page.locator('#platform-view-content').getByRole('heading',{name:'Final assessments',exact:true})).toBeVisible()
  await page.evaluate(()=>window.testProductionNavigation.closePlatformView())
  await page.evaluate(()=>window.testProductionNavigation.openPlatformView('notifications',null,document.querySelector('#floating-notifications')))
  await expect(page.locator('.platform-floating-card .academic-notifications')).toBeVisible()
  await expect(page.locator('.platform-floating-card .is-unread')).toHaveCount(1)
  await page.locator('.platform-floating-card').getByRole('button',{name:'Open',exact:true}).click()
  await expect(page.locator('.platform-floating-card')).toHaveCount(0)
  await expect(page.locator('#platform-view-content .challenge-card')).toHaveCount(1)
  await expect(page.locator('#platform-view-content')).toContainText('A practical invitation')
  // Returning Home retains the hidden internal challenge DOM. Opening a floating
  // challenge from Home therefore leaves two DOM copies.
  // The production submit handler must use the visible form, not a hidden ID twin.
  await page.evaluate(()=>{
    window.testProductionNavigation.closePlatformView()
    return window.testProductionNavigation.openPlatformView('challenges',null,document.querySelector('#floating-notifications'))
  })
  await expect(page.locator('.platform-floating-card .challenge-card')).toHaveCount(1)
  await page.locator('.platform-floating-card .challenge-submit-form textarea').fill('I invited a colleague using a personalized expression.')
  await page.locator('.platform-floating-card').getByRole('button',{name:/Submit Challenge/}).click()
  await expect(page.locator('.platform-floating-card')).toHaveCount(0)
  await expect(page.locator('#platform-view-content .challenge-success-state')).toBeVisible()
  expect(external).toEqual([])
  expect(errors).toEqual([])
})

