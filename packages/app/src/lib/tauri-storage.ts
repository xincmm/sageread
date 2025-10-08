import { appConfigDir, appDataDir } from "@tauri-apps/api/path";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { StateStorage } from "zustand/middleware";
interface StoragePath {
  dirPath: string;
  filePath: string;
}

type StoragePathResolver = (name: string) => Promise<StoragePath>;

interface PendingWrite {
  timer: ReturnType<typeof setTimeout>;
  filePath: string;
  value: string;
}

const pendingWrites = new Map<string, PendingWrite>();

const debouncedWrite = (name: string, filePath: string, value: string) => {
  const existing = pendingWrites.get(name);
  if (existing) {
    clearTimeout(existing.timer);
  }

  const timer = setTimeout(async () => {
    try {
      await writeTextFile(filePath, value);
      pendingWrites.delete(name);
    } catch (error) {
      console.error(`Debounced write error for ${name}:`, error);
      pendingWrites.delete(name);
    }
  }, 500);

  pendingWrites.set(name, { timer, filePath, value });
};

const flushAllWrites = async () => {
  const promises: Promise<void>[] = [];

  for (const [name, pending] of pendingWrites.entries()) {
    clearTimeout(pending.timer);

    promises.push(
      writeTextFile(pending.filePath, pending.value)
        .then(() => {
          // console.log(`Flushed write for ${name}:`, pending.filePath);
        })
        .catch((error) => {
          console.error(`Flush write error for ${name}:`, error);
        }),
    );
  }

  pendingWrites.clear();
  await Promise.all(promises);
};

export { flushAllWrites };

const getStorageFile = async (name: string): Promise<string> => {
  const configDir = await appConfigDir();

  return `${configDir}/${name}.json`;
};

export const tauriStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const filePath = await getStorageFile(name);

      if (!(await exists(filePath))) {
        return null;
      }

      const content = await readTextFile(filePath);
      return content;
    } catch (error) {
      console.error("Zustand getItem Error:", error);
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const filePath = await getStorageFile(name);
      const configDir = await appConfigDir();

      if (!(await exists(configDir))) {
        await mkdir(configDir, { recursive: true });
      }

      debouncedWrite(name, filePath, value);
    } catch (error) {
      console.error("Zustand setItem Error:", error);
    }
  },

  removeItem: async (name: string): Promise<void> => {},
};

const ensureDirectory = async (dirPath: string) => {
  if (!(await exists(dirPath))) {
    await mkdir(dirPath, { recursive: true });
  }
};

const createStateStorage = (resolve: StoragePathResolver): StateStorage => {
  return {
    getItem: async (name: string) => {
      try {
        const { filePath } = await resolve(name);
        if (!(await exists(filePath))) {
          return null;
        }
        return await readTextFile(filePath);
      } catch (error) {
        console.error("Scoped storage getItem error:", error);
        return null;
      }
    },
    setItem: async (name: string, value: string) => {
      try {
        const { dirPath, filePath } = await resolve(name);
        await ensureDirectory(dirPath);
        debouncedWrite(filePath, filePath, value);
      } catch (error) {
        console.error("Scoped storage setItem error:", error);
      }
    },
    removeItem: async (name: string) => {
      try {
        const { filePath } = await resolve(name);
        pendingWrites.delete(filePath);
      } catch (error) {
        console.error("Scoped storage removeItem error:", error);
      }
    },
  };
};

const splitRelativePath = (relativePath: string) => {
  const segments = relativePath.split(/[\\/]/).filter(Boolean);
  const fileName = segments.pop() ?? "settings";
  const directory = segments.join("/");
  return { directory, fileName };
};

const resolveAppDataPath = async (relativePath: string): Promise<StoragePath> => {
  const baseDir = await appDataDir();
  const { directory, fileName } = splitRelativePath(relativePath);
  const dirPath = directory ? `${baseDir}/${directory}` : baseDir;
  return {
    dirPath,
    filePath: `${dirPath}/${fileName.endsWith(".json") ? fileName : `${fileName}.json`}`,
  };
};

export const createAppDataStorage = (relativePathFactory: (name: string) => string): StateStorage => {
  return createStateStorage(async (name) => {
    const relativePath = relativePathFactory(name);
    return await resolveAppDataPath(relativePath);
  });
};

export const createBookViewSettingsStorage = (bookId: string): StateStorage => {
  return createAppDataStorage(() => `books/${bookId}/view-settings.json`);
};
