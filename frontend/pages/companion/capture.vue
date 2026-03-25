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
          <h1 class="text-xl font-bold">{{ $t("companion.capture.title") }}</h1>
          <p class="text-sm text-muted-foreground">{{ $t("companion.capture.description") }}</p>
        </div>
      </div>

      <!-- Embedded HBC Capture page -->
      <div class="overflow-hidden rounded-lg border">
        <iframe
          :src="captureUrl"
          class="h-[calc(100vh-14rem)] w-full border-0"
          allow="camera;microphone"
        />
      </div>
    </div>
  </BaseContainer>
</template>

<script setup lang="ts">
  import MdiArrowLeft from "~icons/mdi/arrow-left";

  definePageMeta({ middleware: ["auth"] });

  const { getPageUrl } = useCompanion();
  const captureUrl = computed(() => getPageUrl("/capture"));
</script>
