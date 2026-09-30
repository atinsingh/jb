// Jobocate's sandbox API, backed by namespace-scoped Kubernetes pods.
const http = require('node:http');
const {spawn} = require('node:child_process');
const {randomUUID, timingSafeEqual} = require('node:crypto');
const path = require('node:path').posix;
const fail = (status,message) => Object.assign(new Error(message),{status});
function validatePath(value) {
  if (typeof value !== 'string' || value.includes('\0')) throw fail(400,'Invalid workspace path');
  const resolved = path.resolve('/workspace',value);
  if (resolved !== '/workspace' && !resolved.startsWith('/workspace/')) throw fail(400,'Path must stay inside /workspace');
  return resolved;
}
function podManifest(spec,id,config) {
  if (spec.image !== config.image) throw fail(400,'Sandbox image is not approved');
  if (spec.workdir && spec.workdir !== '/workspace') throw fail(400,'Invalid workdir');
  const ttl = Number(spec.ttl_seconds);
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > 86400) throw fail(400,'Invalid sandbox lifetime');
  const env = Object.entries(spec.env || {}).map(([name,value]) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || typeof value !== 'string') throw fail(400,'Invalid environment');
    return {name,value};
  });
  return {apiVersion:'v1',kind:'Pod',metadata:{name:id,labels:{'jobocate.io/sandbox':'true'},annotations:{'jobocate.io/expires-at':String(Date.now()+ttl*1000)}},spec:{
    restartPolicy:'Never',automountServiceAccountToken:false,activeDeadlineSeconds:ttl,terminationGracePeriodSeconds:3,
    imagePullSecrets:[{name:`registry-${config.registry || 'perfectum'}`}],
    securityContext:{runAsNonRoot:true,runAsUser:1000,runAsGroup:1000,seccompProfile:{type:'RuntimeDefault'}},
    containers:[{name:'sandbox',image:config.image,workingDir:'/workspace',env,
      resources:{requests:{cpu:'250m',memory:'256Mi','ephemeral-storage':'128Mi'},limits:{cpu:'2',memory:'2Gi','ephemeral-storage':'2Gi'}},
      securityContext:{allowPrivilegeEscalation:false,capabilities:{drop:['ALL']}}}]}};
}
// Execute inside the sandbox; never interpolate commands or paths into a shell.
// A new process group ensures a timed-out agent and its children are all killed.
const remote = String.raw`
import sys,json,pathlib,base64,os,subprocess,signal
d=json.load(sys.stdin)
def safe(p):
 r=pathlib.Path('/workspace').resolve()
 p=pathlib.Path(p).resolve()
 if p!=r and r not in p.parents: raise ValueError('Path must stay inside workspace')
 return p
try:
 if d['action']=='write':
  files=[(safe(f['path']),base64.b64decode(f['content_base64'],validate=True)) for f in d['files']]
  for p,b in files:
   p.parent.mkdir(parents=True,exist_ok=True)
   p.write_bytes(b)
  result={}
 elif d['action']=='read':
  result={'content_base64':base64.b64encode(safe(d['path']).read_bytes()).decode()}
 else:
  env=os.environ.copy();env.update(d.get('env') or {})
  p=subprocess.Popen(d['command'],cwd=safe(d.get('cwd') or '/workspace'),env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
  try:
   out,err=p.communicate(timeout=d['timeout_seconds']); code=p.returncode
  except subprocess.TimeoutExpired:
   os.killpg(p.pid,signal.SIGKILL);out,err=p.communicate();code=124;err+=b'\nSandbox command timed out.'
  result={'exit_code':code,'stdout':out.decode(errors='replace'),'stderr':err.decode(errors='replace')}
 print(json.dumps(result))
except FileNotFoundError:
 print(json.dumps({'error':'File not found','status':404}))
except ValueError:
 print(json.dumps({'error':'Invalid workspace path or file data','status':400}))
except Exception:
 print(json.dumps({'error':'Sandbox operation failed','status':503}))
`;
function createKubectl(namespace) {
  return (args,input,timeout=30000) => new Promise((resolve,reject) => {
    const child = spawn('kubectl',['-n',namespace,...args],{stdio:['pipe','pipe','pipe']});
    let out='',size=0;
    const timer=setTimeout(() => {child.kill();reject(fail(503,'Kubernetes operation timed out'));},timeout);
    child.stdout.on('data', chunk => {size+=chunk.length;if(size>24*1024*1024){child.kill();reject(fail(413,'Sandbox output too large'));}else out+=chunk;});
    child.stderr.resume(); // Never return pod environment or Kubernetes diagnostics to clients.
    child.on('error',() => {clearTimeout(timer);reject(fail(503,'Sandbox infrastructure unavailable'));});
    child.on('close',code => {clearTimeout(timer);code===0?resolve(out):reject(fail(503,'Kubernetes sandbox operation failed'));});
    child.stdin.on('error',()=>{});
    child.stdin.end(input);
  });
}
function createGateway(config,kubectl=createKubectl(config.namespace)) {
  let creating=0;
  const server=http.createServer(async (req,res) => {
    const send=(status,body) => {res.writeHead(status,{'content-type':'application/json'});res.end(body===undefined?'':JSON.stringify(body));};
    try {
      const auth=Buffer.from(req.headers.authorization || '');
      const expected=Buffer.from(`Bearer ${config.key}`);
      if (!config.key || auth.length!==expected.length || !timingSafeEqual(auth,expected)) throw fail(401,'Unauthorized');
      const url=new URL(req.url,'http://gateway');
      if (req.method==='GET' && url.pathname==='/health') return send(200,{status:'ok'});
      let raw='';
      for await (const chunk of req) {raw+=chunk;if(Buffer.byteLength(raw)>12*1024*1024)throw fail(413,'Request too large');}
      let body={};try{body=raw?JSON.parse(raw):{};}catch{throw fail(400,'Invalid JSON');}
      if (req.method==='POST' && url.pathname==='/v1/sandboxes') {
        const id=`jb-sandbox-${randomUUID()}`;
        const pod=podManifest(body,id,config);
        if(creating>=4)throw fail(429,'Sandbox provisioning is busy; retry shortly');
        creating++;
        try {
          const list=JSON.parse(await kubectl(['get','pods','-l','jobocate.io/sandbox=true','-o','json']));
          if (list.items.filter(p=>!['Failed','Succeeded'].includes(p.status?.phase)).length>=6) throw fail(429,'Sandbox capacity reached');
          await kubectl(['create','-f','-'],JSON.stringify(pod));
          await kubectl(['wait',`pod/${id}`,'--for=condition=Ready','--timeout=240s'],undefined,250000);
          return send(201,{id});
        } catch(err) {await kubectl(['delete','pod',id,'--ignore-not-found','--wait=false']).catch(()=>{});throw err;}
        finally {creating--;}
      }
      const match=url.pathname.match(/^\/v1\/sandboxes\/(jb-sandbox-[a-z0-9-]+)(?:\/(files|exec))?$/);
      if(!match)throw fail(404,'Not found');
      const [,id,action]=match;
      const podRaw=await kubectl(['get','pod',id,'--ignore-not-found','-o','json']);
      if(!podRaw)throw fail(404,'Sandbox not found');
      if(JSON.parse(podRaw).metadata.labels?.['jobocate.io/sandbox']!=='true')throw fail(404,'Sandbox not found');
      if(req.method==='DELETE' && !action) {await kubectl(['delete','pod',id,'--wait=true','--timeout=20s'],undefined,25000);return send(204);}
      let payload;
      if(action==='files' && req.method==='PUT') {
        if(!Array.isArray(body.files)||body.files.length>100)throw fail(400,'Invalid files');
        payload={action:'write',files:body.files.map(f=>({...f,path:validatePath(f.path)}))};
      } else if(action==='files' && req.method==='GET') payload={action:'read',path:validatePath(url.searchParams.get('path'))};
      else if(action==='exec' && req.method==='POST') {
        if(!Array.isArray(body.command)||!body.command.length||body.command.some(c=>typeof c!=='string'||c.includes('\0')))throw fail(400,'Invalid command');
        const seconds=body.timeout_seconds??600;
        if(!Number.isInteger(seconds)||seconds<1||seconds>1800)throw fail(400,'Invalid command timeout');
        payload={...body,action:'exec',cwd:validatePath(body.cwd||'/workspace'),timeout_seconds:seconds};
      } else throw fail(405,'Method not allowed');
      const result=JSON.parse(await kubectl(['exec','-i',id,'--','python3','-c',remote],JSON.stringify(payload),((payload.timeout_seconds||30)+15)*1000));
      if(result.error)throw fail(result.status,result.error);
      send(200,result);
    }catch(err){send(err.status||503,{error:err.status?err.message:'Sandbox operation failed'});}
  });
  server.requestTimeout=0;
  return server;
}
if(require.main===module){
  const config={key:process.env.AGENT_PLATFORM_API_KEY,image:process.env.RESUME_SANDBOX_IMAGE,namespace:process.env.SANDBOX_NAMESPACE,registry:process.env.REGISTRY};
  if(!config.key||!config.image||!config.namespace)throw Error('Missing sandbox configuration');
  const kubectl=createKubectl(config.namespace);
  const sweep=async()=>{
    const pods=JSON.parse(await kubectl(['get','pods','-l','jobocate.io/sandbox=true','-o','json']));
    for(const pod of pods.items)if(Number(pod.metadata.annotations?.['jobocate.io/expires-at'])<Date.now()||['Failed','Succeeded'].includes(pod.status?.phase))await kubectl(['delete','pod',pod.metadata.name,'--ignore-not-found','--wait=false']);
  };
  setInterval(()=>sweep().catch(()=>console.error('Sandbox expiry sweep failed')),60000).unref();
  createGateway(config,kubectl).listen(4100,'0.0.0.0',()=>console.log('Kubernetes sandbox gateway listening'));
}
module.exports={createGateway,validatePath,podManifest};
