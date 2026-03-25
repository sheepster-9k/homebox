/**
 * Pinia store for the AI Studio session state.
 * Manages the full workflow: capture → detect → review → import.
 */
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Bounds } from "@/lib/studio/canvas-math";

/**
 * @deprecated Use `Bounds` from `canvas-math.ts` instead.
 */
export type CropBounds = Bounds;

export interface StudioFrame {
  id: string;
  imageData: string;
  fileName: string;
  analyzed: boolean;
}

export interface StudioItem {
  id: string;
  frameId: string;
  cropBounds: Bounds | null;
  croppedImageData: string;
  // Fields from HBC DetectedItemResponse
  name: string;
  quantity: number;
  description: string;
  tagIds: string[];
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  purchasePrice: number | null;
  purchaseFrom: string;
  notes: string;
  customFields: Record<string, string>;
  duplicateMatch: {
    itemId: string;
    itemName: string;
    serialNumber: string;
    locationName: string | null;
  } | null;
  // User overrides
  locationId: string | null;
  excluded: boolean;
  imported: boolean;
  importedItemId: string | null;
  reviewed: boolean;
}

export type StudioStep = "capture" | "detection" | "review" | "import";

export interface ImportResult {
  itemId: string;
  success: boolean;
  homeboxItemId?: string;
  error?: string;
}

export const useStudioStore = defineStore("studio", () => {
  const sessionId = ref(crypto.randomUUID());
  const sessionName = ref("");
  const currentStep = ref<StudioStep>("capture");
  const frames = ref<StudioFrame[]>([]);
  const detectedItems = ref<StudioItem[]>([]);
  const importResults = ref<ImportResult[]>([]);
  const isAnalyzing = ref(false);
  const isImporting = ref(false);
  const importProgress = ref(0);
  const selectedItemId = ref<string | null>(null);

  // Computed
  const activeItems = computed(() =>
    detectedItems.value.filter(i => !i.excluded)
  );

  const importableItems = computed(() =>
    activeItems.value.filter(i => !i.imported)
  );

  const importedCount = computed(() =>
    detectedItems.value.filter(i => i.imported).length
  );

  const selectedItem = computed(() =>
    detectedItems.value.find(i => i.id === selectedItemId.value) || null
  );

  // Actions
  function addFrame(imageData: string, fileName: string): string {
    const id = crypto.randomUUID();
    frames.value.push({ id, imageData, fileName, analyzed: false });
    return id;
  }

  function removeFrame(frameId: string) {
    frames.value = frames.value.filter(f => f.id !== frameId);
    detectedItems.value = detectedItems.value.filter(i => i.frameId !== frameId);
  }

  function addDetectedItems(frameId: string, items: Partial<StudioItem>[]) {
    for (const item of items) {
      detectedItems.value.push({
        id: crypto.randomUUID(),
        frameId,
        cropBounds: null,
        croppedImageData: "",
        name: item.name || "Unknown Item",
        quantity: item.quantity || 1,
        description: item.description || "",
        tagIds: item.tagIds || [],
        manufacturer: item.manufacturer || "",
        modelNumber: item.modelNumber || "",
        serialNumber: item.serialNumber || "",
        purchasePrice: item.purchasePrice ?? null,
        purchaseFrom: item.purchaseFrom || "",
        notes: item.notes || "",
        customFields: item.customFields || {},
        duplicateMatch: item.duplicateMatch || null,
        locationId: item.locationId || null,
        excluded: false,
        imported: false,
        importedItemId: null,
        reviewed: false,
      });
    }
    // Mark frame as analyzed
    const frame = frames.value.find(f => f.id === frameId);
    if (frame) frame.analyzed = true;
  }

  function updateItem(itemId: string, updates: Partial<StudioItem>) {
    const item = detectedItems.value.find(i => i.id === itemId);
    if (item) {
      Object.assign(item, updates);
      item.reviewed = true;
    }
  }

  function excludeItem(itemId: string) {
    const item = detectedItems.value.find(i => i.id === itemId);
    if (item) item.excluded = true;
  }

  function restoreItem(itemId: string) {
    const item = detectedItems.value.find(i => i.id === itemId);
    if (item) item.excluded = false;
  }

  function markImported(itemId: string, homeboxItemId: string) {
    const item = detectedItems.value.find(i => i.id === itemId);
    if (item) {
      item.imported = true;
      item.importedItemId = homeboxItemId;
    }
  }

  function setLocationForAll(locationId: string) {
    for (const item of activeItems.value) {
      item.locationId = locationId;
    }
  }

  function goToStep(step: StudioStep) {
    currentStep.value = step;
  }

  function reset() {
    sessionId.value = crypto.randomUUID();
    sessionName.value = "";
    currentStep.value = "capture";
    frames.value = [];
    detectedItems.value = [];
    importResults.value = [];
    isAnalyzing.value = false;
    isImporting.value = false;
    importProgress.value = 0;
    selectedItemId.value = null;
  }

  return {
    sessionId, sessionName, currentStep,
    frames, detectedItems, importResults,
    isAnalyzing, isImporting, importProgress, selectedItemId,
    // Computed
    activeItems, importableItems, importedCount, selectedItem,
    // Actions
    addFrame, removeFrame, addDetectedItems, updateItem, excludeItem, restoreItem,
    markImported, setLocationForAll, goToStep, reset,
  };
});
