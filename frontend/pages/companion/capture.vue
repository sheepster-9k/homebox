<template>
  <BaseContainer>
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <NuxtLink to="/companion">
          <Button variant="ghost" size="icon">
            <MdiArrowLeft class="size-5" />
          </Button>
        </NuxtLink>
        <h1 class="text-xl font-bold">{{ $t("companion.capture.title") }}</h1>
      </div>

      <!-- Camera / Upload -->
      <Card v-if="!results" class="p-6">
        <div v-if="!imageData" class="space-y-4">
          <div
            class="flex h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:border-primary hover:bg-accent/50"
            @click="triggerUpload"
            @dragover.prevent
            @drop.prevent="handleDrop"
          >
            <MdiCameraPlus class="mb-2 size-12 text-muted-foreground" />
            <p class="text-sm font-medium">{{ $t("companion.capture.drop_hint") }}</p>
            <p class="text-xs text-muted-foreground">{{ $t("companion.capture.formats") }}</p>
          </div>
          <div class="flex gap-2">
            <Button class="flex-1" @click="openCamera">
              <MdiCamera class="mr-2 size-4" />
              {{ $t("companion.capture.take_photo") }}
            </Button>
            <Button variant="outline" class="flex-1" @click="triggerUpload">
              <MdiUpload class="mr-2 size-4" />
              {{ $t("companion.capture.upload") }}
            </Button>
          </div>
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFile" />
          <input ref="cameraInput" type="file" accept="image/*" capture="environment" class="hidden" @change="handleFile" />
        </div>

        <!-- Preview + options -->
        <div v-else class="space-y-4">
          <img :src="imageData" alt="Captured" class="max-h-64 w-full rounded-lg object-contain" />
          <div class="space-y-2">
            <label class="flex items-center gap-2 text-sm">
              <Switch v-model:checked="singleItem" />
              {{ $t("companion.capture.single_item") }}
            </label>
            <input
              v-model="extraInstructions"
              type="text"
              class="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              :placeholder="$t('companion.capture.instructions_hint')"
            />
          </div>
          <div class="flex gap-2">
            <Button class="flex-1" :disabled="analyzing" @click="analyzeImage">
              <MdiMagnifyScan v-if="!analyzing" class="mr-2 size-4" />
              <span v-if="analyzing" class="mr-2 animate-spin">&#9696;</span>
              {{ analyzing ? $t("companion.capture.analyzing") : $t("companion.capture.analyze") }}
            </Button>
            <Button variant="outline" @click="resetCapture">
              {{ $t("companion.capture.retake") }}
            </Button>
          </div>
        </div>
      </Card>

      <!-- Results -->
      <div v-if="results" class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            {{ $t("companion.capture.found_items", { count: results.items.length }) }}
          </h2>
          <Button variant="outline" size="sm" @click="resetCapture">
            {{ $t("companion.capture.scan_another") }}
          </Button>
        </div>
        <Card v-for="(item, i) in results.items" :key="i" class="p-4">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-semibold">{{ item.name }}</h3>
              <p v-if="item.description" class="mt-1 text-sm text-muted-foreground">{{ item.description }}</p>
              <div class="mt-2 flex flex-wrap gap-1">
                <Badge v-if="item.location" variant="outline">{{ item.location }}</Badge>
                <Badge v-if="item.quantity > 1" variant="secondary">x{{ item.quantity }}</Badge>
                <Badge v-for="tag in (item.tags || [])" :key="tag" variant="secondary">{{ tag }}</Badge>
              </div>
            </div>
            <Badge :variant="item.duplicate ? 'destructive' : 'default'">
              {{ item.duplicate ? $t("companion.capture.duplicate") : $t("companion.capture.new_item") }}
            </Badge>
          </div>
        </Card>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      </div>
    </div>
  </BaseContainer>
</template>

<script setup lang="ts">
  import MdiArrowLeft from "~icons/mdi/arrow-left";
  import MdiCameraPlus from "~icons/mdi/camera-plus";
  import MdiCamera from "~icons/mdi/camera";
  import MdiUpload from "~icons/mdi/upload";
  import MdiMagnifyScan from "~icons/mdi/magnify-scan";

  definePageMeta({ middleware: ["auth"] });

  const { detectItems } = useCompanion();

  const fileInput = ref<HTMLInputElement | null>(null);
  const cameraInput = ref<HTMLInputElement | null>(null);
  const imageData = ref<string | null>(null);
  const imageFile = ref<File | null>(null);
  const singleItem = ref(false);
  const extraInstructions = ref("");
  const analyzing = ref(false);
  const results = ref<any>(null);
  const error = ref("");

  function triggerUpload() {
    fileInput.value?.click();
  }

  function openCamera() {
    cameraInput.value?.click();
  }

  function handleFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    imageFile.value = file;
    const reader = new FileReader();
    reader.onload = () => { imageData.value = reader.result as string; };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: DragEvent) {
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    imageFile.value = file;
    const reader = new FileReader();
    reader.onload = () => { imageData.value = reader.result as string; };
    reader.readAsDataURL(file);
  }

  function resetCapture() {
    imageData.value = null;
    imageFile.value = null;
    results.value = null;
    error.value = "";
    extraInstructions.value = "";
  }

  async function analyzeImage() {
    if (!imageFile.value) return;
    analyzing.value = true;
    error.value = "";

    try {
      results.value = await detectItems(imageFile.value, {
        singleItem: singleItem.value,
        extraInstructions: extraInstructions.value || undefined,
      });
    } catch (e: any) {
      error.value = e.message || "Analysis failed";
    } finally {
      analyzing.value = false;
    }
  }
</script>
