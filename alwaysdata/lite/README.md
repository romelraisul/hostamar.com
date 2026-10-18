# hostamar.alwaysdata.net — lite fallback API (layer 3)

Free plan facts: *.alwaysdata.net only (no custom domain), 1GB disk / 256MB RAM,
24/7 awake, SSH deploy to ~/www. Deployed by .github/workflows/final-deploy.yml
(rsync over SSH) and manually: `scp -r alwaysdata/lite/* alwaysdata:~/www/`.

Routes: /health (any *health path) -> ok JSON; everything else -> 202 queued JSON.
PHP 8.4 zero-daemon: no node process, no panel site-type change, survives reboots.
