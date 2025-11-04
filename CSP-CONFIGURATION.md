# CSP Configuration for demo.pauhu.ai

## Issue

The demo at https://pauhu.github.io/demo/ works correctly, but when proxied through https://demo.pauhu.ai, the Content Security Policy (CSP) blocks API requests.

## Solution

Update the CSP configuration on your **demo.pauhu.ai** Cloudflare/proxy to include:

### Current CSP (Blocking)
```
connect-src 'self' https://eu-monitor-ai-analysis.pauhu.workers.dev https://api.pauhu.ai https://ec.europa.eu
```

### Required CSP (Working)
```
connect-src 'self' https://eu-tutka-compliance.pauhu.workers.dev https://eu-monitor-ai-analysis.pauhu.workers.dev https://api.pauhu.ai https://ec.europa.eu https://publications.europa.eu http://publications.europa.eu
```

## Where to Update

If using **Cloudflare Pages**:
1. Go to Cloudflare Dashboard → Pages → demo.pauhu.ai
2. Settings → Headers
3. Add/update the Content-Security-Policy header

If using **Cloudflare Workers** as proxy:
1. Add CSP headers in your worker response
2. Example:
```javascript
response.headers.set('Content-Security-Policy',
  "connect-src 'self' https://eu-tutka-compliance.pauhu.workers.dev https://api.pauhu.ai https://ec.europa.eu https://publications.europa.eu"
);
```

## Verification

After updating CSP, test with:
```bash
curl -I https://demo.pauhu.ai/teknologiateollisuus/eu-tutka/research-assistant.html | grep -i content-security
```

Should show the worker URL in the `connect-src` directive.
