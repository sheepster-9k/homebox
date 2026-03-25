<template>
  <BaseContainer>
    <div class="flex h-[calc(100vh-10rem)] flex-col">
      <div class="mb-4 flex items-center gap-2">
        <NuxtLink to="/companion">
          <Button variant="ghost" size="icon">
            <MdiArrowLeft class="size-5" />
          </Button>
        </NuxtLink>
        <h1 class="text-xl font-bold">{{ $t("companion.chat.title") }}</h1>
        <Badge v-if="sessionId" variant="outline" class="ml-auto">
          {{ $t("companion.chat.session_active") }}
        </Badge>
      </div>

      <!-- Messages -->
      <div ref="messagesContainer" class="flex-1 space-y-4 overflow-y-auto rounded-lg border bg-background p-4">
        <div v-if="messages.length === 0" class="flex h-full items-center justify-center">
          <div class="text-center text-muted-foreground">
            <MdiChatProcessing class="mx-auto mb-2 size-10" />
            <p>{{ $t("companion.chat.empty") }}</p>
            <p class="mt-1 text-sm">{{ $t("companion.chat.examples") }}</p>
          </div>
        </div>
        <div v-for="(msg, i) in messages" :key="i" :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
          <div
            :class="[
              'max-w-[80%] rounded-lg px-4 py-2',
              msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
            ]"
          >
            <Markdown v-if="msg.role === 'assistant'" :source="msg.content" class="text-sm" />
            <p v-else class="text-sm">{{ msg.content }}</p>
          </div>
        </div>
        <div v-if="isStreaming" class="flex justify-start">
          <div class="max-w-[80%] rounded-lg bg-muted px-4 py-2">
            <span class="animate-pulse text-sm text-muted-foreground">...</span>
          </div>
        </div>
      </div>

      <!-- Input -->
      <form class="mt-4 flex gap-2" @submit.prevent="sendMessage">
        <input
          v-model="input"
          type="text"
          class="flex-1 rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          :placeholder="$t('companion.chat.placeholder')"
          :disabled="isStreaming"
        />
        <Button type="submit" :disabled="!input.trim() || isStreaming">
          <MdiSend class="size-5" />
        </Button>
      </form>
    </div>
  </BaseContainer>
</template>

<script setup lang="ts">
  import MdiArrowLeft from "~icons/mdi/arrow-left";
  import MdiChatProcessing from "~icons/mdi/chat-processing";
  import MdiSend from "~icons/mdi/send";

  definePageMeta({ middleware: ["auth"] });

  const { chat, hbcUrl } = useCompanion();

  interface Message {
    role: "user" | "assistant";
    content: string;
  }

  const messages = ref<Message[]>([]);
  const input = ref("");
  const isStreaming = ref(false);
  const sessionId = ref<string | null>(null);
  const messagesContainer = ref<HTMLElement | null>(null);

  function scrollToBottom() {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
      }
    });
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isStreaming.value) return;

    messages.value.push({ role: "user", content: text });
    input.value = "";
    isStreaming.value = true;
    scrollToBottom();

    try {
      const stream = await chat(text, sessionId.value || undefined);
      if (!stream) {
        messages.value.push({ role: "assistant", content: "Failed to get response." });
        return;
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";
      let sseBuffer = "";
      messages.value.push({ role: "assistant", content: "" });
      const msgIdx = messages.value.length - 1;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        // Split on newlines; keep the last incomplete line in the buffer
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() || "";

        // Parse SSE events
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "content" && data.data) {
                assistantMsg += data.data;
                messages.value[msgIdx].content = assistantMsg;
                scrollToBottom();
              } else if (data.type === "session_id") {
                sessionId.value = data.data;
              }
            } catch {
              // Non-JSON data line, treat as raw content
              if (line.slice(6).trim()) {
                assistantMsg += line.slice(6);
                messages.value[msgIdx].content = assistantMsg;
              }
            }
          }
        }
      }
    } catch (e) {
      messages.value.push({ role: "assistant", content: `Error: ${e}` });
    } finally {
      isStreaming.value = false;
      scrollToBottom();
    }
  }
</script>
