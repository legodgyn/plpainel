#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-${CERTBOT_EMAIL:-}}"
APP_PORT="${APP_PORT:-3000}"
INCLUDE_WWW="${INCLUDE_WWW:-0}"
EXPECTED_IP="${CUSTOM_DOMAIN_A_RECORD_IP:-187.77.33.45}"
NGINX_AVAILABLE_DIR="${NGINX_AVAILABLE_DIR:-/etc/nginx/sites-available}"
NGINX_ENABLED_DIR="${NGINX_ENABLED_DIR:-/etc/nginx/sites-enabled}"

if [[ -z "$DOMAIN" ]]; then
  echo "Uso: sudo ./scripts/setup-custom-domain-ssl.sh dominio.com [email]"
  exit 1
fi

if [[ ! "$DOMAIN" =~ ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$ ]]; then
  echo "Dominio invalido: $DOMAIN"
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Rode com sudo para editar Nginx e emitir o certificado."
  exit 1
fi

resolve_domain_ips() {
  if command -v getent >/dev/null 2>&1; then
    getent ahostsv4 "$DOMAIN" | awk '{print $1}' | sort -u
    return
  fi

  if command -v dig >/dev/null 2>&1; then
    dig +short A "$DOMAIN" | sort -u
    return
  fi

  if command -v host >/dev/null 2>&1; then
    host -t A "$DOMAIN" | awk '/has address/ {print $4}' | sort -u
    return
  fi
}

if ! command -v apt-get >/dev/null 2>&1; then
  echo "apt-get nao encontrado. Instale certbot e python3-certbot-nginx manualmente antes de continuar."
  exit 1
fi

if ! command -v certbot >/dev/null 2>&1; then
  echo "Certbot nao encontrado. Instalando certbot e plugin do Nginx..."
  apt-get update
  apt-get install -y certbot python3-certbot-nginx
else
  echo "Certbot ja instalado."
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "Nginx nao encontrado. Instale o Nginx antes de continuar."
  exit 1
fi

echo "Verificando registro A de $DOMAIN..."
RESOLVED_IPS="$(resolve_domain_ips || true)"
if ! printf '%s\n' "$RESOLVED_IPS" | grep -qx "$EXPECTED_IP"; then
  echo "O registro A de $DOMAIN ainda nao aponta para $EXPECTED_IP."
  echo "Encontrado: ${RESOLVED_IPS:-nenhum registro A}"
  echo "Ajuste o DNS e aguarde a propagacao antes de rodar o Certbot."
  exit 1
fi

echo "Registro A confirmado em $EXPECTED_IP."

SERVER_NAMES="$DOMAIN"
if [[ "$INCLUDE_WWW" == "1" ]]; then
  SERVER_NAMES="$SERVER_NAMES www.$DOMAIN"
fi

SERVER_FILE="$NGINX_AVAILABLE_DIR/plpainel-custom-$DOMAIN"

cat > "$SERVER_FILE" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAMES;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

ln -sf "$SERVER_FILE" "$NGINX_ENABLED_DIR/plpainel-custom-$DOMAIN"
nginx -t
systemctl reload nginx

CERTBOT_ARGS=(
  --nginx
  -d "$DOMAIN"
  --agree-tos
  --non-interactive
  --redirect
)

if [[ "$INCLUDE_WWW" == "1" ]]; then
  CERTBOT_ARGS+=(-d "www.$DOMAIN")
fi

if [[ -n "$EMAIL" ]]; then
  CERTBOT_ARGS+=(--email "$EMAIL")
else
  CERTBOT_ARGS+=(--register-unsafely-without-email)
fi

certbot "${CERTBOT_ARGS[@]}"
nginx -t
systemctl reload nginx

echo "SSL configurado para https://$DOMAIN"
