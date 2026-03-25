<template>
  <div class="space-y-3">
    <div class="relative">
      <MdiMagnify class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        v-model="query"
        type="text"
        class="w-full rounded-lg border bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        :placeholder="$t('studio.search.placeholder')"
        @input="debouncedSearch"
        @keydown.enter="search"
      />
      <span v-if="isSearching" class="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-xs">&#9696;</span>
    </div>

    <!-- Results -->
    <div v-if="results.length > 0" class="space-y-2">
      <p class="text-xs text-muted-foreground">{{ results.length }} result(s)</p>
      <div v-for="item in results" :key="item.id" class="rounded-lg border p-3 transition-colors hover:bg-accent">
        <div class="flex items-center justify-between">
          <div>
            <NuxtLink :to="`/item/${item.id}`" class="text-sm font-medium hover:underline">
              {{ item.name }}
            </NuxtLink>
            <p v-if="item.location" class="text-xs text-muted-foreground">{{ item.location }}</p>
          </div>
          <div class="flex gap-1">
            <Badge v-for="tag in item.tags?.slice(0, 3)" :key="tag" variant="outline" class="text-xs">
              {{ tag }}
            </Badge>
          </div>
        </div>
        <p v-if="item.description" class="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {{ item.description }}
        </p>
      </div>
    </div>

    <p v-else-if="hasSearched && !isSearching" class="text-center text-sm text-muted-foreground">
      {{ $t("studio.search.no_results") }}
    </p>
  </div>
</template>

<script setup lang="ts">
  import MdiMagnify from "~icons/mdi/magnify";
  import { Badge } from "@/components/ui/badge";

  interface SearchResult {
    id: string;
    name: string;
    description?: string;
    location?: string;
    tags?: string[];
  }

  const { hbcFetch, isEnabled } = useCompanion();

  const query = ref("");
  const results = ref<SearchResult[]>([]);
  const isSearching = ref(false);
  const hasSearched = ref(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function debouncedSearch() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => search(), 300);
  }

  onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  async function search() {
    if (!query.value.trim() || !isEnabled.value) return;
    isSearching.value = true;
    hasSearched.value = true;
    try {
      const data = await hbcFetch<{ items: SearchResult[] }>("/api/items/search", {
        method: "POST",
        body: JSON.stringify({ query: query.value }),
      });
      results.value = data.items || [];
    } catch {
      results.value = [];
    } finally {
      isSearching.value = false;
    }
  }
</script>
