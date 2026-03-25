<template>
  <div class="flex flex-wrap gap-1">
    <Badge
      v-for="tag in tags"
      :key="tag.id || tag.name"
      :variant="tag.exists ? 'secondary' : 'outline'"
      class="cursor-pointer text-xs transition-opacity"
      :class="{ 'opacity-50 line-through': tag.excluded }"
      @click="toggleTag(tag)"
    >
      <MdiTagPlus v-if="!tag.exists" class="mr-0.5 size-3 text-green-500" />
      {{ tag.name }}
    </Badge>
    <span v-if="newTagCount > 0" class="self-center text-[10px] text-muted-foreground">
      ({{ newTagCount }} new tag{{ newTagCount > 1 ? "s" : "" }} will be created)
    </span>
  </div>
</template>

<script setup lang="ts">
  import MdiTagPlus from "~icons/mdi/tag-plus";
  import { Badge } from "@/components/ui/badge";

  interface TagInfo {
    id: string;
    name: string;
    exists: boolean;
    excluded: boolean;
  }

  const props = defineProps<{
    tags: TagInfo[];
  }>();

  const emit = defineEmits<{
    toggle: [tag: TagInfo];
  }>();

  const newTagCount = computed(() =>
    props.tags.filter(t => !t.exists && !t.excluded).length
  );

  function toggleTag(tag: TagInfo) {
    emit("toggle", tag);
  }
</script>
