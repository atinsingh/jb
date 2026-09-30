[CmdletBinding()]
param(
  [string]$Tag = (Get-Date -Format 'prod-yyyyMMdd-HHmmss'),
  [string]$Cluster = 'perfectum-k8s',
  [string]$Namespace = 'jobocate-prod',
  [string]$Registry = 'perfectum',
  [string]$Domain = 'jobocate.pragra.io'
)
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $RepoRoot
try {
  doctl kubernetes cluster kubeconfig save $Cluster --expiry-seconds 3600
  if ($LASTEXITCODE -ne 0) { throw 'Could not load deployment cluster.' }
  $existing = kubectl get namespace $Namespace --ignore-not-found -o name
  if (-not $existing) {
    kubectl create namespace $Namespace
    if ($LASTEXITCODE -ne 0) { throw 'Could not create application namespace.' }
  }
  doctl registry kubernetes-manifest $Registry --namespace $Namespace --name "registry-$Registry" | kubectl apply -f -
  if ($LASTEXITCODE -ne 0) { throw 'Could not install registry credentials.' }
  node scripts/deploy-ai-production.cjs --tag $Tag --namespace $Namespace --registry $Registry --domain $Domain
  if ($LASTEXITCODE -ne 0) { throw 'AI deployment failed; application deployment was not started.' }
  & (Join-Path $PSScriptRoot 'deploy-production.ps1') -Tag $Tag -Cluster $Cluster -Namespace $Namespace -Registry $Registry -Domain $Domain
  if ($LASTEXITCODE -ne 0) { throw 'Application deployment failed.' }
  Write-Host "Complete production stack deployed at https://$Domain" -ForegroundColor Green
} finally { Pop-Location }
