#!/usr/bin/env bash
# HeatWave-ийн CA солигдсон эсэхийг шалгаж, `--apply` үед VM-ийн prod + staging-ийн
# oci-ca.pem-ийг шинэчилнэ (2026-11-07). HeatWave CA-гаа засвар үйлчилгээгээр анхааруулгагүй
# сольдог — 09-28, ~11-01-нд хоёр удаа production DB "certificate signature failure"-ээр унасан.
# 11-07-нд Tom-ийн VM дээр гараар хийсэн алхмуудыг яг давтана:
#   1. DB-ээс гинжийг татна (`openssl s_client -starttls mysql -showcerts`, VCN-ийн хувийн сүлжээгээр)
#   2. гинжийн сертификат тус бүрээр серверийг шалгаж `Verify return code: 0` өгсөнийг шинэ CA гэж авна
#   3. одоогийн oci-ca.pem-ээр шалгана — 0 бол солигдоогүй, юу ч хийхгүй
#   4. `--apply`: хуучныг .bak-<огноо>, шинийг тавьж, pm2 restart, /health "up" болтол хүлээнэ
#
# Лаптопоос: .\scripts\oci\rotate-db-ca.ps1 [-Apply]   (энэ файлыг `ssh sugi-oci bash -s`-ээр ажиллуулна)
# VM дээр:   bash rotate-db-ca.sh [--apply] [--host 10.0.1.227:3306] [--dirs "DIR DIR"] [--no-restart]
# Гарах код: 0 = CA хүчинтэй (эсвэл солиод сэргэсэн), 1 = солих шаардлагатай (--apply-гүй), 2 = алдаа.
set -euo pipefail

HOST="10.0.1.227:3306"
DIRS="$HOME/sugi-asayake $HOME/sugi-asayake-staging"
APPLY=0
RESTART=1
while [ $# -gt 0 ]; do
  case "$1" in
    --apply) APPLY=1 ;;
    --host) HOST="$2"; shift ;;
    --dirs) DIRS="$2"; shift ;;
    --no-restart) RESTART=0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

verify_code() { # $1 = CA файл → серверийн гинжийг тэр CA-аар шалгасан OpenSSL-ийн код
  echo | openssl s_client -connect "$HOST" -starttls mysql -CAfile "$1" 2>/dev/null \
    | sed -n 's/.*Verify return code: \([0-9]*\).*/\1/p' | head -1
}
describe() { # $1 = сертификат → "CN=… | хүчинтэй … хүртэл | sha256 …"
  printf '%s | until %s | %s\n' \
    "$(openssl x509 -in "$1" -noout -subject | sed 's/^subject= *//')" \
    "$(openssl x509 -in "$1" -noout -enddate | sed 's/^notAfter=//')" \
    "$(openssl x509 -in "$1" -noout -fingerprint -sha256 | sed 's/^.*=//')"
}

# Холбогдож чадахгүй үед openssl алдаатай гарна — pipefail-ээр энд зогсохгүй, доорх шалгалт ойлгомжтой мессеж өгнө.
{ openssl s_client -connect "$HOST" -starttls mysql -showcerts </dev/null 2>/dev/null || true; } \
  | awk -v dir="$work" '/BEGIN CERT/{c++} c{print > (dir "/cert" c ".pem")}'
if ! ls "$work"/cert*.pem >/dev/null 2>&1; then
  echo "ERROR: $HOST-оос сертификатын гинж ирсэнгүй (DB асаалттай юу? VM-ээс ажиллуулж байна уу?)" >&2
  exit 2
fi

new_ca=""
for f in "$work"/cert*.pem; do
  if [ "$(verify_code "$f")" = "0" ]; then new_ca="$f"; break; fi
done
if [ -z "$new_ca" ]; then
  echo "ERROR: гинжийн аль ч сертификат серверийг баталгаажуулсангүй — гараар шалгана уу (HISTORY 2026-11-07)." >&2
  exit 2
fi
echo "server CA: $(describe "$new_ca")"

stale=""
for d in $DIRS; do
  [ -d "$d" ] || continue
  if [ -f "$d/oci-ca.pem" ] && [ "$(verify_code "$d/oci-ca.pem")" = "0" ]; then
    echo "OK     $d/oci-ca.pem"
  else
    echo "STALE  $d/oci-ca.pem"
    stale="$stale $d"
  fi
done

if [ -z "$stale" ]; then
  echo "CA солигдоогүй — юу ч хийх шаардлагагүй."
  exit 0
fi
if [ "$APPLY" -ne 1 ]; then
  echo "CA солигдсон байна. Солихын тулд --apply (лаптопоос: .\\scripts\\oci\\rotate-db-ca.ps1 -Apply)."
  exit 1
fi

stamp=$(date +%Y%m%d-%H%M)
for d in $stale; do
  [ -f "$d/oci-ca.pem" ] && cp "$d/oci-ca.pem" "$d/oci-ca.pem.bak-$stamp"
  cp "$new_ca" "$d/oci-ca.pem"
  echo "replaced $d/oci-ca.pem (хуучин нь oci-ca.pem.bak-$stamp)"
done

if [ "$RESTART" -ne 1 ]; then exit 0; fi
apps=""
for app in sugi sugi-staging; do pm2 describe "$app" >/dev/null 2>&1 && apps="$apps $app"; done
# shellcheck disable=SC2086 # apps нь зориуд үгээр задарна
[ -n "$apps" ] && pm2 restart $apps >/dev/null
for app in $apps; do
  port=3000; [ "$app" = "sugi-staging" ] && port=3001
  for _ in $(seq 1 30); do
    body=$(curl -s --max-time 5 "http://127.0.0.1:$port/health" || true)
    case "$body" in *'"database":"up"'*) echo "port $port: $body"; continue 2 ;; esac
    sleep 3
  done
  echo "WARNING: port $port 90 секундэд 'up' болсонгүй: ${body:-хариугүй}" >&2
  exit 2
done
