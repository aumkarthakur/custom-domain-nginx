#!/bin/bash
# setup_domain.sh
# Usage: sudo setup_domain.sh domain
# Example: sudo setup_domain.sh example.com
#
# Environment variables can be provided to override defaults:
#   NGINX_AVAILABLE_PATH  (default: /etc/nginx/sites-available/)
#   NGINX_ENABLED_PATH    (default: /etc/nginx/sites-enabled/)
#   PROXY_PASS            (default: http://127.0.0.1:3000)
#   RENEW_THRESHOLD       (default: 30) in days

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 domain"
  exit 1
fi

domain="$1"

# Use environment variables with defaults.
nginxAvailablePath="${NGINX_AVAILABLE_PATH:-/etc/nginx/sites-available/}"
nginxEnabledPath="${NGINX_ENABLED_PATH:-/etc/nginx/sites-enabled/}"
proxyPass="${PROXY_PASS:-http://127.0.0.1:3000}"
renewThreshold="${RENEW_THRESHOLD:-30}"

# Determine if the domain is an apex domain (e.g., example.com)
IFS='.' read -ra parts <<< "$domain"
if [ "${#parts[@]}" -eq 2 ]; then
  certbot_domains="-d $domain -d www.$domain"
  server_names="$domain www.$domain"
else
  certbot_domains="-d $domain"
  server_names="$domain"
fi

# Function to check certificate expiration (in days)
check_cert_expiry() {
  local cert_file="$1"
  local threshold_days="$2"
  
  local end_date_str
  end_date_str=$(openssl x509 -enddate -noout -in "$cert_file" 2>/dev/null)
  if [ -z "$end_date_str" ]; then
    return 1
  fi
  local expiry_date_str=${end_date_str#notAfter=}
  local expiry_epoch
  expiry_epoch=$(date -d "$expiry_date_str" +%s)
  local current_epoch
  current_epoch=$(date +%s)
  local diff_seconds=$(( expiry_epoch - current_epoch ))
  local remaining_days=$(( diff_seconds / 86400 ))
  echo "Certificate expires in $remaining_days day(s)."
  
  if [ "$remaining_days" -le "$threshold_days" ]; then
    return 1  # cert is expiring soon (or already expired)
  else
    return 0  # cert is still valid
  fi
}

# Check if certificate exists and is valid beyond the threshold.
cert_dir="/etc/letsencrypt/live/$domain"
cert_file="$cert_dir/fullchain.pem"
issue_cert=true
if [ -d "$cert_dir" ] && [ -f "$cert_file" ]; then
  echo "Certificate already exists for $domain."
  if check_cert_expiry "$cert_file" "$renewThreshold"; then
    echo "Certificate is valid for more than $renewThreshold days. Skipping issuance."
    issue_cert=false
  else
    echo "Certificate is expiring soon or already expired. Proceeding to renew certificate."
  fi
else
  echo "No certificate found for $domain. Proceeding to issue certificate."
fi

if [ "$issue_cert" = true ]; then
  echo "Issuing certificate for: $certbot_domains"
  certbot certonly --nginx $certbot_domains --non-interactive --agree-tos
  if [ $? -ne 0 ]; then
    echo "Error: Certificate issuance failed."
    exit 1
  fi
fi

# Generate the Nginx configuration content.
nginx_config="server {
    listen 80;
    server_name $server_names;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $server_names;

    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass $proxyPass;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}"

# Write the configuration to nginxAvailablePath.
echo "Writing Nginx configuration to ${nginxAvailablePath}${domain}"
echo "$nginx_config" | tee "${nginxAvailablePath}${domain}" > /dev/null
if [ $? -ne 0 ]; then
  echo "Error: Writing Nginx configuration failed."
  exit 1
fi

# Create or update the symbolic link in nginxEnabledPath.
echo "Enabling Nginx configuration..."
ln -sf "${nginxAvailablePath}${domain}" "${nginxEnabledPath}${domain}"
if [ $? -ne 0 ]; then
  echo "Error: Creating symlink in sites-enabled failed."
  exit 1
fi

# Test and reload Nginx.
echo "Testing Nginx configuration..."
nginx -t
if [ $? -ne 0 ]; then
  echo "Error: Nginx configuration test failed."
  exit 1
fi

echo "Reloading Nginx..."
systemctl reload nginx
if [ $? -ne 0 ]; then
  echo "Error: Nginx reload failed."
  exit 1
fi

echo "Domain $domain setup completed successfully."
