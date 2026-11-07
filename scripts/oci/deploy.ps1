<#
.SYNOPSIS
  Deploy the current checkout to the Oracle VM (2026-09-13).

.DESCRIPTION
  The VM cannot clone the private GitHub repo and has 1 GB of RAM, so the
  build happens HERE and only the result travels:
    1. pnpm build                       (dist/ = server bundle + client assets)
    2. tar dist + package.json + lockfile -> scp to the VM
    3. on the VM: unpack, `pnpm install --prod --frozen-lockfile` (only when
       the lockfile changed), `pm2 restart sugi`, health check.
  .env and oci-ca.pem on the VM are NOT touched -- edit them there by hand
  (ssh sugi-oci; ~/sugi-asayake/.env).

  Usage:  .\scripts\oci\deploy.ps1          (from the repo root, any laptop
          with ~/.ssh/config Host sugi-oci)
          .\scripts\oci\deploy.ps1 -Staging (2026-09-14: the second pm2 app
          "sugi-staging" in ~/sugi-asayake-staging on port 3001, its own
          .env pointing at the sugi_staging schema, reached at
          https://sugi-staging.karkaron.com once the DNS record exists)
          .\scripts\oci\deploy.ps1 -Instances 2   (load prep, 2026-09-16)

  -Instances > 1 starts the app in pm2's CLUSTER mode, where N processes
  share port 3000 and the kernel spreads connections across them. The app is
  cluster-safe as of 2026-09-16 (server/_core/clusterRole.ts: only instance 0
  runs the scheduler and the notification dispatcher), but the CURRENT VM is
  the wrong place for it: 2 vCPU and 954 MB of RAM total, with production
  (~126 MB) and staging (~91 MB) both already resident and ~312 MB free.
  Raise the instance count only after the VM has more memory -- until then
  the caching and the Cloudflare cache rules are where the headroom is.

  pm2 cannot switch an already-running app between fork and cluster mode with
  a restart, so changing -Instances deletes and re-creates the pm2 app (a few
  seconds of 502 on that app, which is why it is opt-in rather than default).
#>
# Эзэн солих (2026-10-05): хост/домэйн параметр — шинэ эзний VM ба домэйнд скриптийг засахгүйгээр.
#   -SshHost     ~/.ssh/config-ийн Host нэр (анхдагч sugi-oci, эсвэл $env:DEPLOY_SSH_HOST)
#   -PublicHost  health шалгах домэйн (анхдагч sugi.karkaron.com / sugi-staging…, эсвэл $env:DEPLOY_PUBLIC_HOST, staging-д $env:DEPLOY_STAGING_PUBLIC_HOST)
param([switch]$Staging, [int]$Instances = 1, [switch]$AllowDirty, [string]$SshHost = $(if ($env:DEPLOY_SSH_HOST) { $env:DEPLOY_SSH_HOST } else { "sugi-oci" }), [string]$PublicHost = "")
if ($Instances -lt 1) { throw "-Instances must be at least 1" }
$ErrorActionPreference = "Stop"
$app = if ($Staging) { "sugi-staging" } else { "sugi" }
$dir = if ($Staging) { "sugi-asayake-staging" } else { "sugi-asayake" }
$port = if ($Staging) { 3001 } else { 3000 }
$publicHost = if ($PublicHost) { $PublicHost } elseif ($Staging) { $(if ($env:DEPLOY_STAGING_PUBLIC_HOST) { $env:DEPLOY_STAGING_PUBLIC_HOST } else { "sugi-staging.karkaron.com" }) } elseif ($env:DEPLOY_PUBLIC_HOST) { $env:DEPLOY_PUBLIC_HOST } else { "sugi.karkaron.com" }
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

# 2026-09-23: хоёр лаптоп нэг production-д deploy хийдэг. Хоцорсон лаптоп
# deploy хийвэл production-ийг ЧИМЭЭГҮЙ хуучин код руу буцаадаг (DB-д шинэ
# migration аль хэдийн байхад 500), commit хийгээгүй засвар ч зөөгддөг байв.
Write-Host "==> git preflight" -ForegroundColor Cyan
git fetch -q origin
if ($LASTEXITCODE -ne 0) { throw "git fetch failed -- cannot tell whether this checkout is current" }
$behind = [int](git rev-list --count HEAD..origin/main)
$dirty = git status --porcelain --untracked-files=no
if (-not $AllowDirty) {
  if ($behind -gt 0) { throw "This checkout is $behind commit(s) behind origin/main -- pull first (deploying would roll production back). Override: -AllowDirty" }
  if ($dirty) { throw "Uncommitted changes would ship without being in git:`n$dirty`nCommit them first. Override: -AllowDirty" }
  # 2026-11-07: production 6bb42de-г main-д ороогүй branch-аас deploy хийсэн тул
  # дараагийн хүн main-ээс deploy хийвэл тэр ажил ЧИМЭЭГҮЙ буцах байв. Production
  # зөвхөн origin/main дээр байгаа commit-ийг авна; staging дурын branch-аас.
  if (-not $Staging) {
    git merge-base --is-ancestor HEAD origin/main
    if ($LASTEXITCODE -ne 0) { throw "HEAD is not on origin/main -- merge the branch into main first, then deploy production from main (staging: -Staging). Override: -AllowDirty" }
  }
}
$sha = (git rev-parse --short HEAD).Trim()
Write-Host "deploying $sha"

Write-Host "==> build" -ForegroundColor Cyan
pnpm build | Out-Null
if ($LASTEXITCODE -ne 0) { throw "build failed" }

Write-Host "==> upload" -ForegroundColor Cyan
$bundle = "deploy-$(Get-Date -Format yyyyMMdd-HHmmss).tgz"
tar czf $bundle dist package.json pnpm-lock.yaml pnpm-workspace.yaml
# ClearAllForwardings: the Host block carries the 3307 tunnel forward, which
# the always-on tunnel task already holds -- without this, ssh aborts with
# "Address already in use" before running anything (ExitOnForwardFailure).
scp -q -o ClearAllForwardings=yes $bundle "${SshHost}:~/$bundle"
Remove-Item $bundle

Write-Host "==> install + restart on the VM" -ForegroundColor Cyan
$remote = @'
set -eo pipefail
cd ~/__DIR__
old=$(md5sum pnpm-lock.yaml | cut -c1-32)
rm -rf dist.new && mkdir dist.new && tar xzf ~/__BUNDLE__ -C dist.new && rm ~/__BUNDLE__
new=$(md5sum dist.new/pnpm-lock.yaml | cut -c1-32)
# 2026-09-23: dist-ийг install АМЖИЛТТАЙ болсны ДАРАА л солино. Өмнө нь dist
# эхэлж солигддог тул install унахад хуучин сервер (index.html-ийг хүсэлт
# бүрт дахин уншдаг) ШИНЭ клиентийг ХУУЧИН API-тай өгч, pm2-ийн дараагийн
# автомат restart шинэ серверийг хуучин node_modules дээр асаадаг байв.
# </dev/null (2026-09-21): this script arrives on bash's STDIN (`bash -s`). pnpm
# read that stdin and swallowed the rest of the script, so bash hit EOF and exited 0
# right after the install -- EVERY lockfile-changing deploy silently skipped
# `pm2 restart` and left the previous build running. Never let a command here read stdin.
if [ "$old" != "$new" ]; then
  echo "lockfile changed -> pnpm install --prod"
  for f in package.json pnpm-lock.yaml pnpm-workspace.yaml; do cp -f "$f" "$f.prev"; done
  cp -f dist.new/package.json dist.new/pnpm-lock.yaml dist.new/pnpm-workspace.yaml .
  if ! pnpm install --prod --frozen-lockfile </dev/null 2>&1 | tail -2; then
    for f in package.json pnpm-lock.yaml pnpm-workspace.yaml; do mv -f "$f.prev" "$f"; done
    rm -rf dist.new
    echo "DEPLOY-INSTALL-FAILED: dependencies not installed; the previous build keeps running unchanged"
    exit 4
  fi
  rm -f package.json.prev pnpm-lock.yaml.prev pnpm-workspace.yaml.prev
else
  cp -f dist.new/package.json dist.new/pnpm-lock.yaml dist.new/pnpm-workspace.yaml .
fi
rm -rf dist.old && { [ ! -d dist ] || mv dist dist.old; } && mv dist.new/dist dist && rm -rf dist.new
# `pm2 restart` only knows an app that has been started once; staging is
# started here on first deploy (production was started by hand on 2026-09-13).
# The running app's mode has to match the requested instance count; pm2 can
# only change that by re-creating the app (see the header).
want=__INSTANCES__
mode=$(pm2 jlist 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const a=JSON.parse(d||'[]').find(x=>x.name==='__APP__');console.log(a?a.pm2_env.exec_mode+':'+(a.pm2_env.instances||1):'')})" 2>/dev/null)
have_mode=${mode%%:*}; have_count=${mode##*:}
if [ -n "$mode" ] && { { [ "$want" -gt 1 ] && [ "$have_mode" != "cluster_mode" ]; } || { [ "$want" = "1" ] && [ "$have_mode" = "cluster_mode" ]; } || [ "$want" != "$have_count" ]; }; then
  echo "pm2 mode $have_mode/$have_count -> cluster x$want; re-creating"; pm2 delete __APP__ >/dev/null; mode=""
fi
# `-i 1` is NOT the same as no flag: it puts pm2 in cluster mode with one
# worker. The default path has to stay fork mode, exactly as production runs
# today.
if [ "$want" -gt 1 ]; then inst="-i $want"; else inst=""; fi
if [ -n "$mode" ]; then pm2 restart __APP__ --update-env >/dev/null; else PORT=__PORT__ pm2 start dist/index.js --name __APP__ $inst --max-memory-restart 700M >/dev/null && pm2 save >/dev/null; fi
# 2026-09-21: the restart is VERIFIED here. Before, a local health probe that
# ran while the app was still booting (curl exit 7) aborted this script under
# `set -e`, and the public check below then passed against the OLD process --
# a "successful" deploy that left the previous build running (it happened on
# 2026-09-21: /shopp kept answering 200 until a second deploy).
sleep 8
curl -s --max-time 20 http://localhost:__PORT__/health || echo "(local /health not ready yet -- the public check below retries)"
echo
up=$(pm2 jlist 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const a=JSON.parse(d||'[]').find(x=>x.name==='__APP__');console.log(a&&a.pm2_env.status==='online'?Math.round((Date.now()-a.pm2_env.pm_uptime)/1000):-1)})")
if [ "$up" -lt 0 ] || [ "$up" -gt 120 ]; then echo "DEPLOY-RESTART-FAILED: __APP__ uptime=${up}s -- the previous build is still running"; exit 3; fi
echo "DEPLOY-RESTART-OK: __APP__ restarted ${up}s ago (__SHA__)"
rm -rf dist.old
pm2 status __APP__ | grep __APP__ | cut -c1-100
'@
$remote = $remote.Replace("__BUNDLE__", $bundle).Replace("__DIR__", $dir).Replace("__APP__", $app).Replace("__PORT__", "$port").Replace("__INSTANCES__", "$Instances").Replace("__SHA__", $sha).Replace("`r`n", "`n")  # CRLF checkout -> LF for the remote bash
# Sent over stdin, not as an argument: passed as an argument the script is
# re-split by the remote shell and its quotes are lost ("[: missing ]").
# tr strips the CR that PowerShell appends to every line when it pipes a
# string into a native process (that was the "cut: invalid ... '\r'" noise).
$remoteOutput = $remote | ssh -o ClearAllForwardings=yes $SshHost "tr -d '\r' | bash -s" 2>&1
$remoteExit = $LASTEXITCODE
$remoteOutput | ForEach-Object { Write-Host "   [vm] $_" }
# The remote script prints DEPLOY-RESTART-OK only after verifying pm2 really
# restarted the app; anything else means the old build may still be serving.
if ($remoteExit -ne 0 -or -not ($remoteOutput -match "DEPLOY-RESTART-OK")) {
  throw "Remote install/restart failed (exit $remoteExit) -- the site may still be running the PREVIOUS build. Output above; check: ssh $SshHost 'pm2 logs $app --lines 40'"
}

Write-Host "==> public check" -ForegroundColor Cyan
# pm2 has restarted the app by now, but it needs ~10 s to boot (TensorFlow,
# the DB handshake) and Cloudflare answers 502 until then -- which is exactly
# where the first two deploys "failed" after a successful restart. Retry.
$code = 0
foreach ($attempt in 1..18) {
  try { $code = (Invoke-WebRequest -Uri "https://$publicHost/health" -UseBasicParsing -TimeoutSec 15).StatusCode } catch { $code = 0 }
  if ($code -eq 200) { break }
  Start-Sleep -Seconds 5
}
Write-Host "https://$publicHost/health -> $code (after $attempt attempt(s))"
if ($code -ne 200 -and $Staging) { Write-Host "(staging is not reachable publicly yet -- add the DNS CNAME sugi-staging -> bbd3128e-486e-481d-8c21-f9d3d240a56c.cfargotunnel.com in Cloudflare; the VM-local health above is what counts)" -ForegroundColor Yellow }
elseif ($code -ne 200) { throw "The site did not come back within 90 s -- check: ssh $SshHost 'pm2 logs $app --lines 40'" }
