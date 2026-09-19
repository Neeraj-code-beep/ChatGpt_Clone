# Optional / Legacy VPS Deployment (Paid / Self-Hosted)

> [!NOTE]
> **Primary Deployment**: The recommended $0/month deployment path for this project is **Render (Static Site + Web Service) + MongoDB Atlas Free Cluster**. Please refer to [docs/deployment/deployment.md](../../docs/deployment/deployment.md) for the primary guide.
>
> The files in this directory are provided for optional self-hosted deployments on a paid Linux VPS with Nginx and systemd.

## Contents
- `nginx/chatgpt-clone.conf` — Nginx reverse proxy server block with WebSocket upgrade headers.
- `systemd/chatgpt-clone.service` — systemd service unit file for Node.js process management.
- `scripts/deploy.sh` — Bash script for VPS updates and builds.
