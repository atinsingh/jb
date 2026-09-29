[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$FrontendUrl,
  [Parameter(Mandatory = $true)][string]$ApiUrl
)

$ErrorActionPreference = 'Stop'
$FrontendUrl = $FrontendUrl.TrimEnd('/')
$ApiUrl = $ApiUrl.TrimEnd('/')

function Get-Ok([string]$Url, [hashtable]$Headers = @{}) {
  $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Headers $Headers -MaximumRedirection 5 -TimeoutSec 30
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) {
    throw "Smoke request failed ($($response.StatusCode)): $Url"
  }
  return $response
}

foreach ($path in @('/app/resume', '/app/resume-library', '/app/preferences', '/app/settings', '/app/billing')) {
  Get-Ok "$FrontendUrl$path" | Out-Null
  Write-Host "OK $path"
}

$health = (Get-Ok "$ApiUrl/health").Content | ConvertFrom-Json
if ($health.status -ne 'ok') { throw 'Backend health response was not ok.' }
$readiness = (Get-Ok "$ApiUrl/health/readiness").Content | ConvertFrom-Json
if (-not $readiness.ready) { throw "Backend readiness failed: $($readiness.missing -join ', ')" }

$token = [Environment]::GetEnvironmentVariable('JOBOCATE_SMOKE_ACCESS_TOKEN')
if ($token) {
  $headers = @{ Authorization = "Bearer $token" }
  $options = (Get-Ok "$ApiUrl/api/resume-harness/options" $headers).Content | ConvertFrom-Json
  if (-not $options.sandboxAvailable) { throw 'Authenticated smoke: resume sandbox is unavailable.' }
  if (@($options.models).Count -eq 0) { throw 'Authenticated smoke: no owner-permitted model routes were returned.' }
  $budget = (Get-Ok "$ApiUrl/api/resume-harness/budget" $headers).Content | ConvertFrom-Json
  if ($null -eq $budget.remaining) { throw 'Authenticated smoke: owner credit status was not returned.' }
  Write-Host 'OK owner-scoped model routing and credits'
} else {
  Write-Warning 'JOBOCATE_SMOKE_ACCESS_TOKEN is unset; authenticated model-routing and credit smoke checks were skipped.'
}

Write-Host 'Production smoke checks passed.' -ForegroundColor Green
