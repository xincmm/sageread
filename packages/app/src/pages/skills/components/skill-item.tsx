import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ask } from "@tauri-apps/plugin-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { type Skill, useDeleteSkill, useToggleSkillActive } from "../hooks/use-skills";

interface SkillItemProps {
  skill: Skill;
  onEdit: (skill: Skill) => void;
}

export default function SkillItem({ skill, onEdit }: SkillItemProps) {
  const toggleActiveMutation = useToggleSkillActive();
  const deleteSkillMutation = useDeleteSkill();

  const handleToggleActive = async () => {
    try {
      await toggleActiveMutation.mutateAsync(skill.id);
    } catch (error) {
      console.error("切换技能状态失败:", error);
    }
  };

  const handleDelete = async () => {
    try {
      const confirmed = await ask(`确定要删除技能 "${skill.name}" 吗？\n\n此操作无法撤销。`, {
        title: "确认删除",
        kind: "warning",
      });

      if (confirmed) {
        await deleteSkillMutation.mutateAsync(skill.id);
      }
    } catch (error) {
      console.error("删除技能失败:", error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="group relative select-auto rounded-xl bg-muted p-3 shadow-around">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex-1 text-lg">{skill.name}</span>
        <div className="flex items-center gap-2">
          {!skill.isSystem && (
            <Switch
              checked={skill.isActive}
              onCheckedChange={handleToggleActive}
              disabled={toggleActiveMutation.isPending}
            />
          )}
          <Button variant="ghost" size="icon" onClick={() => onEdit(skill)} className="size-5">
            <Pencil className="size-4" />
          </Button>
          {!skill.isSystem && (
            <Button variant="ghost" size="icon" onClick={handleDelete} className="size-5 hover:text-destructive/80">
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="mb-3 line-clamp-2 text-muted-foreground text-sm">{skill.content}</p>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {skill.isSystem && <Badge variant="outline">系统技能</Badge>}
          <Badge variant={skill.isActive ? "default" : "secondary"}>{skill.isActive ? "已启用" : "已禁用"}</Badge>
        </div>
        <span className="text-muted-foreground">更新于 {formatDate(skill.updatedAt)}</span>
      </div>
    </div>
  );
}
