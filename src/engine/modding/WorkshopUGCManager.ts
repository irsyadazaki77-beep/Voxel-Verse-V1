// Pusat Karya Nusantara — Community UGC Workshop Manager (v7.3.0)
// Unified 1-click installer, publisher, and JSON exchanger for Behavior Packs, Blueprints, and 16x16 Batik Patterns.
import { BehaviorPackManager, BehaviorPackManifest } from './BehaviorPackManager';

export type WorkshopCategory = 'behavior_pack' | 'blueprint' | 'batik_pattern';

export interface WorkshopBlueprintPayload {
  width: number;
  height: number;
  depth: number;
  voxels: Array<[number, number, number, number]>; // [x, y, z, blockType]
}

export interface WorkshopBatikPayload {
  size: 16;
  palette: string[];
  gridHex: string[]; // 16x16 palette indices or hex strings
}

export interface WorkshopItem {
  id: string;
  title: string;
  category: WorkshopCategory;
  author: string;
  version: string;
  description: string;
  tags: string[];
  downloads: number;
  createdAt: number;
  payload: BehaviorPackManifest | WorkshopBlueprintPayload | WorkshopBatikPayload;
}

const WORKSHOP_STORAGE_KEY = 'voxelverse_pusat_karya_v73';

const BUILTIN_WORKSHOP_CATALOG: WorkshopItem[] = [
  {
    id: 'bp_nusantara_prosperity',
    title: 'Pack Kemakmuran Nusantara (2x Panen & KeepInventory)',
    category: 'behavior_pack',
    author: 'Empu VoxelVerse',
    version: '1.0.0',
    description: 'Menggandakan hasil panen padi & rempah serta mengaktifkan gamerule keepInventory untuk eksplorasi santai.',
    tags: ['economy', 'farming', 'casual'],
    downloads: 1420,
    createdAt: 1763600000000,
    payload: {
      id: 'bp_nusantara_prosperity',
      name: 'Kemakmuran Nusantara',
      version: '1.0.0',
      author: 'Empu VoxelVerse',
      description: '2x loot multiplier untuk panen dan keepInventory aktif.',
      lootMultipliers: {
        wheat: 2.0,
        beras_wangi: 2.0,
        rendang_spices: 1.5,
      },
      worldRules: {
        keepInventory: true,
        mobGriefing: false,
      },
    } as BehaviorPackManifest,
  },
  {
    id: 'blueprint_candi_bentar_mini',
    title: 'Candi Bentar Gerbang Surya (Blueprint 7×6×3)',
    category: 'blueprint',
    author: 'Arsitek Bali',
    version: '1.2.0',
    description: 'Gerbang terbelah khas Bali dari batu andesit ukir dan lentera emas, siap pasang di pintu masuk desa.',
    tags: ['bali', 'candi', 'architecture'],
    downloads: 980,
    createdAt: 1763610000000,
    payload: {
      width: 7,
      height: 6,
      depth: 3,
      voxels: [
        [0, 0, 1, 119], [1, 0, 1, 119], [5, 0, 1, 119], [6, 0, 1, 119],
        [0, 1, 1, 119], [1, 1, 1, 119], [5, 1, 1, 119], [6, 1, 1, 119],
        [1, 2, 1, 119], [5, 2, 1, 119],
        [1, 3, 1, 119], [5, 3, 1, 119],
        [1, 4, 1, 31],  [5, 4, 1, 31],
      ],
    } as WorkshopBlueprintPayload,
  },
  {
    id: 'batik_parang_kusumo_16',
    title: 'Motif Batik Parang Kusumo 16×16',
    category: 'batik_pattern',
    author: 'Pengrajin Solo',
    version: '1.0.0',
    description: 'Pola diagonal klasik Parang Kusumo berwarna sogan coklat keemasan untuk layar Phinisi dan jubah.',
    tags: ['batik', 'jawa', 'parang'],
    downloads: 760,
    createdAt: 1763620000000,
    payload: {
      size: 16,
      palette: ['#2c1b10', '#8c5327', '#e6c57a', '#f7ecd0'],
      gridHex: Array.from({ length: 256 }, (_, idx) => {
        const x = idx % 16;
        const y = Math.floor(idx / 16);
        const diag = (x + y) % 4;
        return ['#2c1b10', '#8c5327', '#e6c57a', '#f7ecd0'][diag];
      }),
    } as WorkshopBatikPayload,
  },
];

export class WorkshopUGCManager {
  private catalog: Map<string, WorkshopItem> = new Map();
  private installedIds: Set<string> = new Set();

