# Unloquia Chat – WordPress Plugin Pack

Turn any WordPress site into a Unloquia-enabled landing by dropping this folder into
`wp-content/plugins/unloquia-chat`.

## Structure

```
unloquia-chat.php                             ← Plugin bootstrap
includes/class-unloquia-chat-plugin.php       ← Admin settings + REST proxy + enqueue logic
assets/unloquia-chat-widget.css               ← Widget styling
assets/unloquia-chat-widget.js                ← Vanilla JS widget (mirrors React behaviour)
```

## Installation

1. Copy the folder to `wp-content/plugins/unloquia-chat`.
2. (Optional) Rebuild the JS bundle if you make changes:
   ```bash
   npm install
   npm run build
   ```
   *(Prebuilt bundle is already included.)*
3. Activate **Unloquia Chat Widget** from the WordPress admin dashboard.
4. Navigate to **Settings → Unloquia Chat** and fill in:
   - **Client ID** (UUID from Supabase `messaging_channel_configs`)
   - **Landing ingest secret** (same as `UNLOQUIA_LANDING_SECRET`)
   - **API base (optional)** if you want to route through a custom proxy (defaults to `https://api.unloquia.com`).

The widget automatically mounts in the site footer and mirrors the React version’s logic:

- De-duplicates bot replies within 30 s (text normalised via NFKC).
- Maintains a pending queue so users see “Sending…” until the backend echoes their message.
- Polls every 2 s, guarded against overlapping requests.
- Generates a fresh session per page load unless you pass a custom ID via the JS config.

## Developer Notes

- REST endpoints:  
  - `GET /wp-json/unloquia/v1/messages` → proxied to the landing messages endpoint.  
  - `POST /wp-json/unloquia/v1/proxy` → forwards user input to the workflow executor.
- You can override the default API by supplying a custom base URL in the settings page (useful if you host the Next.js proxy separately).
- Styling lives in `assets/unloquia-chat-widget.css`; tweak colours/shadows to align with your theme.
- The JS bundle avoids React to keep dependencies minimal and can be converted into an ES module build if you prefer chaining through a bundler.

## Troubleshooting

- “Widget does not appear” → verify the `client_id` field is populated in Settings and that no caching plugin is stripping the footer markup.
- “Messages fail to send” → check browser console; the REST proxy will return detailed JSON errors if the secret or client ID is incorrect.
- Duplicate replies → aligns with the React widget; if the backend emits the same text twice, one copy will be discarded client-side.

This plugin is intentionally small. Extend `class-unloquia-chat-plugin.php` if you need per-page toggle switches, custom suggestions, or analytics hooks.  
Keep an eye on changes to the React widget so both implementations stay in feature parity.
