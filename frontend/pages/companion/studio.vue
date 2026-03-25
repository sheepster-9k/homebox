<template>
  <div class="mx-auto max-w-screen-2xl px-4 pb-24">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/companion">
          <Button variant="ghost" size="icon">
            <MdiArrowLeft class="size-5" />
          </Button>
        </NuxtLink>
        <div>
          <h1 class="text-2xl font-bold">{{ $t("studio.title") }}</h1>
          <p class="text-sm text-muted-foreground">{{ $t("studio.description") }}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <SessionManager />
        <Badge variant="outline">
          {{ $t(`studio.steps.${store.currentStep}`) }}
        </Badge>
        <Button v-if="store.detectedItems.length > 0" variant="ghost" size="sm" @click="resetSession">
          <MdiRefresh class="mr-1 size-4" />
          {{ $t("studio.new_session") }}
        </Button>
      </div>
    </div>

    <!-- Step: Capture -->
    <div v-if="store.currentStep === 'capture'" class="space-y-4">
      <CapturePanel />

      <!-- Options -->
      <Card v-if="store.frames.length > 0" class="p-4">
        <div class="space-y-3">
          <label class="flex items-center gap-2 text-sm">
            <Switch v-model:checked="singleItemMode" />
            {{ $t("studio.single_item_mode") }}
          </label>
          <input
            v-model="extraInstructions"
            type="text"
            class="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            :placeholder="$t('studio.instructions_hint')"
          />
          <Button
            class="w-full"
            :disabled="store.isAnalyzing || store.frames.length === 0"
            @click="analyzeAllFrames"
          >
            <MdiMagnifyScan v-if="!store.isAnalyzing" class="mr-2 size-4" />
            <span v-else class="mr-2 animate-spin">&#9696;</span>
            {{ store.isAnalyzing ? $t("studio.analyzing") : $t("studio.analyze_all") }}
          </Button>
        </div>
      </Card>
    </div>

    <!-- Step: Detection (interactive canvas) -->
    <div v-if="store.currentStep === 'detection'" class="space-y-4">
      <DetectionCanvas
        v-if="store.frames.length > 0"
        :frame-image-data="store.frames[activeFrameIndex].imageData"
        :items="itemsForActiveFrame"
        :selected-item-id="store.selectedItemId"
        :is-reanalyzing="isReanalyzing"
        @select-item="store.selectedItemId = $event"
        @update-item-crop="onCropUpdate"
        @add-region="onAddRegion"
        @reanalyze="reanalyzeItem"
      />

      <!-- Frame selector (if multiple) -->
      <div v-if="store.frames.length > 1" class="flex items-center gap-2">
        <Button variant="ghost" size="sm" :disabled="activeFrameIndex === 0" @click="activeFrameIndex--">
          <MdiChevronLeft class="size-4" />
        </Button>
        <span class="text-sm text-muted-foreground">
          Frame {{ activeFrameIndex + 1 }} / {{ store.frames.length }}
        </span>
        <Button variant="ghost" size="sm" :disabled="activeFrameIndex >= store.frames.length - 1" @click="activeFrameIndex++">
          <MdiChevronRight class="size-4" />
        </Button>
      </div>

      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="store.goToStep('capture')">Back</Button>
        <Button @click="store.goToStep('review')">Continue to Review</Button>
      </div>
    </div>

    <!-- Step: Review -->
    <div v-if="store.currentStep === 'review'" class="space-y-4">
      <ItemReviewTable
        v-if="reviewViewMode === 'table'"
        :items="store.detectedItems"
        :locations="locations"
        @exclude="store.excludeItem($event)"
        @restore="store.restoreItem($event)"
        @toggle-view="reviewViewMode = 'grid'"
      />
      <ItemGrid
        v-else
        :items="store.detectedItems"
        :selected-item-id="store.selectedItemId"
        @select="store.selectedItemId = $event"
        @exclude="store.excludeItem($event)"
        @restore="store.restoreItem($event)"
        @toggle-view="reviewViewMode = 'table'"
      />

      <!-- Selected item detail panel -->
      <Card v-if="store.selectedItem" class="p-4">
        <h3 class="mb-3 text-sm font-semibold">{{ $t("studio.edit_item") }}</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="text-xs text-muted-foreground">{{ $t("studio.fields.name") }}</label>
            <input v-model="store.selectedItem.name" class="w-full rounded border bg-background px-2 py-1 text-sm" />
          </div>
          <div>
            <label class="text-xs text-muted-foreground">{{ $t("studio.fields.quantity") }}</label>
            <input v-model.number="store.selectedItem.quantity" type="number" min="1" class="w-full rounded border bg-background px-2 py-1 text-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="text-xs text-muted-foreground">{{ $t("studio.fields.description") }}</label>
            <textarea v-model="store.selectedItem.description" rows="2" class="w-full rounded border bg-background px-2 py-1 text-sm" />
          </div>
          <div>
            <label class="text-xs text-muted-foreground">{{ $t("studio.fields.manufacturer") }}</label>
            <input v-model="store.selectedItem.manufacturer" class="w-full rounded border bg-background px-2 py-1 text-sm" />
          </div>
          <div>
            <label class="text-xs text-muted-foreground">{{ $t("studio.fields.model") }}</label>
            <input v-model="store.selectedItem.modelNumber" class="w-full rounded border bg-background px-2 py-1 text-sm" />
          </div>
          <div>
            <label class="text-xs text-muted-foreground">{{ $t("studio.fields.serial") }}</label>
            <input v-model="store.selectedItem.serialNumber" class="w-full rounded border bg-background px-2 py-1 text-sm" />
          </div>
          <div>
            <label class="text-xs text-muted-foreground">{{ $t("studio.fields.price") }}</label>
            <input v-model.number="store.selectedItem.purchasePrice" type="number" step="0.01" class="w-full rounded border bg-background px-2 py-1 text-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="text-xs text-muted-foreground">{{ $t("studio.fields.notes") }}</label>
            <textarea v-model="store.selectedItem.notes" rows="2" class="w-full rounded border bg-background px-2 py-1 text-sm" />
          </div>
        </div>
      </Card>
    </div>

    <!-- Step: Import (results) -->
    <div v-if="store.currentStep === 'import'" class="space-y-4">
      <Card class="p-6 text-center">
        <MdiCheckCircle class="mx-auto mb-3 size-16 text-green-500" />
        <h2 class="text-xl font-bold">{{ $t("studio.import_complete") }}</h2>
        <p class="mt-1 text-muted-foreground">
          {{ store.importedCount }} {{ $t("studio.items_imported") }}
        </p>
        <div class="mt-4 flex justify-center gap-3">
          <Button @click="resetSession">
            <MdiCameraPlus class="mr-2 size-4" />
            {{ $t("studio.scan_more") }}
          </Button>
          <NuxtLink to="/items">
            <Button variant="outline">
              {{ $t("studio.view_inventory") }}
            </Button>
          </NuxtLink>
        </div>
      </Card>

      <!-- Import errors -->
      <Card v-if="importErrors.length > 0" class="border-destructive p-4">
        <h3 class="text-sm font-semibold text-destructive">{{ importErrors.length }} error(s)</h3>
        <ul class="mt-2 space-y-1 text-xs text-muted-foreground">
          <li v-for="err in importErrors" :key="err">{{ err }}</li>
        </ul>
      </Card>
    </div>

    <!-- Batch action bar (visible during review) -->
    <BatchActionBar
      v-if="store.currentStep === 'review'"
      :importable-count="store.importableItems.length"
      :imported-count="store.importedCount"
      :is-importing="store.isImporting"
      :progress="store.importProgress"
      :locations="locations"
      @import-all="importAll"
      @cancel="store.goToStep('capture')"
      @set-location="store.setLocationForAll($event)"
    />
  </div>
