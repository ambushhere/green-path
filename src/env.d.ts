/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL?: string;
  readonly VITE_API_PROXY_BASE_URL?: string;
  readonly VITE_ROUTING_API_BASE_URL?: string;
  readonly VITE_GEOCODING_API_BASE_URL?: string;
  readonly VITE_AIR_QUALITY_API_BASE_URL?: string;
  readonly VITE_WAQI_API_BASE_URL?: string;
  /**
   * WAQI key for direct browser calls. Ships in the bundle, so prefer the proxy,
   * which keeps the token server-side.
   */
  readonly VITE_WAQI_TOKEN?: string;
  readonly VITE_IP_GEOLOCATION_API_BASE_URL?: string;
  readonly VITE_GEOCODING_LANGUAGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
