export interface PresetModel {
  id: string;
  filename: string;
  url: string;
  size: string;
  dimension: number;
  description: string;
  recommended?: string;
  downloaded?: boolean;
}

export const PRESET_MODELS_VERSION = 2;

export const PRESET_EMBEDDING_MODELS: PresetModel[] = [
  {
    id: "Qwen3-Embedding-0.6B-f16",
    filename: "Qwen3-Embedding-0.6B-f16.gguf",
    url: "https://hf-mirror.com/Qwen/Qwen3-Embedding-0.6B-GGUF/resolve/main/Qwen3-Embedding-0.6B-f16.gguf",
    size: "1.1 GB",
    dimension: 1024,
    description: "快速、低内存占用",
    recommended: "测试和个人使用",
  },
  {
    id: "embeddinggemma-300m",
    filename: "embeddinggemma-300m.gguf",
    url: "https://huggingface.co/unsloth/embeddinggemma-300m-GGUF/resolve/main/embeddinggemma-300M-F32.gguf?download=true",
    size: "1.22 GB",
    dimension: 768,
    description: "平衡性能与质量",
    recommended: "日常使用推荐",
  },
  {
    id: "bge-m3-FP16",
    filename: "bge-m3-FP16.gguf",
    url: "https://huggingface.co/gpustack/bge-m3-GGUF/resolve/main/bge-m3-FP16.gguf?download=true",
    size: "1.16 GB",
    dimension: 1024,
    description: "高质量中文支持",
    recommended: "专业使用",
  },
  {
    id: "jina-embeddings-v3-f16",
    filename: "jina-embeddings-v3-f16.gguf",
    url: "https://huggingface.co/gaianet/jina-embeddings-v3-GGUF/resolve/main/jina-embeddings-v3-f16.gguf?download=true",
    size: "1.12 GB",
    dimension: 1024,
    description: "支持中文",
    recommended: "日常使用",
  },
];
