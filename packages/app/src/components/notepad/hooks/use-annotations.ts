import { deleteBookNote, getBookNotes } from "@/services/book-note-service";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

interface UseAnnotationsProps {
  bookId?: string;
}

export const useAnnotations = ({ bookId }: UseAnnotationsProps = {}) => {
  const queryClient = useQueryClient();

  // 获取当前书籍的所有标注
  const {
    data: annotations,
    error,
    isLoading,
    status,
  } = useQuery({
    queryKey: ["annotations", bookId],
    queryFn: async () => {
      if (!bookId) return [];
      const bookNotes = await getBookNotes(bookId);
      // 过滤出类型为 annotation 且未删除的笔记，并按创建时间倒序排列
      return bookNotes
        .filter((note) => note.type === "annotation" && !note.deletedAt)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    enabled: !!bookId,
  });

  // 删除标注
  const handleDeleteAnnotation = useCallback(
    async (annotationId: string) => {
      try {
        await deleteBookNote(annotationId);
        toast.success("标注删除成功");

        // 刷新标注列表
        queryClient.invalidateQueries({ queryKey: ["annotations", bookId] });
      } catch (error) {
        console.error("删除标注失败:", error);
        toast.error("删除标注失败");
        throw error;
      }
    },
    [queryClient, bookId],
  );

  return {
    annotations: annotations ?? [],
    error,
    isLoading,
    status,
    handleDeleteAnnotation,
  };
};
