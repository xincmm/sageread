import { invoke } from "@tauri-apps/api/core";

export interface Skill {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
  isSystem: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SkillCreateData {
  name: string;
  content: string;
  isActive?: boolean;
  isSystem?: boolean;
}

export interface SkillUpdateData {
  name?: string;
  content?: string;
  isActive?: boolean;
  updatedAt?: number;
}

export async function createSkill(data: SkillCreateData): Promise<Skill> {
  try {
    const result = await invoke<Skill>("create_skill", { data });
    return result;
  } catch (error) {
    console.error("创建技能失败:", error);
    throw new Error(`创建技能失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function getSkills(): Promise<Skill[]> {
  try {
    const result = await invoke<Skill[]>("get_skills");
    return result;
  } catch (error) {
    console.error("获取技能列表失败:", error);
    throw new Error(`获取技能列表失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function getSkillById(id: string): Promise<Skill | null> {
  try {
    const result = await invoke<Skill | null>("get_skill_by_id", { id });
    return result;
  } catch (error) {
    console.error("获取技能详情失败:", error);
    throw new Error(`获取技能详情失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function updateSkill(id: string, updateData: SkillUpdateData): Promise<Skill> {
  try {
    const result = await invoke<Skill>("update_skill", {
      id,
      updateData: {
        ...updateData,
        updatedAt: Date.now(),
      },
    });
    return result;
  } catch (error) {
    console.error("更新技能失败:", error);
    throw new Error(`更新技能失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function deleteSkill(id: string): Promise<void> {
  try {
    await invoke("delete_skill", { id });
  } catch (error) {
    console.error("删除技能失败:", error);
    throw new Error(`删除技能失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

export async function toggleSkillActive(id: string): Promise<Skill> {
  try {
    const result = await invoke<Skill>("toggle_skill_active", { id });
    return result;
  } catch (error) {
    console.error("切换技能状态失败:", error);
    throw new Error(`切换技能状态失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}
