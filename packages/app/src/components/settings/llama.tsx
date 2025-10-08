import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { PresetModel } from "@/constants/preset-models";
import { deleteLocalModel, downloadModelFile, getAppDataDir } from "@/services/model-service";
import { useLlamaStore } from "@/store/llama-store";
import { listen } from "@tauri-apps/api/event";
import { ask } from "@tauri-apps/plugin-dialog";
import { type as getOsType } from "@tauri-apps/plugin-os";
import { Check, ChevronDown, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LlamaServerManager, LlamacppClient } from "./llama-client";
import VectorModelManager from "./vector-model-manager";

export default function LlamaSettings() {
  const {
    serverStatus,
    currentSession,
    modelPath,
    testText,
    downloadState,
    embeddingModels,

    setServerStatus,
    setCurrentSession,
    setModelPath,
    setTestText,
    setDownloadState,
    updateDownloadProgress,
    addEmbeddingModel,
    updateEmbeddingModel,
    deleteEmbeddingModel,
  } = useLlamaStore();

  const [showCustomDownload, setShowCustomDownload] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [customDimension, setCustomDimension] = useState<number>(1024);
  const [appDataDir, setAppDataDir] = useState("");
  const [isMacOS, setIsMacOS] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    (async () => {
      if (!currentSession) {
        try {
          const client = new LlamacppClient();
          const sessions = await client.getAllSessions();
          if (sessions && sessions.length > 0) {
            setCurrentSession(sessions[0]);
            setServerStatus(`检测到已运行的服务器 | PID: ${sessions[0].pid} | Port: ${sessions[0].port}`);
          }
        } catch {}
      }

      // 获取 app data 目录
      try {
        const dir = await getAppDataDir();
        setAppDataDir(dir);
      } catch (error) {
        console.error("Failed to get app data dir:", error);
      }
    })();

    // 监听下载进度
    const unlistenProgress = listen<{ downloaded: number; total: number; percent: number; filename: string }>(
      "model-download-progress",
      (event) => {
        updateDownloadProgress({
          percent: event.payload.percent,
          downloaded: event.payload.downloaded,
          total: event.payload.total,
        });
      },
    );

    // 监听下载完成事件
    const unlistenComplete = listen<{ filename: string; success: boolean; error?: string }>(
      "model-download-complete",
      async (event) => {
        const { filename, success, error } = event.payload;

        if (success) {
          toast.success(`模型下载成功: ${filename}`);
          updateEmbeddingModel(filename, { downloaded: true });
        } else {
          toast.error(`下载失败: ${error || "未知错误"}`);
        }
        setDownloadState(null);
      },
    );

    return () => {
      unlistenProgress.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
  }, [updateDownloadProgress, setDownloadState, setModelPath]);

  useEffect(() => {
    const osType = getOsType();
    setIsMacOS(osType === "macos");
  }, []);

  async function handleDownloadPresetModel(model: PresetModel) {
    if (model.downloaded) {
      toast.info("该模型已下载");
      return;
    }
    setDownloadState({
      isDownloading: true,
      filename: model.filename,
      progress: { percent: 0, downloaded: 0, total: 0 },
    });

    try {
      await downloadModelFile(model.url, model.filename);
      toast.info(`开始下载 ${model.id}...`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`启动下载失败: ${message}`);
      setDownloadState(null);
    }
  }

  async function handleDeleteModel(filename: string, event?: React.MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();

    try {
      const confirmed = await ask(`确定删除模型"${filename}"吗？\n\n此操作无法撤销。`, {
        title: "确认删除",
        kind: "warning",
      });

      if (!confirmed) {
        return;
      }

      await deleteLocalModel(filename);
      toast.success(`已删除模型: ${filename}`);

      deleteEmbeddingModel(filename);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`删除失败: ${message}`);
    }
  }

  async function handleDownloadCustomModel() {
    if (!downloadUrl.trim()) {
      toast.error("请填写下载链接");
      return;
    }

    let filename: string;
    try {
      const url = new URL(downloadUrl);
      const pathname = url.pathname;
      const parts = pathname.split("/");
      filename = parts[parts.length - 1] || "model.gguf";
      if (!filename.endsWith(".gguf")) {
        filename = `${filename}.gguf`;
      }
    } catch (error) {
      toast.error("无效的 URL 格式");
      return;
    }

    if (!filename.endsWith(".gguf")) {
      toast.error("文件名必须以 .gguf 结尾");
      return;
    }

    const customModel: PresetModel = {
      id: filename.replace(".gguf", ""),
      filename: filename,
      url: downloadUrl,
      dimension: customDimension,
      size: "未知",
      description: "自定义模型",
    };
    addEmbeddingModel(customModel);

    setDownloadState({
      isDownloading: true,
      filename: filename,
      progress: { percent: 0, downloaded: 0, total: 0 },
    });

    setDownloadUrl("");
    setShowCustomDownload(false);

    try {
      await downloadModelFile(downloadUrl, filename);
      toast.info(`开始下载模型文件: ${filename}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`启动下载失败: ${message}`);
      setDownloadState(null);
    }
  }

  async function startServer() {
    if (!modelPath) {
      toast.error("请先选择模型");
      return;
    }

    setServerStatus("正在检测系统并准备后端…");
    try {
      const serverManager = new LlamaServerManager();

      setServerStatus("正在创建应用数据目录结构…");
      await new Promise((r) => setTimeout(r, 200));

      setServerStatus("检查并下载 llama-server（首次运行需下载）…");
      await new Promise((r) => setTimeout(r, 200));

      setServerStatus("启动 Embedding 服务器…");
      const fullModelPath = `${appDataDir}/llamacpp/models/${modelPath}`;
      const session = await serverManager.startEmbeddingServer(fullModelPath);
      setCurrentSession(session);
      setServerStatus(`服务器启动成功 | PID: ${session.pid} | Port: ${session.port}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("Binary not found") || msg.includes("下载失败")) {
        setServerStatus("启动失败：后端下载失败，请检查网络或手动安装 llama.cpp");
      } else if (msg.includes("Model file not found")) {
        setServerStatus(`启动失败：模型文件未找到，请检查路径：${modelPath}`);
      } else {
        setServerStatus(`启动失败：${msg}`);
      }
      console.error("启动服务器失败:", error);
    }
  }

  async function testEmbedding() {
    if (!currentSession) {
      setServerStatus("请先启动服务器");
      return;
    }
    setServerStatus("测试 embedding…");
    try {
      const res = await fetch(`http://127.0.0.1:${currentSession.port}/v1/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentSession.api_key}`,
        },
        body: JSON.stringify({
          input: [testText],
          model: currentSession.model_id,
          encoding_format: "float",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      const len = json?.data?.[0]?.embedding?.length ?? 0;
      setServerStatus(`Embedding 测试成功 | 维度: ${len}`);
    } catch (error) {
      setServerStatus(`测试失败：${error}` as string);
      console.error("Embedding 测试失败:", error);
    }
  }

  async function stopServer() {
    if (!currentSession) {
      setServerStatus("没有运行中的服务器");
      return;
    }
    setServerStatus("正在停止服务器…");
    try {
      const serverManager = new LlamaServerManager();
      await serverManager.stopServer(currentSession);
      setCurrentSession(null);
      setServerStatus("服务器已停止");
    } catch (error) {
      setServerStatus(`停止失败：${error}` as string);
      console.error("停止服务器失败:", error);
    }
  }

  const labelClass = "block text-neutral-800 dark:text-neutral-200 mb-1 text-sm";

  return (
    <div className="space-y-4 p-4 pt-3 text-neutral-800 dark:text-neutral-100">
      <VectorModelManager />
      {isMacOS && (
        <>
          <div className="flex items-center justify-center">
            <div className="flex-grow border-neutral-300 border-t dark:border-neutral-600" />
            <span className="mx-4 text-neutral-500 text-sm dark:text-neutral-400">or</span>
            <div className="flex-grow border-neutral-300 border-t dark:border-neutral-600" />
          </div>
          <section className="rounded-lg bg-muted/80 p-4 ">
            <div className="mb-4 flex items-center justify-between">
              <h2>Llama.cpp 服务器控制</h2>
              {currentSession ? (
                <span className="rounded-md border px-2 py-1 font-medium text-xs">
                  运行中 · PID {currentSession.pid} · 端口 {currentSession.port}
                </span>
              ) : null}
            </div>

            <div className="space-y-4">
              <div>
                <div className={labelClass}>向量型下载与管理</div>
                <div>
                  {embeddingModels.map((model) => {
                    const isDownloaded = model.downloaded === true;
                    const isDownloading = downloadState?.filename === model.filename;
                    const isSelected = modelPath === model.filename;

                    return (
                      <div key={model.id} className="flex items-start justify-between gap-3 border-b p-3 px-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-neutral-900 text-sm dark:text-neutral-100">{model.id}</h4>
                            {isDownloaded && (
                              <>
                                <span className="flex items-center gap-1 text-green-700 text-xs dark:text-green-400">
                                  <Check size={12} />
                                  已下载
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => handleDeleteModel(model.filename, e)}
                                  className="size-5 p-0 text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
                                  title="删除模型"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </>
                            )}
                            {isDownloading && downloadState && (
                              <span className="text-blue-600 text-xs dark:text-blue-400">
                                {downloadState.progress.percent.toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-neutral-600 text-xs dark:text-neutral-400">
                            {model.description} • {model.size}
                            {" • "}
                            {model.recommended && (
                              <span className="text-neutral-600 text-xs dark:text-neutral-400">
                                推荐：{model.recommended}
                              </span>
                            )}
                          </p>
                        </div>
                        {isDownloaded ? (
                          <Switch
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setModelPath(model.filename);
                              } else {
                                setModelPath("");
                              }
                            }}
                            className="shrink-0"
                          />
                        ) : (
                          <Button
                            size="xs"
                            variant="soft"
                            onClick={() => handleDownloadPresetModel(model)}
                            disabled={isDownloading || !!downloadState}
                            className="shrink-0"
                          >
                            {isDownloading ? "下载中..." : "下载"}
                          </Button>
                        )}
                      </div>
                    );
                  })}

                  <div className="p-3 px-0">
                    <div
                      onClick={() => setShowCustomDownload(!showCustomDownload)}
                      className="flex w-full cursor-pointer items-center justify-between"
                    >
                      <span className="text-sm">自定义下载 (高级)</span>
                      <ChevronDown
                        className={`size-4 transition-transform ${showCustomDownload ? "rotate-180" : ""}`}
                      />
                    </div>

                    {showCustomDownload && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className={labelClass}>下载链接</label>
                          <Input
                            value={downloadUrl}
                            onChange={(e) => setDownloadUrl(e.target.value)}
                            placeholder="https://example.com/model.gguf"
                            className="h-8"
                            disabled={downloadState?.isDownloading}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>向量维度</label>
                          <Select
                            value={String(customDimension)}
                            onValueChange={(value) => setCustomDimension(Number(value))}
                            disabled={downloadState?.isDownloading}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="768">768</SelectItem>
                              <SelectItem value="1024">1024</SelectItem>
                              <SelectItem value="2048">2048</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDownloadUrl("");
                              setShowCustomDownload(false);
                            }}
                            disabled={downloadState?.isDownloading}
                          >
                            取消
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleDownloadCustomModel}
                            disabled={!downloadUrl || downloadState?.isDownloading}
                          >
                            {downloadState?.isDownloading ? "下载中..." : "下载"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* {appDataDir && (
                  <p className="mt-2 text-neutral-500 text-xs dark:text-neutral-400">
                    模型目录: {appDataDir}/llamacpp/models
                  </p>
                )} */}
              </div>

              <div>
                <div className={labelClass}>测试文本</div>
                <Input
                  type="text"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="输入要测试的文本…"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={startServer} disabled={currentSession !== null} variant="default" size="xs">
                  启动
                </Button>
                <Button onClick={testEmbedding} disabled={currentSession === null} size="xs">
                  测试
                </Button>
                <Button onClick={stopServer} disabled={currentSession === null} variant="outline" size="xs">
                  停止
                </Button>
              </div>

              <div className="border-b pb-4 text-sm">
                <strong>状态：</strong> {serverStatus || "等待操作…"}
              </div>

              {currentSession && (
                <div className="text-sm">
                  <div className="mb-2 font-medium">服务器信息</div>
                  <div>进程 ID: {currentSession.pid}</div>
                  <div>端口: {currentSession.port}</div>
                  <div>API 端点: http://127.0.0.1:{currentSession.port}/v1/embeddings</div>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
