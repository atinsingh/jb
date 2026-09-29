[CmdletBinding()]
param(
  [string]$SourceFile,
  [string]$FrontendOutput,
  [string]$BackendOutput
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$RepoRoot = Split-Path $PSScriptRoot -Parent
if (-not $SourceFile) { $SourceFile = Join-Path $RepoRoot '.env.production' }
if (-not $FrontendOutput) { $FrontendOutput = Join-Path $RepoRoot 'frontend/.env.production' }
if (-not $BackendOutput) { $BackendOutput = Join-Path $RepoRoot 'backend/.env.production' }
if (-not (Test-Path -LiteralPath $SourceFile -PathType Leaf)) { throw "Missing production env file: $SourceFile" }

$public = [Collections.Generic.List[string]]::new()
$private = [Collections.Generic.List[string]]::new()
foreach ($line in Get-Content -LiteralPath $SourceFile) {
  if ($line -match '^\s*(?:#|$)') { continue }
  $match = [regex]::Match($line, '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$')
  if (-not $match.Success) { throw "Invalid env line: $line" }
  $normalized = "$($match.Groups[1].Value)=$($match.Groups[2].Value.Trim())"
  if ($match.Groups[1].Value -like 'NEXT_PUBLIC_*') { $public.Add($normalized) }
  else { $private.Add($normalized) }
}
if ($public.Count -eq 0) { throw 'No NEXT_PUBLIC_* values were found.' }
if ($private.Count -eq 0) { throw 'No backend-only values were found.' }

[IO.File]::WriteAllLines($FrontendOutput, $public, (New-Object Text.UTF8Encoding($false)))
[IO.File]::WriteAllLines($BackendOutput, $private, (New-Object Text.UTF8Encoding($false)))
Write-Host 'Prepared image-specific production env files.' -ForegroundColor Green
