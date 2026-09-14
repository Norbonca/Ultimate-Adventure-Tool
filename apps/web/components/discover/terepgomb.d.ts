/**
 * Type surface for the plain-JS globe renderer (`terepgomb.js`).
 * Keep in sync with that file — it is the implementation, this is the contract.
 */

export interface GlobeMarker {
  id: string;
  slug: string;
  title: string;
  lat: number;
  lng: number;
  /** 'country_centroid' markers are approximate placeholders, not real locations. */
  geocodeSource: string;
  country: string;
  region: string | null;
  city: string | null;
  startDate: string | null;
  endDate: string | null;
  difficulty: number;
  priceAmount: number | null;
  priceCurrency: string;
  isCostSharing: boolean;
  spotsLeft: number;
  imageUrl: string | null;
  categoryId: string;
  categoryName: string | null;
  categoryNameLocalized: Record<string, string> | null;
  categoryColor: string | null;
}

export interface ScreenPosition {
  x: number;
  y: number;
}

export interface TerepgombOptions {
  textureUrl?: string;
  markerColor?: string;
  atmosphereColor?: string;
  autoRotate?: boolean;
  initialLat?: number;
  initialLng?: number;
  onMarkerClick?: (marker: GlobeMarker) => void;
  onMarkerHover?: (marker: GlobeMarker | null, position: ScreenPosition | null) => void;
}

export declare class Terepgomb {
  constructor(container: HTMLElement, options?: TerepgombOptions);
  setMarkers(markers: GlobeMarker[]): void;
  /** Canvas-relative pixel positions of the markers facing the camera. */
  getMarkerScreenPositions(): { marker: GlobeMarker; x: number; y: number }[];
  focusOn(lat: number, lng: number): void;
  resize(): void;
  destroy(): void;
}

export declare function isWebGLAvailable(): boolean;
export declare function latLngToVector3(
  lat: number,
  lng: number,
  radius?: number
): { x: number; y: number; z: number };

export default Terepgomb;
