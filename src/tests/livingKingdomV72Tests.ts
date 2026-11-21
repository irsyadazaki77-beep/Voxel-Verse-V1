// VoxelVerse v7.2.0 Verification Suite:
// 1. LivingKingdomManager (Inter-Settlement Trade Caravans, Escort/Raid, Autonomous Settlement Expansion)
// 2. WorldBossRaidManager (3-Phase Transitions, Destructive Voxel Blast Sphere respecting Bedrock/Obsidian, Mythic Loot)
// 3. NPCMemoryAndQuestEngine & NusantaraAIService Memory-Enriched Dialogue + Dynamic Contextual Quests
import { BlockType } from '../types';
import { LivingKingdomManager } from '../engine/settlement/LivingKingdomManager';
import { WorldBossRaidManager, VoxelBlastWriter } from '../engine/combat/WorldBossRaidManager';
import { NusantaraAIService } from '../engine/ai/NusantaraAIService';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`v7.2.0 Test Failed: ${message}`);
  }
  console.log(`  ✓ [PASS] ${message}`);
}

export function runLivingKingdomV72Tests(): void {
  console.log('\n====================================================');
  console.log(' VOXELVERSE v7.2.0: KERAJAAN HIDUP, BOSS RAID & AI MEMORY');
  console.log('====================================================');

  // --- 1. LIVING KINGDOM & TRADE CARAVANS ---
  console.log('\n▶ [1/3] Testing LivingKingdomManager Caravans & Autonomous Expansion...');
  {
    const kingdom = new LivingKingdomManager();
    const caravan = kingdom.dispatchCaravan('desa_majapahit', 'banjar_subak', 'kain_batik_tulis', 15);
    assert(caravan !== null, 'Dispatched trade caravan from Dusun Wilwatikta to Banjar Tirta Subak');
    assert(caravan!.mode === 'phinisi_vessel', `Long maritime route selected Phinisi vessel (${caravan!.mode})`);

    const escorted = kingdom.escortCaravan(caravan!.id, 'player_raka');
    assert(escorted && caravan!.escortedByPlayerId === 'player_raka', 'Player Raka registered as caravan escort');

    // Simulate ticks until caravan completes its journey
    for (let i = 0; i < 120; i++) {
      kingdom.update(1.0);
    }
    assert(caravan!.status === 'arrived', 'Escorted caravan arrived safely at Banjar Tirta Subak');

    const destGrowth = kingdom.getSettlementGrowth('banjar_subak');
    assert(
      !!destGrowth && destGrowth.expansions.length >= 1 && destGrowth.tierLevel >= 2,
      `Banjar Tirta Subak autonomously expanded (tier ${destGrowth?.tierLevel}, built ${destGrowth?.expansions[0]?.structureType})`
    );
  }

  // --- 2. MULTI-PHASE WORLD BOSS & DESTRUCTIVE VOXEL ARENA ---
  console.log('\n▶ [2/3] Testing WorldBossRaidManager Multi-Phase & Voxel Destruction...');
  {
    const raid = new WorldBossRaidManager();
    const boss = raid.spawnBoss('naga_besukih', [100, 64, 100]);
    assert(boss.phase === 1 && boss.active, 'Spawned Naga Besukih in Phase 1');

    // Mock voxel arena with stone, obsidian pillar, and bedrock floor
    const voxelMap = new Map<string, BlockType>();
    for (let x = 95; x <= 105; x++) {
      for (let z = 95; z <= 105; z++) {
        voxelMap.set(`${x},62,${z}`, BlockType.STONE);
        voxelMap.set(`${x},63,${z}`, BlockType.STONE);
      }
    }
    voxelMap.set('100,63,100', BlockType.OBSIDIAN);           // Must survive blast!
    voxelMap.set('101,62,100', BlockType.ANCIENT_RUNE_STONE); // Must survive blast!

    const mockWorld: VoxelBlastWriter = {
      getBlockAt: (x, y, z) => voxelMap.get(`${x},${y},${z}`) ?? BlockType.AIR,
      setBlockAt: (x, y, z, b) => voxelMap.set(`${x},${y},${z}`, b),
    };

    // Push boss to Phase 2 (<= 65% HP)
    const hit1 = raid.damageBoss('player_raka', 1300);
    assert(hit1.phaseChanged && hit1.newPhase === 2, 'Boss transitioned to Phase 2 at <= 65% HP');

    // Trigger Phase 2 Tectonic Slam & let telegraph complete
    const atk = raid.triggerPhaseAttack([100, 63, 100]);
    assert(atk !== null && atk.blastRadius > 0, `Triggered telegraphed destructive attack: ${atk?.name}`);
    const impact = raid.update(atk!.telegraphSec + 0.1, mockWorld);
    assert(impact.impactFired && impact.shatteredCount > 5, `Tectonic Slam shattered ${impact.shatteredCount} arena stone blocks`);
    assert(mockWorld.getBlockAt(100, 63, 100) === BlockType.OBSIDIAN, 'Obsidian block survived destructive boss blast');
    assert(mockWorld.getBlockAt(101, 62, 100) === BlockType.ANCIENT_RUNE_STONE, 'Ancient Rune Stone survived destructive boss blast');

    // Finish boss in Phase 3 & verify mythic loot
    const kill = raid.damageBoss('player_sinta', 2500);
    assert(kill.defeated && !!kill.rewards && kill.rewards.includes('sisik_naga_besukih'), 'Defeating Naga Besukih awards mythic raid loot');
  }

  // --- 3. NPC EPISODIC MEMORY & CONTEXTUAL AI QUESTS ---
  console.log('\n▶ [3/3] Testing NPC Episodic Memory & Contextual AI Quest Generator...');
  {
    const mem = NusantaraAIService.memoryEngine;
    mem.recordMemory(
      'ki_lurah_tejo_elder',
      'desa_majapahit',
      'escort_caravan',
      'Mengawal Kapal Phinisi Batik menuju Banjar Tirta Subak',
      25
    );

    const promptStr = mem.buildDialogueMemoryPrompt('ki_lurah_tejo_elder', 'desa_majapahit');
    assert(
      promptStr.includes('sangat menghormati') && promptStr.includes('Phinisi Batik'),
      'NPC memory prompt captures player deed and positive sentiment'
    );

    const fallbackReply = NusantaraAIService.buildOfflineDialogueFallback({
      npcId: 'ki_lurah_tejo_elder',
      npcName: 'Ki Lurah Tejo',
      npcRole: 'Tetua Dusun',
      settlementId: 'desa_majapahit',
      settlementName: 'Dusun Wilwatikta',
      reputation: 45,
      playerMessage: 'Halo Ki Lurah',
      memoryContext: promptStr,
    });
    assert(
      fallbackReply.reply.includes('Phinisi Batik'),
      'NPC dialogue response reflects episodic memory of player deeds'
    );

    // Contextual quest prioritizes active World Boss first, then active Caravan
    const raid = new WorldBossRaidManager();
    const activeBoss = raid.spawnBoss('garuda_sura', [220, 90, -140]);
    const bossQuest = mem.generateContextualQuest({
      giverNpcId: 'ki_lurah_tejo_elder',
      settlementId: 'desa_majapahit',
      activeBoss,
    });
    assert(
      bossQuest.objectiveType === 'vanquish_boss' && bossQuest.targetId === activeBoss.id,
      `Dynamic quest generated for live World Boss: ${bossQuest.title}`
    );

    const kingdom = new LivingKingdomManager();
    const liveCaravan = kingdom.dispatchCaravan('desa_majapahit', 'nagari_minang', 'beras_wangi', 10)!;
    const escortQuest = mem.generateContextualQuest({
      giverNpcId: 'ki_lurah_tejo_elder',
      settlementId: 'desa_majapahit',
      activeBoss: null,
      activeCaravans: [liveCaravan],
    });
    assert(
      escortQuest.objectiveType === 'escort_caravan' && escortQuest.targetId === liveCaravan.id,
      `Dynamic quest generated for live Trade Caravan: ${escortQuest.title}`
    );
  }

  console.log('\n====================================================');
  console.log(' ALL VOXELVERSE v7.2.0 TESTS PASSED!');
  console.log('====================================================\n');
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('livingKingdomV72Tests')) {
  runLivingKingdomV72Tests();
}
