[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$StateFile,
  [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not (Test-Path -LiteralPath $StateFile -PathType Leaf)) { throw "Rollback state not found: $StateFile" }
$state = Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json
foreach ($field in @('cluster', 'namespace', 'frontendImage', 'backendImage')) {
  if (-not $state.$field) { throw "Rollback state is missing $field." }
}
foreach ($image in @($state.frontendImage, $state.backendImage)) {
  if ($image -notmatch '^registry\.digitalocean\.com/[a-z0-9-]+/[a-z0-9-]+@sha256:[a-f0-9]{64}$') {
    throw "Rollback image is not digest-pinned: $image"
  }
}

if ($ValidateOnly) {
  Write-Host 'Rollback state is valid and restores two immutable image digests.' -ForegroundColor Green
  exit 0
}

foreach ($tool in @('doctl', 'kubectl')) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Required command '$tool' is unavailable." }
}

& doctl kubernetes cluster kubeconfig save $state.cluster --expiry-seconds 3600
if ($LASTEXITCODE -ne 0) { throw 'Could not load the DOKS kubeconfig.' }
& kubectl set image deployment/jobocate-frontend "frontend=$($state.frontendImage)" -n $state.namespace
if ($LASTEXITCODE -ne 0) { throw 'Could not restore the frontend image.' }
& kubectl set image deployment/jobocate-backend "backend=$($state.backendImage)" -n $state.namespace
if ($LASTEXITCODE -ne 0) { throw 'Could not restore the backend image.' }
& kubectl rollout status deployment/jobocate-backend -n $state.namespace --timeout=10m
if ($LASTEXITCODE -ne 0) { throw 'Backend rollback did not become ready.' }
& kubectl rollout status deployment/jobocate-frontend -n $state.namespace --timeout=10m
if ($LASTEXITCODE -ne 0) { throw 'Frontend rollback did not become ready.' }
Write-Host 'Rollback completed using the captured image digests.' -ForegroundColor Green
