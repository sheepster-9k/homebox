/**
 * Composable for interacting with the Homebox Companion (HBC) API.
 *
 * HBC runs as a sidecar service providing AI-powered features:
 * - Vision: snap photos to auto-identify and catalog items
 * - Chat: natural language inventory queries
 * - QR: barcode/QR scanning for item lookup
 *
 * The HBC URL is configured via the NUXT_PUBLIC_HBC_URL runtime config,
 * defaulting to "" (disabled) when not set.
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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useCompanion() {
  const runtimeConfig = useRuntimeConfig();
  const hbcUrl = computed(() => runtimeConfig.public.hbcUrl as string || "");

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
  };
}
