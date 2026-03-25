<template>
  <Card class="p-4">
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <MdiBookOpenPageVariant class="size-5 text-primary" />
        <h3 class="font-semibold">Affine Integration</h3>
        <Badge v-if="isAvailable" variant="default" class="bg-green-500">Connected</Badge>
        <Badge v-else-if="isConfigured" variant="destructive">Unreachable</Badge>
        <Badge v-else variant="secondary">Not Configured</Badge>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="text-xs text-muted-foreground">Affine Server URL</label>
          <input
            v-model="url"
            type="text"
            class="w-full rounded border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="http://192.168.42.99:3010"
          />
        </div>
        <div>
          <label class="text-xs text-muted-foreground">Workspace ID</label>
          <input
            v-model="workspaceId"
            type="text"
            class="w-full rounded border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="workspace-uuid"
          />
        </div>
        <div>
          <label class="text-xs text-muted-foreground">Access Token</label>
          <input
            v-model="accessToken"
            type="password"
            class="w-full rounded border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Bearer token"
          />
        </div>
      </div>

      <div class="flex gap-2">
        <Button size="sm" @click="saveAndTest">
          <MdiCheck class="mr-1 size-4" />
          Save & Test
        </Button>
        <span v-if="testMessage" class="self-center text-xs" :class="testOk ? 'text-green-600' : 'text-destructive'">
          {{ testMessage }}
        </span>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
  import MdiBookOpenPageVariant from "~icons/mdi/book-open-page-variant";
  import MdiCheck from "~icons/mdi/check";
  import { Card } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";

  const { config, isConfigured, isAvailable, setConfig, checkAvailability } = useAffineBridge();

  const url = ref(config.value.url);
  const workspaceId = ref(config.value.workspaceId);
  const accessToken = ref(config.value.accessToken);
  const testMessage = ref("");
  const testOk = ref(false);

  async function saveAndTest() {
    setConfig({
      url: url.value,
      workspaceId: workspaceId.value,
      accessToken: accessToken.value,
    });
    testMessage.value = "Testing...";
    const ok = await checkAvailability();
    testOk.value = ok;
    testMessage.value = ok ? "Connected!" : "Could not reach Affine";
  }
</script>
