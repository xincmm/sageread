import { fetch as fetchTauri } from "@tauri-apps/plugin-http";

/**
 * Fetches models from a provider's API endpoint
 * Always uses Tauri's HTTP client to bypass CORS issues
 * @param provider The provider object containing baseUrl and apiKey
 * @returns Promise<string[]> Array of model IDs
 */
export const fetchModelsFromProvider = async (provider: ModelProvider): Promise<string[]> => {
  if (!provider.baseUrl) {
    throw new Error("Provider must have baseUrl configured");
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Only add authentication headers if API key is provided
    if (provider.apiKey) {
      headers["x-api-key"] = provider.apiKey;
      headers.Authorization = `Bearer ${provider.apiKey}`;
    }

    // Always use Tauri's fetch to avoid CORS issues
    const response = await fetchTauri(`${provider.baseUrl}/models`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Handle different response formats that providers might use
    if (data.data && Array.isArray(data.data)) {
      // OpenAI format: { data: [{ id: "model-id" }, ...] }
      return data.data.map((model: { id: string }) => model.id).filter(Boolean);
    }

    if (Array.isArray(data)) {
      // Direct array format: ["model-id1", "model-id2", ...]
      return data.filter(Boolean).map((model) => (typeof model === "object" && "id" in model ? model.id : model));
    }

    if (data.models && Array.isArray(data.models)) {
      // Alternative format: { models: [...] }
      return data.models
        .map((model: string | { id: string }) => (typeof model === "string" ? model : model.id))
        .filter(Boolean);
    }

    console.warn("Unexpected response format from provider API:", data);
    return [];
  } catch (error) {
    console.error("Error fetching models from provider:", error);
    // Provide helpful error message
    if (error instanceof Error && error.message.includes("fetch")) {
      throw new Error(
        `Cannot connect to ${provider.provider} at ${provider.baseUrl}. Please check that the service is running and accessible.`,
      );
    }
    throw error;
  }
};
