// src/llamacpp-client.ts
import { invoke } from "@tauri-apps/api/core";

// 类型定义
export interface SessionInfo {
  pid: number;
  port: number;
  model_id: string;
  model_path: string;
  api_key: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  memory: number;
}

export interface GgufMetadata {
  version: number;
  tensor_count: number;
  metadata: Record<string, string>;
}

// llamacpp 客户端类
export class LlamacppClient {
  // 加载模型
  async loadModel(backendPath: string, libraryPath?: string, args: string[] = []): Promise<SessionInfo> {
    return await invoke("plugin:llamacpp|load_llama_model", {
      backendPath,
      libraryPath,
      args,
    });
  }

  // 卸载模型
  async unloadModel(pid: number): Promise<void> {
    return await invoke("plugin:llamacpp|unload_llama_model", { pid });
  }

  // 获取设备信息
  async getDevices(backendPath: string, libraryPath?: string): Promise<DeviceInfo[]> {
    return await invoke("plugin:llamacpp|get_devices", {
      backendPath,
      libraryPath,
    });
  }

  // 检查进程是否运行
  async isProcessRunning(pid: number): Promise<boolean> {
    return await invoke("plugin:llamacpp|is_process_running", { pid });
  }

  // 获取随机端口
  async getRandomPort(): Promise<number> {
    return await invoke("plugin:llamacpp|get_random_port");
  }

  // 根据模型ID查找会话
  async findSessionByModel(modelId: string): Promise<SessionInfo | null> {
    return await invoke("plugin:llamacpp|find_session_by_model", { modelId });
  }

  // 获取所有已加载的模型
  async getLoadedModels(): Promise<string[]> {
    return await invoke("plugin:llamacpp|get_loaded_models");
  }

  // 获取所有活跃会话
  async getAllSessions(): Promise<SessionInfo[]> {
    return await invoke("plugin:llamacpp|get_all_sessions");
  }

  // 读取 GGUF 元数据
  async readGgufMetadata(path: string): Promise<GgufMetadata> {
    return await invoke("plugin:llamacpp|read_gguf_metadata", { path });
  }

  // 清理所有进程
  async cleanupProcesses(): Promise<void> {
    return await invoke("plugin:llamacpp|cleanup_llama_processes");
  }

  // 生成 API 密钥
  async generateApiKey(modelId: string, apiSecret: string): Promise<string> {
    return await invoke("plugin:llamacpp|generate_api_key", { modelId, apiSecret });
  }
}

// Embedding 服务器管理类 - 使用 tauri-plugin-llamacpp 的自动后端管理
export class LlamaServerManager {
  private client: LlamacppClient;

  constructor() {
    this.client = new LlamacppClient();
  }

  // 获取应用数据目录中的后端路径，并确保后端已下载
  private async ensureBackendReady(): Promise<string> {
    try {
      // 1. 确保 llamacpp 目录结构存在
      await invoke<string>("ensure_llamacpp_directories");
      console.log("✅ LlamaCpp 目录结构已创建");

      // 2. 下载 llama-server（如果还没有的话）
      console.log("📥 检查并下载 llama-server...");
      const downloadResult = await invoke<string>("download_llama_server");
      console.log("📥", downloadResult);

      // 3. 获取应用数据目录后端路径
      const backendPath = await invoke<string>("get_llamacpp_backend_path");
      console.log("📂 后端路径:", backendPath);
      return backendPath;
    } catch (error) {
      console.log("自动后端管理失败，尝试系统路径:", error);

      // 如果失败，尝试系统安装的路径
      const systemPaths = [
        "/opt/homebrew/bin/llama-server", // Homebrew macOS
        "/usr/local/bin/llama-server", // 手动安装
        "/usr/bin/llama-server", // 系统包管理器
        "llama-server", // PATH 中
      ];

      console.log("🔄 使用系统路径:", systemPaths[0]);
      return systemPaths[0]; // 返回第一个作为尝试
    }
  }

