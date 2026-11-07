<#
.SYNOPSIS
  HeatWave-ийн CA солигдсон эсэхийг VM дээр шалгаж, -Apply үед VM-ийн prod + staging-ийн
  oci-ca.pem-ийг шинэчилж pm2 restart хийнэ; дараа нь энэ лаптопын oci-ca.pem-ийг татна.
  (2026-11-07 — production DB хоёр удаа CA солигдсоноос унасны дараа.)

.DESCRIPTION
  Ажлыг scripts/oci/rotate-db-ca.sh хийдэг; энэ нь түүнийг deploy.ps1-тэй ижил аргаар
  (stdin, `tr -d '\r' | bash -s`) VM рүү илгээнэ. Гарах код: 0 = CA хүчинтэй/шинэчлэгдсэн,
  1 = солих шаардлагатай (-Apply-гүй), 2 = алдаа.

  Хэрэглээ (репогийн root-оос):
    .\scripts\oci\rotate-db-ca.ps1          # шалгана, юу ч өөрчлөхгүй
    .\scripts\oci\rotate-db-ca.ps1 -Apply   # солино + restart + лаптопын CA-г татна
#>
param([switch]$Apply, [string]$SshHost = $(if ($env:DEPLOY_SSH_HOST) { $env:DEPLOY_SSH_HOST } else { "sugi-oci" }))
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$script = (Get-Content (Join-Path $PSScriptRoot "rotate-db-ca.sh") -Raw).Replace("`r`n", "`n")
$remoteArgs = if ($Apply) { "--apply" } else { "" }

$script | ssh -o ClearAllForwardings=yes $SshHost "tr -d '\r' | bash -s -- $remoteArgs"
$code = $LASTEXITCODE
if ($code -ne 0) { exit $code }

if ($Apply) {
  # Лаптопын CA-г VM-ийнхтэй ижил болгоно (scripts, pnpm dev, backup энэ файлыг ашигладаг).
  $local = Join-Path $root "oci-ca.pem"
  if (Test-Path $local) { Copy-Item $local "$local.bak-$(Get-Date -Format yyyyMMdd-HHmm)" }
  scp -o ClearAllForwardings=yes "${SshHost}:sugi-asayake/oci-ca.pem" $local
  if ($LASTEXITCODE -ne 0) { throw "scp failed -- copy oci-ca.pem from the VM by hand" }
  Write-Host "local oci-ca.pem updated: $local"
}
