import { useTTSStore } from "@/store/tts-store";
import { fetch as fetchTauri } from "@tauri-apps/plugin-http";

interface TTSOptions {
  text: string;
  voice?: string;
  languageType?: string;
}

interface TTSResponse {
  output: {
    audio: {
      url: string;
    };
  };
  request_id: string;
}

const getTTSConfig = () => {
  return useTTSStore.getState().config;
};

const MAX_CHARACTERS = 500;

function cleanTextForTTS(text: string): string {
  return text
    .replace(/\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countCharacters(text: string): number {
  let count = 0;
  for (const char of text) {
    count += /[\u4e00-\u9fa5]/.test(char) ? 2 : 1;
  }
  return count;
}

function splitTextIntoChunks(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  const sentenceEndings = /([。！？.!?\n]+)/g;

  const sentences = text.split(sentenceEndings).reduce((acc, part, index, array) => {
    if (index % 2 === 0 && part) {
      const ending = array[index + 1] || "";
      acc.push(part + ending);
    }
    return acc;
  }, [] as string[]);

  let currentChunk = "";
  let currentCount = 0;

  for (const sentence of sentences) {
    const sentenceCount = countCharacters(sentence);

    if (sentenceCount > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
        currentCount = 0;
      }

      let remaining = sentence;
      while (remaining) {
        let partialChunk = "";
        let partialCount = 0;

        for (const char of remaining) {
          const charCount = /[\u4e00-\u9fa5]/.test(char) ? 2 : 1;
          if (partialCount + charCount > maxChars) break;
          partialChunk += char;
          partialCount += charCount;
        }

        if (partialChunk) {
          chunks.push(partialChunk);
          remaining = remaining.slice(partialChunk.length);
        } else {
          break;
        }
      }
      continue;
    }

    if (currentCount + sentenceCount > maxChars) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
      currentCount = sentenceCount;
    } else {
      currentChunk += sentence;
      currentCount += sentenceCount;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

function truncateText(text: string, maxChars: number): string {
  let count = 0;
  let result = "";

  for (const char of text) {
    const charCount = /[\u4e00-\u9fa5]/.test(char) ? 2 : 1;
    if (count + charCount > maxChars) {
      break;
    }
    count += charCount;
    result += char;
  }

  return result;
}

async function synthesizeSingleChunk(text: string, voice: string, languageType: string): Promise<string> {
  const config = getTTSConfig();
  const response = await fetchTauri(
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3-tts-flash",
        input: {
          text,
          voice,
          language_type: languageType,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`TTS API调用失败: ${response.statusText}`);
  }

  const data: TTSResponse = await response.json();
  return data.output.audio.url.replace("http://", "https://");
}

export async function synthesizeSpeech(options: TTSOptions): Promise<string> {
  const config = getTTSConfig();
  const { text, voice = config.voice, languageType = config.languageType } = options;
  const cleanedText = cleanTextForTTS(text);
  const truncatedText = truncateText(cleanedText, MAX_CHARACTERS);
  return synthesizeSingleChunk(truncatedText, voice, languageType);
}

interface SpeechChunkedOptions extends TTSOptions {
  onChunkReady?: (url: string, index: number) => void;
}

export async function synthesizeSpeechChunked(options: SpeechChunkedOptions): Promise<string[]> {
  const config = getTTSConfig();
  const { text, voice = config.voice, languageType = config.languageType, onChunkReady } = options;

  const cleanedText = cleanTextForTTS(text);
  const chunks = splitTextIntoChunks(cleanedText, MAX_CHARACTERS);

  const audioUrls: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const url = await synthesizeSingleChunk(chunks[i], voice, languageType);
    audioUrls.push(url);
    onChunkReady?.(url, i);
  }

  return audioUrls;
}

class AudioPlayerManager {
  private audio: HTMLAudioElement | null = null;
  private nextAudio: HTMLAudioElement | null = null;
  private currentMessageId: string | null = null;
  private audioQueue: string[] = [];
  private currentIndex = 0;
  private isPausedState = false;
  private onEndedCallback: (() => void) | null = null;
  private isPlayingState = false;
  private allChunksAdded = false;

  async startPlayback(messageId: string) {
    if (this.currentMessageId === messageId && this.isPausedState) {
      await this.resume();
      return true;
    }

    this.stop();

    this.currentMessageId = messageId;
    this.audioQueue = [];
    this.currentIndex = 0;
    this.isPausedState = false;
    this.isPlayingState = false;
    this.allChunksAdded = false;
    return false;
  }

  addToQueue(audioUrl: string) {
    this.audioQueue.push(audioUrl);

    if (!this.isPlayingState && !this.isPausedState) {
      this.playNext();
    }
  }

  markAllChunksAdded() {
    this.allChunksAdded = true;
  }

  private preloadNext() {
    const nextIndex = this.currentIndex + 1;
    if (nextIndex < this.audioQueue.length) {
      this.nextAudio = new Audio(this.audioQueue[nextIndex]);
      this.nextAudio.preload = "auto";
    }
  }

  private async playNext() {
    if (this.currentIndex >= this.audioQueue.length) {
      if (this.allChunksAdded) {
        this.onEndedCallback?.();
        this.stop();
      } else {
        this.isPlayingState = false;
      }
      return;
    }

    if (this.nextAudio && this.currentIndex > 0) {
      this.audio = this.nextAudio;
      this.nextAudio = null;
    } else {
      const audioUrl = this.audioQueue[this.currentIndex];
      this.audio = new Audio(audioUrl);
      this.audio.preload = "auto";
    }

    this.isPlayingState = true;
    this.audio.volume = 1.0;
    this.preloadNext();

    let hasAdvanced = false;

    this.audio.onended = async () => {
      if (!hasAdvanced) {
        this.currentIndex++;
        await this.playNext();
      }
    };

    this.audio.ontimeupdate = () => {
      if (this.audio && !hasAdvanced) {
        const duration = this.audio.duration;
        const currentTime = this.audio.currentTime;
        const remaining = duration - currentTime;

        const isLastChunk = this.currentIndex === this.audioQueue.length - 1;

        if (isLastChunk && remaining > 0 && remaining < 0.4) {
          hasAdvanced = true;
          this.audio.pause();
          this.onEndedCallback?.();
          this.stop();
        } else if (remaining > 0 && remaining < 0.4 && !isLastChunk) {
          hasAdvanced = true;
          this.currentIndex++;
          this.playNext();
        }
      }
    };

    this.audio.onerror = () => {
      console.error(`音频加载失败: chunk ${this.currentIndex}`);
      this.currentIndex++;
      this.playNext();
    };

    try {
      await this.audio.play();
      this.isPausedState = false;
    } catch (error) {
      console.error("音频播放失败:", error);
      this.isPlayingState = false;
    }
  }

  pause() {
    this.audio?.pause();
    this.isPausedState = true;
  }

  async resume() {
    if (this.audio) {
      await this.audio.play();
      this.isPausedState = false;
      this.isPlayingState = true;
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    if (this.nextAudio) {
      this.nextAudio.pause();
      this.nextAudio = null;
    }
    this.currentMessageId = null;
    this.audioQueue = [];
    this.currentIndex = 0;
    this.isPausedState = false;
    this.isPlayingState = false;
    this.allChunksAdded = false;
  }

  isPlaying(messageId: string): boolean {
    return this.currentMessageId === messageId && this.audio !== null && !this.audio.paused;
  }

  isPaused(messageId: string): boolean {
    return this.currentMessageId === messageId && this.isPausedState;
  }

  getCurrentMessageId(): string | null {
    return this.currentMessageId;
  }

  onEnded(callback: () => void) {
    this.onEndedCallback = callback;
  }
}

export const audioPlayerManager = new AudioPlayerManager();