  // 启动 Embedding 服务器
  async startEmbeddingServer(modelPath: string): Promise<SessionInfo> {
    try {
      console.log("正在启动 Embedding 服务器...");
      console.log("模型路径:", modelPath);

      // 确保后端已准备就绪
      const backendPath = await this.ensureBackendReady();
      console.log("✅ 后端已准备就绪:", backendPath);

      // 获取随机端口
      const serverPort = await this.client.getRandomPort();

      // 构建 embedding 参数 - 使用最基本的参数确保兼容性
      const embeddingArgs = [
        "--port",
        serverPort.toString(), // 服务端口
        "--host",
        "0.0.0.0", // 绑定到本地
        "-m",
        modelPath, // 模型路径
        "--embedding", // 启用 embedding 模式
        "-c",
        "1024", // 上下文长度
        "--threads",
        "4", // CPU 线程数
      ];

      console.log("启动参数:", embeddingArgs);

      // 调用插件的 load_llama_model 命令
      const session = await this.client.loadModel(backendPath, undefined, embeddingArgs);

      console.log("🎉 Embedding 服务器启动成功:", {
        pid: session.pid,
        port: session.port,
        model_id: session.model_id,
        model_path: session.model_path,
        api_endpoint: `http://127.0.0.1:${session.port}/v1/embeddings`,
      });

      return session;
    } catch (error) {
      console.error("❌ 启动 Embedding 服务器失败:", error);

      // 提供解决方案
      if (error instanceof Error && error.message.includes("Binary not found")) {
        console.log("💡 解决方案:");
        console.log("1. 安装 llama.cpp:");
        console.log("   macOS: brew install llama.cpp");
        console.log("   Ubuntu: sudo apt install llama.cpp");
        console.log("   或从源码编译: https://github.com/ggerganov/llama.cpp");
        console.log("");
        console.log("2. 或者等待插件自动下载功能实现");
        throw new Error("llama-server 未找到。请先安装 llama.cpp，或确保 llama-server 在 PATH 中。");
      }

      throw error;
    }
  }

  // 停止服务器
  async stopServer(session: SessionInfo): Promise<void> {
    try {
      console.log(`正在停止服务器 PID: ${session.pid}`);
      await this.client.unloadModel(session.pid);
      console.log("服务器已成功停止");
    } catch (error) {
      console.error("停止服务器失败:", error);
      throw error;
    }
  }

  // 测试 embedding 功能
  async testEmbedding(session: SessionInfo, text: string): Promise<any> {
    try {
      const response = await fetch(`http://127.0.0.1:${session.port}/v1/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.api_key}`,
        },
        body: JSON.stringify({
          input: [text],
          model: session.model_id,
          encoding_format: "float",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Embedding 测试成功:", {
          text: text,
          embedding_length: result.data?.[0]?.embedding?.length || 0,
          first_few_values: result.data?.[0]?.embedding?.slice(0, 5) || [],
        });
        return result;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      console.error("Embedding 测试失败:", error);
      throw error;
    }
  }
}

// 通用使用示例
export async function exampleUsage() {
  const client = new LlamacppClient();

  try {
    // 1. 获取可用设备 (使用自动检测的路径)
    const devices = await client.getDevices("/usr/local/bin/llama-server");
    console.log("可用设备:", devices);

    // 2. 加载模型
    const session = await client.loadModel("/usr/local/bin/llama-server", undefined, [
      "-m",
      "/path/to/model.gguf",
      "--port",
      "8080",
      "--host",
      "127.0.0.1",
      "-c",
      "2048",
      "-ngl",
      "32",
    ]);
    console.log("模型已加载:", session);

    // 3. 检查进程状态
    const isRunning = await client.isProcessRunning(session.pid);
    console.log("进程运行状态:", isRunning);

    // 4. 获取所有会话
    const allSessions = await client.getAllSessions();
    console.log("所有会话:", allSessions);

    // 5. 卸载模型
    await client.unloadModel(session.pid);
    console.log("模型已卸载");
  } catch (error) {
    console.error("操作失败:", error);
  }
}
