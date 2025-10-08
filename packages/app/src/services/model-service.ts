import { invoke } from "@tauri-apps/api/core";

export interface ModelDownloadProgress {
  status: "downloading" | "success" | "error";
  message: string;
  filename?: string;
}

export async function listLocalModels(): Promise<string[]> {
  try {
    const models = await invoke<string[]>("list_local_models");
    return models;
  } catch (error) {
    console.error("Failed to list local models:", error);
    throw error;
  }
}

export async function downloadModelFile(url: string, filename: string): Promise<void> {
  try {
    await invoke<void>("download_model_file", {
      url,
      filename,
    });
  } catch (error) {
    console.error("Failed to start model download:", error);
    throw error;
  }
}

export async function getAppDataDir(): Promise<string> {
  try {
    const dir = await invoke<string>("get_app_data_dir");
    return dir;
  } catch (error) {
    console.error("Failed to get app data dir:", error);
    throw error;
  }
}

export async function deleteLocalModel(filename: string): Promise<void> {
  try {
    await invoke<void>("delete_local_model", {
      filename,
    });
  } catch (error) {
    console.error("Failed to delete local model:", error);
    throw error;
  }
}
