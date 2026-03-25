<template>
  <Card
    class="overflow-hidden transition-colors"
    :class="{
      'opacity-50': item.excluded,
      'ring-2 ring-primary': isSelected,
      'ring-2 ring-green-500': item.imported,
    }"
  >
    <!-- Image thumbnail -->
    <div class="relative h-32 bg-muted">
      <img
        v-if="item.croppedImageData"
        :src="item.croppedImageData"
        :alt="item.name"
        class="h-full w-full object-cover"
      />
      <div v-else class="flex h-full items-center justify-center">
        <MdiPackageVariant class="size-8 text-muted-foreground" />
      </div>
      <!-- Badges -->
      <Badge
        v-if="item.duplicateMatch"
        class="absolute left-2 top-2"
        variant="destructive"
      >
        Duplicate
      </Badge>
      <Badge
        v-if="item.imported"
        class="absolute right-2 top-2 bg-green-500"
      >
        Imported
      </Badge>
    </div>

    <div class="space-y-2 p-3">
      <!-- Editable name -->
      <input
        v-model="item.name"
        class="w-full truncate border-b border-transparent bg-transparent text-sm font-semibold focus:border-primary focus:outline-none"
        @change="markReviewed"
      />

      <!-- Description (truncated) -->
      <p v-if="item.description" class="line-clamp-2 text-xs text-muted-foreground">
        {{ item.description }}
      </p>

      <!-- Metadata chips -->
      <div class="flex flex-wrap gap-1">
        <Badge v-if="item.quantity > 1" variant="secondary" class="text-xs">
          x{{ item.quantity }}
        </Badge>
        <Badge v-if="item.manufacturer" variant="outline" class="text-xs">
          {{ item.manufacturer }}
        </Badge>
        <Badge v-if="item.serialNumber" variant="outline" class="text-xs font-mono">
          SN: {{ item.serialNumber.slice(0, 10) }}
        </Badge>
      </div>

      <!-- Actions -->
      <div class="flex gap-1 pt-1">
        <Button
          v-if="!item.excluded"
          variant="ghost"
          size="sm"
          class="h-7 flex-1 text-xs"
          @click="$emit('select', item.id)"
        >
          Edit
        </Button>
        <Button
          v-if="!item.excluded"
          variant="ghost"
          size="sm"
          class="h-7 text-xs text-destructive"
          @click="$emit('exclude', item.id)"
        >
          <MdiClose class="size-3" />
        </Button>
        <Button
          v-if="item.excluded"
          variant="ghost"
          size="sm"
          class="h-7 flex-1 text-xs"
          @click="$emit('restore', item.id)"
        >
          Restore
        </Button>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
  import MdiPackageVariant from "~icons/mdi/package-variant";
  import MdiClose from "~icons/mdi/close";
  import { Card } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import type { StudioItem } from "@/stores/studio";

  const props = defineProps<{
    item: StudioItem;
    isSelected: boolean;
  }>();

  defineEmits<{
    select: [id: string];
    exclude: [id: string];
    restore: [id: string];
  }>();

  function markReviewed() {
    props.item.reviewed = true;
  }
</script>
