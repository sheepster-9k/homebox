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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Module-level cache so discovery only runs once per page load
const _discoveredUrl = ref<string | null>(null);
const _discoveryDone = ref(false);

export async function discoverHbcUrl(): Promise<string> {
  if (_discoveryDone.value) return _discoveredUrl.value || "";

  // 1. Check localStorage (user override / persisted config)
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("hbc_url");
    if (stored) {
      _discoveredUrl.value = stored;
      _discoveryDone.value = true;
      return stored;
    }
  }

  // 2. Try fetching /api/companion-config.json (static file in Homebox data dir)
  try {
    const resp = await fetch("/api/companion-config.json", { signal: AbortSignal.timeout(3000) });
    if (resp.ok) {
      const data = await resp.json();
      if (data.url) {
        _discoveredUrl.value = data.url;
        _discoveryDone.value = true;
        // Cache in localStorage for faster subsequent loads
        if (typeof window !== "undefined") localStorage.setItem("hbc_url", data.url);
        return data.url;
      }
    }
  } catch {
    // Not configured via static file, continue
  }

  // 3. Nuxt build-time fallback
  try {
    const runtimeConfig = useRuntimeConfig();
    const buildTimeUrl = runtimeConfig.public.hbcUrl as string;
    if (buildTimeUrl) {
      _discoveredUrl.value = buildTimeUrl;
      _discoveryDone.value = true;
      return buildTimeUrl;
    }
  } catch {
    // runtimeConfig not available
  }

  _discoveryDone.value = true;
  return "";
}

export function useCompanion() {
  const hbcUrl = computed(() => _discoveredUrl.value || "");

  const isEnabled = computed(() => !!hbcUrl.value);
  const isAvailable = ref(false);
  const config = ref<HBCConfig | null>(null);

  // Trigger discovery on first use
  if (!_discoveryDone.value) {
    discoverHbcUrl();
  }

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
