"use client";

import { useCallback, useState } from "react";

export type GeolocationStatus = "idle" | "pending" | "granted" | "denied" | "unavailable";

export interface GeolocationState {
  status: GeolocationStatus;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Session-only, one-shot location, never watchPosition, never
 * background tracking, never persisted anywhere, this state lives only
 * in the browser tab for as long as the person is on this page. Only
 * ever requested after an explicit "Use my location" action, never on
 * page load.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    status: "idle",
    latitude: null,
    longitude: null,
  });

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unavailable", latitude: null, longitude: null });
      return;
    }

    setState((prev) => ({ ...prev, status: "pending" }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: "granted",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setState({ status: "denied", latitude: null, longitude: null });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  return { ...state, requestLocation };
}
