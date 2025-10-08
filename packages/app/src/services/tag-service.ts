import { invoke } from "@tauri-apps/api/core";

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TagCreateData {
  name: string;
  color?: string;
}

export interface TagUpdateData {
  name?: string;
  color?: string;
  updatedAt?: number;
}

export async function createTag(data: TagCreateData): Promise<Tag> {
  try {
    const result = await invoke<Tag>("create_tag", { data });
    return result;
  } catch (error) {
    console.error("创建标签失败:", error);
    throw new Error(`创建标签失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function getTags(): Promise<Tag[]> {
  try {
    const result = await invoke<Tag[]>("get_tags");
    return result;
  } catch (error) {
    console.error("获取标签列表失败:", error);
    throw new Error(`获取标签列表失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function getTagById(id: string): Promise<Tag | null> {
  try {
    const result = await invoke<Tag | null>("get_tag_by_id", { id });
    return result;
  } catch (error) {
    console.error("获取标签详情失败:", error);
    throw new Error(`获取标签详情失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function getTagByName(name: string): Promise<Tag | null> {
  try {
    const result = await invoke<Tag | null>("get_tag_by_name", { name });
    return result;
  } catch (error) {
    console.error("获取标签详情失败:", error);
    throw new Error(`获取标签详情失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function updateTag(id: string, updateData: TagUpdateData): Promise<Tag> {
  try {
    const result = await invoke<Tag>("update_tag", {
      id,
      updateData: {
        ...updateData,
        updatedAt: Date.now(),
      },
    });
    return result;
  } catch (error) {
    console.error("更新标签失败:", error);
    throw new Error(`更新标签失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function deleteTag(id: string): Promise<void> {
  try {
    await invoke("delete_tag", { id });
  } catch (error) {
    console.error("删除标签失败:", error);
    throw new Error(`删除标签失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}
