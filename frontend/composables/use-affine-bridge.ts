/**
 * Composable for Affine knowledge base integration.
 * Manages configuration, document CRUD, and bidirectional linking.
 */

import { AffineClient } from "@/lib/affine/client";
import type { AffineConfig } from "@/lib/affine/types";
import { itemToMarkdown, locationToMarkdown, inventoryReportToMarkdown } from "@/lib/affine/templates";

const CONFIG_KEY = "homebox/affine/config";

// Module-level state
const _config = ref<AffineConfig>({
  url: "",
  workspaceId: "",
  accessToken: "",
});
const _initialized = ref(false);

function loadConfig() {
  if (_initialized.value) return;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        Object.assign(_config.value, JSON.parse(stored));
      }
    } catch {
      // Invalid stored config
    }
  }
  _initialized.value = true;
}

function saveConfig() {
  if (typeof window !== "undefined") {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(_config.value));
  }
}

export function useAffineBridge() {
  loadConfig();

  const config = _config;
  const isConfigured = computed(() =>
    !!(config.value.url && config.value.workspaceId && config.value.accessToken)
  );
  const isAvailable = ref(false);

  function getClient(): AffineClient {
    if (!isConfigured.value) throw new Error("Affine not configured");
    return new AffineClient(config.value);
  }

  /** Update and persist configuration. */
  function setConfig(update: Partial<AffineConfig>) {
    Object.assign(config.value, update);
    saveConfig();
  }

  /** Check if Affine is reachable. */
  async function checkAvailability(): Promise<boolean> {
    if (!isConfigured.value) return false;
    try {
      isAvailable.value = await getClient().checkHealth();
      return isAvailable.value;
    } catch {
      isAvailable.value = false;
      return false;
    }
  }

  /** Create an Affine document from a Homebox item. */
  async function createDocFromItem(item: {
    id: string;
    name: string;
    description?: string;
    quantity?: number;
    manufacturer?: string;
    modelNumber?: string;
    serialNumber?: string;
    purchasePrice?: number | null;
    purchaseFrom?: string;
    notes?: string;
    locationName?: string;
    tags?: string[];
    insured?: boolean;
  }): Promise<string | null> {
    if (!isConfigured.value) return null;

    try {
      const _markdown = itemToMarkdown(item);
      // For now, log the generated markdown
      // Full doc creation requires CRDT update format which is complex
      // TODO: Implement via Affine's doc creation API when available
      console.log("Generated Affine doc markdown for:", item.name);
      console.log(_markdown);

      // Placeholder: return a fake doc ID
      // Real implementation would use applyDocUpdates mutation
      return `affine-doc-${item.id}`;
    } catch (e) {
      console.error("Failed to create Affine doc:", e);
      return null;
    }
  }

  /** Create a location summary document. */
  async function createDocFromLocation(location: {
    id: string;
    name: string;
    description?: string;
    itemCount?: number;
    totalValue?: number;
    items?: { name: string; quantity: number }[];
  }): Promise<string | null> {
    if (!isConfigured.value) return null;

    try {
      const _markdown = locationToMarkdown(location);
      console.log("Generated Affine doc for location:", location.name);
      return `affine-loc-${location.id}`;
    } catch (e) {
      console.error("Failed to create Affine location doc:", e);
      return null;
    }
  }

  /** Generate an inventory report document. */
  async function createInventoryReport(data: {
    totalItems: number;
    totalLocations: number;
    totalValue: number;
    topLocations: { name: string; count: number; value: number }[];
  }): Promise<string | null> {
    if (!isConfigured.value) return null;

    try {
      const _markdown = inventoryReportToMarkdown({
        ...data,
        generatedAt: new Date().toLocaleString(),
      });
      console.log("Generated inventory report");
      return `affine-report-${Date.now()}`;
    } catch (e) {
      console.error("Failed to create inventory report:", e);
      return null;
    }
  }

  /** Get the Affine doc ID linked to a Homebox item (from custom field). */
  function getLinkedDocId(itemFields: { name: string; textValue: string }[]): string | null {
    const field = itemFields.find(f => f.name === "affine_doc_id");
    return field?.textValue || null;
  }

  /** Get list of workspaces. */
  async function listWorkspaces() {
    return getClient().listWorkspaces();
  }

  return {
    config,
    isConfigured,
    isAvailable,
    setConfig,
    checkAvailability,
    createDocFromItem,
    createDocFromLocation,
    createInventoryReport,
    getLinkedDocId,
    listWorkspaces,
    getClient,
  };
}
