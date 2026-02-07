"use client";

import { useEffect, useState } from "react";
import type { NormalizedPlace, PlaceDetails } from "../../lib/types";

function formatDistance(distance: number) {
  if (distance >= 1000) return `${(distance / 1000).toFixed(1)} km`;
  return `${distance} m`;
}

export default function PlaceCard({
  place,
  selected,
  detailsState,
  onSelect,
  onFetchDetails
}: {
  place: NormalizedPlace;
  selected: boolean;
  detailsState?: { data?: PlaceDetails; loading?: boolean; error?: string };
  onSelect: () => void;
  onFetchDetails: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded && !detailsState?.data && !detailsState?.loading) {
      onFetchDetails();
    }
  }, [expanded, detailsState, onFetchDetails]);

  return (
    <div
      className={`rounded-2xl border px-4 py-3 transition ${
        selected ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white"
      }`}
    >
      <button
        className="w-full text-left"
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSelect();
          }
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{place.name}</h3>
            <p className="mt-1 text-xs text-slate-500">{place.address}</p>
          </div>
          <div className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
            {formatDistance(place.distanceMeters)}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
            {place.openNow == null ? "Hours unknown" : place.openNow ? "Open now" : "Closed"}
          </span>
        </div>
      </button>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-slate-400">{place.types?.slice(0, 3).join(" • ")}</span>
        <button
          className="font-semibold text-brand-600 hover:text-brand-700"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Hide" : "More"}
        </button>
      </div>
      {expanded ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          {detailsState?.loading ? (
            <p>Loading details…</p>
          ) : detailsState?.error ? (
            <p className="text-rose-600">{detailsState.error}</p>
          ) : detailsState?.data ? (
            <div className="space-y-2">
              {detailsState.data.phone ? <p>📞 {detailsState.data.phone}</p> : null}
              {detailsState.data.website ? (
                <a
                  href={detailsState.data.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  {detailsState.data.website}
                </a>
              ) : null}
              {detailsState.data.openingHours ? (
                <ul className="list-disc space-y-1 pl-4">
                  {detailsState.data.openingHours.map((hour) => (
                    <li key={hour}>{hour}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p>No extra details.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
