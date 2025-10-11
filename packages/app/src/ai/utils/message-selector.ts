import type { UIMessage } from "@ai-sdk/react";

export function selectValidMessages(messages: UIMessage[], maxCount = 8): UIMessage[] {
  if (messages.length === 0) return [];

  const lastUserIndex = messages.findLastIndex((msg) => msg.role === "user");
  if (lastUserIndex === -1) return [];

  const fromLastUser = messages.slice(lastUserIndex);

  if (fromLastUser.length > maxCount) {
    return [fromLastUser[0]];
  }

  const cleaned = cleanupAndValidate(fromLastUser);
  if (cleaned.length === 0) {
    return [fromLastUser[0]];
  }

  const remaining = maxCount - cleaned.length;
  if (remaining > 0 && lastUserIndex > 0) {
    const history = cleanupAndValidate(messages.slice(0, lastUserIndex));
    let historyToAdd = history.slice(-remaining);

    if (historyToAdd.length > 0 && historyToAdd[0].role !== "user") {
      const firstUserInHistory = historyToAdd.findIndex((m) => m.role === "user");
      if (firstUserInHistory > 0) {
        historyToAdd = historyToAdd.slice(firstUserInHistory);
      } else {
        historyToAdd = [];
      }
    }

    return [...historyToAdd, ...cleaned];
  }

  return cleaned;
}

function cleanupAndValidate(messages: UIMessage[]): UIMessage[] {
  if (messages.length === 0) return [];

  const firstUserIndex = messages.findIndex((msg) => msg.role === "user");
  if (firstUserIndex === -1) return [];

  const fromFirstUser = messages.slice(firstUserIndex);
  const merged = mergeConsecutiveRoles(fromFirstUser);

  if (!isValidSequence(merged)) return [];

  return merged;
}

function mergeConsecutiveRoles(messages: UIMessage[]): UIMessage[] {
  const result: UIMessage[] = [];

  for (const msg of messages) {
    const last = result[result.length - 1];

    if (last && last.role === msg.role) {
      last.parts = [...(Array.isArray(last.parts) ? last.parts : []), ...(Array.isArray(msg.parts) ? msg.parts : [])];
    } else {
      result.push({ ...msg });
    }
  }

  return result;
}

function isValidSequence(messages: UIMessage[]): boolean {
  if (messages.length === 0) return false;
  if (messages[0].role !== "user") return false;

  for (let i = 0; i < messages.length - 1; i++) {
    const current = messages[i].role;
    const next = messages[i + 1].role;

    if (current === "user" && next !== "assistant") return false;
    if (current === "assistant" && next !== "user") return false;
    if (current !== "user" && current !== "assistant") return false;
  }

  return true;
}
