// Separate academic history, attendance evidence and package accounting.
const count=value=>value!==null&&value!==undefined&&value!==''&&Number.isInteger(Number(value))&&Number(value)>=0?Number(value):null
export function packageMetrics(course){
 const allowance=count(course.total),used=count(course.consumed),valid=allowance!==null&&allowance>0&&used!==null&&used<=allowance
 return {...course,allowance,used,remaining:valid?allowance-used:null,usagePercent:valid?Math.round(used/allowance*100):null,needsReview:!valid}
}
export function studentDirectoryMetrics(student){
 const packages=(student.courses||[]).map(packageMetrics),activePackages=packages.filter(p=>p.status==='active'),recorded=count(student.recorded_completed),target=count(student.recorded_total)
 // Without an enrollment teacher the RPC's zero does not describe all attendance.
 const attendance=count(student.verified_completed),attendanceScoped=Boolean(student.teacher_id)
 return {recorded,target,verified:attendanceScoped?attendance:null,attendanceScoped,packages,activePackages,primaryPackage:activePackages[0]||null,teacherLinkNeeded:!student.teacher_id,recordedPercent:recorded!==null&&target>0&&recorded<=target?Math.round(recorded/target*100):null}
}
export function directoryCounts(students){return{total:students.length,active:students.filter(s=>s.state==='active').length,needsTeacher:students.filter(s=>!s.teacher_id&&s.state!=='removed').length,archived:students.filter(s=>s.state==='archived').length}}
export function filterDirectory(students,{search='',state='active',language='all'}={}){
 const term=search.trim().toLocaleLowerCase()
 return students.filter(s=>(state==='all'||s.state===state)&&(language==='all'||s.language===language)&&[s.name,s.email,s.language,s.level,...(s.courses||[]).map(c=>c.name)].join(' ').toLocaleLowerCase().includes(term))
}
export function studentInitials(name){return String(name||'Student').trim().split(/\s+/).slice(0,2).map(x=>Array.from(x)[0]).join('').toLocaleUpperCase()}
