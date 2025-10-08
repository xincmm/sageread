import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { type VectorModelConfig, useLlamaStore } from "@/store/llama-store";
import { normalizeEmbeddingsUrl } from "@/utils/model";
import { ask } from "@tauri-apps/plugin-dialog";
import { Edit2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function VectorModelManager() {
  const {
    vectorModelEnabled,
    vectorModels,
    selectedVectorModelId,
    testText,
    setVectorModelEnabled,
    addVectorModel,
    updateVectorModel,
    deleteVectorModel,
    setSelectedVectorModelId,
  } = useLlamaStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<Omit<VectorModelConfig, "id">>({
    name: "",
    url: "",
    modelId: "",
    apiKey: "",
    description: "",
  });

  const labelClass = "block mb-2 text-sm text-neutral-800 dark:text-neutral-200";

  const resetForm = () => {
    setFormData({
      name: "",
      url: "",
      modelId: "",
      apiKey: "",
      description: "",
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!formData.name.trim() || !formData.url.trim() || !formData.modelId.trim()) {
      toast.error("请填写必填字段：名称、URL、模型ID");
      return;
    }

    const newModel: VectorModelConfig = {
      id: `model-${Date.now()}`,
      ...formData,
    };

    addVectorModel(newModel);
    toast.success(`已添加模型配置：${formData.name}`);
    resetForm();
  };

  const startEdit = (model: VectorModelConfig) => {
    setFormData({
      name: model.name,
      url: model.url,
      modelId: model.modelId,
      apiKey: model.apiKey,
      description: model.description || "",
    });
    setEditingId(model.id);
  };

  const handleEdit = () => {
    if (!editingId || !formData.name.trim() || !formData.url.trim() || !formData.modelId.trim()) {
      toast.error("请填写必填字段");
      return;
    }

    updateVectorModel(editingId, formData);
    toast.success(`已更新模型配置：${formData.name}`);
    resetForm();
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const confirmed = await ask(`确定删除模型配置"${name}"吗？\n\n此操作无法撤销。`, {
        title: "确认删除",
        kind: "warning",
      });

      if (confirmed) {
        deleteVectorModel(id);
        toast.success(`已删除模型配置：${name}`);
      }
    } catch (error) {
      console.error("删除模型配置失败:", error);
    }
  };

  const detectModelDimension = async (model: VectorModelConfig, statusMessage: string) => {
    setTestingId(model.id);
    setTestResults((prev) => ({ ...prev, [model.id]: statusMessage }));

    try {
      const testUrl = normalizeEmbeddingsUrl(model.url);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (model.apiKey.trim()) {
        headers.Authorization = `Bearer ${model.apiKey}`;
      }

      const res = await fetch(testUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          input: [testText || "测试文本"],
          model: model.modelId,
          encoding_format: "float",
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      const len = json?.data?.[0]?.embedding?.length ?? 0;
      updateVectorModel(model.id, { dimension: len });
      setTestResults((prev) => ({ ...prev, [model.id]: `连接成功 | 维度: ${len}` }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTestResults((prev) => ({ ...prev, [model.id]: `连接失败: ${message}` }));
    } finally {
      setTestingId(null);
    }
  };

  const testModel = async (model: VectorModelConfig) => {
    await detectModelDimension(model, "测试中...");
  };

  const handleModelSelect = async (model: VectorModelConfig, checked: boolean) => {
    if (checked) {
      setSelectedVectorModelId(model.id);
      if (!model.dimension) {
        await detectModelDimension(model, "检测维度中...");
      }
    } else {
      setSelectedVectorModelId(null);
    }
  };

  return (
    <section className="rounded-lg bg-muted/80 p-4 pt-3">
      <div className="mb-4 flex items-center justify-between">
        <h2>向量模型配置</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className={labelClass}>使用远程向量模型</div>
            <div className="text-neutral-500 text-xs dark:text-neutral-400">
              启用后将使用配置的向量模型，而非本地 Llama.cpp 服务
            </div>
          </div>
          <Switch checked={vectorModelEnabled} onCheckedChange={setVectorModelEnabled} />
        </div>

        {vectorModelEnabled && (
          <>
            <div className="space-y-3">
              {vectorModels.length === 0 ? (
                <div className="space-y-1 rounded-lg border p-4 text-center">
                  <p className="text-neutral-600 dark:text-neutral-200">暂无配置的模型</p>
                  <p className="text-neutral-600 text-xs dark:text-neutral-200">点击下方"添加模型"开始配置</p>
                </div>
              ) : (
                vectorModels.map((model) => (
                  <div key={model.id} className="flex items-start justify-between gap-3 border-b p-3 px-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-neutral-900 text-sm dark:text-neutral-100">{model.name}</span>
                        <button
                          onClick={() => handleDelete(model.id, model.name)}
                          className="p-0 text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
                          title="删除模型"
                        >
                          <Trash2 className="size-3" />
                        </button>
                        <button
                          onClick={() => startEdit(model)}
                          className="p-0 text-neutral-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400"
                          title="编辑模型"
                        >
                          <Edit2 className="size-3" />
                        </button>
                        <button
                          onClick={() => testModel(model)}
                          disabled={testingId === model.id}
                          className="cursor-pointer text-xs"
                        >
                          测试
                        </button>
                      </div>
                      <p className="mt-1 text-neutral-600 text-xs dark:text-neutral-400">
                        {model.url} • {model.dimension && `维度: ${model.dimension}`}
                        {testResults[model.id] && (
                          <span
                            className={`mt-1 ml-1 text-xs ${
                              testResults[model.id].includes("成功")
                                ? "text-green-600 dark:text-green-400"
                                : testResults[model.id].includes("失败")
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-neutral-600 dark:text-neutral-400"
                            }`}
                          >
                            {testResults[model.id]}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-neutral-600 text-xs dark:text-neutral-400">{model.description}</p>
                    </div>
                    <Switch
                      checked={selectedVectorModelId === model.id}
                      onCheckedChange={(checked) => handleModelSelect(model, checked)}
                      className="shrink-0"
                    />
                  </div>
                ))
              )}
            </div>

            {(showAddForm || editingId) && (
              <div className="rounded-lg border border-neutral-200 bg-background p-4 dark:border-neutral-700 dark:bg-neutral-800">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                    {editingId ? "编辑模型配置" : "添加新模型"}
                  </h4>
                  <Button size="sm" variant="ghost" onClick={resetForm} className="h-8 px-2">
                    <X size={14} />
                  </Button>
                </div>

                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>名称 *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="OpenAI Embedding"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>模型ID *</label>
                      <Input
                        value={formData.modelId}
                        onChange={(e) => setFormData((prev) => ({ ...prev, modelId: e.target.value }))}
                        placeholder="text-embedding-3-small"
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>API端点 *</label>
                    <Input
                      value={formData.url}
                      onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                      placeholder="https://api.openai.com/v1/embeddings"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>API Key</label>
                    <Input
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData((prev) => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>描述</label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="模型描述信息"
                      className="h-8"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={resetForm}>
                    取消
                  </Button>
                  <Button size="sm" onClick={editingId ? handleEdit : handleAdd}>
                    {editingId ? "保存" : "添加"}
                  </Button>
                </div>
              </div>
            )}

            {!showAddForm && !editingId && (
              <Button variant="outline" onClick={() => setShowAddForm(true)} className="flex w-full items-center gap-2">
                <Plus size={16} />
                添加模型配置
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
