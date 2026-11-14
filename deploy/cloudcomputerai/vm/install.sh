#!/usr/bin/env bash
# Idempotent installer for one Zero instance's data plane on gex44-apps.
#   sudo ./install.sh <slug> <pg_port> <redis_http_port>
# Creates /opt/ccai-email/<slug>/ with a generated .env (never overwritten; POSTGRES_PASSWORD and
# REDIS_TOKEN are taken from the environment when the caller provides them, e.g. the
# CloudComputerAI control plane, which also needs them for Hyperdrive and the Worker),
# starts Postgres/Valkey/REST proxy, installs a nightly pg_dump with 14-day retention.
set -euo pipefail

slug=${1:?slug}; pg_port=${2:?pg_port}; redis_port=${3:?redis_http_port}
[[ $slug =~ ^[a-z0-9][a-z0-9-]{0,30}$ ]] || { echo "bad slug" >&2; exit 1; }
here=$(cd "$(dirname "$0")" && pwd)
base=/opt/ccai-email
dir=$base/$slug

install -d -m 750 "$dir" "$base/backups/$slug" "$base/tunnel"
install -m 644 "$here/instance-compose.yml" "$dir/compose.yml"
install -m 644 "$here/tunnel-compose.yml" "$base/tunnel/compose.yml"

if [[ ! -f $dir/.env ]]; then
  umask 077
  cat > "$dir/.env" <<EOF
CUSTOMER_SLUG=$slug
PG_PORT=$pg_port
REDIS_HTTP_PORT=$redis_port
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-$(openssl rand -hex 24)}
REDIS_TOKEN=${REDIS_TOKEN:-$(openssl rand -hex 32)}
EOF
  echo "generated $dir/.env"
else
  echo "keeping existing $dir/.env"
fi
chmod 600 "$dir/.env"

# Self-signed TLS for Postgres (Hyperdrive requires TLS; it does not verify the CA by default).
if [[ ! -f $dir/tls/server.key ]]; then
  install -d -m 755 "$dir/tls"
  openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj "/CN=ccai-email-$slug-db" \
    -keyout "$dir/tls/server.key" -out "$dir/tls/server.crt" 2>/dev/null
  chown 70:70 "$dir/tls/server.key" "$dir/tls/server.crt" # postgres uid in the alpine image
  chmod 600 "$dir/tls/server.key"
fi

docker network inspect ccai-email-tunnel >/dev/null 2>&1 || docker network create ccai-email-tunnel >/dev/null
docker compose -f "$dir/compose.yml" --env-file "$dir/.env" -p "ccai-email-$slug" up -d --wait

# Tunnel connector starts once its token has been placed in $base/tunnel/.env.
if [[ -f $base/tunnel/.env ]]; then
  docker compose -f "$base/tunnel/compose.yml" --env-file "$base/tunnel/.env" -p ccai-email-tunnel up -d
fi

cat > "/etc/cron.d/ccai-email-$slug-backup" <<EOF
# Nightly logical backup of Zero instance $slug, 14-day retention.
17 3 * * * root docker exec ccai-email-$slug-db-1 pg_dump -U zero -Fc zero > $base/backups/$slug/zero-\$(date +\%F).dump && find $base/backups/$slug -name '*.dump' -mtime +14 -delete
EOF
chmod 644 "/etc/cron.d/ccai-email-$slug-backup"

docker compose -p "ccai-email-$slug" ps
