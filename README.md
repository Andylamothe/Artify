# HackTheSummit

Team workspace split by ownership area.

## Structure

```text
apps/
  ar-web/        WebAR + AR-facing web UI
  front-ui/      Main product/front UI workspace
  social/        Social features workspace
tools/
  mind-workshop/ MindAR target workshop/compiler workspace
```

## AR App

Our current working area is:

```bash
cd apps/ar-web
npm install
npm run dev:host
```

Production/reverse proxy target remains the AR app service on port `3287`.
