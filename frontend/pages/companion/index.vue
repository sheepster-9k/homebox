<template>
  <BaseContainer>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">{{ $t("companion.title") }}</h1>
          <p class="mt-1 text-muted-foreground">{{ $t("companion.description") }}</p>
        </div>
        <Badge v-if="version" variant="outline">v{{ version }}</Badge>
      </div>

      <div v-if="!isEnabled" class="rounded-lg border border-dashed p-8 text-center">
        <MdiRobotConfused class="mx-auto size-12 text-muted-foreground" />
        <h3 class="mt-4 text-lg font-medium">{{ $t("companion.not_configured") }}</h3>
        <p class="mt-2 text-sm text-muted-foreground">{{ $t("companion.not_configured_hint") }}</p>
      </div>

      <div v-else-if="!isAvailable" class="rounded-lg border border-dashed p-8 text-center">
        <MdiCloudOffOutline class="mx-auto size-12 text-muted-foreground" />
        <h3 class="mt-4 text-lg font-medium">{{ $t("companion.unavailable") }}</h3>
        <p class="mt-2 text-sm text-muted-foreground">{{ $t("companion.unavailable_hint") }}</p>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <!-- AI Chat -->
        <NuxtLink to="/companion/chat" class="group">
          <Card class="p-6 transition-colors hover:bg-accent">
            <div class="flex items-start gap-4">
              <div class="rounded-lg bg-emerald-500/10 p-3">
                <MdiChatProcessing class="size-6 text-emerald-500" />
              </div>
              <div>
                <h3 class="font-semibold group-hover:underline">{{ $t("companion.chat.title") }}</h3>
                <p class="mt-1 text-sm text-muted-foreground">{{ $t("companion.chat.description") }}</p>
              </div>
            </div>
          </Card>
        </NuxtLink>

        <!-- Camera Capture -->
        <NuxtLink to="/companion/capture" class="group">
          <Card class="p-6 transition-colors hover:bg-accent">
            <div class="flex items-start gap-4">
              <div class="rounded-lg bg-amber-500/10 p-3">
                <MdiCameraPlus class="size-6 text-amber-500" />
              </div>
              <div>
                <h3 class="font-semibold group-hover:underline">{{ $t("companion.capture.title") }}</h3>
                <p class="mt-1 text-sm text-muted-foreground">{{ $t("companion.capture.description") }}</p>
              </div>
            </div>
          </Card>
        </NuxtLink>

        <!-- QR/Barcode Scanner -->
        <NuxtLink to="/companion/qr" class="group">
          <Card class="p-6 transition-colors hover:bg-accent">
            <div class="flex items-start gap-4">
              <div class="rounded-lg bg-blue-500/10 p-3">
                <MdiQrcodeScan class="size-6 text-blue-500" />
              </div>
              <div>
                <h3 class="font-semibold group-hover:underline">{{ $t("companion.qr.title") }}</h3>
                <p class="mt-1 text-sm text-muted-foreground">{{ $t("companion.qr.description") }}</p>
              </div>
            </div>
          </Card>
        </NuxtLink>
      </div>

      <!-- Semantic Search (above features grid) -->
      <div v-if="isAvailable" class="pt-2">
        <SemanticSearch />
      </div>

      <!-- Affine Integration Settings -->
      <div class="pt-4">
        <BridgeSettings />
      </div>
    </div>
  </BaseContainer>
</template>

<script setup lang="ts">
  import BridgeSettings from "@/components/Affine/BridgeSettings.vue";
  import SemanticSearch from "@/components/Studio/SemanticSearch.vue";
  import MdiRobotConfused from "~icons/mdi/robot-confused";
  import MdiCloudOffOutline from "~icons/mdi/cloud-off-outline";
  import MdiChatProcessing from "~icons/mdi/chat-processing";
  import MdiCameraPlus from "~icons/mdi/camera-plus";
  import MdiQrcodeScan from "~icons/mdi/qrcode-scan";

  definePageMeta({ middleware: ["auth"] });

  const companion = useCompanion();
  const { isEnabled, isAvailable } = companion;
  const version = ref("");

  onMounted(async () => {
    if (isEnabled.value) {
      const available = await companion.checkAvailability();
      if (available) {
        try {
          const data = await companion.hbcFetch<{ version: string }>("/api/version");
          version.value = data.version;
        } catch {
          // ignore
        }
      }
    }
  });
</script>
