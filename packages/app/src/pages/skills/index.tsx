import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import SkillEditorDialog from "./components/skill-editor-dialog";
import SkillItem from "./components/skill-item";
import { type Skill, useSkills } from "./hooks/use-skills";

export default function SkillsPage() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);

  const { data: skills, isLoading, error } = useSkills();

  const handleCreate = () => {
    setEditingSkill(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingSkill(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">加载技能列表失败</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="font-bold text-3xl dark:border-neutral-700">技能库</h1>
          <p className="text-neutral-600 dark:text-neutral-400">管理 AI 助手的技能和标准操作流程</p>
        </div>
        <Button variant="soft" size="sm" onClick={handleCreate}>
          <Plus className="size-4" />
          新建技能
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!skills || skills.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">还没有任何技能</p>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 size-4" />
                创建第一个技能
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {skills.map((skill) => (
              <SkillItem key={skill.id} skill={skill} onEdit={handleEdit} />
            ))}
          </div>
        )}
      </div>
      <SkillEditorDialog isOpen={isEditorOpen} onClose={handleCloseEditor} skill={editingSkill} />
    </div>
  );
}
