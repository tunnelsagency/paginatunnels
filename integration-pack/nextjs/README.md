# Unloquia Chat – Next.js Starter Pack

This pack mirrors the production setup used in the main application. Copy the files into a fresh
Next.js (App Router) project and the chat widget will work out-of-the-box.

## Files

```
components/UnloquiaChatWidget.tsx    ← Floating widget (client component)
app/api/unloquia-proxy/route.ts     ← POST proxy that forwards messages to Django
app/api/unloquia-messages/route.ts  ← GET proxy that retrieves the conversation history
.env.example                        ← Required environment variables
```

## Installation

1. Copy this folder into your project (e.g. `cp -R integration-pack/nextjs/* ./`).
2. Install peer dependencies:
   ```bash
   npm install lucide-react
   ```
3. Rename `.env.example` to `.env.local` and fill in:
   ```env
   NEXT_PUBLIC_UNLOQUIA_CLIENT_ID=8a8c9728-e5f5-459e-a1f7-2016bd091bd4
   UNLOQUIA_LANDING_SECRET=your_ingest_secret
   ```
4. Add the widget to your layout/page:
   ```tsx
   import UnloquiaChatWidget from '@/components/UnloquiaChatWidget';

   export default function Page() {
     return (
       <>
         {/* page content */}
         <UnloquiaChatWidget clientId={process.env.NEXT_PUBLIC_UNLOQUIA_CLIENT_ID!} />
       </>
     );
   }
   ```
5. Deploy. The widget will poll `/api/unloquia-messages` every 2 s and send user input to `/api/unloquia-proxy`.

## Behaviour Highlights

- **Duplicate shielding** – bot replies are normalised (NFKC + whitespace collapse) and de-duped within a 30 s window.
- **Pending queue** – outgoing bubbles show “Sending…” until Django echoes the text back.
- **Poll guard** – prevents overlapping fetches, so no flicker or double inserts.
- **Session handling** – generates a fresh session per page load; pass `userId` if you need continuity.

## Testing

Run lint/tests to ensure the pack integrates cleanly with your project:
```bash
npm run lint
npm run test
```

## Customisation

- Update the inline `theme` object if you want to match your brand palette.
- Expose additional props (e.g. `suggestions`) if your product requires more prompts.
- To receive bot replies in real-time, swap polling for a websocket/SSE client while reusing the same normalisation helpers.

This starter pack stays in sync with the production widget in `src/components/UnloquiaChatWidget.tsx`.  
Keep both files aligned when you ship new features.
