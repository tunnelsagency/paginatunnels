# Unloquia Chat – Integration Packs

This directory contains ready-to-use bundles for embedding the Unloquia floating chat widget in different environments.  
Each pack mirrors the production behaviour found in `src/components/UnloquiaChatWidget.tsx` and the supporting API
routes so you can drop the widget into any project without reverse-engineering the main app.

## Contents

- `nextjs/` – Canonical implementation for Next.js / React applications (App Router).  
  Includes the widget component and the two proxy API routes your deployment needs.
- `wordpress/` – A WordPress plugin skeleton that exposes the same widget through vanilla JavaScript and
  WP REST routes. Designed to be configurable from the WP admin panel and safe to bundle on any theme.

## Quick Start

### Next.js / React

1. Copy the contents of `integration-pack/nextjs` into your project.
2. Add `UNLOQUIA_LANDING_SECRET` and `NEXT_PUBLIC_UNLOQUIA_CLIENT_ID` to your environment.
3. Import and render `UnloquiaChatWidget` near the root of your layout.
4. Deploy – the widget will poll `/api/unloquia-messages` and POST to `/api/unloquia-proxy`.

### WordPress

1. Copy `integration-pack/wordpress` into `wp-content/plugins/unloquia-chat`.
2. Run `npm install && npm run build` inside the plugin if you wish to rebuild the ES module bundle (already prebuilt).
3. Activate “Unloquia Chat Widget” from the WP admin dashboard.
4. In **Settings → Unloquia Chat**, enter:
   - Client ID (UUID from Supabase)
   - Landing secret
   - API base (optional if you self-host the Next.js proxy; defaults to the production API)
5. The widget will appear on every page and reuse the same dedupe/pending logic as the React version.

## Shared Behaviour

- **Bot dedupe**: normalises text (NFKC, whitespace collapse) and drops duplicates within 30 s.
- **Pending queue**: keeps a short list of unsent messages and clears once the backend echoes the text.
- **Poll guard**: ensures only one fetch runs at a time, avoiding flickers or double inserts.
- **Session strategy**: generates a new session on each page load unless you pass an explicit ID – safe defaults for public landing pages.

## Maintenance Tips

- When updating the main widget, port the changes to both packs to keep parity.
- Validate the packs by running the included smoke tests (`npm test` in the Next.js pack, `npm run lint` in WP).
- Keep the WordPress REST proxy aligned with the Next.js one (same headers, error handling).

Happy embedding!  
