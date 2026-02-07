"use client";

import { useEffect, useRef } from "react";
import type { LeafletModule } from "./useLeaflet";
import type { NormalizedPlace } from "../../lib/types";

const DEFAULT_TILE_URL =
  process.env.NEXT_PUBLIC_OSM_TILE_URL ??
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_ATTRIBUTION =
  process.env.NEXT_PUBLIC_OSM_TILE_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const MARKER_ICON_URL =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const MARKER_ICON_RETINA_URL =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const MARKER_SHADOW_URL =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function MapPane({
  ready,
  leaflet,
  center,
  places,
  selectedId,
  onSelect
}: {
  ready: boolean;
  leaflet: LeafletModule | null;
  center: { lat: number; lng: number };
  places: NormalizedPlace[];
  selectedId: string | null;
  onSelect: (placeId: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  const markers = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const popupRef = useRef<import("leaflet").Popup | null>(null);
  const initialCenterRef = useRef(center);

  useEffect(() => {
    if (!ready || !leaflet || !mapRef.current || mapInstance.current) return;
    leaflet.Icon.Default.mergeOptions({
      iconUrl: MARKER_ICON_URL,
      iconRetinaUrl: MARKER_ICON_RETINA_URL,
      shadowUrl: MARKER_SHADOW_URL
    });

    mapInstance.current = leaflet.map(mapRef.current, {
      center: [initialCenterRef.current.lat, initialCenterRef.current.lng],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true
    });

    leaflet
      .tileLayer(DEFAULT_TILE_URL, {
        attribution: DEFAULT_ATTRIBUTION,
        maxZoom: 19
      })
      .addTo(mapInstance.current);

    popupRef.current = leaflet.popup({ maxWidth: 240, closeButton: true });

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [ready, leaflet]);

  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.setView([center.lat, center.lng], mapInstance.current.getZoom());
  }, [center]);

  useEffect(() => {
    if (!mapInstance.current || !leaflet) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current.clear();
    popupRef.current?.remove();

    if (!places.length) return;

    const bounds = leaflet.latLngBounds([]);
    places.forEach((place) => {
      const marker = leaflet.marker([place.lat, place.lng], { title: place.name });
      marker.addTo(mapInstance.current!);
      marker.on("click", () => onSelect(place.placeId));
      markers.current.set(place.placeId, marker);
      bounds.extend(marker.getLatLng());
    });

    if (places.length) {
      mapInstance.current.fitBounds(bounds, { padding: [72, 72] });
    }
  }, [places, onSelect, leaflet]);

  useEffect(() => {
    if (!mapInstance.current || !popupRef.current) return;
    if (!selectedId) {
      popupRef.current.remove();
      return;
    }
    const marker = markers.current.get(selectedId);
    const place = places.find((item) => item.placeId === selectedId);
    if (!marker || !place) return;

    const content = `<div style="font-family:Inter, sans-serif;max-width:220px"><strong>${escapeHtml(
      place.name
    )}</strong><br/>${escapeHtml(place.address || "")}</div>`;

    popupRef.current.setLatLng(marker.getLatLng()).setContent(content);
    popupRef.current.openOn(mapInstance.current);
    mapInstance.current.panTo(marker.getLatLng());
    mapInstance.current.setZoom(14);
  }, [selectedId, places]);

  return <div ref={mapRef} className="map-container h-[420px] w-full rounded-2xl" />;
}
