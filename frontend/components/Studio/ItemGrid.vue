<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium">
        {{ items.length }} item(s) detected
        <span v-if="excludedCount > 0" class="text-muted-foreground">
          ({{ excludedCount }} excluded)
        </span>
      </p>
      <Button v-if="items.length > 0" variant="ghost" size="sm" @click="$emit('toggleView')">
        <MdiTable class="mr-1 size-4" />
        Table View
      </Button>
    </div>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <ItemReviewCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        :is-selected="item.id === selectedItemId"
        @select="$emit('select', $event)"
        @exclude="$emit('exclude', $event)"
        @restore="$emit('restore', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import MdiTable from "~icons/mdi/table";
  import { Button } from "@/components/ui/button";
  import ItemReviewCard from "./ItemReviewCard.vue";
  import type { StudioItem } from "@/stores/studio";

  const props = defineProps<{
    items: StudioItem[];
    selectedItemId: string | null;
  }>();

  defineEmits<{
    select: [id: string];
    exclude: [id: string];
    restore: [id: string];
    toggleView: [];
  }>();

  const excludedCount = computed(() =>
    props.items.filter(i => i.excluded).length
  );
</script>
