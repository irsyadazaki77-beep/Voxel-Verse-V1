// VoxelVerse v7.3.0 Verification Suite:
// 1. Pusat Karya Nusantara WorkshopUGCManager (Catalog, Search, 1-Click BehaviorPack Install, Blueprint/Batik Publish & JSON Exchange)
// 2. TauriNativeBridge (Web fallback detection, worldId sanitization, and mocked Tauri Rust IPC atomic save/load/list/delete round-trip)
import { WorkshopUGCManager } from '../engine/modding/WorkshopUGCManager';
import { BehaviorPackManager } from '../engine/modding/BehaviorPackManager';
import { TauriNativeBridge } from '../engine/storage/TauriNativeBridge';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`v7.3.0 Test Failed: ${message}`);
  }
  console.log(`  ✓ [PASS] ${message}`);
}

export async function runWorkshopNativeV73Tests(): Promise<void> {
  console.log('\n====================================================');
  console.log(' VOXELVERSE v7.3.0: WORKSHOP UGC & TAURI NATIVE BRIDGE');
  console.log('====================================================');

  // --- 1. PUSAT KARYA NUSANTARA WORKSHOP UGC ---
  console.log('\n▶ [1/2] Testing WorkshopUGCManager (Catalog, 1-Click Install, Publish & JSON Exchange)...');
  {
    BehaviorPackManager.reset();
    const workshop = new WorkshopUGCManager();

    const all = workshop.listCatalog();
    assert(all.length >= 3, `Built-in Nusantara Workshop catalog loaded (${all.length} items)`);

    const batikOnly = workshop.listCatalog({ category: 'batik_pattern', query: 'parang' });
    assert(batikOnly.length === 1 && batikOnly[0].id === 'batik_parang_kusumo_16', 'Search & category filter found Parang Kusumo 16x16 Batik');

    // 1-click install of Behavior Pack should live-activate loot multipliers & worldRules
    const installRes = workshop.installItem('bp_nusantara_prosperity');
    assert(installRes.ok && workshop.isInstalled('bp_nusantara_prosperity'), '1-click installed Kemakmuran Nusantara Behavior Pack');
    assert(BehaviorPackManager.worldRules.keepInventory === true, 'Installed Behavior Pack activated keepInventory worldRule');
    assert(BehaviorPackManager.getLootMultiplier('beras_wangi') === 2.0, 'Installed Behavior Pack applied 2.0x beras_wangi loot multiplier');

    // Publish custom Blueprint & round-trip export/import JSON
    const pub = workshop.publishItem({
      id: 'bp_pendopo_kayu_jati',
      title: 'Pendopo Kayu Jati Mini',
      category: 'blueprint',
      author: 'Arsitek Jawa',
      version: '1.0.0',
      description: 'Pendopo jati 4 pilar siap pasang.',
      tags: ['jawa', 'pendopo'],
      payload: {
        width: 5,
        height: 4,
        depth: 5,
        voxels: [[0, 0, 0, 14], [4, 0, 0, 14], [0, 0, 4, 14], [4, 0, 4, 14]],
      },
    });
    assert(pub.ok, 'Published custom community Blueprint to Workshop');

    const exported = workshop.exportItemJSON('bp_pendopo_kayu_jati');
    assert(exported !== null && exported.includes('Pendopo Kayu Jati Mini'), 'Exported Workshop item to portable JSON');

    const freshWorkshop = new WorkshopUGCManager();
    const imported = freshWorkshop.importItemJSON(exported!);
    assert(imported.ok && freshWorkshop.getItem('bp_pendopo_kayu_jati') !== null, 'Imported portable Workshop JSON cleanly');
  }

  // --- 2. TAURI NATIVE DESKTOP SAVE BRIDGE ---
  console.log('\n▶ [2/2] Testing TauriNativeBridge (Web Fallback, Sanitization & Native IPC Round-Trip)...');
  {
    TauriNativeBridge.setAdapter(null);
    const webCaps = TauriNativeBridge.getRuntimeCapabilities();
    assert(
      webCaps.platform === 'web_browser' && !webCaps.nativeFilesystemSaves,
      'Detects web_browser runtime cleanly when Tauri IPC is absent'
    );

    const sanitized = TauriNativeBridge.sanitizeWorldId('../../etc/passwd;rm -rf');
    assert(!sanitized.includes('..') && !sanitized.includes('/'), `Sanitized unsafe worldId safely -> "${sanitized}"`);

    // Inject mock Tauri Rust IPC backend to verify full native save/load/list/delete lifecycle
    const mockDisk = new Map<string, string>();
    TauriNativeBridge.setAdapter({
      invoke: (async (cmd: string, args?: Record<string, any>) => {
        if (cmd === 'save_world_native') {
          mockDisk.set(args!.worldId, args!.payloadJson);
          return `C:/AppData/VoxelVerse/worlds/${args!.worldId}.vvsave.json`;
        }
        if (cmd === 'load_world_native') {
          const v = mockDisk.get(args!.worldId);
          if (!v) throw new Error('NOT_FOUND');
          return v;
        }
        if (cmd === 'list_native_worlds') {
          return Array.from(mockDisk.keys());
        }
        if (cmd === 'delete_world_native') {
          mockDisk.delete(args!.worldId);
          return true;
        }
        throw new Error(`Unknown command: ${cmd}`);
      }) as any,
    });

    const nativeCaps = TauriNativeBridge.getRuntimeCapabilities();
    assert(nativeCaps.platform === 'tauri_desktop' && nativeCaps.nativeFilesystemSaves, 'Detects tauri_desktop runtime with native filesystem saves');

    const saveRes = await TauriNativeBridge.saveWorldNative('nusantara_main', JSON.stringify({ seed: 42819, name: 'Nusantara' }));
    assert(saveRes.ok && !!saveRes.path?.endsWith('nusantara_main.vvsave.json'), `Native atomic world save succeeded (${saveRes.path})`);

    const list = await TauriNativeBridge.listNativeWorlds();
    assert(list.includes('nusantara_main'), 'Native worlds listing returned saved world');

    const loadRes = await TauriNativeBridge.loadWorldNative('nusantara_main');
    assert(loadRes.ok && JSON.parse(loadRes.payloadJson!).seed === 42819, 'Native world load restored exact JSON payload');

    const deleted = await TauriNativeBridge.deleteWorldNative('nusantara_main');
    assert(deleted && (await TauriNativeBridge.listNativeWorlds()).length === 0, 'Native world deletion removed save file cleanly');

    TauriNativeBridge.setAdapter(null);
  }

  console.log('\n====================================================');
  console.log(' ALL VOXELVERSE v7.3.0 TESTS PASSED!');
  console.log('====================================================\n');
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('workshopNativeV73Tests')) {
  runWorkshopNativeV73Tests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
