<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium">
        {{ $t("studio.canvas.title") }}
      </p>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" :disabled="isDrawing" @click="startDrawMode">
          <MdiCropFree class="mr-1 size-4" />
          {{ $t("studio.canvas.add_region") }}
        </Button>
        <Button
          v-if="selectedItemId"
          variant="outline"
          size="sm"
          :disabled="isReanalyzing"
          @click="$emit('reanalyze', selectedItemId)"
        >
          <MdiRefresh class="mr-1 size-4" />
          {{ isReanalyzing ? $t("studio.canvas.reanalyzing") : $t("studio.canvas.reanalyze") }}
        </Button>
      </div>
    </div>

    <!-- Canvas container -->
    <div
      ref="container"
      class="relative overflow-hidden rounded-lg border bg-black"
      :class="{ 'cursor-crosshair': isDrawing }"
      @pointerdown="onContainerPointerDown"
    >
      <!-- Source image -->
      <img
        ref="imageEl"
        :src="frameImageData"
        alt="Source frame"
        class="block w-full"
        @load="onImageLoad"
      />

      <!-- Crop overlays -->
      <CropOverlay
        v-for="item in itemsWithBounds"
        :key="item.id"
        :bounds="item.displayBounds"
        :container-width="displayWidth"
        :container-height="displayHeight"
        :is-selected="item.id === selectedItemId"
        :label="item.name"
        :item="item"
        @select="$emit('selectItem', item.id)"
        @update-bounds="onBoundsUpdate(item.id, $event)"
      />

      <!-- Drawing overlay -->
      <div
        v-if="drawingBounds"
        class="absolute border-2 border-dashed border-green-400 bg-green-400/10"
        :style="{
          left: `${drawingBounds.x}px`,
          top: `${drawingBounds.y}px`,
          width: `${drawingBounds.width}px`,
          height: `${drawingBounds.height}px`,
        }"
      />
    </div>

    <p v-if="isDrawing" class="text-center text-xs text-muted-foreground">
      {{ $t("studio.canvas.draw_hint") }}
    </p>
  </div>
</template>

<script setup lang="ts">
  import MdiCropFree from "~icons/mdi/crop-free";
  import MdiRefresh from "~icons/mdi/refresh";
  import { Button } from "@/components/ui/button";
  import CropOverlay from "./CropOverlay.vue";
  import type { StudioItem } from "@/stores/studio";
  import type { Bounds } from "@/lib/studio/canvas-math";
  import { imageToDisplay, displayToImage, generateDefaultCrops } from "@/lib/studio/canvas-math";

  const props = defineProps<{
    frameImageData: string;
    items: StudioItem[];
    selectedItemId: string | null;
    isReanalyzing: boolean;
  }>();

  const emit = defineEmits<{
    selectItem: [id: string];
    updateItemCrop: [id: string, bounds: Bounds];
    addRegion: [bounds: Bounds];
    reanalyze: [id: string];
  }>();

  const container = ref<HTMLElement | null>(null);
  const imageEl = ref<HTMLImageElement | null>(null);
  const imageWidth = ref(0);
  const imageHeight = ref(0);
  const displayWidth = ref(0);
  const displayHeight = ref(0);
  const isDrawing = ref(false);
  const drawingBounds = ref<Bounds | null>(null);
  let drawStart = { x: 0, y: 0 };

  function onImageLoad() {
    if (!imageEl.value || !container.value) return;
    imageWidth.value = imageEl.value.naturalWidth;
    imageHeight.value = imageEl.value.naturalHeight;
    displayWidth.value = imageEl.value.clientWidth;
    displayHeight.value = imageEl.value.clientHeight;

    // Generate default crop regions for items that don't have them
    assignDefaultCrops();
  }

  function assignDefaultCrops() {
    const uncroppedItems = props.items.filter(i => !i.cropBounds);
    if (uncroppedItems.length === 0) return;

    const defaults = generateDefaultCrops(
      uncroppedItems.length,
      imageWidth.value,
      imageHeight.value,
    );

    for (let i = 0; i < uncroppedItems.length; i++) {
      emit("updateItemCrop", uncroppedItems[i]!.id, defaults[i]!);
    }
  }

  const itemsWithBounds = computed(() =>
    props.items
      .filter(i => i.cropBounds)
      .map(item => ({
        ...item,
        displayBounds: imageToDisplay(
          item.cropBounds!,
          imageWidth.value,
          imageHeight.value,
          displayWidth.value,
          displayHeight.value,
        ),
      }))
  );

  function onBoundsUpdate(itemId: string, displayBounds: Bounds) {
    const imageBounds = displayToImage(
      displayBounds,
      imageWidth.value,
      imageHeight.value,
      displayWidth.value,
      displayHeight.value,
    );
    emit("updateItemCrop", itemId, imageBounds);
  }

  function startDrawMode() {
    isDrawing.value = true;
  }

  function onContainerPointerDown(e: PointerEvent) {
    if (!isDrawing.value) return;
    const rect = container.value!.getBoundingClientRect();
    drawStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    drawingBounds.value = { x: drawStart.x, y: drawStart.y, width: 0, height: 0 };

    const onMove = (ev: PointerEvent) => {
      const cx = ev.clientX - rect.left;
      const cy = ev.clientY - rect.top;
      drawingBounds.value = {
        x: Math.min(drawStart.x, cx),
        y: Math.min(drawStart.y, cy),
        width: Math.abs(cx - drawStart.x),
        height: Math.abs(cy - drawStart.y),
      };
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (drawingBounds.value && drawingBounds.value.width > 20 && drawingBounds.value.height > 20) {
        const imageBounds = displayToImage(
          drawingBounds.value,
          imageWidth.value,
          imageHeight.value,
          displayWidth.value,
          displayHeight.value,
        );
        emit("addRegion", imageBounds);
      }
      drawingBounds.value = null;
      isDrawing.value = false;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }
</script>
