[CmdletBinding()]
param(
  [string]$Domain = 'jobocate.pragra.io',
  [string]$DnsZone = 'pragra.io',
  [string]$DnsRecord = 'jobocate',
  [string]$Cluster = 'perfectum-k8s',
  [string]$Registry = 'perfectum',
  [string]$Namespace = 'jobocate-prod',
  [string]$Tag,
  [string]$ProductionEnvFile,
  [string]$RenderDirectory,
  [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepoRoot = Split-Path $PSScriptRoot -Parent
if (-not $ProductionEnvFile) { $ProductionEnvFile = Join-Path $RepoRoot '.env.production' }
if (-not $RenderDirectory) { $RenderDirectory = Join-Path $RepoRoot '.deploy-state/rendered' }
$TemplateFile = Join-Path $RepoRoot 'deploy/kubernetes/jobocate.template.yaml'

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' is not installed or is not on PATH."
  }
}

function Read-EnvMap([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Missing production env file: $Path"
  }
  $result = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
    $match = [regex]::Match($line, '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$')
    if (-not $match.Success) { throw "Invalid env line in ${Path}: $line" }
    $result[$match.Groups[1].Value] = $match.Groups[2].Value.Trim()
  }
  return $result
}

function Assert-RequiredKeys([hashtable]$Values, [string[]]$Keys, [string]$Label) {
  $missing = @($Keys | Where-Object {
    -not $Values.ContainsKey($_) -or [string]::IsNullOrWhiteSpace([string]$Values[$_])
  })
  if ($missing.Count -gt 0) {
    throw "$Label is missing required values: $($missing -join ', ')"
  }
}

function Assert-SafeProductionValues([hashtable]$Values, [string]$Label) {
  foreach ($entry in $Values.GetEnumerator()) {
    if ([string]$entry.Value -match '(?i)(localhost|127\.0\.0\.1|replace-me|your-project-ref|jobocate\.example)') {
      throw "$Label contains a development or placeholder value for $($entry.Key)."
    }
  }
}

function Invoke-Checked([scriptblock]$Command, [string]$Failure) {
  & $Command
  if ($LASTEXITCODE -ne 0) { throw $Failure }
}

function Get-PinnedImage([string]$TaggedImage, [string]$Repository) {
  Invoke-Checked { docker pull $TaggedImage } "Could not pull the published image $TaggedImage." | Out-Host
  $raw = & docker image inspect $TaggedImage --format '{{json .RepoDigests}}'
  if ($LASTEXITCODE -ne 0) { throw "Could not inspect $TaggedImage." }
  $digests = $raw | ConvertFrom-Json
  $match = $digests | Where-Object { $_ -like "$Repository@sha256:*" } | Select-Object -First 1
  if (-not $match -or $match -notmatch '@sha256:[a-f0-9]{64}$') {
    throw "The registry did not return an immutable digest for $TaggedImage."
  }
  return [string]$match
}

function Render-Manifest(
  [string]$FrontendImage,
  [string]$BackendImage
) {
  $text = Get-Content -LiteralPath $TemplateFile -Raw
  $replacements = @{
    '__NAMESPACE__' = $Namespace
    '__REGISTRY__' = $Registry
    '__HOST__' = $Domain
    '__FRONTEND_IMAGE__' = $FrontendImage
    '__BACKEND_IMAGE__' = $BackendImage
  }
  foreach ($entry in $replacements.GetEnumerator()) {
    $text = $text.Replace([string]$entry.Key, [string]$entry.Value)
  }
  if ($text -match '__[A-Z_]+__') { throw 'The rendered manifest still contains template tokens.' }
  New-Item -ItemType Directory -Path $RenderDirectory -Force | Out-Null
  $path = Join-Path $RenderDirectory 'jobocate.yaml'
  [IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding($false)))
  return $path
}

if ($Domain -notmatch '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$') { throw 'Domain is invalid.' }
if ($DnsZone -notmatch '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$') { throw 'DnsZone is invalid.' }
if ($DnsRecord -notmatch '^[a-z0-9](?:[-a-z0-9]*[a-z0-9])?$') { throw 'DnsRecord is invalid.' }
if ("$DnsRecord.$DnsZone" -ne $Domain) { throw 'DnsRecord and DnsZone must form Domain.' }
if ($Namespace -notmatch '^[a-z0-9](?:[-a-z0-9]*[a-z0-9])?$') { throw 'Namespace is invalid.' }
if ($Registry -notmatch '^[a-z0-9](?:[-a-z0-9]*[a-z0-9])?$') { throw 'Registry is invalid.' }

