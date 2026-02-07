# Area Place Finder

A production-ready Next.js app that finds restaurants and medical centers near a chosen location with a polished map + list experience.

## File Tree
```
.
├── .dockerignore
├── .env.example
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
│   │   └── useLeaflet.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib
│   ├── cache.ts
│   ├── cacheInstances.ts
│   ├── osm.ts
│   ├── haversine.ts
│   ├── normalize.ts
│   ├── rateLimiter.ts
│   ├── response.ts
│   └── types.ts
├── next-env.d.ts
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── public
├── tailwind.config.ts
└── tsconfig.json
```

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and update with your contact info:
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your email/contact
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:3000`.

Optional checks:
```bash
npm run lint
```

## OpenStreetMap & Overpass
This app uses open data sources instead of Google APIs:
- **Nominatim** for geocoding (`/api/geocode`).
- **Overpass API** for nearby places and details (`/api/nearby`, `/api/details`).
- **OpenStreetMap tiles** for map rendering (Leaflet).

Use a descriptive `OSM_USER_AGENT` with contact info to respect usage policies. For production, consider hosting your own tiles and Overpass instance or using a paid provider.

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
- Search requests aborted when a new search begins.

## Limitations & Future Improvements
- Medical category merges multiple place types; could add richer taxonomy filters.
- OpenStreetMap data does not include ratings; integrate a reviews source if needed.
- Add pagination UI for individual medical subtypes.
- Optional persistent cache (Redis) for multi-instance deployments.
- Add multi-language support and saved searches.

## **Containerization**

**Quick start (no env vars needed for public OSM):**
```bash
docker compose up --build
```
App will be available at `http://localhost:3000`.

**With custom OSM contact info (recommended for production):**
1. Copy `.env.example` to `.env` and update your contact email:
   ```bash
   cp .env.example .env
   ```
2. Run:
   ```bash
   docker compose up --build
   ```

**Build image manually:**
```bash
docker build -t area-place-finder:latest .
docker run --rm -p 3000:3000 area-place-finder:latest
```

Files: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `.env.example`.
