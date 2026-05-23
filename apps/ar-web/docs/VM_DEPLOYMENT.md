# VM Deployment (Isolated + Safe Ports)

This deployment flow is designed for servers that already host other projects.

It uses:

- dedicated folder: `/srv/apps/hackthesummit-ar`
- automatic free-port selection
- isolated `systemd` service: `hackthesummit-ar.service`
- listen address: `0.0.0.0`

## 1) Copy project to VM

Copy this repository to your VM (git clone or rsync).

## 2) Run deploy script

```bash
cd /path/to/HackTheSummit
chmod +x scripts/deploy-vm.sh
./scripts/deploy-vm.sh
```

## 2b) Remote deploy from your local machine (Python + password prompt)

This option does not store your password in the repo.

```bash
pip install paramiko
python scripts/deploy_remote_vm.py --host 192.168.0.46 --user yasser
```

The script will:

- ask SSH password in hidden prompt
- upload project to `~/apps/hackthesummit-ar-src`
- run remote `scripts/deploy-vm.sh` with sudo
- print service status and selected port

By default, redeploys keep the same port from `/srv/apps/hackthesummit-ar/shared/port`.
To force a specific port once:

```bash
DEPLOY_PORT=3287 ./scripts/deploy-vm.sh
```

Optional flags:

```bash
./scripts/deploy-vm.sh --source /path/to/HackTheSummit --base-dir /srv/apps --app-slug hackthesummit-ar
```

## 3) What the script configures

- App root: `/srv/apps/hackthesummit-ar`
- Current release: `/srv/apps/hackthesummit-ar/current`
- Shared env: `/srv/apps/hackthesummit-ar/shared/.env.production`
- Chosen port: `/srv/apps/hackthesummit-ar/shared/port`
- Logs:
  - `/srv/apps/hackthesummit-ar/logs/app.log`
  - `/srv/apps/hackthesummit-ar/logs/app.err.log`
- Service: `/etc/systemd/system/hackthesummit-ar.service`

## 4) Verify runtime

```bash
sudo systemctl status hackthesummit-ar
cat /srv/apps/hackthesummit-ar/shared/port
curl http://127.0.0.1:$(cat /srv/apps/hackthesummit-ar/shared/port)/ar
```

## 5) Reverse proxy (recommended for iOS camera + HTTPS)

Use your reverse proxy (Nginx/Caddy/Traefik) to forward HTTPS traffic to:

```text
http://127.0.0.1:<PORT_FROM_SHARED_PORT_FILE>
```

For WebAR on iPhone, real HTTPS certificate is strongly recommended.
