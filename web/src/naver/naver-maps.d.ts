/** Naver Maps v3 최소 타입 선언 (이 프로젝트에서 쓰는 API 한정). */
declare namespace naver.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }
  class LatLngBounds {
    constructor(sw: LatLng, ne: LatLng);
    extend(latlng: LatLng): void;
  }
  class Point {
    constructor(x: number, y: number);
  }
  class Size {
    constructor(width: number, height: number);
  }

  interface MapOptions {
    center?: LatLng;
    zoom?: number;
    minZoom?: number;
    zoomControl?: boolean;
    scrollWheel?: boolean;
    draggable?: boolean;
    disableDoubleClickZoom?: boolean;
    disableKineticPan?: boolean;
    tileTransition?: boolean;
    logoControl?: boolean;
    mapDataControl?: boolean;
    scaleControl?: boolean;
  }
  class Map {
    constructor(el: HTMLElement | string, opts?: MapOptions);
    setCenter(latlng: LatLng): void;
    setZoom(zoom: number, effect?: boolean): void;
    getZoom(): number;
    fitBounds(bounds: LatLngBounds, margin?: unknown): void;
    destroy(): void;
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map;
    icon?: { content: string; anchor?: Point; size?: Size };
    zIndex?: number;
    title?: string;
  }
  class Marker {
    constructor(opts: MarkerOptions);
    setMap(map: Map | null): void;
    setPosition(latlng: LatLng): void;
    getPosition(): LatLng;
  }

  interface PolylineOptions {
    map?: Map;
    path: LatLng[];
    strokeColor?: string;
    strokeWeight?: number;
    strokeOpacity?: number;
    strokeStyle?: string;
    strokeLineCap?: string;
    strokeLineJoin?: string;
  }
  class Polyline {
    constructor(opts: PolylineOptions);
    setMap(map: Map | null): void;
    setPath(path: LatLng[]): void;
  }

  interface CircleOptions {
    map?: Map;
    center: LatLng;
    radius: number;
    strokeColor?: string;
    strokeWeight?: number;
    fillColor?: string;
    fillOpacity?: number;
  }
  class Circle {
    constructor(opts: CircleOptions);
    setMap(map: Map | null): void;
  }

  interface InfoWindowOptions {
    content: string;
    borderWidth?: number;
    disableAnchor?: boolean;
    backgroundColor?: string;
    pixelOffset?: Point;
  }
  class InfoWindow {
    constructor(opts: InfoWindowOptions);
    open(map: Map, marker: Marker): void;
    close(): void;
    setContent(content: string): void;
  }

  namespace Event {
    function addListener(target: unknown, type: string, handler: (...args: unknown[]) => void): unknown;
  }
}

interface Window {
  naver?: { maps: typeof naver.maps };
}