$productionEnv = Read-EnvMap $ProductionEnvFile
$frontendEnv = @{}
$backendEnv = @{}
foreach ($entry in $productionEnv.GetEnumerator()) {
  if ($entry.Key -like 'NEXT_PUBLIC_*') { $frontendEnv[$entry.Key] = $entry.Value }
  else { $backendEnv[$entry.Key] = $entry.Value }
}
$frontendKeys = @('NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
$backendKeys = @(
  'NODE_ENV', 'PORT', 'MONGODB_URI', 'SUPABASE_URL', 'SUPABASE_JWKS_URL',
  'SUPABASE_SERVICE_ROLE_KEY', 'FRONTEND_URL', 'RESUME_SHARE_SECRET',
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SMTP_HOST', 'SMTP_USER',
  'SMTP_PASSWORD', 'LITELLM_BASE_URL', 'LITELLM_MASTER_KEY',
  'RESUME_SANDBOX_DRIVER', 'AGENT_PLATFORM_URL', 'AGENT_PLATFORM_API_KEY',
  'DEFAULT_AUTOMATIC_MODEL_ALIAS', 'CANDIDATE_ATS_MAX_REVIEW_TURNS', 'STORAGE_DRIVER', 'S3_BUCKET', 'S3_REGION',
  'S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'
)
Assert-RequiredKeys $frontendEnv $frontendKeys 'Frontend production env'
Assert-RequiredKeys $backendEnv $backendKeys 'Backend production env'

$privateFrontendKeys = @($frontendEnv.Keys | Where-Object { $_ -notlike 'NEXT_PUBLIC_*' })
if ($privateFrontendKeys.Count -gt 0) {
  throw "Frontend production env may contain public NEXT_PUBLIC_* values only: $($privateFrontendKeys -join ', ')"
}
if (@($backendEnv.Keys | Where-Object { $_ -like 'NEXT_PUBLIC_*' }).Count -gt 0) {
  throw 'Backend production env must not duplicate browser-facing NEXT_PUBLIC_* values.'
}
if ($backendEnv.NODE_ENV -ne 'production') { throw 'Backend NODE_ENV must be production.' }
if ($backendEnv.CANDIDATE_ATS_MAX_REVIEW_TURNS -notmatch '^[1-5]$') {
  throw 'CANDIDATE_ATS_MAX_REVIEW_TURNS must be an integer from 1 to 5.'
}
if ($backendEnv.RESUME_SANDBOX_DRIVER -ne 'agent-platform') {
  throw 'Kubernetes deployment requires RESUME_SANDBOX_DRIVER=agent-platform; DOKS nodes do not expose a Docker daemon to the backend pod.'
}
if ($backendEnv.STORAGE_DRIVER -ne 's3') {
  throw 'Kubernetes deployment requires STORAGE_DRIVER=s3 for the Supabase bucket; pod-local uploads are not persistent.'
}
if ($frontendEnv.NEXT_PUBLIC_API_URL.TrimEnd('/') -ne "https://$Domain") {
  throw "NEXT_PUBLIC_API_URL must be https://$Domain; frontend calls already add /api."
}
if ($backendEnv.FRONTEND_URL.TrimEnd('/') -ne "https://$Domain") {
  throw "FRONTEND_URL must be https://$Domain."
}
if (-not $ValidateOnly) {
  Assert-SafeProductionValues $frontendEnv 'Frontend production env'
  Assert-SafeProductionValues $backendEnv 'Backend production env'
}

$frontendRepository = "registry.digitalocean.com/$Registry/jobocate-frontend"
$backendRepository = "registry.digitalocean.com/$Registry/jobocate-backend"

if ($ValidateOnly) {
  Assert-Command 'kubectl'
  $frontendImage = "$frontendRepository@sha256:$('a' * 64)"
  $backendImage = "$backendRepository@sha256:$('b' * 64)"
  $manifest = Render-Manifest $frontendImage $backendImage
  Invoke-Checked { kubectl apply --dry-run=client -f $manifest } 'Rendered Kubernetes manifest failed client validation.'
  Write-Host "Deployment contract is valid: $manifest" -ForegroundColor Green
  exit 0
}

foreach ($tool in @('docker', 'doctl', 'kubectl', 'git')) { Assert-Command $tool }
if (-not $Tag) {
  $Tag = (& git -C $RepoRoot rev-parse --short=12 HEAD).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Could not derive the image tag from Git.' }
}
if ($Tag -eq 'latest' -or $Tag -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*$') {
  throw 'Tag must be an immutable, Docker-compatible value and cannot be latest.'
}

$frontendTagged = "${frontendRepository}:$Tag"
$backendTagged = "${backendRepository}:$Tag"

Write-Host 'Authenticating Docker with DigitalOcean Container Registry...' -ForegroundColor Cyan
if (-not $env:DOCKER_CONFIG) {
  $env:DOCKER_CONFIG = Join-Path $RepoRoot '.deploy-state/docker-config'
  New-Item -ItemType Directory -Path $env:DOCKER_CONFIG -Force | Out-Null
}
Invoke-Checked { doctl registry login --expiry-seconds 1800 } 'DigitalOcean registry login failed.'

$preparedFrontendEnv = Join-Path $RepoRoot 'frontend/.env.production'
$preparedBackendEnv = Join-Path $RepoRoot 'backend/.env.production'
& (Join-Path $PSScriptRoot 'prepare-production-env.ps1') -SourceFile $ProductionEnvFile -FrontendOutput $preparedFrontendEnv -BackendOutput $preparedBackendEnv
try {
  Write-Host "Building immutable frontend image $frontendTagged" -ForegroundColor Cyan
  Invoke-Checked { docker build --pull --file (Join-Path $RepoRoot 'frontend/Dockerfile') --tag $frontendTagged (Join-Path $RepoRoot 'frontend') } 'Frontend image build failed.'
  Write-Host "Building immutable backend image $backendTagged" -ForegroundColor Cyan
  Invoke-Checked { docker build --pull --file (Join-Path $RepoRoot 'backend/Dockerfile') --tag $backendTagged $RepoRoot } 'Backend image build failed.'
  $runtimeCheck = "const fs=require('fs');fs.accessSync('logs',fs.constants.W_OK);fs.accessSync('config/stripe-catalog.yaml',fs.constants.R_OK);const {AiBudgetPolicyService}=require('./dist/src/ai-budget/ai-budget-policy.service');new AiBudgetPolicyService();console.log('Backend runtime permissions and policies: OK');"
  Invoke-Checked { docker run --rm --entrypoint node $backendTagged -e $runtimeCheck } 'Backend runtime permission or policy validation failed.'
} finally {
  Remove-Item -LiteralPath $preparedFrontendEnv, $preparedBackendEnv -Force -ErrorAction SilentlyContinue
}

Invoke-Checked { docker push $frontendTagged } 'Frontend image push failed.'
Invoke-Checked { docker push $backendTagged } 'Backend image push failed.'
$frontendImage = Get-PinnedImage $frontendTagged $frontendRepository
$backendImage = Get-PinnedImage $backendTagged $backendRepository
$manifest = Render-Manifest $frontendImage $backendImage

Write-Host "Loading kubeconfig for $Cluster..." -ForegroundColor Cyan
Invoke-Checked { doctl kubernetes cluster kubeconfig save $Cluster --expiry-seconds 3600 } 'Could not load the DOKS kubeconfig.'
Invoke-Checked { kubectl get ingressclass nginx } 'The nginx ingress class is not installed.'
Invoke-Checked { kubectl get clusterissuer letsencrypt-prod } 'The letsencrypt-prod ClusterIssuer is not installed.'

$ingressIp = (& kubectl get service ingress-nginx-controller -n ingress-nginx -o 'jsonpath={.status.loadBalancer.ingress[0].ip}').Trim()
if ($LASTEXITCODE -ne 0 -or $ingressIp -notmatch '^\d{1,3}(?:\.\d{1,3}){3}$') {
  throw 'Could not resolve the nginx ingress public IP.'
}
$dnsRows = & doctl compute domain records list $DnsZone -o json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Could not read DNS records for $DnsZone." }
$dns = $dnsRows | Where-Object { $_.type -eq 'A' -and $_.name -eq $DnsRecord } | Select-Object -First 1
if (-not $dns) {
  Invoke-Checked { doctl compute domain records create $DnsZone --record-type A --record-name $DnsRecord --record-data $ingressIp --record-ttl 300 } "Could not create DNS for $Domain."
} elseif ($dns.data -ne $ingressIp) {
  Invoke-Checked { doctl compute domain records update $DnsZone --record-id $dns.id --record-type A --record-name $DnsRecord --record-data $ingressIp --record-ttl 300 } "Could not update DNS for $Domain."
}

$existingNamespace = & kubectl get namespace $Namespace --ignore-not-found -o name
if ($LASTEXITCODE -ne 0) { throw "Could not check namespace $Namespace." }
if (-not $existingNamespace) {
  Invoke-Checked { kubectl create namespace $Namespace } "Could not create namespace $Namespace."
}

$secretFile = [IO.Path]::GetTempFileName()
try {
  $secretYaml = & doctl registry kubernetes-manifest $Registry --namespace $Namespace --name "registry-$Registry"
  if ($LASTEXITCODE -ne 0) { throw 'Could not create the DOCR image-pull manifest.' }
  [IO.File]::WriteAllLines($secretFile, [string[]]$secretYaml, (New-Object Text.UTF8Encoding($false)))
  Invoke-Checked { kubectl apply -f $secretFile } 'Could not install the DOCR image-pull secret.'
} finally {
  Remove-Item -LiteralPath $secretFile -Force -ErrorAction SilentlyContinue
}

function Get-CurrentImage([string]$Deployment, [string]$Container) {
  $value = & kubectl get deployment $Deployment -n $Namespace --ignore-not-found -o "jsonpath={.spec.template.spec.containers[?(@.name=='$Container')].image}"
  if ($LASTEXITCODE -ne 0) { throw "Could not inspect deployment $Deployment." }
  if (-not $value) { return $null }
  return ([string]$value).Trim()
}

$previousFrontend = Get-CurrentImage 'jobocate-frontend' 'frontend'
$previousBackend = Get-CurrentImage 'jobocate-backend' 'backend'
$pinnedImagePattern = '^registry\.digitalocean\.com/[a-z0-9-]+/[a-z0-9-]+@sha256:[a-f0-9]{64}$'
$stateFile = $null
if ($previousFrontend -match $pinnedImagePattern -and $previousBackend -match $pinnedImagePattern) {
  New-Item -ItemType Directory -Path (Join-Path $RepoRoot '.deploy-state') -Force | Out-Null
  $stateFile = Join-Path $RepoRoot ('.deploy-state/rollback-{0}.json' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
  [ordered]@{
    cluster = $Cluster
    namespace = $Namespace
    frontendImage = $previousFrontend
    backendImage = $previousBackend
    deployedFrontendImage = $frontendImage
    deployedBackendImage = $backendImage
    capturedAt = (Get-Date).ToUniversalTime().ToString('o')
  } | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
} else {
  Write-Warning 'No complete digest-pinned Jobocate release exists yet; this first deployment has no previous release to restore.'
}

Invoke-Checked { kubectl apply -f $manifest } 'Kubernetes apply failed.'
Invoke-Checked { kubectl rollout status deployment/jobocate-backend -n $Namespace --timeout=10m } 'Backend rollout did not become ready.'
Invoke-Checked { kubectl rollout status deployment/jobocate-frontend -n $Namespace --timeout=10m } 'Frontend rollout did not become ready.'

foreach ($seed in @('seed.js', 'seed-harness-aliases.js', 'seed-resume-templates.js')) {
  Invoke-Checked { kubectl exec deployment/jobocate-backend -n $Namespace -- node "dist/src/scripts/$seed" } "Required catalogue seed failed: $seed"
}

& (Join-Path $PSScriptRoot 'smoke-production.ps1') -FrontendUrl "https://$Domain" -ApiUrl "https://$Domain"
if ($LASTEXITCODE -ne 0) { throw 'Production smoke checks failed.' }

Write-Host "Deployment completed with digest-pinned images." -ForegroundColor Green
if ($stateFile) { Write-Host "Rollback state: $stateFile" }
