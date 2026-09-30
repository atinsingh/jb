const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createGateway, validatePath, podManifest} = require('./gateway.cjs');

test('production manifest uses external databases and isolates sandbox permissions', () => {
  const fs=require('node:fs');
  const manifest=fs.readFileSync(require('node:path').join(__dirname,'../../deploy/kubernetes/ai.template.yaml'),'utf8');
  assert(!/image:.*(?:postgres|mongo)/.test(manifest));
  assert(manifest.includes('key: LITELLM_DATABASE_URL'));
  assert(manifest.includes('namespace: __NAMESPACE__-sandboxes'));
  assert(!/resources:.*secrets/.test(manifest));
  assert(manifest.includes('strategy: {type: Recreate}'));
});

test('workspace boundaries and fixed sandbox image are enforced', () => {
  assert.equal(validatePath('resume.tex'), '/workspace/resume.tex');
  for (const path of ['/etc/passwd', '../secret', '/workspace/../etc/passwd']) {
    assert.throws(() => validatePath(path));
  }
  assert.throws(() => podManifest({image:'untrusted', env:{}, ttl_seconds:60}, 'jb-sandbox-test', {image:'approved'}));
  const pod = podManifest({image:'approved',env:{KEY:'value'},ttl_seconds:60}, 'jb-sandbox-test', {image:'approved',registry:'perfectum'});
  assert.equal(pod.spec.automountServiceAccountToken, false);
  assert.equal(pod.spec.containers[0].securityContext.allowPrivilegeEscalation, false);
  assert.equal(pod.spec.activeDeadlineSeconds,60);
  assert.equal(pod.spec.containers[0].resources.requests.memory,'256Mi');
});

test('a demo cannot exceed six live sandbox pods', async () => {
  let created=false;
  const kubectl=async args=>{
    if(args[0]==='get')return JSON.stringify({items:Array.from({length:6},()=>({status:{phase:'Running'}}))});
    if(args[0]==='create')created=true;
    return '';
  };
  const server=createGateway({key:'secret',image:'approved'},kubectl);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const response=await fetch(`http://127.0.0.1:${server.address().port}/v1/sandboxes`,{method:'POST',headers:{authorization:'Bearer secret'},body:JSON.stringify({image:'approved',ttl_seconds:60,env:{}})});
    assert.equal(response.status,429);
    assert.equal(created,false);
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('unauthorized requests cannot create or read sandboxes; health requires the correct key', async () => {
  const server = createGateway({key:'demo-secret', image:'approved'}, async () => {throw Error('should not invoke kubectl');});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${base}/health`)).status,401);
    assert.equal((await fetch(`${base}/v1/sandboxes`,{method:'POST',body:'{}'})).status,401);
    assert.equal((await fetch(`${base}/health`,{headers:{authorization:'Bearer demo-secret'}})).status,200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('file transport and command exit status survive the Kubernetes adapter', async () => {
  const calls = [];
  const kubectl = async (args,input) => {
    calls.push({args,input});
    if (args[0] === 'get') return JSON.stringify({metadata:{labels:{'jobocate.io/sandbox':'true'}}});
    return JSON.stringify({exit_code:7,stdout:'retained output',stderr:'command failed'});
  };
  const server = createGateway({key:'secret',image:'approved'},kubectl);
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/v1/sandboxes/jb-sandbox-test/exec`, {
      method:'POST',headers:{authorization:'Bearer secret'},body:JSON.stringify({command:['sh','-c','exit 7'],timeout_seconds:10,cwd:'/workspace'})
    });
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{exit_code:7,stdout:'retained output',stderr:'command failed'});
    assert.equal(JSON.parse(calls[1].input).timeout_seconds,10);
    assert(calls[1].args.includes('-i'));
  } finally {await new Promise(resolve => server.close(resolve));}
});
