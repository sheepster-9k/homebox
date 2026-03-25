<template>
  <a
    v-if="docId && affineUrl"
    :href="`${affineUrl}/workspace/${workspaceId}/${docId}`"
    target="_blank"
    class="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 transition-colors hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
  >
    <MdiBookOpenPageVariant class="size-3" />
    Affine
  </a>
</template>

<script setup lang="ts">
  import MdiBookOpenPageVariant from "~icons/mdi/book-open-page-variant";

  defineProps<{
    docId: string | null;
  }>();

  const { config } = useAffineBridge();
  const affineUrl = computed(() => config.value.url);
  const workspaceId = computed(() => config.value.workspaceId);
</script>
