# iOS HTTPS Setup For Local AR Testing

This project needs a trusted HTTPS connection for camera access on iPhone.

If HTTPS is not trusted, `window.isSecureContext` can fail and AR startup may fall back.

## Why Buttons Look Broken On Other Devices

`Start AR Experience` can appear to do nothing when:

1. The iPhone does not trust the local certificate.
2. The certificate is valid only for `localhost`, but the phone opens the app via LAN IP.
3. Camera permission is blocked by iOS browser settings.

## Recommended Local Setup (mkcert)

Use a certificate that includes both `localhost` and your LAN IP in SAN entries.

## 1) Install mkcert on Windows

Use one of:

- `choco install mkcert`
- `winget install FiloSottile.mkcert`

Also ensure local trust store support is installed:

- `mkcert -install`

## 2) Create certificate files for this project

From project root:

```powershell
New-Item -ItemType Directory -Force certs | Out-Null
mkcert -key-file certs/dev-key.pem -cert-file certs/dev-cert.pem localhost 127.0.0.1 ::1 10.201.49.106
```

Replace `10.201.49.106` with your current LAN IPv4.

## 3) Run Next.js with your custom cert

```powershell
npm run dev:https:cert
```

## 4) Install mkcert root CA on iPhone

Find mkcert root CA path on Windows:

```powershell
mkcert -CAROOT
```

In that folder, copy `rootCA.pem` to your iPhone (AirDrop, iCloud Drive, email, etc).

On iPhone:

1. Open the file and install the profile.
2. Go to `Settings > General > About > Certificate Trust Settings`.
3. Enable full trust for that root certificate.

## 5) Open the app from iPhone

Open Safari:

```text
https://10.201.49.106:3000/ar
```

Accept prompts, then allow camera permission.

## Notes

- Safari on iOS is more reliable than Chrome for WebAR.
- If LAN IP changes, regenerate cert with the new IP.
- If AR still fails, fallback mode remains available for demo continuity.
