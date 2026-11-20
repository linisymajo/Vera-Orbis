// Fetch bytes using the current user session. No reusable signed Storage URL is issued.
export async function privateFileDownload(client,bucket,path,{urlFactory=URL}={}) {
 if(!['materials','academic-submissions'].includes(bucket)||typeof path!=='string'||path.length>1024||path.split('/').some(p=>!p||p==='.'||p==='..')||/[\\\x00-\x1f]/.test(path))throw Error('Invalid private academic file.')
 const result=await client.storage.from(bucket).download(path)
 if(result.error||!result.data||typeof result.data.arrayBuffer!=='function'||result.data.size<=0||result.data.size>10485760)throw Error('The private file could not be authorized. Verify your enrollment or contact your teacher.')
 // Uploads already enforce academic formats; never execute active web content.
 if(/(?:text\/html|javascript|svg\+xml)/i.test(result.data.type||''))throw Error('This file cannot be opened as an academic download.')
 const url=urlFactory.createObjectURL(result.data)
 const timer=setTimeout(()=>urlFactory.revokeObjectURL(url),300000);timer.unref?.()
 return url
}
