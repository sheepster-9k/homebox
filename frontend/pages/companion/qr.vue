<template>
  <BaseContainer>
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <NuxtLink to="/companion">
          <Button variant="ghost" size="icon">
            <MdiArrowLeft class="size-5" />
          </Button>
        </NuxtLink>
        <div>
          <h1 class="text-xl font-bold">{{ $t("companion.qr.title") }}</h1>
          <p class="text-sm text-muted-foreground">{{ $t("companion.qr.description") }}</p>
        </div>
      </div>

      <div class="overflow-hidden rounded-lg border">
        <iframe
          :src="qrUrl"
          class="h-[calc(100vh-14rem)] w-full border-0"
          allow="camera"
        />
      </div>
    </div>
  </BaseContainer>
</template>

<script setup lang="ts">
  import MdiArrowLeft from "~icons/mdi/arrow-left";

  definePageMeta({ middleware: ["auth"] });

  const { getPageUrl } = useCompanion();
  const authCtx = useAuthContext();
  const qrUrl = computed(() => {
    const token = authCtx.token.value;
    const base = getPageUrl("/qr");
    return token ? `${base}?hb_token=${encodeURIComponent(token)}` : base;
  });
</script>