  constructor() {
    for (const item of BUILTIN_WORKSHOP_CATALOG) {
      this.catalog.set(item.id, item);
    }
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(WORKSHOP_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.customItems)) {
        for (const item of parsed.customItems as WorkshopItem[]) {
          if (item && item.id && item.category) {
            this.catalog.set(item.id, item);
          }
        }
      }
      if (Array.isArray(parsed?.installedIds)) {
        for (const id of parsed.installedIds as string[]) {
          this.installedIds.add(id);
        }
      }
    } catch {
      // Ignore corrupt local storage
    }
  }

  private persistToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const builtinIds = new Set(BUILTIN_WORKSHOP_CATALOG.map((i) => i.id));
      const customItems = Array.from(this.catalog.values()).filter((i) => !builtinIds.has(i.id));
      window.localStorage.setItem(
        WORKSHOP_STORAGE_KEY,
        JSON.stringify({
          customItems,
          installedIds: Array.from(this.installedIds),
        })
      );
    } catch {
      // Ignore quota errors
    }
  }

  public listCatalog(filter?: { category?: WorkshopCategory; query?: string }): WorkshopItem[] {
    let items = Array.from(this.catalog.values());
    if (filter?.category) {
      items = items.filter((i) => i.category === filter.category);
    }
    if (filter?.query && filter.query.trim().length > 0) {
      const q = filter.query.trim().toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.author.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return items.sort((a, b) => b.downloads - a.downloads);
  }

  public getItem(id: string): WorkshopItem | null {
    return this.catalog.get(id) || null;
  }

  public isInstalled(id: string): boolean {
    return this.installedIds.has(id);
  }

  public getInstalledItems(): WorkshopItem[] {
    const out: WorkshopItem[] = [];
    for (const id of this.installedIds) {
      const item = this.catalog.get(id);
      if (item) out.push(item);
    }
    return out;
  }

  public publishItem(item: Omit<WorkshopItem, 'downloads' | 'createdAt'>): { ok: boolean; item?: WorkshopItem; error?: string } {
    if (!item.id || !item.title || !item.category || !item.payload) {
      return { ok: false, error: 'Item workshop wajib memiliki id, title, category, dan payload.' };
    }
    if (item.category === 'batik_pattern') {
      const bp = item.payload as WorkshopBatikPayload;
      if (bp.size !== 16 || !Array.isArray(bp.gridHex) || bp.gridHex.length !== 256) {
        return { ok: false, error: 'Pola Batik wajib berukuran 16x16 (256 piksel).' };
      }
    }
    if (item.category === 'blueprint') {
      const bl = item.payload as WorkshopBlueprintPayload;
      if (!Array.isArray(bl.voxels) || bl.voxels.length === 0) {
        return { ok: false, error: 'Blueprint wajib memiliki minimal 1 voxel.' };
      }
    }

    const fullItem: WorkshopItem = {
      ...item,
      downloads: 1,
      createdAt: Date.now(),
    };
    this.catalog.set(fullItem.id, fullItem);
    this.persistToStorage();
    return { ok: true, item: fullItem };
  }

  /**
   * 1-click install: registers Behavior Packs immediately into BehaviorPackManager,
   * and marks Blueprints / Batik Patterns ready for instant in-game use.
   */
  public installItem(id: string): { ok: boolean; item?: WorkshopItem; error?: string } {
    const item = this.catalog.get(id);
    if (!item) return { ok: false, error: 'ITEM_NOT_FOUND' };

    if (item.category === 'behavior_pack') {
      const res = BehaviorPackManager.registerPackFromJSON(JSON.stringify(item.payload));
      if (!res.ok) {
        return { ok: false, error: res.error || 'BEHAVIOR_PACK_INVALID' };
      }
    }

    this.installedIds.add(id);
    item.downloads++;
    this.persistToStorage();
    return { ok: true, item };
  }

  public uninstallItem(id: string): boolean {
    const existed = this.installedIds.delete(id);
    if (existed) {
      this.persistToStorage();
    }
    return existed;
  }

  public exportItemJSON(id: string): string | null {
    const item = this.catalog.get(id);
    if (!item) return null;
    return JSON.stringify(item, null, 2);
  }

  public importItemJSON(jsonStr: string): { ok: boolean; item?: WorkshopItem; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr) as WorkshopItem;
      return this.publishItem({
        id: parsed.id,
        title: parsed.title,
        category: parsed.category,
        author: parsed.author || 'Komunitas Nusantara',
        version: parsed.version || '1.0.0',
        description: parsed.description || '',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        payload: parsed.payload,
      });
    } catch (err: any) {
      return { ok: false, error: `JSON Workshop tidak valid: ${err?.message || 'parse error'}` };
    }
  }
}
