export function getModelIdFromFilename(filename: string): string {
  if (!filename) {
    return "local-embed";
  }

  if (filename.endsWith(".gguf")) {
    return filename.slice(0, -5);
  }

  return filename;
}

export function normalizeEmbeddingsUrl(url: string): string {
  let normalized = url.replace(/\/$/, "");
  if (!normalized.endsWith("/embeddings")) {
    if (normalized.endsWith("/v1")) {
      normalized = `${normalized}/embeddings`;
    } else {
      normalized = `${normalized}/v1/embeddings`;
    }
  }
  return normalized;
}

export interface VectorModelConfig {
  embeddingsUrl: string;
  model: string;
  apiKey: string | null;
  dimension: number;
  source: "external" | "local";
}

export async function getCurrentVectorModelConfig(): Promise<VectorModelConfig> {
  const { useLlamaStore } = await import("@/store/llama-store");
  const { PRESET_EMBEDDING_MODELS } = await import("@/constants/preset-models");
  const llamaState = useLlamaStore.getState();

  if (llamaState.vectorModelEnabled) {
    const selectedModel = llamaState.getSelectedVectorModel();
    if (selectedModel) {
      return {
        embeddingsUrl: normalizeEmbeddingsUrl(selectedModel.url),
        model: selectedModel.modelId,
        apiKey: selectedModel.apiKey || null,
        dimension: selectedModel.dimension || 1024,
        source: "external",
      };
    }
  }

  const port = llamaState.currentSession?.port;
  const baseUrl = port ? `http://127.0.0.1:${port}` : "http://127.0.0.1:3544";
  const model = getModelIdFromFilename(llamaState.modelPath);

  const presetModel = PRESET_EMBEDDING_MODELS.find((m) => m.filename === llamaState.modelPath);
  const dimension = presetModel?.dimension || 1024;

  return {
    embeddingsUrl: normalizeEmbeddingsUrl(baseUrl),
    model,
    apiKey: null,
    dimension,
    source: "local",
  };
}
