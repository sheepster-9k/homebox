/**
 * Composable for interacting with the Homebox Companion (HBC) API.
 *
 * HBC runs as a sidecar service providing AI-powered features:
 * - Vision: snap photos to auto-identify and catalog items
 * - Chat: natural language inventory queries
 * - QR: barcode/QR scanning for item lookup
 *
 * Discovery: The HBC URL is resolved at runtime (not build time) via:
 * 1. localStorage "hbc_url" (set once, persists across sessions)
 * 2. /api/companion-config.json (static file served by Homebox)
 * 3. NUXT_PUBLIC_HBC_URL build-time fallback
 *
 * To configure, either:
 * - Place a companion-config.json in Homebox's static dir: {"url": "http://host:port"}
 * - Or set localStorage.hbc_url in the browser console
 * - Or set NUXT_PUBLIC_HBC_URL at Docker build time
 */

interface HBCConfig {
  is_demo_mode: boolean;
  homebox_url: string;
  llm_model: string;
  image_quality: string;
  capture_max_images: number;
  capture_max_file_size_mb: number;
}

interface HBCVersion {
  version: string;
  latest_version: string | null;
  update_available: boolean;
}

export interface DetectedItem {
  name: string;
  quantity: number;
  description: string | null;
  tag_ids: string[] | null;
  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;
  purchase_price: number | null;
  purchase_from: string | null;
  notes: string | null;
  custom_fields: Record<string, string> | null;
  duplicate_match: {
    item_id: string;
    item_name: string;
    serial_number: string;
    location_name: string | null;
  } | null;
}

export function useCompanion() {
  // Read HBC URL: localStorage override > Nuxt runtimeConfig (baked at build time)
  const runtimeConfig = useRuntimeConfig();
  const hbcUrl = computed(() => {
    if (typeof window !== "undefined") {
      const override = localStorage.getItem("hbc_url");
      if (override) return override;
    }
    return (runtimeConfig.public.hbcUrl as string) || "";
  });

  const isEnabled = computed(() => !!hbcUrl.value);
  const isAvailable = ref(false);
  const config = ref<HBCConfig | null>(null);

  /**
   * Get the auth token from the current user context.
   * HBC accepts the same Homebox bearer token.
   */
  function getAuthHeaders(): Record<string, string> {
    const authCtx = useAuthContext();
    const token = authCtx.token.value;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  /** Base fetch wrapper for HBC API calls. */
  async function hbcFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${hbcUrl.value}${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options?.headers || {}),
    };
    const resp = await fetch(url, { ...options, headers });
    if (!resp.ok) {
      throw new Error(`HBC API error: ${resp.status} ${resp.statusText}`);
    }
    return resp.json();
  }

  /** Check if HBC is reachable. */
  async function checkAvailability(): Promise<boolean> {
    if (!isEnabled.value) return false;
    try {
      const data = await hbcFetch<HBCVersion>("/api/version");
      isAvailable.value = !!data.version;
      return isAvailable.value;
    } catch {
      isAvailable.value = false;
      return false;
    }
  }

  /** Get HBC configuration. */
  async function getConfig(): Promise<HBCConfig | null> {
    try {
      config.value = await hbcFetch<HBCConfig>("/api/config");
      return config.value;
    } catch {
      return null;
    }
  }

  /** Send a chat message and get a response. */
  async function chat(
    message: string,
    sessionId?: string,
  ): Promise<ReadableStream | null> {
    const url = `${hbcUrl.value}/api/chat/stream`;
    const headers = {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    };
    const body: Record<string, unknown> = { message };
    if (sessionId) body.session_id = sessionId;

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!resp.ok || !resp.body) return null;
    return resp.body;
  }

  /** Search items via HBC (uses AI-enhanced search). */
  async function searchItems(query: string) {
    return hbcFetch<{ items: unknown[] }>("/api/items/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
  }

  /** Get all locations. */
  async function getLocations() {
    return hbcFetch<unknown[]>("/api/locations");
  }

  /** Get the full HBC URL for iframe embedding or linking. */
  function getPageUrl(path: string = "/"): string {
    return `${hbcUrl.value}${path}`;
  }

  // --- Studio API methods ---

  interface DetectResponse {
    items: DetectedItem[];
    message: string;
    compressed_images: { data: string; mime_type: string }[];
  }

  interface BatchCreateItem {
    name: string;
    quantity?: number;
    description?: string;
    location_id?: string;
    tag_ids?: string[];
    serial_number?: string;
    model_number?: string;
    manufacturer?: string;
    purchase_price?: number;
    purchase_from?: string;
    notes?: string;
    custom_fields?: Record<string, string>;
  }

  interface BatchCreateResponse {
    created: unknown[];
    errors: string[];
    message: string;
  }

  /** Detect items in an image via HBC vision API. */
  async function detectItems(
    image: File,
    options?: { singleItem?: boolean; extraInstructions?: string },
  ): Promise<DetectResponse> {
    const formData = new FormData();
    formData.append("image", image);
    formData.append("single_item", String(options?.singleItem ?? false));
    if (options?.extraInstructions) {
      formData.append("extra_instructions", options.extraInstructions);
    }

    const resp = await fetch(`${hbcUrl.value}/api/tools/vision/detect`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!resp.ok) throw new Error(`Detection failed: ${resp.status}`);
    return resp.json();
  }

  /** Batch create items in Homebox via HBC. */
  async function batchCreateItems(
    items: BatchCreateItem[],
    fallbackLocationId?: string,
  ): Promise<BatchCreateResponse> {
    return hbcFetch<BatchCreateResponse>("/api/items", {
      method: "POST",
      body: JSON.stringify({
        items,
        location_id: fallbackLocationId,
      }),
    });
  }

  return {
    hbcUrl,
    isEnabled,
    isAvailable,
    config,
    checkAvailability,
    getConfig,
    chat,
    searchItems,
    getLocations,
    getPageUrl,
    hbcFetch,
    detectItems,
    batchCreateItems,
  };
}
