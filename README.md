# Area Place Finder

A production-ready Next.js app that finds restaurants and medical centers near a chosen location with a polished map + list experience.

## File Tree
```
.
├── app
│   ├── api
│   │   ├── details
│   │   │   └── route.ts
│   │   ├── geocode
│   │   │   └── route.ts
│   │   └── nearby
│   │       └── route.ts
│   ├── components
│   │   ├── AppShell.tsx
│   │   ├── MapPane.tsx
│   │   ├── PlaceCard.tsx
│   │   ├── ResultsList.tsx
│   │   └── useGoogleMaps.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib
│   ├── cache.ts
│   ├── cacheInstances.ts
│   ├── google.ts
│   ├── haversine.ts
│   ├── normalize.ts
│   ├── rateLimiter.ts
│   ├── response.ts
│   └── types.ts
├── next-env.d.ts
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file:
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_client_key
   GOOGLE_MAPS_SERVER_KEY=your_server_key
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Google APIs to Enable
Enable these APIs in Google Cloud Console:
- **Maps JavaScript API** (for map rendering)
- **Places API** (for Autocomplete, Nearby Search, Place Details)
- **Geocoding API** (for server-side geocoding)

## Key Restrictions (Security)
- `NEXT_PUBLIC_GOOGLE_MAPS_KEY`
  - Restrict by HTTP referrer (your domain).
  - Only enable Maps JavaScript API + Places API.
- `GOOGLE_MAPS_SERVER_KEY`
  - Restrict by server IP (or VPC).
  - Enable Places API + Geocoding API.

## Caching Strategy
Server-side LRU + TTL caching:
- **Geocode**: 24 hours (`/api/geocode`)
- **Nearby**: 10 minutes (`/api/nearby`)
- **Details**: 24 hours (`/api/details`)

Dev-only cache hit/miss logging is enabled to keep production logs clean.

## Rate Limiting Strategy
Per-IP fixed window rate limiting in all `/api/*` routes:
- **Limit**: 30 requests per 60 seconds
- Returns `HTTP 429` with `{ ok:false, error:{ code:"RATE_LIMIT", message:"..." } }`

## Cost Minimization
- Place Details fetched only when a card is expanded.
- All server calls cached with LRU + TTL.
- Autocomplete runs on client-side Maps JS library.
- Search requests aborted when a new search begins.

## Limitations & Future Improvements
- Medical category merges multiple place types; could add richer taxonomy filters.
- Add pagination UI for individual medical subtypes.
- Optional persistent cache (Redis) for multi-instance deployments.
- Add multi-language support and saved searches.
