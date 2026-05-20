import { useState, useEffect } from 'react';

export interface Coords {
  lat: number;
  lng: number;
}

export const useGeolocation = () => {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {} // silent fail — user denied or unavailable
    );
  }, []);

  return coords;
};
