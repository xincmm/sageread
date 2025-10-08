import { createNote, deleteNote, getNotesPaginated, updateNote } from "@/services/note-service";
import type { CreateNoteData, Note, UpdateNoteData } from "@/types/note";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

interface UseNotepadProps {
  bookId?: string;
}

export const useNotepad = ({ bookId }: UseNotepadProps = {}) => {
  const queryClient = useQueryClient();

  // 分页获取笔记列表
  const {
    data: notesData,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["notes", bookId],
    queryFn: ({ pageParam = 1 }) => {
      return getNotesPaginated(pageParam, 20, { bookId }).then((notes) => ({
        data: notes,
        nextCursor: notes.length === 20 ? pageParam + 1 : undefined,
      }));
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!bookId,
  });

  // 获取单条笔记详情
  const useNoteDetail = (noteId: string) => {
    return useQuery({
      queryKey: ["note", noteId],
      queryFn: async () => {
        const { getNoteById } = await import("@/services/note-service");
        return getNoteById(noteId);
      },
      enabled: !!noteId,
    });
  };

  // 创建笔记
  const handleCreateNote = useCallback(
    async (data: CreateNoteData) => {
      try {
        const newNote = await createNote(data);
        toast.success("笔记创建成功");

        // 刷新笔记列表
        if (data.bookId) {
          queryClient.invalidateQueries({ queryKey: ["notes", data.bookId] });
        } else {
          queryClient.invalidateQueries({ queryKey: ["notes"] });
        }

        return newNote;
      } catch (error) {
        console.error("创建笔记失败:", error);
        toast.error("创建笔记失败");
        throw error;
      }
    },
    [queryClient],
  );

  // 更新笔记
  const handleUpdateNote = useCallback(
    async (data: UpdateNoteData) => {
      try {
        const updatedNote = await updateNote(data);
        toast.success("笔记更新成功");

        // 刷新笔记列表
        queryClient.invalidateQueries({ queryKey: ["notes", bookId] });
        queryClient.invalidateQueries({ queryKey: ["note", data.id] });

        return updatedNote;
      } catch (error) {
        console.error("更新笔记失败:", error);
        toast.error("更新笔记失败");
        throw error;
      }
    },
    [queryClient, bookId],
  );

  // 删除笔记
  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      try {
        await deleteNote(noteId);
        toast.success("笔记删除成功");

        // 刷新笔记列表
        queryClient.invalidateQueries({ queryKey: ["notes", bookId] });
        queryClient.invalidateQueries({ queryKey: ["note", noteId] });
      } catch (error) {
        console.error("删除笔记失败:", error);
        toast.error("删除笔记失败");
        throw error;
      }
    },
    [queryClient, bookId],
  );

  // 转换笔记数据用于显示
  const transformNoteForDisplay = useCallback(
    (note: Note) => ({
      id: note.id,
      preview: note.content || "",
      createdAt: new Date(note.createdAt),
    }),
    [],
  );

  return {
    // 查询相关
    notesData,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    useNoteDetail,

    // 操作相关
    handleCreateNote,
    handleUpdateNote,
    handleDeleteNote,

    // 工具函数
    transformNoteForDisplay,
  };
};
