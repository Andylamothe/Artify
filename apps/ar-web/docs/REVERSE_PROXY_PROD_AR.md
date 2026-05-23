# Reverse Proxy Option (Reliable Multi-Device AR)

If local HTTPS trust keeps failing on iOS/other devices, use a reverse proxy with a real public certificate.

This is the most reliable setup for WebAR demos.

## Why This Works Better

- iPhone and Android already trust public CAs (Let's Encrypt, etc.).
- No manual root certificate install on each phone.
- Stable HTTPS origin for camera APIs.

## Recommended Setup

Use a domain/subdomain you control and terminate TLS on a reverse proxy.

Example:

- Public URL: `https://ar-demo.yourdomain.com`
- Reverse proxy forwards to local app: `http://127.0.0.1:3001`

## Caddy Example

Create `Caddyfile`:

```text
ar-demo.yourdomain.com {
  reverse_proxy 127.0.0.1:3001
}
```

Run app:

```powershell
npx next dev -H 0.0.0.0 -p 3001
```

Run Caddy:

```powershell
caddy run
```

Caddy provisions HTTPS automatically for public DNS-resolvable domains.

## Nginx Example (Concept)

1. Obtain TLS cert (Let's Encrypt).
2. Configure server block with `ssl_certificate` and `ssl_certificate_key`.
3. Proxy pass to `http://127.0.0.1:3001`.

## Device Checklist

1. Open only the public HTTPS URL.
2. Use Safari on iOS for best MindAR reliability.
3. Ensure camera permission is allowed for that domain.
4. Avoid in-app browsers (Instagram, LinkedIn, etc.).
