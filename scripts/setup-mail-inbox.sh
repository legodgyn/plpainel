#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/plpainel}"
APP_URL="${PANEL_APP_URL:-https://plpainel.com}"
MAIL_HOST="${PANEL_MAIL_MX_HOST:-mail.plpainel.com}"
SECRET="${INBOUND_EMAIL_SECRET:-}"
SCRIPT_TARGET="/usr/local/bin/plpainel-postfix-inbound.mjs"
WRAPPER_TARGET="/usr/local/bin/plpainel-postfix-pipe.sh"
ENV_FILE="/etc/plpainel-mail.env"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Rode com sudo para instalar e configurar o Postfix."
  exit 1
fi

if [[ -z "$SECRET" ]]; then
  echo "Defina INBOUND_EMAIL_SECRET antes de rodar."
  echo "Exemplo: sudo INBOUND_EMAIL_SECRET='segredo-forte' bash scripts/setup-mail-inbox.sh"
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "apt-get nao encontrado. Configure Postfix manualmente."
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y postfix nodejs

install -m 0755 "$APP_DIR/scripts/postfix-inbound-email.mjs" "$SCRIPT_TARGET"

cat > "$ENV_FILE" <<ENV
PANEL_APP_URL=$APP_URL
PANEL_MAIL_MX_HOST=$MAIL_HOST
INBOUND_EMAIL_SECRET=$SECRET
ENV
chmod 0600 "$ENV_FILE"

cat > "$WRAPPER_TARGET" <<'WRAPPER'
#!/usr/bin/env bash
set -euo pipefail

set -a
. /etc/plpainel-mail.env
set +a

exec /usr/bin/node /usr/local/bin/plpainel-postfix-inbound.mjs "$@"
WRAPPER
chmod 0755 "$WRAPPER_TARGET"

postconf -e "myhostname = $MAIL_HOST"
postconf -e "mydestination = localhost"
postconf -e "virtual_mailbox_domains = regexp:/etc/postfix/plpainel-virtual-domains"
postconf -e "virtual_transport = plpainel-inbound:"

cat > /etc/postfix/plpainel-virtual-domains <<'REGEXP'
/^.+$/ OK
REGEXP

if ! grep -q "^plpainel-inbound" /etc/postfix/master.cf; then
  cat >> /etc/postfix/master.cf <<'MASTER'
plpainel-inbound unix - n n - - pipe
  flags=Rq user=www-data argv=/usr/local/bin/plpainel-postfix-pipe.sh ${recipient} ${sender}
MASTER
fi

postfix check
systemctl restart postfix

echo "Inbox de email configurado."
echo "Aponte os MX dos dominios para: $MAIL_HOST"
