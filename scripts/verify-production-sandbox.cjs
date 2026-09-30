const fs=require('node:fs');
const env=require('../backend/node_modules/dotenv').parse(fs.readFileSync('.env.production'));
async function request(method,path,body) {
  const response=await fetch(env.AGENT_PLATFORM_URL.replace(/\/$/,'')+path,{method,headers:{authorization:`Bearer ${env.AGENT_PLATFORM_API_KEY}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(280000)});
  if(!response.ok)throw Error(`${method} ${path.split('?')[0]} returned ${response.status}`);
  return response.status===204?undefined:response.json();
}
(async()=>{
  let id;
  try {
    await request('GET','/health');console.log('Authenticated production sandbox health: OK');
    const created=await request('POST','/v1/sandboxes',{name:'deployment-smoke',image:env.RESUME_SANDBOX_IMAGE,env:{},workdir:'/workspace',ttl_seconds:600});id=created.id;
    console.log('Sandbox provisioned: '+id);
    const tex='\\documentclass{article}\n\\begin{document}\nJobocate production sandbox smoke test.\n\\end{document}\n';
    await request('PUT',`/v1/sandboxes/${id}/files`,{files:[{path:'/workspace/resume.tex',content_base64:Buffer.from(tex).toString('base64')}]});
    const read=await request('GET',`/v1/sandboxes/${id}/files?path=%2Fworkspace%2Fresume.tex`);
    if(Buffer.from(read.content_base64,'base64').toString()!==tex)throw Error('Workspace roundtrip mismatch');
    const result=await request('POST',`/v1/sandboxes/${id}/exec`,{command:['pdflatex','-interaction=nonstopmode','-halt-on-error','resume.tex'],timeout_seconds:60,cwd:'/workspace'});
    if(result.exit_code!==0)throw Error('Production PDF compilation failed');
    const pdf=await request('GET',`/v1/sandboxes/${id}/files?path=%2Fworkspace%2Fresume.pdf`);
    if(!Buffer.from(pdf.content_base64,'base64').subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('Invalid PDF');
    console.log('File initialization, remote exec and real TeX PDF generation: OK');
    const timeout=await request('POST',`/v1/sandboxes/${id}/exec`,{command:['sleep','10'],timeout_seconds:1});
    if(timeout.exit_code!==124)throw Error('Command timeout was not enforced');
    console.log('Remote process timeout: OK');
  }finally{if(id){await request('DELETE',`/v1/sandboxes/${id}`);console.log('Sandbox deletion: OK');}}
})().catch(err=>{console.error(err.message);process.exitCode=1;});
