<template>
  <BaseContainer>
    <div class="flex h-[calc(100vh-10rem)] flex-col items-center justify-center space-y-6">
      <div class="rounded-lg bg-blue-500/10 p-6">
        <MdiQrcodeScan class="size-16 text-blue-500" />
      </div>
      <div class="text-center">
        <h1 class="text-2xl font-bold">{{ $t("companion.qr.title") }}</h1>
        <p class="mt-2 max-w-md text-muted-foreground">{{ $t("companion.qr.description") }}</p>
      </div>
      <Button size="lg" @click="openQr">
        <MdiOpenInNew class="mr-2 size-5" />
        {{ $t("companion.qr.open") }}
      </Button>
      <NuxtLink to="/companion" class="text-sm text-muted-foreground hover:underline">
        {{ $t("companion.back") }}
      </NuxtLink>
    </div>
  </BaseContainer>
</template>

<script setup lang="ts">
  import MdiQrcodeScan from "~icons/mdi/qrcode-scan";
  import MdiOpenInNew from "~icons/mdi/open-in-new";

  definePageMeta({ middleware: ["auth"] });

  const authCtx = useAuthContext();

  function openQr() {
    const token = authCtx.token.value;
    const directHbc = localStorage.getItem("hbc_direct_url") || "http://192.168.42.99:8200";
    const url = token
      ? `${directHbc}/qr?hb_token=${encodeURIComponent(token)}`
      : `${directHbc}/qr`;
    window.open(url, "_blank");
  }
</script>
