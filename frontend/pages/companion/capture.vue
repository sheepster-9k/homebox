<template>
  <BaseContainer>
    <div class="flex h-[calc(100vh-10rem)] flex-col items-center justify-center space-y-6">
      <div class="rounded-lg bg-amber-500/10 p-6">
        <MdiCameraPlus class="size-16 text-amber-500" />
      </div>
      <div class="text-center">
        <h1 class="text-2xl font-bold">{{ $t("companion.capture.title") }}</h1>
        <p class="mt-2 max-w-md text-muted-foreground">{{ $t("companion.capture.description") }}</p>
      </div>
      <Button size="lg" @click="openCapture">
        <MdiOpenInNew class="mr-2 size-5" />
        {{ $t("companion.capture.open") }}
      </Button>
      <NuxtLink to="/companion" class="text-sm text-muted-foreground hover:underline">
        {{ $t("companion.back") }}
      </NuxtLink>
    </div>
  </BaseContainer>
</template>

<script setup lang="ts">
  import MdiCameraPlus from "~icons/mdi/camera-plus";
  import MdiOpenInNew from "~icons/mdi/open-in-new";

  definePageMeta({ middleware: ["auth"] });

  const { hbcUrl } = useCompanion();
  const authCtx = useAuthContext();

  function openCapture() {
    const token = authCtx.token.value;
    // Open HBC directly (not through /hbc/ proxy) since it's a full SPA
    const directUrl = hbcUrl.value.startsWith("/")
      ? `${window.location.origin}${hbcUrl.value}`
      : hbcUrl.value;
    const directHbc = localStorage.getItem("hbc_direct_url") || "http://192.168.42.99:8200";
    const url = token
      ? `${directHbc}/capture?hb_token=${encodeURIComponent(token)}`
      : `${directHbc}/capture`;
    window.open(url, "_blank");
  }
</script>
