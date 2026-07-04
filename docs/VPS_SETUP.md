# VPS setup log (Ubuntu 24.04)

Step-by-step record of how this site was deployed to the production VPS. Use this as a reference when rebuilding the server or setting up a second one — the same steps, adapted for the target domain.

## 1. Install Docker

Ubuntu's own package worked fine (Docker's official `get.docker.com` install script can fail with an SSL/network error on some fresh VPS images):

```bash
sudo apt update
sudo apt install -y docker.io
sudo systemctl enable --now docker
docker --version
```

`docker.io` does not ship Docker Compose, so install it separately:

```bash
sudo apt install -y docker-compose-v2
docker compose version
```

If that package isn't available on your Ubuntu release, install the Compose CLI plugin manually instead:

```bash
sudo mkdir -p /usr/libexec/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/libexec/docker/cli-plugins/docker-compose
sudo chmod +x /usr/libexec/docker/cli-plugins/docker-compose
```

## 2. Clone the repo and start the container

The site is deployed from the `main` branch (kept in sync with `dev`, the working branch).

```bash
git clone https://github.com/Ranma-2000/Ranma-2000.github.io.git /srv/peterpham-cv
cd /srv/peterpham-cv
sudo docker compose -f deploy/docker-compose.yml up -d --build
curl -I http://127.0.0.1:8080
```

The container only binds to `127.0.0.1:8080` (see [`deploy/docker-compose.yml`](../deploy/docker-compose.yml)) — it is not reachable from the internet directly. A host-level Nginx sits in front of it and terminates TLS.

## 3. Point DNS at the VPS

Create an A record for `peterpham.info.vn` (and `www.peterpham.info.vn` if used) pointing at the VPS's public IP. Confirm propagation:

```bash
dig +short peterpham.info.vn
```

## 4. Host Nginx reverse proxy + HTTPS (Let's Encrypt)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

cd /srv/peterpham-cv
sudo cp deploy/nginx.host.conf.example /etc/nginx/sites-available/peterpham.info.vn
sudo ln -s /etc/nginx/sites-available/peterpham.info.vn /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

curl -I http://peterpham.info.vn   # sanity check before requesting the cert
```

Issue the certificate:

```bash
sudo certbot --nginx \
  -d peterpham.info.vn \
  -d www.peterpham.info.vn \
  -m <your-email> \
  --agree-tos --non-interactive
```

Certbot rewrites the Nginx server block to redirect HTTP → HTTPS and installs the cert. It also registers a renewal timer — verify with:

```bash
sudo certbot certificates
sudo systemctl list-timers | grep certbot
```

## 5. Firewall

Only expose SSH, HTTP and HTTPS:

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## 6. Basic hardening — hide Nginx version

Edit `/etc/nginx/nginx.conf`, and inside the top-level `http { ... }` block add:

```nginx
server_tokens off;
```

Then apply it:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

This removes the Nginx version number from the `Server` response header (`Server: nginx` instead of `Server: nginx/1.24.0`), so it can't be used to look up known vulnerabilities for that exact version.

Verify:

```bash
curl -I https://peterpham.info.vn
```

## Updating the deployed site

Until CI/CD (`.github/workflows/deploy.yml`) is wired up with the VPS secrets, deploy manually:

```bash
cd /srv/peterpham-cv
git pull
sudo docker compose -f deploy/docker-compose.yml up -d --build
```

Once the repository secrets listed in the main [README](../README.md#continuous-deployment) are configured, this step runs automatically on every push to `main`.

## Simulation backend (`sim-backend`)

`deploy/docker-compose.yml` also runs a `sim-backend` container (FastAPI, `backend/`) bound to `127.0.0.1:8090`, powering the interactive robot simulation embedded in the portfolio. It's rebuilt automatically alongside `web` by the same `docker compose up -d --build` command above.

The host Nginx needs one extra location block to proxy `/api/sim/` (WebSocket) to it — already present in `deploy/nginx.host.conf.example`. If your host Nginx config predates this feature, re-apply it once:

```bash
cd /srv/peterpham-cv
sudo cp deploy/nginx.host.conf.example /etc/nginx/sites-available/peterpham.info.vn
sudo nginx -t && sudo systemctl reload nginx
```

This is a manual step because CI only rebuilds the Docker containers — it does not touch the host-level Nginx config.
