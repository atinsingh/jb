const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const source=readFileSync(join(__dirname,'../src/services/resumeHarnessApi.js'),'utf8')
  .replace(/^import .*;\r?\n/gm,'')
  .replace(/^export const /gm,'const ');
let response;
const streamPost=new Function('API_URL','getAccessToken','fetch',`${source}\nreturn streamPost;`)(
  'http://example.test',async()=> 'test-token',async()=>response,
);
test('a terminal low-credit event finishes even if the proxy leaves the SSE socket open',async()=>{
  let cancelled=false;
  response={ok:true,body:new ReadableStream({start(controller){
    controller.enqueue(new TextEncoder().encode('data: {"type":"error","code":"AI_BUDGET_INSUFFICIENT","message":"Need 75 credits"}\n\n'));
  },cancel(){cancelled=true;}})};
  const events=[];
  await Promise.race([
    streamPost('/api/resume-harness/sessions/test/turns/stream',{},event=>events.push(event)),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('stream remained open')),500)),
  ]);
  assert.equal(events[0]?.code,'AI_BUDGET_INSUFFICIENT');
  assert.equal(cancelled,true);
});

test('a stalled stream ends with a recoverable error',async()=>{
  let cancelled=false;
  response={ok:true,body:new ReadableStream({cancel(){cancelled=true;}})};
  await assert.rejects(
    streamPost('/api/resume-harness/sessions/test/turns/stream',{},()=>{},{},25),
    /stopped responding/i,
  );
  assert.equal(cancelled,true);
});
