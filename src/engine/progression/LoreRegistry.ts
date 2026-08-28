// Modular Lore & Ancient Chronicle Registry for VoxelVerse
import { LoreEntry } from '../../types';

export const LORE_REGISTRY: Record<string, LoreEntry> = {
  chronicle_origin: {
    id: 'chronicle_origin',
    title: 'The First Spark of Ley',
    category: 'origins',
    era: 'First Age of Ley',
    content: 'Before the mountains split and the seas cooled, the realm was woven of harmonic voxel leylines. The Precursors learned to shape raw matter with resonance chisels, raising crystalline citadels that floated above the emerald vales.',
    discoveryLocation: 'Ancient Shrine Monoliths',
  },
  chronicle_sundering: {
    id: 'chronicle_sundering',
    title: 'The Void Sundering',
    category: 'void_cataclysm',
    era: 'The Void Sundering',
    content: 'In their hubris to harvest the dark heart of the cosmos, the Precursors tore a rift beyond the stars. Out surged the Void Stalkers and the Shadow Sovereign. Whole cities collapsed into the abyssal stratum, leaving only runic monoliths and mossy ruins.',
    discoveryLocation: 'Sunken Crypt Tablets',
  },
  chronicle_aether: {
    id: 'chronicle_aether',
    title: 'Aurelion Crystal Resonance',
    category: 'precursors',
    era: 'The Zenith Era',
    content: 'Cyan aether crystals do not merely store ambient luminescence; they store memories and thermal potential. When struck with hardened ferrite or mythril, they pulse with kinetic force capable of empowering primitive tools into astral instruments.',
    discoveryLocation: 'Crystal Cavern Inscriptions',
  },
  chronicle_flora_fauna: {
    id: 'chronicle_flora_fauna',
    title: 'Ecosystem of the Highlands',
    category: 'fauna_flora',
    era: 'Present Reclamation',
    content: 'The Aurelion Crystal Stag feeds exclusively on luminous sun orchids and wild herbs. Its antler marrow possesses regenerative properties, rendering it revered by nomadic merchants who trade across the wild frontier.',
    discoveryLocation: 'Nomad Journals & Explorer Cabins',
  },
  chronicle_deep_world: {
    id: 'chronicle_deep_world',
    title: 'The Subterranean Stratum',
    category: 'ancient_craft',
    era: 'The Zenith Era',
    content: 'Beneath the iron crust lies the mythril belt, guarded by the slumbering Ruin Sentinels. Those who venture past elevation Y=15 must carry reliable light and thermal wards, for the magma strata brook no careless wanderers.',
    discoveryLocation: 'Subterranean Rune Carvings',
  },
};
