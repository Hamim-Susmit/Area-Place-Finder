"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGoogleMaps } from "./useGoogleMaps";
import MapPane from "./MapPane";
import ResultsList from "./ResultsList";
import type { Category, NormalizedPlace, PlaceDetails } from "../../lib/types";

const radiusOptions = [500, 1000, 2000, 5000, 10000];

const initialCenter = { lat: 40.758, lng: -73.9855 };

type DetailsState = {
  data?: PlaceDetails;
  loading?: boolean;
  error?: string;
};

export default function AppShell() {
  const { ready, error: mapsError } = useGoogleMaps();
  const inputRef = useRef<HTMLInputElement>(null);
  const [center, setCenter] = useState(initialCenter);
  const [locationLabel, setLocationLabel] = useState("Times Square, NYC");
  const [category, setCategory] = useState<Category>("restaurants");
  const [radiusMeters, setRadiusMeters] = useState(2000);
  const [sortBy, setSortBy] = useState<"distance" | "rating">("distance");
  const [filter, setFilter] = useState("");
  const [places, setPlaces] = useState<NormalizedPlace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [detailsMap, setDetailsMap] = useState<Record<string, DetailsState>>({});
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!ready || !inputRef.current) return;
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "name"]
    });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setCenter({ lat, lng });
      setLocationLabel(place.formatted_address || place.name || "Selected location");
    });
  }, [ready]);

  const runSearch = useCallback(
    async ({
      pageToken,
      append
    }: {
      pageToken?: string;
      append?: boolean;
    } = {}) => {
      setError(null);
      setLoading(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/nearby", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: center.lat,
            lng: center.lng,
            radiusMeters,
            category,
            pageToken
          }),
          signal: controller.signal
        });

        const payload = await response.json();
        if (!payload.ok) {
          throw new Error(payload.error?.message || "Unable to fetch places.");
        }

        setPlaces((prev) => (append ? [...prev, ...payload.data.results] : payload.data.results));
        setNextPageToken(payload.data.nextPageToken);
        setSelectedId(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [center.lat, center.lng, radiusMeters, category]
  );

  useEffect(() => {
    runSearch();
  }, [center, category, radiusMeters, runSearch]);

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLabel("Current location");
      },
      () => setError("Unable to access your location.")
    );
  };

  const handleManualSearch = async () => {
    if (!inputRef.current?.value) return;
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: inputRef.current.value })
      });
      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error?.message || "Unable to geocode address.");
      }
      setCenter({ lat: payload.data.lat, lng: payload.data.lng });
      setLocationLabel(payload.data.formattedAddress);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleSelectPlace = (placeId: string) => {
    setSelectedId(placeId);
  };

  const handleFetchDetails = async (placeId: string) => {
    setDetailsMap((prev) => ({
      ...prev,
      [placeId]: { ...prev[placeId], loading: true, error: undefined }
    }));

    try {
      const response = await fetch("/api/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId })
      });
      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error?.message || "Unable to load details.");
      }
      setDetailsMap((prev) => ({
        ...prev,
        [placeId]: { data: payload.data, loading: false }
      }));
    } catch (err) {
      setDetailsMap((prev) => ({
        ...prev,
        [placeId]: { loading: false, error: (err as Error).message }
      }));
    }
  };

  const visiblePlaces = useMemo(() => {
    const filtered = places.filter((place) => {
      const needle = filter.trim().toLowerCase();
      if (!needle) return true;
      return (
        place.name.toLowerCase().includes(needle) ||
        place.address.toLowerCase().includes(needle)
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === "rating") {
        return (b.rating || 0) - (a.rating || 0);
      }
      return a.distanceMeters - b.distanceMeters;
    });
  }, [places, filter, sortBy]);

  const hasResults = visiblePlaces.length > 0;

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-5 lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Area Place Finder
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Discover places around {locationLabel}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Restaurants, clinics, hospitals, and pharmacies with live map context.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live results powered by Google Maps
          </div>
        </div>
      </header>

      <main className="mx-auto grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:px-10">
        <section className="space-y-4">
          <div className="rounded-3xl bg-white p-5 shadow-card">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Location
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    ref={inputRef}
                    placeholder="Search a city, address, or landmark"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleManualSearch();
                      }
                    }}
                  />
                  <button
                    className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
                    onClick={handleManualSearch}
                  >
                    Search
                  </button>
                </div>
              </div>
              <button
                className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
                onClick={handleUseLocation}
              >
                Use my location
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Category
                </label>
                <div className="mt-2 flex gap-2">
                  {(["restaurants", "medical"] as Category[]).map((option) => (
                    <button
                      key={option}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold capitalize transition ${
                        category === option
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
                      }`}
                      onClick={() => setCategory(option)}
                    >
                      {option === "restaurants" ? "Restaurants" : "Medical"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Radius
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={radiusMeters}
                  onChange={(event) => setRadiusMeters(Number(event.target.value))}
                >
                  {radiusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option >= 1000 ? `${option / 1000} km` : `${option} m`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sort
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as "distance" | "rating")}
                >
                  <option value="distance">Distance</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
            </div>

            <div className="mt-5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Filter results
              </label>
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter by name or address"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-card">
            {mapsError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {mapsError}
              </div>
            ) : (
              <MapPane
                ready={ready}
                center={center}
                places={visiblePlaces}
                selectedId={selectedId}
                onSelect={handleSelectPlace}
              />
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          {error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {error}
            </div>
          ) : null}

          <ResultsList
            places={visiblePlaces}
            loading={loading}
            selectedId={selectedId}
            detailsMap={detailsMap}
            onSelect={handleSelectPlace}
            onFetchDetails={handleFetchDetails}
            emptyState={!loading && !hasResults}
          />

          {nextPageToken && !loading ? (
            <button
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm hover:border-brand-400"
              onClick={() => runSearch({ pageToken: nextPageToken, append: true })}
            >
              Load more
            </button>
          ) : null}
        </section>
      </main>
    </div>
  );
}
