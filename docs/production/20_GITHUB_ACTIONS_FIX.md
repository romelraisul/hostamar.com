# GitHub Actions Fix — ci.yml invalid YAML + DB mirror secrets
- 50+ fail emails due to ci.yml 0.0 sec invalid YAML
- Fixed YAML syntax, added pnpm setup, test, build
- Added missing secrets TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, FORGEJO_TOKEN, GITLAB_TOKEN via gh secret set from Infisical
- Verified gh run list success
