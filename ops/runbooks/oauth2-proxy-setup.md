# oauth2-proxy setup for ssh.hostamar.com

Prereqs
- GitHub OAuth App (or Google) with callback URL: `https://ssh.hostamar.com/oauth2/callback`
- Client ID and Client Secret from the OAuth provider
- A 32-byte base64 cookie secret (run: `openssl rand -base64 32`)

Steps
1. Fill placeholders in ops/ssh-gateway/docker-compose.oauth.yml:
   - OAUTH2_PROXY_CLIENT_ID
   - OAUTH2_PROXY_CLIENT_SECRET
   - OAUTH2_PROXY_COOKIE_SECRET
   - OAUTH2_PROXY_EMAIL_DOMAINS (or use `*` for catch-all during testing)
   - OAUTH2_PROXY_REDIRECT_URL to match `https://ssh.hostamar.com/oauth2/callback`

2. Start the stack
   docker compose -f ops/ssh-gateway/docker-compose.oauth.yml up -d --remove-orphans

3. Update cloudflared ingress
   - hostname: ssh.hostamar.com
   - service: http://127.0.0.1:4180

4. Deploy cloudflared and verify
   - Container should show oauth2-proxy → 4180, ssh-gateway → 7681
   - Visiting https://ssh.hostamar.com should redirect to GitHub/Google login
   - After login, it should proxy to the ttyd shell

Rollback
- Remove the ssh.hostamar.com ingress from cloudflared config and restart cloudflared.

Notes
- No host bind mounts are used; the stack is minimal and read-only where possible.
- Replace `yourdomain.com` with an allowed email domain once testing is complete.

2026-06-26 Deployment record

- Deployed oauth2-proxy + ttyd ssh-gateway scaffold (non-bind-mount, read-only).
- GitHub OAuth flow validated: romelraisul@gmail.com authenticated successfully; oauth2-proxy redirected and ttyd served shell via WebSocket.
- Public ingress for ssh.hostamar.com was disabled during hardening; re-enabled behind oauth2-proxy.
- Healthcheck changed to TCP probe to avoid unauthenticated HTTP checks failing.
- Mitigation: no host SSH keys are mounted; container runs read-only with tmpfs for /tmp.
- Next steps: enable Cloudflare Access or rotate oauth2-proxy client secret periodically; enable Access logging and alerting.
