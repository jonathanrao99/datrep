# Security Checklist

Use this checklist before merging any DatRep change.

## Secrets and credentials
- [ ] No API keys, tokens, passwords, or private certs in code.
- [ ] `.env` files are excluded from git.
- [ ] New environment variables are documented in `backend/.env.example` or root `.env.example`.

## File upload safety
- [ ] Upload endpoint validates file extension and content type.
- [ ] Upload endpoint enforces max size limit.
- [ ] Filenames are sanitized before writing to disk.

## API safety
- [ ] Protected routes require bearer token when `API_AUTH_TOKEN` is set.
- [ ] Rate limiting is enabled for heavy/expensive routes.
- [ ] Error responses do not leak stack traces or internal details.

## Data and privacy
- [ ] No real user uploads/sample sensitive datasets committed to git.
- [ ] Logs do not include sensitive payloads or secret headers.

## Release hygiene
- [ ] CI passes (frontend build + backend checks).
- [ ] New dependencies reviewed for security risk.
- [ ] If a secret was exposed, it was revoked/rotated and incident noted.
