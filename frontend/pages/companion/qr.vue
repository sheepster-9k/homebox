<template>
  <BaseContainer>
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <NuxtLink to="/companion">
          <Button variant="ghost" size="icon">
            <MdiArrowLeft class="size-5" />
          </Button>
        </NuxtLink>
        <h1 class="text-xl font-bold">{{ $t("companion.qr.title") }}</h1>
      </div>

      <Card class="p-6">
        <!-- Scanner -->
        <div v-if="!scannedResult" class="space-y-4">
          <div ref="videoContainer" class="relative overflow-hidden rounded-lg bg-black">
            <video ref="videoEl" class="h-64 w-full object-cover" autoplay playsinline muted />
            <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div class="size-48 rounded-lg border-2 border-white/50" />
            </div>
          </div>
          <p class="text-center text-sm text-muted-foreground">
            <MdiQrcodeScan class="mb-1 mr-1 inline size-4" />
            {{ scanning ? $t("companion.qr.scanning") : $t("companion.qr.initializing") }}
          </p>
          <div class="flex justify-center">
            <Button v-if="!scanning" @click="startScanning">
              {{ $t("companion.qr.start") }}
            </Button>
            <Button v-else variant="outline" @click="stopScanning">
              {{ $t("companion.qr.stop") }}
            </Button>
          </div>
        </div>

        <!-- Result -->
        <div v-else class="space-y-4">
          <div class="rounded-lg bg-accent p-4">
            <p class="text-sm font-medium text-muted-foreground">{{ $t("companion.qr.result") }}</p>
            <p class="mt-1 break-all font-mono text-sm">{{ scannedResult }}</p>
          </div>

          <div v-if="resolvedUrl && resolvedUrl !== scannedResult" class="rounded-lg bg-accent p-4">
            <p class="text-sm font-medium text-muted-foreground">{{ $t("companion.qr.resolved") }}</p>
            <p class="mt-1 break-all font-mono text-sm">{{ resolvedUrl }}</p>
          </div>

          <div v-if="resolving" class="text-center text-sm text-muted-foreground">
            {{ $t("companion.qr.resolving") }}
          </div>

          <div class="flex gap-2">
            <Button v-if="itemUrl" class="flex-1" @click="navigateTo(itemUrl)">
              <MdiPackageVariant class="mr-2 size-4" />
              {{ $t("companion.qr.open_item") }}
            </Button>
            <Button v-else-if="isUrl" variant="outline" class="flex-1" as="a" :href="resolvedUrl || scannedResult" target="_blank">
              <MdiOpenInNew class="mr-2 size-4" />
              {{ $t("companion.qr.open_link") }}
            </Button>
            <Button variant="outline" @click="resetScan">
              <MdiQrcodeScan class="mr-2 size-4" />
              {{ $t("companion.qr.scan_again") }}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  </BaseContainer>
</template>

<script setup lang="ts">
  import { BrowserMultiFormatReader } from "@zxing/library";
  import MdiArrowLeft from "~icons/mdi/arrow-left";
  import MdiQrcodeScan from "~icons/mdi/qrcode-scan";
  import MdiPackageVariant from "~icons/mdi/package-variant";
  import MdiOpenInNew from "~icons/mdi/open-in-new";

  definePageMeta({ middleware: ["auth"] });

  const { hbcFetch } = useCompanion();

  const videoEl = ref<HTMLVideoElement | null>(null);
  const scanning = ref(false);
  const scannedResult = ref<string | null>(null);
  const resolvedUrl = ref<string | null>(null);
  const resolving = ref(false);
  const itemUrl = ref<string | null>(null);

  let reader: BrowserMultiFormatReader | null = null;
  let stream: MediaStream | null = null;

  const isUrl = computed(() => {
    const val = scannedResult.value || "";
    return val.startsWith("http://") || val.startsWith("https://");
  });

  async function startScanning() {
    try {
      reader = new BrowserMultiFormatReader();
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoEl.value) {
        videoEl.value.srcObject = stream;
      }
      scanning.value = true;
      scanLoop();
    } catch (e) {
      console.error("Camera error:", e);
    }
  }

  async function scanLoop() {
    if (!reader || !videoEl.value || !scanning.value) return;

    try {
      const result = await reader.decodeOnceFromVideoDevice(undefined, videoEl.value);
      if (result) {
        scannedResult.value = result.getText();
        stopScanning();
        await processResult(result.getText());
        return;
      }
    } catch {
      // No decode yet, keep scanning
    }

    if (scanning.value) {
      requestAnimationFrame(() => scanLoop());
    }
  }

  function stopScanning() {
    scanning.value = false;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (reader) {
      reader.reset();
      reader = null;
    }
  }

  async function processResult(text: string) {
    // Check if it's a URL that might need resolving
    if (!isUrl.value) return;

    // Try to extract item ID from Homebox URL patterns
    const itemMatch = text.match(/\/item\/([a-f0-9-]+)/i);
    if (itemMatch) {
      itemUrl.value = `/item/${itemMatch[1]}`;
      return;
    }

    // Try resolving shortened URLs via HBC
    if (text.includes("bit.ly") || text.includes("t.co") || text.length < 50) {
      resolving.value = true;
      try {
        const data = await hbcFetch<{ resolved_url: string }>("/api/qr/resolve", {
          method: "POST",
          body: JSON.stringify({ url: text }),
        });
        resolvedUrl.value = data.resolved_url;
        // Check resolved URL for item pattern
        const resolvedMatch = data.resolved_url.match(/\/item\/([a-f0-9-]+)/i);
        if (resolvedMatch) {
          itemUrl.value = `/item/${resolvedMatch[1]}`;
        }
      } catch {
        // Resolve failed, show raw URL
      } finally {
        resolving.value = false;
      }
    }
  }

  function resetScan() {
    scannedResult.value = null;
    resolvedUrl.value = null;
    itemUrl.value = null;
    resolving.value = false;
    startScanning();
  }

  onUnmounted(() => {
    stopScanning();
  });
</script>
