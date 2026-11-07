<#
.SYNOPSIS
  Loads DATABASE_URL from the repository's ignored .env file and runs the
  normal backup script. Intended for Windows Task Scheduler.
#>
param(
  [string]$RepositoryRoot = (Join-Path $PSScriptRoot ".."),
  [int]$RetentionCount = 14
)

$ErrorActionPreference = "Stop"
$envFile = Join-Path $RepositoryRoot ".env"
if (-not (Test-Path $envFile)) { throw "Missing .env file: $envFile" }

# Prefer DATABASE_ADMIN_URL (HeatWave, 2026-09-13): the app's sugi_app user has
# only SELECT/INSERT/UPDATE/DELETE, which is not enough for a full mysqldump
# (--routines/--triggers). Fall back to DATABASE_URL where no admin URL exists.
$databaseUrl = $null
foreach ($key in "DATABASE_ADMIN_URL", "DATABASE_URL") {
  $line = Get-Content $envFile | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  if ($line) { $databaseUrl = $line.Substring("$key=".Length).Trim().Trim('"').Trim("'") }
  if ($databaseUrl) { break }
}
if (-not $databaseUrl) { throw "DATABASE_ADMIN_URL / DATABASE_URL is missing from $envFile" }

# DATABASE_CA_CERT_PATH (".\oci-ca.pem" гэх мэт, репогийн root-оос) — backup-ийг CA-аар баталгаажуулна.
$caLine = Get-Content $envFile | Where-Object { $_ -match "^DATABASE_CA_CERT_PATH=" } | Select-Object -First 1
$sslCa = ""
if ($caLine) {
  $caPath = $caLine.Substring("DATABASE_CA_CERT_PATH=".Length).Trim().Trim('"').Trim("'")
  $sslCa = if ([System.IO.Path]::IsPathRooted($caPath)) { $caPath } else { Join-Path $RepositoryRoot $caPath }
}
& (Join-Path $PSScriptRoot "db-backup.ps1") `
  -DatabaseUrl $databaseUrl `
  -SslCa $sslCa `
  -OutputDir (Join-Path $RepositoryRoot "backups") `
  -RetentionCount $RetentionCount
if ($LASTEXITCODE -ne 0) { throw "Daily database backup failed with exit code $LASTEXITCODE" }
