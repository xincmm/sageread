import { getAPIBaseUrl } from "@/services/environment";
import { fetchWithAuth } from "@/utils/fetch";
import { type ProgressHandler, type ProgressPayload, webDownload, webUpload } from "@/utils/transfer";

const API_ENDPOINTS = {
  upload: `${getAPIBaseUrl()}/storage/upload`,
  download: `${getAPIBaseUrl()}/storage/download`,
  delete: `${getAPIBaseUrl()}/storage/delete`,
};

export const createProgressHandler = (
  totalFiles: number,
  completedFilesRef: { count: number },
  onProgress?: ProgressHandler,
) => {
  return (progress: ProgressPayload) => {
    const fileProgress = progress.progress / progress.total;
    const overallProgress = ((completedFilesRef.count + fileProgress) / totalFiles) * 100;

    if (onProgress) {
      onProgress({
        progress: overallProgress,
        total: 100,
        transferSpeed: progress.transferSpeed,
      });
    }
  };
};

export const uploadFile = async (file: File, onProgress?: ProgressHandler, bookHash?: string) => {
  try {
    const response = await fetchWithAuth(API_ENDPOINTS.upload, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        bookHash,
      }),
    });

    const { uploadUrl } = await response.json();
    await webUpload(file, uploadUrl, onProgress);
  } catch (error) {
    console.error("File upload failed:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("File upload failed");
  }
};

export const downloadFile = async (filePath: string, onProgress?: ProgressHandler) => {
  try {
    const response = await fetchWithAuth(`${API_ENDPOINTS.download}?fileKey=${encodeURIComponent(filePath)}`, {
      method: "GET",
    });

    const { downloadUrl } = await response.json();

    return await webDownload(downloadUrl, onProgress);
  } catch (error) {
    console.error(`File '${filePath}' download failed:`, error);
    throw new Error("File download failed");
  }
};

export const deleteFile = async (filePath: string) => {
  try {
    await fetchWithAuth(`${API_ENDPOINTS.delete}?fileKey=${encodeURIComponent(filePath)}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("File deletion failed:", error);
    throw new Error("File deletion failed");
  }
};
