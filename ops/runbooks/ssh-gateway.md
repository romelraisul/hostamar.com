2026-06-26 Mitigation
- Public ingress for ssh.hostamar.com removed from cloudflared.
- ssh-gateway compose converted to minimal non-bind-mount scaffold to avoid host key exposure.
- Gateway remains disabled at edge until oauth2-proxy or Cloudflare Access is configured.
