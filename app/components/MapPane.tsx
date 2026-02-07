"use client";

import { useEffect, useRef } from "react";
import type { NormalizedPlace } from "../../lib/types";

const mapStyles: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ saturation: -20 }] },
  { featureType: "road", elementType: "geometry", stylers: [{ lightness: 20 }] }
];

export default function MapPane({
  ready,
  center,
  places,
  selectedId,
  onSelect
}: {
  ready: boolean;
  center: { lat: number; lng: number };
  places: NormalizedPlace[];
  selectedId: string | null;
  onSelect: (placeId: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map>();
  const markers = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindow = useRef<google.maps.InfoWindow>();

  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return;
    mapInstance.current = new google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      styles: mapStyles,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false
    });
    infoWindow.current = new google.maps.InfoWindow();
  }, [ready, center]);

  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.setCenter(center);
  }, [center]);

  useEffect(() => {
    if (!mapInstance.current) return;
    markers.current.forEach((marker) => marker.setMap(null));
    markers.current.clear();

    const bounds = new google.maps.LatLngBounds();
    places.forEach((place) => {
      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map: mapInstance.current,
        title: place.name
      });
      marker.addListener("click", () => onSelect(place.placeId));
      markers.current.set(place.placeId, marker);
      bounds.extend(marker.getPosition()!);
    });

    if (places.length) {
      mapInstance.current.fitBounds(bounds, 72);
    }
  }, [places, onSelect]);

  useEffect(() => {
    if (!mapInstance.current || !infoWindow.current) return;
    if (!selectedId) {
      infoWindow.current.close();
      return;
    }
    const marker = markers.current.get(selectedId);
    const place = places.find((item) => item.placeId === selectedId);
    if (!marker || !place) return;

    infoWindow.current.setContent(
      `<div style="font-family:Inter, sans-serif;max-width:220px"><strong>${place.name}</strong><br/>${place.address}</div>`
    );
    infoWindow.current.open({ map: mapInstance.current, anchor: marker });
    mapInstance.current.panTo(marker.getPosition()!);
    mapInstance.current.setZoom(14);
  }, [selectedId, places]);

  return <div ref={mapRef} className="map-container h-[420px] w-full rounded-2xl" />;
}
