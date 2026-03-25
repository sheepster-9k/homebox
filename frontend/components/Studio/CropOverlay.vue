<template>
  <div
    ref="cropEl"
    class="absolute cursor-move border-2 transition-colors"
    :class="[
      isSelected ? 'border-primary bg-primary/10 shadow-lg' : 'border-blue-400/70 bg-blue-400/5',
      item?.excluded ? 'opacity-30' : '',
    ]"
    :style="positionStyle"
    @pointerdown.stop="startDrag"
    @click.stop="$emit('select')"
  >
    <!-- Label -->
    <div
      class="absolute -top-5 left-0 max-w-full truncate rounded-t bg-background/90 px-1.5 py-0.5 text-[10px] font-medium"
      :class="isSelected ? 'text-primary' : 'text-muted-foreground'"
    >
      {{ label }}
    </div>

    <!-- Resize handles (only when selected) -->
    <template v-if="isSelected">
      <div
        v-for="handle in handles"
        :key="handle.position"
        class="absolute z-10 size-2.5 rounded-full border border-background bg-primary"
        :class="handle.cursor"
        :style="handle.style"
        @pointerdown.stop="startResize($event, handle.position)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from "vue";
  import type { Bounds } from "@/lib/studio/canvas-math";
  import { clamp, MIN_CROP_SIZE } from "@/lib/studio/canvas-math";
  import type { StudioItem } from "@/stores/studio";

  const props = defineProps<{
    bounds: Bounds;
    containerWidth: number;
    containerHeight: number;
    isSelected: boolean;
    label: string;
    item?: StudioItem;
  }>();

  const emit = defineEmits<{
    select: [];
    updateBounds: [bounds: Bounds];
  }>();

  const cropEl = ref<HTMLElement | null>(null);

  const positionStyle = computed(() => ({
    left: `${props.bounds.x}px`,
    top: `${props.bounds.y}px`,
    width: `${props.bounds.width}px`,
    height: `${props.bounds.height}px`,
  }));

  type HandlePos = "nw" | "ne" | "sw" | "se";

  const handles = computed(() => [
    { position: "nw" as HandlePos, cursor: "cursor-nw-resize", style: { top: "-4px", left: "-4px" } },
    { position: "ne" as HandlePos, cursor: "cursor-ne-resize", style: { top: "-4px", right: "-4px" } },
    { position: "sw" as HandlePos, cursor: "cursor-sw-resize", style: { bottom: "-4px", left: "-4px" } },
    { position: "se" as HandlePos, cursor: "cursor-se-resize", style: { bottom: "-4px", right: "-4px" } },
  ]);

  let dragStart = { x: 0, y: 0, bounds: { ...props.bounds } };

  function startDrag(e: PointerEvent) {
    emit("select");
    dragStart = { x: e.clientX, y: e.clientY, bounds: { ...props.bounds } };
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - dragStart.x;
      const dy = ev.clientY - dragStart.y;
      emit("updateBounds", {
        x: clamp(dragStart.bounds.x + dx, 0, props.containerWidth - props.bounds.width),
        y: clamp(dragStart.bounds.y + dy, 0, props.containerHeight - props.bounds.height),
        width: props.bounds.width,
        height: props.bounds.height,
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startResize(e: PointerEvent, handle: HandlePos) {
    emit("select");
    const start = { x: e.clientX, y: e.clientY, bounds: { ...props.bounds } };
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      const b = { ...start.bounds };

      if (handle.includes("w")) {
        b.x = clamp(b.x + dx, 0, b.x + b.width - MIN_CROP_SIZE);
        b.width = start.bounds.x + start.bounds.width - b.x;
      }
      if (handle.includes("e")) {
        b.width = clamp(start.bounds.width + dx, MIN_CROP_SIZE, props.containerWidth - b.x);
      }
      if (handle.includes("n")) {
        b.y = clamp(b.y + dy, 0, b.y + b.height - MIN_CROP_SIZE);
        b.height = start.bounds.y + start.bounds.height - b.y;
      }
      if (handle.includes("s")) {
        b.height = clamp(start.bounds.height + dy, MIN_CROP_SIZE, props.containerHeight - b.y);
      }

      emit("updateBounds", b);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }
</script>
