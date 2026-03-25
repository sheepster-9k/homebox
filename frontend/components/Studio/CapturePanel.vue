<template>
  <div class="space-y-4">
    <!-- Upload zone -->
    <div
      class="flex h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:border-primary hover:bg-accent/50"
      :class="{ 'border-primary bg-accent/50': isDragOver }"
      @click="triggerUpload"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop.prevent="handleDrop"
    >
      <MdiCameraPlus class="mb-2 size-12 text-muted-foreground" />
      <p class="text-sm font-medium">Drop images here or click to select</p>
      <p class="text-xs text-muted-foreground">JPG, PNG, WebP &mdash; photograph a shelf, room, or items</p>
    </div>

    <!-- Action buttons -->
    <div class="flex gap-2">
      <Button class="flex-1" @click="openCamera">
        <MdiCamera class="mr-2 size-4" />
        Take Photo
      </Button>
      <Button variant="outline" class="flex-1" @click="triggerUpload">
        <MdiUpload class="mr-2 size-4" />
        Upload
      </Button>
    </div>

    <!-- Uploaded frames preview -->
    <div v-if="store.frames.length > 0" class="space-y-2">
      <p class="text-sm font-medium">{{ store.frames.length }} image(s) loaded</p>
      <div class="flex gap-2 overflow-x-auto">
        <div
          v-for="frame in store.frames"
          :key="frame.id"
          class="relative shrink-0"
        >
          <img
            :src="frame.imageData"
            :alt="frame.fileName"
            class="h-20 w-28 rounded-lg border object-cover"
            :class="{ 'ring-2 ring-primary': frame.analyzed }"
          />
          <Badge
            v-if="frame.analyzed"
            class="absolute -right-1 -top-1"
            variant="default"
          >
            <MdiCheck class="size-3" />
          </Badge>
          <button
            class="absolute -left-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground shadow-sm hover:bg-destructive/80"
            @click.stop="removeFrame(frame.id)"
          >
            <MdiClose class="size-3" />
          </button>
        </div>
      </div>
    </div>

    <!-- Hidden inputs -->
    <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleFileInput" />
    <input ref="cameraInput" type="file" accept="image/*" capture="environment" class="hidden" @change="handleFileInput" />
  </div>
</template>

<script setup lang="ts">
  import MdiCameraPlus from "~icons/mdi/camera-plus";
  import MdiCamera from "~icons/mdi/camera";
  import MdiUpload from "~icons/mdi/upload";
  import MdiCheck from "~icons/mdi/check";
  import MdiClose from "~icons/mdi/close";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { useStudioStore } from "@/stores/studio";
  import { fileToDataUrl } from "@/lib/studio/image-processing";

  const store = useStudioStore();

  const fileInput = ref<HTMLInputElement | null>(null);
  const cameraInput = ref<HTMLInputElement | null>(null);
  const isDragOver = ref(false);

  function removeFrame(id: string) {
    store.removeFrame(id);
  }

  function triggerUpload() {
    fileInput.value?.click();
  }

  function openCamera() {
    cameraInput.value?.click();
  }

  async function addFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await fileToDataUrl(file);
    store.addFrame(dataUrl, file.name);
  }

  async function handleFileInput(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await addFile(file);
    }
    // Reset input so the same file can be re-selected
    (e.target as HTMLInputElement).value = "";
  }

  async function handleDrop(e: DragEvent) {
    isDragOver.value = false;
    const files = e.dataTransfer?.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await addFile(file);
    }
  }
</script>
