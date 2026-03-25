<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium">
        {{ items.length }} item(s)
        <span v-if="excludedCount > 0" class="text-muted-foreground">({{ excludedCount }} excluded)</span>
      </p>
      <Button variant="ghost" size="sm" @click="$emit('toggleView')">
        <MdiViewGrid class="mr-1 size-4" />
        Grid View
      </Button>
    </div>

    <!-- Table -->
    <div class="rounded-lg border">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/50">
          <tr>
            <th class="w-8 px-3 py-2">
              <Checkbox :checked="allSelected" @update:checked="toggleAll" />
            </th>
            <th class="w-12 px-2 py-2" />
            <th class="px-3 py-2 text-left font-medium">Name</th>
            <th class="w-16 px-3 py-2 text-left font-medium">Qty</th>
            <th class="px-3 py-2 text-left font-medium">Description</th>
            <th class="w-36 px-3 py-2 text-left font-medium">Location</th>
            <th class="w-24 px-3 py-2 text-left font-medium">Status</th>
            <th class="w-16 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.id"
            class="border-b transition-colors hover:bg-accent/50"
            :class="{
              'opacity-40': item.excluded,
              'bg-green-50 dark:bg-green-950/20': item.imported,
            }"
          >
            <td class="px-3 py-2">
              <Checkbox
                :checked="selectedIds.has(item.id)"
                :disabled="item.excluded"
                @update:checked="toggleItem(item.id)"
              />
            </td>
            <td class="px-2 py-2">
              <img
                v-if="item.croppedImageData"
                :src="item.croppedImageData"
                class="size-8 rounded object-cover"
                alt=""
              />
              <div v-else class="flex size-8 items-center justify-center rounded bg-muted">
                <MdiPackageVariant class="size-4 text-muted-foreground" />
              </div>
            </td>
            <td class="px-3 py-2">
              <input
                v-model="item.name"
                class="w-full bg-transparent text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                @change="item.reviewed = true"
              />
            </td>
            <td class="px-3 py-2">
              <input
                v-model.number="item.quantity"
                type="number"
                min="1"
                class="w-12 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </td>
            <td class="px-3 py-2">
              <input
                v-model="item.description"
                class="w-full bg-transparent text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                @change="item.reviewed = true"
              />
            </td>
            <td class="px-3 py-2">
              <select
                v-model="item.locationId"
                class="w-full rounded bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">—</option>
                <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                  {{ loc.name }}
                </option>
              </select>
            </td>
            <td class="px-3 py-2">
              <Badge v-if="item.imported" variant="default" class="bg-green-500 text-xs">Imported</Badge>
              <Badge v-else-if="item.duplicateMatch" variant="destructive" class="text-xs">Duplicate</Badge>
              <Badge v-else-if="item.excluded" variant="secondary" class="text-xs">Excluded</Badge>
              <Badge v-else variant="outline" class="text-xs">Ready</Badge>
            </td>
            <td class="px-3 py-2">
              <Button
                v-if="!item.excluded"
                variant="ghost"
                size="sm"
                class="h-6 text-xs text-destructive"
                @click="$emit('exclude', item.id)"
              >
                <MdiClose class="size-3" />
              </Button>
              <Button
                v-else
                variant="ghost"
                size="sm"
                class="h-6 text-xs"
                @click="$emit('restore', item.id)"
              >
                Undo
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Bulk location assignment -->
    <div v-if="selectedIds.size > 0" class="flex items-center gap-2 text-sm">
      <span class="text-muted-foreground">{{ selectedIds.size }} selected:</span>
      <select
        class="rounded border bg-background px-2 py-1 text-sm"
        @change="bulkSetLocation(($event.target as HTMLSelectElement).value)"
      >
        <option value="">Set location...</option>
        <option v-for="loc in locations" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
      </select>
      <Button variant="ghost" size="sm" class="h-7 text-xs text-destructive" @click="bulkExclude">
        Exclude selected
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import MdiViewGrid from "~icons/mdi/view-grid";
  import MdiPackageVariant from "~icons/mdi/package-variant";
  import MdiClose from "~icons/mdi/close";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { Checkbox } from "@/components/ui/checkbox";
  import type { StudioItem } from "@/stores/studio";

  const props = defineProps<{
    items: StudioItem[];
    locations: { id: string; name: string }[];
  }>();

  const emit = defineEmits<{
    exclude: [id: string];
    restore: [id: string];
    toggleView: [];
  }>();

  const selectedIds = ref(new Set<string>());
  const excludedCount = computed(() => props.items.filter(i => i.excluded).length);
  const allSelected = computed(() => {
    const active = props.items.filter(i => !i.excluded);
    return active.length > 0 && active.every(i => selectedIds.value.has(i.id));
  });

  function toggleAll(checked: boolean) {
    if (checked) {
      props.items.filter(i => !i.excluded).forEach(i => selectedIds.value.add(i.id));
    } else {
      selectedIds.value.clear();
    }
  }

  function toggleItem(id: string) {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id);
    } else {
      selectedIds.value.add(id);
    }
  }

  function bulkSetLocation(locationId: string) {
    if (!locationId) return;
    for (const item of props.items) {
      if (selectedIds.value.has(item.id)) {
        item.locationId = locationId;
      }
    }
  }

  function bulkExclude() {
    for (const id of selectedIds.value) {
      emit("exclude", id);
    }
    selectedIds.value.clear();
  }
</script>