</template>

<script setup lang="ts">
  import MdiArrowLeft from "~icons/mdi/arrow-left";
  import MdiRefresh from "~icons/mdi/refresh";
  import MdiMagnifyScan from "~icons/mdi/magnify-scan";
  import MdiCheckCircle from "~icons/mdi/check-circle";
  import MdiCameraPlus from "~icons/mdi/camera-plus";
  import MdiChevronLeft from "~icons/mdi/chevron-left";
  import MdiChevronRight from "~icons/mdi/chevron-right";
  import { Card } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { Switch } from "@/components/ui/switch";
  import { useStudioStore } from "@/stores/studio";
  import { dataUrlToFile, extractCrop } from "@/lib/studio/image-processing";
  import type { Bounds } from "@/lib/studio/canvas-math";
  import CapturePanel from "@/components/Studio/CapturePanel.vue";
  import DetectionCanvas from "@/components/Studio/DetectionCanvas.vue";
  import ItemGrid from "@/components/Studio/ItemGrid.vue";
  import BatchActionBar from "@/components/Studio/BatchActionBar.vue";
  import ItemReviewTable from "@/components/Studio/ItemReviewTable.vue";
  import SessionManager from "@/components/Studio/SessionManager.vue";

  definePageMeta({ middleware: ["auth"] });

  const store = useStudioStore();
  const { detectItems, batchCreateItems, getLocations, isEnabled } = useCompanion();
  const { t } = useI18n();

  const singleItemMode = ref(false);
  const extraInstructions = ref("");
  const locations = ref<{ id: string; name: string }[]>([]);
  const importErrors = ref<string[]>([]);
  const activeFrameIndex = ref(0);
  const isReanalyzing = ref(false);
  const reviewViewMode = ref<"grid" | "table">("grid");

  // Items for the currently displayed frame in the detection canvas
  const itemsForActiveFrame = computed(() => {
    if (store.frames.length === 0) return [];
    const frameId = store.frames[activeFrameIndex.value]?.id;
    return store.detectedItems.filter(i => i.frameId === frameId);
  });

  // Fetch locations on mount
  onMounted(async () => {
    if (!isEnabled.value) return;
    try {
      const locs = await getLocations();
      locations.value = (locs as { id: string; name: string }[]) || [];
    } catch {
      // Locations will be empty — user can still import without location
    }
  });

  async function analyzeAllFrames() {
    store.isAnalyzing = true;
    try {
      for (const frame of store.frames) {
        if (frame.analyzed) continue;
        const file = dataUrlToFile(frame.imageData, frame.fileName);
        const result = await detectItems(file, {
          singleItem: singleItemMode.value,
          extraInstructions: extraInstructions.value || undefined,
        });

        const items = result.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          description: item.description || "",
          tagIds: item.tag_ids || [],
          manufacturer: item.manufacturer || "",
          modelNumber: item.model_number || "",
          serialNumber: item.serial_number || "",
          purchasePrice: item.purchase_price,
          purchaseFrom: item.purchase_from || "",
          notes: item.notes || "",
          customFields: item.custom_fields || {},
          duplicateMatch: item.duplicate_match ? {
            itemId: item.duplicate_match.item_id,
            itemName: item.duplicate_match.item_name,
            serialNumber: item.duplicate_match.serial_number,
            locationName: item.duplicate_match.location_name,
          } : null,
        }));

        store.addDetectedItems(frame.id, items);
      }
      store.goToStep("detection");
    } catch (e: any) {
      console.error("Analysis failed:", e);
    } finally {
      store.isAnalyzing = false;
    }
  }

  function onCropUpdate(itemId: string, bounds: Bounds) {
    store.updateItem(itemId, { cropBounds: bounds });
  }

  async function onAddRegion(bounds: Bounds) {
    // User drew a new region — analyze it as a single item
    const frame = store.frames[activeFrameIndex.value];
    if (!frame) return;

    isReanalyzing.value = true;
    try {
      const cropped = await extractCrop(frame.imageData, bounds);
      const file = dataUrlToFile(cropped, `crop-${Date.now()}.jpg`);
      const result = await detectItems(file, { singleItem: true });

      if (result.items.length > 0) {
        const items = result.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          description: item.description || "",
          tagIds: item.tag_ids || [],
          manufacturer: item.manufacturer || "",
          modelNumber: item.model_number || "",
          serialNumber: item.serial_number || "",
          purchasePrice: item.purchase_price,
          purchaseFrom: item.purchase_from || "",
          notes: item.notes || "",
          customFields: item.custom_fields || {},
          duplicateMatch: item.duplicate_match ? {
            itemId: item.duplicate_match.item_id,
            itemName: item.duplicate_match.item_name,
            serialNumber: item.duplicate_match.serial_number,
            locationName: item.duplicate_match.location_name,
          } : null,
          cropBounds: bounds,
          croppedImageData: cropped,
        }));
        store.addDetectedItems(frame.id, items);
      }
    } catch (e) {
      console.error("Region analysis failed:", e);
    } finally {
      isReanalyzing.value = false;
    }
  }

  async function reanalyzeItem(itemId: string) {
    const item = store.detectedItems.find(i => i.id === itemId);
    if (!item || !item.cropBounds) return;

    const frame = store.frames.find(f => f.id === item.frameId);
    if (!frame) return;

    isReanalyzing.value = true;
    try {
      const cropped = await extractCrop(frame.imageData, item.cropBounds);
      const file = dataUrlToFile(cropped, `reanalyze-${Date.now()}.jpg`);
      const result = await detectItems(file, { singleItem: true });

      if (result.items.length > 0) {
        const detected = result.items[0];
        store.updateItem(itemId, {
          name: detected.name,
          quantity: detected.quantity,
          description: detected.description || "",
          manufacturer: detected.manufacturer || "",
          modelNumber: detected.model_number || "",
          serialNumber: detected.serial_number || "",
          purchasePrice: detected.purchase_price,
          notes: detected.notes || "",
          croppedImageData: cropped,
        });
      }
    } catch (e) {
      console.error("Re-analysis failed:", e);
    } finally {
      isReanalyzing.value = false;
    }
  }

  async function importAll() {
    store.isImporting = true;
    store.importProgress = 0;
    importErrors.value = [];

    const items = store.importableItems;
    const batchPayload = items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      description: item.description,
      location_id: item.locationId || undefined,
      tag_ids: item.tagIds.length > 0 ? item.tagIds : undefined,
      serial_number: item.serialNumber || undefined,
      model_number: item.modelNumber || undefined,
      manufacturer: item.manufacturer || undefined,
      purchase_price: item.purchasePrice || undefined,
      purchase_from: item.purchaseFrom || undefined,
      notes: item.notes || undefined,
      custom_fields: Object.keys(item.customFields).length > 0 ? item.customFields : undefined,
    }));

    try {
      const result = await batchCreateItems(batchPayload, items[0]?.locationId || undefined);

      // Mark items as imported
      for (let i = 0; i < items.length; i++) {
        if (result.created[i]) {
          const created = result.created[i] as { id?: string };
          store.markImported(items[i].id, created.id || "");
        }
      }

      if (result.errors.length > 0) {
        importErrors.value = result.errors;
      }

      store.importProgress = items.length;
      store.goToStep("import");
    } catch (e: any) {
      importErrors.value = [e.message || "Batch import failed"];
    } finally {
      store.isImporting = false;
    }
  }

  function resetSession() {
    store.reset();
    singleItemMode.value = false;
    extraInstructions.value = "";
    importErrors.value = [];
  }
</script>
