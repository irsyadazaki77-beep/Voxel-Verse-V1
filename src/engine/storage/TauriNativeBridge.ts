// Tauri Native Desktop Save & Capabilities Bridge (v7.3.0)
// Detects Tauri desktop runtime dynamically with zero extra npm dependencies and provides
// unlimited native filesystem world saves (bypassing browser IndexedDB quota limits).

export interface TauriInvokeAdapter {
  invoke: <T = any>(cmd: string, args?: Record<string, any>) => Promise<T>;
}

export interface NativeRuntimeCapabilities {
  platform: 'tauri_desktop' | 'web_browser';
  nativeFilesystemSaves: boolean;
  storageBackend: 'native_fs' | 'indexeddb_fallback';
}

export class TauriNativeBridge {
  private static customAdapter: TauriInvokeAdapter | null = null;

  /**
   * Optional dependency injection hook for unit tests or custom wrappers.
   */
  public static setAdapter(adapter: TauriInvokeAdapter | null): void {
    this.customAdapter = adapter;
  }

  private static resolveAdapter(): TauriInvokeAdapter | null {
    if (this.customAdapter) return this.customAdapter;
    if (typeof window === 'undefined') return null;

    const w = window as any;
    if (w.__TAURI__?.tauri?.invoke) {
      return { invoke: (cmd, args) => w.__TAURI__.tauri.invoke(cmd, args) };
    }
    if (w.__TAURI__?.core?.invoke) {
      return { invoke: (cmd, args) => w.__TAURI__.core.invoke(cmd, args) };
    }
    if (w.__TAURI_INTERNALS__?.invoke) {
      return { invoke: (cmd, args) => w.__TAURI_INTERNALS__.invoke(cmd, args) };
    }
    return null;
  }

  public static isNativeDesktop(): boolean {
    return this.resolveAdapter() !== null;
  }

  public static getRuntimeCapabilities(): NativeRuntimeCapabilities {
    const isNative = this.isNativeDesktop();
    return {
      platform: isNative ? 'tauri_desktop' : 'web_browser',
      nativeFilesystemSaves: isNative,
      storageBackend: isNative ? 'native_fs' : 'indexeddb_fallback',
    };
  }

  public static sanitizeWorldId(worldId: string): string {
    return worldId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'world_default';
  }

  public static async saveWorldNative(worldId: string, payloadJson: string): Promise<{ ok: boolean; path?: string; error?: string }> {
    const adapter = this.resolveAdapter();
    if (!adapter) {
      return { ok: false, error: 'NOT_TAURI_DESKTOP' };
    }
    try {
      const safeId = this.sanitizeWorldId(worldId);
      const savedPath = await adapter.invoke<string>('save_world_native', {
        worldId: safeId,
        payloadJson,
      });
      return { ok: true, path: savedPath };
    } catch (err: any) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  public static async loadWorldNative(worldId: string): Promise<{ ok: boolean; payloadJson?: string; error?: string }> {
    const adapter = this.resolveAdapter();
    if (!adapter) {
      return { ok: false, error: 'NOT_TAURI_DESKTOP' };
    }
    try {
      const safeId = this.sanitizeWorldId(worldId);
      const payloadJson = await adapter.invoke<string>('load_world_native', { worldId: safeId });
      return { ok: true, payloadJson };
    } catch (err: any) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  public static async listNativeWorlds(): Promise<string[]> {
    const adapter = this.resolveAdapter();
    if (!adapter) return [];
    try {
      const list = await adapter.invoke<string[]>('list_native_worlds');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  public static async deleteWorldNative(worldId: string): Promise<boolean> {
    const adapter = this.resolveAdapter();
    if (!adapter) return false;
    try {
      const safeId = this.sanitizeWorldId(worldId);
      await adapter.invoke('delete_world_native', { worldId: safeId });
      return true;
    } catch {
      return false;
    }
  }
}
