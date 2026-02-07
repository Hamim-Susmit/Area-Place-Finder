export type Category = "restaurants" | "medical";

export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export type NormalizedPlace = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  types?: string[];
  distanceMeters: number;
};

export type PlaceDetails = {
  phone?: string;
  website?: string;
  openingHours?: string[];
};

export type NearbyResult = {
  results: NormalizedPlace[];
  nextPageToken?: string;
};
