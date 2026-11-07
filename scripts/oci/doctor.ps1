<#
.SYNOPSIS
  Энэ лаптоп deploy / импорт / pnpm dev хийхэд бэлэн эсэхийг нэг командаар шалгана
  (2026-11-07). Юу ч өөрчлөхгүй; мөр бүр [OK] / [!!] ба засах командтай.

.DESCRIPTION
  11-07-нд нэг ажлыг эхлүүлэхэд долоон алхам дараалан бүтэлгүйтсэн: буруу фолдер
  (C:\Windows\System32), 8-р сарын хуучин хуулбар (C:\sugi-asayake), .env-гүй, тунел
  унтарсан, хуучирсан oci-ca.pem, хоёр тунел зэрэг, гацсан backup. Шалгалт бүр тэдгээрийн
  нэгийг барина. Нууц утга хэвлэхгүй — .env-ээс зөвхөн түлхүүрийн НЭР шалгана.

  Хэрэглээ:  .\scripts\oci\doctor.ps1        (репогийн root-оос; өөр газраас ажиллуулбал хэлнэ)
#>
param([string]$SshHost = $(if ($env:DEPLOY_SSH_HOST) { $env:DEPLOY_SSH_HOST } else { "sugi-oci" }))
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$failures = 0
function Report([bool]$ok, [string]$what, [string]$fix = "") {
  if ($ok) { Write-Host "[OK] $what" -ForegroundColor Green }
  else {
    Write-Host "[!!] $what" -ForegroundColor Red
    if ($fix) { Write-Host "     -> $fix" -ForegroundColor Yellow }
    $script:failures++
  }
}

# 1. Фолдер ба git
$here = (Get-Location).Path
Report ($here -eq $root) "PowerShell репогийн root дээр байна ($root)" "cd `"$root`""
Report (Test-Path (Join-Path $root ".git")) "Энэ бол git хуулбар" "git clone https://github.com/tmorius-eng/sugi-asayake.git"
Push-Location $root
try {
  git fetch -q origin 2>$null
  $branch = (git rev-parse --abbrev-ref HEAD 2>$null)
  $behind = [int](git rev-list --count "HEAD..origin/main" 2>$null)
  Report ($behind -eq 0) "Branch '$branch' нь origin/main-ээс хоцроогүй ($behind commit)" "git pull (эсвэл: git checkout main; git pull)"
  $dirty = git status --porcelain --untracked-files=no
  Report (-not $dirty) "Commit хийгээгүй өөрчлөлт алга" "git status — commit эсвэл stash"

  # 2. .env — зөвхөн түлхүүрийн нэр
  $envFile = Join-Path $root ".env"
  $hasEnv = Test-Path $envFile
  Report $hasEnv ".env байна" "Ажлын хуулбарын .env-ийг хуулна (docs/OPERATIONS.md §7) — chat-д бүү хуул"
  $keys = if ($hasEnv) { Get-Content $envFile | Where-Object { $_ -match '^[A-Z0-9_]+=' } | ForEach-Object { $_.Split('=')[0] } } else { @() }
  foreach ($key in "DATABASE_URL", "DATABASE_CA_CERT_PATH", "JWT_SECRET", "S3_BUCKET", "S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY") {
    Report ($keys -contains $key) ".env-д $key байна" "Ажлын хуулбарын .env-ээс $key мөрийг нэм"
  }
  $caLine = if ($hasEnv) { Get-Content $envFile | Where-Object { $_ -match '^DATABASE_CA_CERT_PATH=' } | Select-Object -First 1 } else { $null }
  $caPath = if ($caLine) { $caLine.Substring("DATABASE_CA_CERT_PATH=".Length).Trim().Trim('"').Trim("'") } else { "oci-ca.pem" }
  if (-not [System.IO.Path]::IsPathRooted($caPath)) { $caPath = Join-Path $root $caPath }
  Report (Test-Path $caPath) "CA файл байна ($caPath)" "scp ${SshHost}:sugi-asayake/oci-ca.pem oci-ca.pem"

  # 3. ssh ба тунел
  $sshOk = $false
  $out = ssh -o ClearAllForwardings=yes -o BatchMode=yes -o ConnectTimeout=10 $SshHost "echo ok" 2>$null
  $sshOk = ($LASTEXITCODE -eq 0 -and "$out" -match "ok")
  Report $sshOk "ssh $SshHost ажиллаж байна" ".\scripts\oci\setup-laptop.ps1 (түлхүүрийг VM-д нэмэх — OPERATIONS §8)"
  $tunnel = (Test-NetConnection 127.0.0.1 -Port 3307 -WarningAction SilentlyContinue).TcpTestSucceeded
  Report $tunnel "DB тунел 127.0.0.1:3307 нээлттэй" "Start-ScheduledTask -TaskName 'SUGI OCI Tunnel'  (НЭГ л тунел — tunnel.ps1-ийг давхар бүү ажиллуул)"

  # 4. CA нь VM-ийнхтэй ижил (HeatWave CA солигдох — 09-28, ~11-01)
  if ($sshOk -and (Test-Path $caPath)) {
    $remoteHash = (ssh -o ClearAllForwardings=yes -o BatchMode=yes $SshHost "sha256sum sugi-asayake/oci-ca.pem" 2>$null) -split '\s+' | Select-Object -First 1
    $localHash = (Get-FileHash $caPath -Algorithm SHA256).Hash.ToLower()
    Report ($remoteHash -and $remoteHash -eq $localHash) "Лаптопын CA = VM-ийн CA" "scp ${SshHost}:sugi-asayake/oci-ca.pem `"$caPath`"  (VM-ийнх ч хуучирсан бол .\scripts\oci\rotate-db-ca.ps1)"
  }

  # 5. Production
  try {
    $health = Invoke-RestMethod -Uri "https://sugi.karkaron.com/health" -TimeoutSec 20
    Report ($health.database -eq "up") "Production /health: database $($health.database)" ".\scripts\oci\rotate-db-ca.ps1  (reason: $($health.reason))"
  } catch {
    $body = $_.ErrorDetails.Message
    Report $false "Production /health хариу: $body" "reason=tls_ca бол .\scripts\oci\rotate-db-ca.ps1 -Apply; бусад: OPERATIONS §5"
  }
} finally { Pop-Location }

Write-Host ""
if ($failures -eq 0) { Write-Host "Бүгд бэлэн." -ForegroundColor Green } else { Write-Host "$failures асуудал — дээрх '->' командуудыг дарааллаар нь." -ForegroundColor Yellow }
exit $failures
