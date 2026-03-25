<template>
  <div class="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="mx-auto flex max-w-screen-2xl items-center justify-between gap-4">
      <!-- Left: item count -->
      <div class="text-sm">
        <span class="font-semibold">{{ importableCount }}</span> items ready
        <span v-if="importedCount > 0" class="ml-2 text-green-600">
          ({{ importedCount }} imported)
        </span>
      </div>

      <!-- Center: location selector -->
      <div class="flex items-center gap-2">
        <label class="text-sm text-muted-foreground">Location:</label>
        <select
          v-model="selectedLocation"
          class="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          @change="$emit('setLocation', selectedLocation)"
        >
          <option value="">Select location...</option>
          <option v-for="loc in locations" :key="loc.id" :value="loc.id">
            {{ loc.name }}
          </option>
        </select>
      </div>

      <!-- Right: import button -->
      <div class="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="isImporting"
          @click="$emit('cancel')"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          :disabled="importableCount === 0 || isImporting"
          @click="$emit('importAll')"
        >
          <MdiImport v-if="!isImporting" class="mr-2 size-4" />
          <span v-if="isImporting" class="mr-2 animate-spin">&#9696;</span>
          {{ isImporting ? `Importing (${progress}/${importableCount})...` : `Import ${importableCount} Items` }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import MdiImport from "~icons/mdi/import";
  import { Button } from "@/components/ui/button";

  defineProps<{
    importableCount: number;
    importedCount: number;
    isImporting: boolean;
    progress: number;
    locations: { id: string; name: string }[];
  }>();

  defineEmits<{
    importAll: [];
    cancel: [];
    setLocation: [locationId: string];
  }>();

  const selectedLocation = ref("");
</script>
