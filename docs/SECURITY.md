# Security checklist

Use before merging changes.

- **Secrets**: No API keys/tokens in code; `.env` excluded from git; new vars in `.env.example`.
- **Uploads**: Validate extension and size; sanitize filenames.
- **API**: Use `API_AUTH_TOKEN` and rate limits where needed; no stack traces in errors.
- **Data**: No real/sensitive uploads in git; no secrets in logs.
- **Release**: CI passes; new deps reviewed; rotate any exposed secret.
