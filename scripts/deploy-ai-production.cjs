// Companion to deploy-production.ps1. Uses the same combined private env file.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const dotenv=require('../backend/node_modules/dotenv');
const root=path.resolve(__dirname,'..');
const option=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const namespace=option('--namespace','jobocate-prod');
const registry=option('--registry','perfectum');
const domain=option('--domain','jobocate.pragra.io');
const tag=option('--tag',null);
const gatewayOnly=process.argv.includes('--gateway-only');
const validateOnly=process.argv.includes('--validate-only');
const values=dotenv.parse(fs.readFileSync(path.join(root,'.env.production')));
function run(cmd,args,input,{quiet=false}={}) {
  const result=spawnSync(cmd,args,{cwd:root,input,encoding:'utf8',maxBuffer:32*1024*1024,env:process.env,stdio:input!==undefined||quiet?['pipe','pipe','pipe']:'inherit'});
  if(result.status!==0)throw Error(`${cmd} ${args[0]} failed (diagnostics withheld for credential safety)`);
  return result.stdout||'';
}
function apply(data){run('kubectl',['apply','-f','-'],typeof data==='string'?data:JSON.stringify(data));}
function secret(name,keys){
  const stringData=Object.fromEntries(keys.map(k=>{if(!values[k])throw Error(`Set ${k} in .env.production`);return[k,values[k]];}));
  apply({apiVersion:'v1',kind:'Secret',metadata:{name,namespace},type:'Opaque',stringData});
}
function image(repository,dockerfile,context,provided){
  if(provided){if(!/@sha256:[a-f0-9]{64}$/.test(provided))throw Error('Use an immutable image digest');return provided;}
  const name=`registry.digitalocean.com/${registry}/${repository}`;
  run('docker',['build','-f',dockerfile,'-t',`${name}:${tag}`,context]);
  run('docker',['push',`${name}:${tag}`]);
  const digests=JSON.parse(run('docker',['image','inspect',`${name}:${tag}`,'--format','{{json .RepoDigests}}'],undefined,{quiet:true}));
  const digest=digests.find(d=>d.startsWith(`${name}@sha256:`));
  if(!digest)throw Error('Published image digest missing');return digest;
}
function main(){
  for(const v of [namespace,registry,domain])if(!/^[a-z0-9][a-z0-9.-]+$/.test(v))throw Error('Invalid deployment name');
  if(!validateOnly&&(!tag||tag==='latest'||!/^[a-zA-Z0-9._-]+$/.test(tag)))throw Error('Supply --tag with an immutable release tag');
  if(!gatewayOnly&&!values.LITELLM_DATABASE_URL)throw Error('Set LITELLM_DATABASE_URL to Supabase Postgres session pooler URI before deploying LiteLLM');
  if(!gatewayOnly&& !/^postgres(ql)?:\/\//.test(values.LITELLM_DATABASE_URL))throw Error('LITELLM_DATABASE_URL must be a Postgres connection URI');
  let gatewayImage='registry.digitalocean.com/perfectum/jobocate-agent-platform@sha256:'+'a'.repeat(64);
  let sandboxImage='registry.digitalocean.com/perfectum/jobocate-resume-harness@sha256:'+'b'.repeat(64);
  if(!validateOnly){
    process.env.DOCKER_CONFIG=process.env.DOCKER_CONFIG||path.join(root,'.deploy-state/docker-config');
    fs.mkdirSync(process.env.DOCKER_CONFIG,{recursive:true});
    run('doctl',['registry','login','--expiry-seconds','3600']);
    const currentSandbox=/@sha256:[a-f0-9]{64}$/.test(values.RESUME_SANDBOX_IMAGE||'')?values.RESUME_SANDBOX_IMAGE:null;
    sandboxImage=image('jobocate-resume-harness','infra/agent-platform/harness.Dockerfile','infra/agent-platform',option('--sandbox-image',currentSandbox));
    gatewayImage=image('jobocate-agent-platform','infra/agent-platform/gateway.Dockerfile','infra/agent-platform',option('--gateway-image',null));
  }
  const replacements={'__NAMESPACE__':namespace,'__REGISTRY__':registry,'__HOST__':domain,'__GATEWAY_IMAGE__':gatewayImage,
    '__LITELLM_IMAGE__':'ghcr.io/berriai/litellm@sha256:a53a7d3ffebede1925bd3ee8a21e4a7b9b63e2e68ec883af136edcccb6eeb82c'};
  let manifest=fs.readFileSync(path.join(root,'deploy/kubernetes/ai.template.yaml'),'utf8');
  for(const [key,value]of Object.entries(replacements))manifest=manifest.replaceAll(key,value);
  if(gatewayOnly)manifest=manifest.split(/^---$/m).filter(doc=>!/^  name: jobocate-litellm$/m.test(doc)).join('\n---\n');
  fs.mkdirSync(path.join(root,'.deploy-state/rendered'),{recursive:true});
  fs.writeFileSync(path.join(root,'.deploy-state/rendered/ai.yaml'),manifest);
  if(validateOnly){run('kubectl',['apply','--dry-run=client','-f','-'],manifest);console.log('AI manifest valid; no MongoDB or Postgres workloads.');return;}
  apply({apiVersion:'v1',kind:'Namespace',metadata:{name:`${namespace}-sandboxes`,labels:{'pod-security.kubernetes.io/enforce':'restricted','pod-security.kubernetes.io/enforce-version':'v1.34'}}});
  const pullSecret=JSON.parse(run('kubectl',['get','secret',`registry-${registry}`,'-n',namespace,'-o','json'],undefined,{quiet:true}));
  apply({apiVersion:'v1',kind:'Secret',metadata:{name:`registry-${registry}`,namespace:`${namespace}-sandboxes`},type:pullSecret.type,data:pullSecret.data});
  values.RESUME_SANDBOX_IMAGE=sandboxImage;
  secret('jobocate-agent-platform',['AGENT_PLATFORM_API_KEY','RESUME_SANDBOX_IMAGE']);
  if(!gatewayOnly){
    secret('jobocate-litellm',['AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_REGION','LITELLM_MASTER_KEY','LITELLM_DATABASE_URL']);
    const config=fs.readFileSync(path.join(root,'infra/litellm/config.yaml'),'utf8');
    apply({apiVersion:'v1',kind:'ConfigMap',metadata:{name:'jobocate-litellm-config',namespace},data:{'config.yaml':config}});
  }
  apply(manifest);
  run('kubectl',['rollout','restart','deployment/jobocate-agent-platform','-n',namespace]);
  run('kubectl',['rollout','status','deployment/jobocate-agent-platform','-n',namespace,'--timeout=5m']);
  if(!gatewayOnly){
    run('kubectl',['rollout','restart','deployment/jobocate-litellm','-n',namespace]);
    run('kubectl',['rollout','status','deployment/jobocate-litellm','-n',namespace,'--timeout=10m']);
  }
  let envText=fs.readFileSync(path.join(root,'.env.production'),'utf8');
  envText=envText.replace(/^RESUME_SANDBOX_IMAGE=.*$/m,`RESUME_SANDBOX_IMAGE=${sandboxImage}`);
  const internalRoute=`RESUME_HARNESS_LITELLM_INTERNAL_URL=http://jobocate-litellm.${namespace}.svc.cluster.local:4000`;
  envText=/^RESUME_HARNESS_LITELLM_INTERNAL_URL=/m.test(envText)?envText.replace(/^RESUME_HARNESS_LITELLM_INTERNAL_URL=.*$/m,internalRoute):envText+'\n'+internalRoute+'\n';
  fs.writeFileSync(path.join(root,'.env.production'),envText);
  console.log('AI services deployed; rebuild backend with deploy-production.ps1 to bake the pinned sandbox image.');
}
if(require.main===module)try{main();}catch(err){console.error(err.message);process.exitCode=1;}
