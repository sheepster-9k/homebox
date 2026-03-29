<template>
  <div class="space-y-2">
    <!-- Save/Load buttons -->
    <div class="flex gap-2">
      <Button variant="outline" size="sm" @click="save">
        <MdiContentSave class="mr-1 size-4" />
        Save
      </Button>
      <Button
        v-if="sessions.length > 0"
        variant="outline"
        size="sm"
        @click="showList = !showList"
      >
        <MdiHistory class="mr-1 size-4" />
        Load ({{ sessions.length }})
      </Button>
    </div>

    <!-- Session list -->
    <Card v-if="showList && sessions.length > 0" class="p-3">
      <div class="space-y-2">
        <div
          v-for="s in sessions"
          :key="s.id"
          class="flex items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-accent"
        >
          <img
            v-if="s.thumbnailData"
            :src="s.thumbnailData"
            class="size-10 rounded object-cover"
            alt=""
          />
          <div v-else class="flex size-10 items-center justify-center rounded bg-muted">
            <MdiCamera class="size-5 text-muted-foreground" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ s.name }}</p>
            <p class="text-xs text-muted-foreground">
              {{ s.itemCount }} items &middot; {{ formatDate(s.updatedAt) }}
            </p>
          </div>
          <div class="flex gap-1">
            <Button variant="ghost" size="sm" class="h-7" @click="load(s.id)">
              Load
            </Button>
            <Button variant="ghost" size="sm" class="h-7 text-destructive" @click="remove(s.id)">
              <MdiDelete class="size-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>

    <p v-if="saveMessage" class="text-xs text-muted-foreground">{{ saveMessage }}</p>
  </div>
</template>

<script setup lang="ts">
  import MdiContentSave from "~icons/mdi/content-save";
  import MdiHistory from "~icons/mdi/history";
  import MdiCamera from "~icons/mdi/camera";
  import MdiDelete from "~icons/mdi/delete";
  import { Card } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { useStudioStore } from "@/stores/studio";
  import {
    saveSession,
    loadSession,
    listSessions,
    deleteSession,
  } from "@/lib/studio/session-storage";

  const store = useStudioStore();

  const sessions = ref<{ id: string; name: string; updatedAt: string; itemCount: number; thumbnailData: string }[]>([]);
  const showList = ref(false);
  const saveMessage = ref("");

  onMounted(async () => {
    sessions.value = await listSessions();
  });

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function save() {
    const thumbnail = store.frames[0]?.imageData || "";
    await saveSession(
      store.sessionId,
      store.sessionName || `Studio Session`,
      {
        sessionId: store.sessionId,
        sessionName: store.sessionName,
        currentStep: store.currentStep,
        frames: store.frames,
        detectedItems: store.detectedItems,
      },
      store.detectedItems.length,
      "", // Thumbnail not stored; placeholder icon used in list
    );
    sessions.value = await listSessions();
    saveMessage.value = "Session saved";
    setTimeout(() => { saveMessage.value = ""; }, 2000);
  }

  async function load(id: string) {
    const data = await loadSession(id) as {
      sessionId: string;
      sessionName: string;
      currentStep: string;
      frames: unknown[];
      detectedItems: unknown[];
    } | null;
    if (!data) return;

    store.reset();
    store.sessionId = data.sessionId as `${string}-${string}-${string}-${string}-${string}`;
    store.sessionName = data.sessionName;
    store.currentStep = data.currentStep as "capture" | "detection" | "review" | "import";
    store.frames = data.frames as typeof store.frames;
    store.detectedItems = data.detectedItems as typeof store.detectedItems;
    showList.value = false;
  }

  async function remove(id: string) {
    await deleteSession(id);
    sessions.value = await listSessions();
  }
</script>
