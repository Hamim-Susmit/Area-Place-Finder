"use client";

import { useEffect, useMemo, useRef } from "react";
import PlaceCard from "./PlaceCard";
import type { NormalizedPlace, PlaceDetails } from "../../lib/types";

export default function ResultsList({
  places,
  loading,
  selectedId,
  detailsMap,
  onSelect,
  onFetchDetails,
  emptyState
}: {
  places: NormalizedPlace[];
  loading: boolean;
  selectedId: string | null;
  detailsMap: Record<string, { data?: PlaceDetails; loading?: boolean; error?: string }>;
  onSelect: (placeId: string) => void;
  onFetchDetails: (placeId: string) => void;
  emptyState: boolean;
}) {
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const list = useMemo(() => places, [places]);

  useEffect(() => {
    itemRefs.current = {};
  }, [places]);

  useEffect(() => {
    if (!selectedId) return;
    const element = itemRefs.current[selectedId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedId]);

  return (
    <div className="rounded-3xl bg-white p-4 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Results</h2>
        <span className="text-xs font-medium text-slate-500">{places.length} places</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : null}

      {emptyState ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No places found. Try expanding the radius or choosing another category.
        </div>
      ) : null}

      <div className="mt-3 space-y-3 max-h-[620px] overflow-y-auto pr-1">
        {list.map((place) => (
          <div
            key={place.placeId}
            ref={(el) => {
              if (el) itemRefs.current[place.placeId] = el;
            }}
          >
            <PlaceCard
              place={place}
              selected={place.placeId === selectedId}
              detailsState={detailsMap[place.placeId]}
              onSelect={() => onSelect(place.placeId)}
              onFetchDetails={() => onFetchDetails(place.placeId)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
