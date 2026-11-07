<#
.SYNOPSIS
  Dumps the SUGI ASAYAKE MySQL database to a timestamped, zipped backup file.

.DESCRIPTION
  ROADMAP.md TIER 5: "automatic DB backup + documented restore plan".
  Reads connection details from $env:DATABASE_URL (same variable the app
  itself uses - see docs/PROJECT-GUIDE.md) so no credentials are hard-coded in this
  script. Writes <db>_<timestamp>.zip into the output directory (default:
  ./backups, already in .gitignore - never commit real data) and prunes old
  backups beyond -RetentionCount.

.PARAMETER DatabaseUrl
  mysql://user:password@host:port/dbname - defaults to $env:DATABASE_URL.

.PARAMETER MySqlDumpPath
  Full path to mysqldump.exe. Defaults to $env:MYSQLDUMP_PATH, falling back
  to the documented local MySQL 8 install path, then bare "mysqldump" (PATH).

.PARAMETER OutputDir
  Where backup .zip files are written. Defaults to <repo>/backups.

.PARAMETER RetentionCount
  How many most-recent backups to keep. Older ones are deleted after a
  successful new backup. Defaults to 14 (roughly two weeks of daily backups).

.EXAMPLE
  # Local dev DB, using the DATABASE_URL already in your shell/.env:
  pwsh scripts/db-backup.ps1

.EXAMPLE
  # Explicit connection, custom retention:
  pwsh scripts/db-backup.ps1 -DatabaseUrl "mysql://root:Zulaa123@127.0.0.1:3306/sugi_asayake" -RetentionCount 30
#>
param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$MySqlDumpPath = $env:MYSQLDUMP_PATH,
  [string]$OutputDir = (Join-Path $PSScriptRoot "..\backups"),
  [int]$RetentionCount = 14,
  # 2026-11-07: CA-гаар баталгаажуулна (VERIFY_CA). Өмнө нь зөвхөн --ssl-mode=REQUIRED байсан тул
  # HeatWave CA солигдоход апп унаж байхад backup "амжилттай" үргэлжилж, дохиог нууж байв.
  [string]$SslCa = $env:DATABASE_CA_CERT_PATH
)

$ErrorActionPreference = "Stop"

if (-not $DatabaseUrl) {
  throw "DATABASE_URL is not set. Pass -DatabaseUrl, or set `$env:DATABASE_URL first (see docs/PROJECT-GUIDE.md for the local dev value)."
}

$match = [regex]::Match($DatabaseUrl, '^mysql://(?<user>[^:@]+):(?<pass>[^@]*)@(?<host>[^:/]+)(:(?<port>\d+))?/(?<db>[^?]+)(\?.*)?$')
if (-not $match.Success) {
  throw "Could not parse DATABASE_URL. Expected format: mysql://user:password@host:port/dbname"
}
# Credentials in the URL are percent-encoded (the HeatWave passwords contain '#'
# and '@', which dotenv/URL parsing would otherwise misread) - decode them.
$dbUser = [uri]::UnescapeDataString($match.Groups["user"].Value)
$dbPass = [uri]::UnescapeDataString($match.Groups["pass"].Value)
$dbHost = $match.Groups["host"].Value
$dbPort = if ($match.Groups["port"].Success) { $match.Groups["port"].Value } else { "3306" }
$dbName = $match.Groups["db"].Value

if (-not $MySqlDumpPath) {
  $candidate = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
  $MySqlDumpPath = if (Test-Path $candidate) { $candidate } else { "mysqldump" }
}

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$sqlFile = Join-Path $OutputDir "$dbName`_$timestamp.sql"
$zipFile = Join-Path $OutputDir "$dbName`_$timestamp.zip"

Write-Host "Dumping '$dbName' from $dbHost`:$dbPort ..."

# MYSQL_PWD avoids the password showing up in `Get-Process`/task manager
# command-line output the way --password=... on the argv would.
$previousPwd = $env:MYSQL_PWD
$env:MYSQL_PWD = $dbPass
try {
  $dumpArgs = @("--host=$dbHost", "--port=$dbPort", "--user=$dbUser")
  if ($SslCa -and (Test-Path $SslCa)) { $dumpArgs += @("--ssl-mode=VERIFY_CA", "--ssl-ca=$SslCa") }
  elseif ($DatabaseUrl -match '(?i)([?&])ssl-mode=required(&|$)') { $dumpArgs += "--ssl-mode=REQUIRED" }
  # Same flags as migrate-to-oracle-mysql.ps1: HeatWave is GTID-enabled and its
  # admin user has neither SUPER (needed to apply GTID_PURGED on restore) nor
  # PROCESS (needed to read tablespace metadata). Harmless on other servers.
  $dumpArgs += @("--set-gtid-purged=OFF", "--no-tablespaces")
  $dumpArgs += @("--single-transaction", "--routines", "--triggers", "--result-file=$sqlFile")
  & $MySqlDumpPath @dumpArgs $dbName
  if ($LASTEXITCODE -ne 0) { throw "mysqldump exited with code $LASTEXITCODE (TLS/сертификатын алдаа бол HeatWave CA солигдсон байж магадгүй: .\scripts\oci\rotate-db-ca.ps1)" }
} catch {
  # A failed dump leaves a partial .sql behind; remove it before re-throwing.
  if (Test-Path $sqlFile) { Remove-Item $sqlFile -Force -ErrorAction SilentlyContinue }
  throw
} finally {
  if ($null -eq $previousPwd) { Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue } else { $env:MYSQL_PWD = $previousPwd }
}

try {
  if (-not (Test-Path $sqlFile) -or (Get-Item $sqlFile).Length -eq 0) {
    throw "Backup file is missing or empty - treating this as a failed backup."
  }
  Compress-Archive -Path $sqlFile -DestinationPath $zipFile -Force
} finally {
  # 2026-10-01: the raw .sql holds every customer row in clear text. It used to be
  # removed only on the success path, so a failed run (0-byte or partial dump, a
  # Compress-Archive error) left it in backups/ for good.
  if (Test-Path $sqlFile) { Remove-Item $sqlFile -Force -ErrorAction SilentlyContinue }
}

$sizeKb = [math]::Round((Get-Item $zipFile).Length / 1KB, 1)
Write-Host "Backup written: $zipFile ($sizeKb KB)"

# Retention: keep only the N most recent backups for this database.
$allBackups = Get-ChildItem -Path $OutputDir -Filter "$dbName`_*.zip" | Sort-Object LastWriteTime -Descending
if ($allBackups.Count -gt $RetentionCount) {
  $toDelete = $allBackups | Select-Object -Skip $RetentionCount
  foreach ($old in $toDelete) {
    Write-Host "Pruning old backup: $($old.Name)"
    Remove-Item $old.FullName
  }
}

$retained = if ($allBackups.Count -gt $RetentionCount) { $RetentionCount } else { $allBackups.Count }
Write-Host "Done. $retained backup(s) retained in $OutputDir."
