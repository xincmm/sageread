import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as skillService from "@/services/skill-service";
import type { Skill, SkillCreateData, SkillUpdateData } from "@/services/skill-service";

const SKILLS_QUERY_KEY = ["skills"];

export function useSkills() {
  return useQuery({
    queryKey: SKILLS_QUERY_KEY,
    queryFn: skillService.getSkills,
  });
}

export function useSkillById(id: string | null) {
  return useQuery({
    queryKey: [...SKILLS_QUERY_KEY, id],
    queryFn: () => (id ? skillService.getSkillById(id) : null),
    enabled: !!id,
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SkillCreateData) => skillService.createSkill(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILLS_QUERY_KEY });
    },
  });
}

export function useUpdateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SkillUpdateData }) => skillService.updateSkill(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILLS_QUERY_KEY });
    },
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => skillService.deleteSkill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILLS_QUERY_KEY });
    },
  });
}

export function useToggleSkillActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => skillService.toggleSkillActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILLS_QUERY_KEY });
    },
  });
}

export type { Skill, SkillCreateData, SkillUpdateData };
