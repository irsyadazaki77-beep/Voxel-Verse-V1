// Procedural PBR Material & Contact Grounding Factory for Creature 3.0
import * as THREE from 'three';

export interface CreatureMaterialPalette {
  body: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  belly?: THREE.MeshStandardMaterial;
  horn?: THREE.MeshStandardMaterial;
  eye: THREE.Material;
  secondaryEye?: THREE.Material;
  limb?: THREE.MeshStandardMaterial;
  feature?: THREE.MeshStandardMaterial;
}

export class CreatureMaterialFactory {
  private static shadowTexture: THREE.CanvasTexture | null = null;
  private static shadowMaterial: THREE.MeshBasicMaterial | null = null;
  private static shadowGeometry: THREE.BufferGeometry | null = null;

  public static readonly HIT_FLASH_NORMAL = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  public static readonly HIT_FLASH_CRIT = new THREE.MeshBasicMaterial({ color: 0xffd700 });

  // Cache of palettes keyed by `${modelType}_var${variantIndex}`
  private static paletteCache: Map<string, CreatureMaterialPalette> = new Map();

  /**
   * Generates a circular contact shadow plane geometry & material for grounding.
   */
  public static getContactShadowMesh(scale: number = 1.0): THREE.Mesh {
    if (!this.shadowGeometry) {
      this.shadowGeometry = new THREE.PlaneGeometry(1, 1);
      this.shadowGeometry.rotateX(-Math.PI / 2);
    }

    if (!this.shadowTexture) {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
          gradient.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
          gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.40)');
          gradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.12)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 64, 64);
        }
        this.shadowTexture = new THREE.CanvasTexture(canvas);
        this.shadowTexture.generateMipmaps = false;
        this.shadowTexture.minFilter = THREE.LinearFilter;
      } else {
        const size = 32;
        const data = new Uint8Array(size * size * 4);
        const center = size / 2;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const dx = (x - center) / center;
            const dy = (y - center) / center;
            const dist = Math.min(1.0, Math.sqrt(dx * dx + dy * dy));
            const alpha = Math.floor(Math.max(0, 1.0 - dist) * 160);
            const idx = (y * size + x) * 4;
            data[idx] = 0;
            data[idx + 1] = 0;
            data[idx + 2] = 0;
            data[idx + 3] = alpha;
          }
        }
        this.shadowTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat) as any;
        this.shadowTexture.needsUpdate = true;
      }
    }

    if (!this.shadowMaterial) {
      this.shadowMaterial = new THREE.MeshBasicMaterial({
        map: this.shadowTexture,
        transparent: true,
        opacity: 0.52,
        depthWrite: false,
      });
    }

    const mesh = new THREE.Mesh(this.shadowGeometry, this.shadowMaterial);
    mesh.scale.set(scale, 1, scale);
    mesh.position.y = 0.02; // Just above terrain to avoid z-fighting
    mesh.renderOrder = 1;
    return mesh;
  }

  /**
   * Applies subtle deterministic color variation (4 variants) without breaking species identity.
   */
  private static shiftColor(baseHex: number, variant: number): number {
    if (variant === 0) return baseHex;
    const color = new THREE.Color(baseHex);
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);

    switch (variant) {
      case 1: // Warmer & slightly brighter
        hsl.h = (hsl.h + 0.02) % 1.0;
        hsl.l = Math.min(1.0, hsl.l * 1.05);
        break;
      case 2: // Cooler & slightly muted
        hsl.h = (hsl.h - 0.02 + 1.0) % 1.0;
        hsl.s = Math.max(0.0, hsl.s * 0.95);
        break;
      case 3: // Richer & deeper tone
        hsl.l = Math.max(0.05, hsl.l * 0.92);
        hsl.s = Math.min(1.0, hsl.s * 1.08);
        break;
    }

    color.setHSL(hsl.h, hsl.s, hsl.l);
    return color.getHex();
  }

  /**
   * Gets or creates a material palette for a creature model type and variant index.
   */
  public static getPalette(modelType: string, variantIndex: number = 0): CreatureMaterialPalette {
    const v = Math.abs(variantIndex) % 4;
    const key = `${modelType}_v${v}`;
    let cached = this.paletteCache.get(key);
    if (cached) return cached;

    cached = this.createPaletteForType(modelType, v);
    this.paletteCache.set(key, cached);
    return cached;
  }

  private static createPaletteForType(modelType: string, variant: number): CreatureMaterialPalette {
    switch (modelType) {
      // 1. Aurelion Crystal Stag
      case 'stag':
      
      case 'storm_ray': {
        const mat = new THREE.MeshStandardMaterial({ color: 0x22d3ee });
        mat.emissive.setHex(0x06b6d4);
        mat.emissiveIntensity = 0.5;
        return {
          body: mat,
          accent: mat,
          eye: new THREE.MeshBasicMaterial({ color: 0xffffff })
        };
      }
      case 'crystal_golem': {
        const mat = new THREE.MeshStandardMaterial({ color: 0xc084fc });
        mat.transparent = true;
        mat.opacity = 0.8;
        mat.emissive.setHex(0xa855f7);
        mat.emissiveIntensity = 0.3;
        mat.roughness = 0.1;
        mat.metalness = 0.8;
        return {
          body: mat,
          accent: mat,
          eye: new THREE.MeshBasicMaterial({ color: 0xffffff })
        };
      }

      case 'aether_stag': {
        const bodyColor = this.shiftColor(0x9a653d, variant);
        const limbColor = this.shiftColor(0x734825, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.85, metalness: 0.04 }),
          accent: new THREE.MeshStandardMaterial({ color: 0xe8cfb2, roughness: 0.8, metalness: 0.02 }), // bib/chest fur
          belly: new THREE.MeshStandardMaterial({ color: 0xdfc1a0, roughness: 0.8, metalness: 0.02 }),
          horn: new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            roughness: 0.18,
            metalness: 0.25,
            emissive: 0x0284c7,
            emissiveIntensity: 0.75,
          }),
          eye: new THREE.MeshBasicMaterial({ color: 0x1c1917 }),
          secondaryEye: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }), // Aether cyan pupil
          limb: new THREE.MeshStandardMaterial({ color: limbColor, roughness: 0.88, metalness: 0.03 }),
        };
      }

      // 2. Woolbeast (Boreal Fluffy Livestock)
      case 'woolbeast': {
        const fleeceColor = this.shiftColor(0xf5f5f7, variant);
        const skinColor = this.shiftColor(0xdadce0, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: fleeceColor, roughness: 0.95, metalness: 0.01 }), // thick wool
          accent: new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.75, metalness: 0.05 }), // hooves / horns
          belly: new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.95, metalness: 0.01 }),
          horn: new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.7, metalness: 0.1 }),
          eye: new THREE.MeshBasicMaterial({ color: 0x18181b }),
          limb: new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8, metalness: 0.02 }),
        };
      }

      // 3. Ironhide Grazeback (Heavy Armored Bovine)
      case 'grazeback': {
        const hideColor = this.shiftColor(0x52525b, variant);
        const plateColor = this.shiftColor(0x333338, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: hideColor, roughness: 0.85, metalness: 0.08 }),
          accent: new THREE.MeshStandardMaterial({ color: plateColor, roughness: 0.9, metalness: 0.25 }), // dorsal stone plates
          horn: new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.6, metalness: 0.15 }),
          eye: new THREE.MeshBasicMaterial({ color: 0x27272a }),
          secondaryEye: new THREE.MeshBasicMaterial({ color: 0xf59e0b }), // amber eye
          limb: new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.88, metalness: 0.05 }),
        };
      }

      // 4. Shadow Wolf (Predator Pack Hunter)
      case 'wolf':
      case 'shadow_wolf': {
        const coatColor = this.shiftColor(0x27272a, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.88, metalness: 0.05 }),
          accent: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.05 }), // dark muzzle / spine
          belly: new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.85, metalness: 0.03 }),
          horn: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.0 }), // fangs
          eye: new THREE.MeshBasicMaterial({ color: 0x18181b }),
          secondaryEye: new THREE.MeshBasicMaterial({ color: 0xef4444 }), // Glowing red hunter eyes
          limb: new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.88, metalness: 0.04 }),
        };
      }

      // 5. Luminescent Glowhen
      case 'glowhen': {
        const featherColor = this.shiftColor(0xfef08a, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: featherColor, roughness: 0.9, metalness: 0.02 }),
          accent: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6, metalness: 0.02 }), // beak / legs
          belly: new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.9, metalness: 0.02 }),
          horn: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6, metalness: 0.0 }), // comb & wattle
          eye: new THREE.MeshBasicMaterial({ color: 0x1c1917 }),
          secondaryEye: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }), // Luminescent tail plumes
          limb: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.7, metalness: 0.02 }),
        };
      }

      // 6. Astral Crystal Bee
      case 'bee':
      case 'crystal_bee': {
        const bodyColor = this.shiftColor(0xf59e0b, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.75, metalness: 0.08 }),
          accent: new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.7, metalness: 0.05 }), // black stripes
          horn: new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            roughness: 0.15,
            metalness: 0.3,
            emissive: 0x0284c7,
            emissiveIntensity: 0.8,
          }), // glowing stinger
          eye: new THREE.MeshBasicMaterial({ color: 0x0f172a }),
          secondaryEye: new THREE.MeshStandardMaterial({
            color: 0xbae6fd,
            roughness: 0.1,
            metalness: 0.1,
            transparent: true,
            opacity: 0.72,
          }), // translucent crystal wings
          limb: new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.8, metalness: 0.0 }),
        };
      }

      // 7. Azure Glowfin
      case 'glowfin': {
        const scaleColor = this.shiftColor(0x0284c7, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: scaleColor, roughness: 0.35, metalness: 0.18 }),
          accent: new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            roughness: 0.2,
            metalness: 0.2,
            emissive: 0x0369a1,
            emissiveIntensity: 0.65,
          }), // bioluminescent streak
          eye: new THREE.MeshBasicMaterial({ color: 0x0f172a }),
          secondaryEye: new THREE.MeshStandardMaterial({
            color: 0x7dd3fc,
            roughness: 0.25,
            metalness: 0.1,
            transparent: true,
            opacity: 0.85,
          }), // fin membrane
          limb: new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.4, metalness: 0.15 }),
        };
      }

      // 8. Void Lynx (Rare Aether Predator)
      case 'void_lynx': {
        const coatColor = this.shiftColor(0x201435, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.85, metalness: 0.08 }),
          accent: new THREE.MeshStandardMaterial({ color: 0x120a22, roughness: 0.8, metalness: 0.05 }),
          horn: new THREE.MeshStandardMaterial({
            color: 0xa855f7,
            roughness: 0.25,
            metalness: 0.3,
            emissive: 0x7e22ce,
            emissiveIntensity: 0.7,
          }), // purple claw tips
          eye: new THREE.MeshBasicMaterial({ color: 0x0d0718 }),
          secondaryEye: new THREE.MeshBasicMaterial({ color: 0xc084fc }), // intense violet predator pupil
          limb: new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.85, metalness: 0.06 }),
        };
      }

      // 9. Shadow Stalker (Nocturnal Hostile Predator)
      case 'stalker':
      case 'shadow_stalker': {
        const darkColor = this.shiftColor(0x1a1528, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: darkColor, roughness: 0.85, metalness: 0.05 }),
          accent: new THREE.MeshStandardMaterial({ color: 0x0f0b18, roughness: 0.9, metalness: 0.02 }), // spine spikes
          horn: new THREE.MeshStandardMaterial({ color: 0x2e1065, roughness: 0.6, metalness: 0.1 }), // claws
          eye: new THREE.MeshBasicMaterial({ color: 0x0d0b14 }),
          secondaryEye: new THREE.MeshBasicMaterial({ color: 0xff1a40 }), // piercing crimson eyes
          limb: new THREE.MeshStandardMaterial({ color: darkColor, roughness: 0.88, metalness: 0.04 }),
        };
      }

      // 10. Void Spitter (Levitating Aberration)
      case 'void_spitter': {
        return {
          body: new THREE.MeshStandardMaterial({
            color: 0x4c1d95,
            roughness: 0.3,
            metalness: 0.35,
            emissive: 0x2e1065,
            emissiveIntensity: 0.5,
          }),
          accent: new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            roughness: 0.15,
            metalness: 0.4,
            emissive: 0x0891b2,
            emissiveIntensity: 0.8,
          }), // orbiting shards
          eye: new THREE.MeshBasicMaterial({ color: 0xc084fc }),
          secondaryEye: new THREE.MeshBasicMaterial({ color: 0x06b6d4 }),
          limb: new THREE.MeshStandardMaterial({ color: 0x2e1065, roughness: 0.4, metalness: 0.2 }),
        };
      }

      // 11. Ruin Sentinel Mini-Boss (Ancient Heavy Golem)
      case 'ruin_sentinel':
      case 'golem': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.92, metalness: 0.18 }), // ancient weathered stone
          accent: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85, metalness: 0.35 }), // heavy stone joints
          belly: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9, metalness: 0.2 }),
          horn: new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            roughness: 0.15,
            metalness: 0.4,
            emissive: 0x0284c7,
            emissiveIntensity: 1.1,
          }), // glowing chest reactor
          eye: new THREE.MeshBasicMaterial({ color: 0x18181b }),
          secondaryEye: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }), // glowing visor slit
          limb: new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.92, metalness: 0.18 }),
        };
      }

      // 12. Void Sovereign (Cataclysmic World Boss)
      case 'void_sovereign':
      case 'boss_void_sovereign': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x0d081a, roughness: 0.7, metalness: 0.3 }),
          accent: new THREE.MeshStandardMaterial({
            color: 0xa855f7,
            roughness: 0.2,
            metalness: 0.4,
            emissive: 0x7e22ce,
            emissiveIntensity: 0.95,
          }), // floating crown crystals & runes
          belly: new THREE.MeshStandardMaterial({
            color: 0x581c87,
            roughness: 0.2,
            metalness: 0.2,
            emissive: 0x3b0764,
            emissiveIntensity: 0.8,
          }), // pulsing singularity heart
          horn: new THREE.MeshStandardMaterial({ color: 0x2e1065, roughness: 0.4, metalness: 0.4 }),
          eye: new THREE.MeshBasicMaterial({ color: 0x050308 }),
          secondaryEye: new THREE.MeshBasicMaterial({ color: 0xc084fc }),
          limb: new THREE.MeshStandardMaterial({
            color: 0x2e1065,
            roughness: 0.45,
            metalness: 0.3,
            transparent: true,
            opacity: 0.9,
          }), // void wings
        };
      }

      // 13. Nomadic Merchant
      case 'merchant':
      case 'npc_merchant': {
        const robeColor = this.shiftColor(0x9a5a2e, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.85, metalness: 0.02 }), // travel robe
          accent: new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.78, metalness: 0.05 }), // backpack leather
          belly: new THREE.MeshStandardMaterial({ color: 0xcca658, roughness: 0.8, metalness: 0.02 }), // trim/scarf
          horn: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.6 }), // lantern brass
          eye: new THREE.MeshBasicMaterial({ color: 0x27272a }),
          secondaryEye: new THREE.MeshBasicMaterial({ color: 0xfef08a }), // lantern glow
          limb: new THREE.MeshStandardMaterial({ color: 0x3b2f27, roughness: 0.88, metalness: 0.02 }),
        };
      }

      // 14. Settlement Elder
      case 'elder':
      case 'npc_elder': {
        const robeColor = this.shiftColor(0x254b73, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.85, metalness: 0.02 }),
          accent: new THREE.MeshStandardMaterial({ color: 0x47386d, roughness: 0.8, metalness: 0.04 }), // mantle
          belly: new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.8, metalness: 0.0 }), // beard
          horn: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.3, emissive: 0x0369a1, emissiveIntensity: 0.5 }), // amulet
          eye: new THREE.MeshBasicMaterial({ color: 0x1e293b }),
          limb: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85, metalness: 0.02 }),
        };
      }

      // 15. Farmer (Petani Sawah & Ladang)
      case 'farmer':
      case 'npc_farmer': {
        const tunicColor = this.shiftColor(0x4d5b38, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: tunicColor, roughness: 0.9, metalness: 0.0 }), // farming tunic
          accent: new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.92, metalness: 0.0 }), // straw caping hat
          belly: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.85, metalness: 0.02 }), // sarong/belt
          horn: new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.4, metalness: 0.5 }), // sickle blade
          eye: new THREE.MeshBasicMaterial({ color: 0x27272a }),
          limb: new THREE.MeshStandardMaterial({ color: 0x3f2e21, roughness: 0.88, metalness: 0.0 }),
        };
      }

      // 16. Fisher (Nelayan Sungai & Pesisir)
      case 'fisher':
      case 'npc_fisher': {
        const tunicColor = this.shiftColor(0x1e3a5f, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: tunicColor, roughness: 0.85, metalness: 0.0 }),
          accent: new THREE.MeshStandardMaterial({ color: 0xb5a886, roughness: 0.9, metalness: 0.0 }), // bamboo wicker basket
          belly: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8, metalness: 0.0 }), // fishing net
          horn: new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.2 }), // fish scale shine
          eye: new THREE.MeshBasicMaterial({ color: 0x0f172a }),
          limb: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88, metalness: 0.0 }),
        };
      }

      // 17. Craftsperson (Pengrajin Kayu & Pahat Batu)
      case 'craftsperson':
      case 'npc_craftsperson': {
        const tunicColor = this.shiftColor(0x78350f, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: tunicColor, roughness: 0.88, metalness: 0.02 }),
          accent: new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.75, metalness: 0.1 }), // leather apron
          belly: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8, metalness: 0.0 }), // carved wood piece
          horn: new THREE.MeshStandardMaterial({ color: 0xa1a1aa, roughness: 0.3, metalness: 0.7 }), // steel chisel/hammer
          eye: new THREE.MeshBasicMaterial({ color: 0x18181b }),
          limb: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85, metalness: 0.0 }),
        };
      }

      // 18. Guard (Prajurit Penjaga Tapal Batas)
      case 'guard':
      case 'npc_guard': {
        const armorColor = this.shiftColor(0x991b1b, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: armorColor, roughness: 0.6, metalness: 0.3 }), // dyed cuirass
          accent: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.65 }), // brass trim & pauldrons
          belly: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8, metalness: 0.0 }), // under-armor
          horn: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 }), // spear/keris steel
          eye: new THREE.MeshBasicMaterial({ color: 0x09090b }),
          limb: new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7, metalness: 0.2 }),
        };
      }

      // 19. Engineer (Empu Irigasi & Mekanik Aether)
      case 'engineer':
      case 'npc_engineer': {
        const tunicColor = this.shiftColor(0x0f766e, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: tunicColor, roughness: 0.8, metalness: 0.05 }),
          accent: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.7 }), // brass gear & gauge
          belly: new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.85, metalness: 0.0 }), // heavy tool harness
          horn: new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.15, metalness: 0.3, emissive: 0x0891b2, emissiveIntensity: 0.6 }), // aether crystal lens
          eye: new THREE.MeshBasicMaterial({ color: 0x134e4a }),
          limb: new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85, metalness: 0.0 }),
        };
      }

      // 20. Hunter (Pemburu Rimba & Penjejak)
      case 'hunter':
      case 'npc_hunter': {
        const cloakColor = this.shiftColor(0x365314, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: cloakColor, roughness: 0.9, metalness: 0.0 }), // camo cloak
          accent: new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.85, metalness: 0.05 }), // quiver & belt
          belly: new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8, metalness: 0.0 }), // leather tunic
          horn: new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.4, metalness: 0.2 }), // sumpit blowpipe
          eye: new THREE.MeshBasicMaterial({ color: 0x14532d }),
          limb: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.88, metalness: 0.0 }),
        };
      }

      // 21. Boat Trader (Saudagar Perahu Sungai & Pesisir)
      case 'boat_trader':
      case 'npc_boat_trader': {
        const sashColor = this.shiftColor(0x0284c7, variant);
        return {
          body: new THREE.MeshStandardMaterial({ color: sashColor, roughness: 0.82, metalness: 0.05 }),
          accent: new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8, metalness: 0.05 }), // cargo satchel
          belly: new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.85, metalness: 0.0 }), // sailor destar
          horn: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.6 }), // brass scales
          eye: new THREE.MeshBasicMaterial({ color: 0x0c4a6e }),
          limb: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.0 }),
        };
      }

      // =========================================================================
      // VOXELVERSE — NUSANTARA MYTHIC PALETTES
      // =========================================================================
      case 'lembu_sekti': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.7, metalness: 0.1 }), // golden brown hide
          accent: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8, metalness: 0.05 }), // terracotta relief saddle
          belly: new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6, metalness: 0.0 }), // cream underbelly
          horn: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.7, emissive: 0xd97706, emissiveIntensity: 0.5 }), // golden glowing horns
          eye: new THREE.MeshBasicMaterial({ color: 0xfffbeb }),
          limb: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75, metalness: 0.1 }),
        };
      }

      case 'singa_marapi': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.65, metalness: 0.2 }), // onyx fur body
          accent: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.8, emissive: 0x94a3b8, emissiveIntensity: 0.4 }), // silver filigree mane
          belly: new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.7, metalness: 0.1 }),
          horn: new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.3, metalness: 0.6 }), // golden roof horns
          eye: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }), // cyan glowing eyes
          limb: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7, metalness: 0.2 }),
        };
      }

      case 'enggang_celestial': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8, metalness: 0.05 }), // black obsidian feathers
          accent: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.3, emissive: 0xd97706, emissiveIntensity: 0.6 }), // ivory casque horn
          belly: new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.8, metalness: 0.0 }), // white chest feathers
          horn: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.4 }),
          eye: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
          limb: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85, metalness: 0.0 }),
        };
      }

      case 'barong_aether': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.5, emissive: 0xb45309, emissiveIntensity: 0.3 }), // golden mask armor
          accent: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.8 }), // golden floral carvings
          belly: new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.1, metalness: 0.9, emissive: 0x0891b2, emissiveIntensity: 0.8 }), // chest mirror medallion
          horn: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.7 }),
          eye: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
          limb: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6, metalness: 0.2 }),
        };
      }

      case 'tedong_bonga': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.75, metalness: 0.05 }), // dark piebald base
          accent: new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.8, metalness: 0.0 }), // white star patches
          belly: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8, metalness: 0.0 }),
          horn: new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.4, metalness: 0.4 }), // sweeping carved horns
          eye: new THREE.MeshBasicMaterial({ color: 0x0f172a }),
          limb: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8, metalness: 0.0 }),
        };
      }

      case 'cenderawasih_astral': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, metalness: 0.3, emissive: 0x0369a1, emissiveIntensity: 0.4 }), // sapphire wings
          accent: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.6, emissive: 0xd97706, emissiveIntensity: 0.8 }), // golden tail plume streamers
          belly: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5, metalness: 0.2 }),
          horn: new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3, metalness: 0.5 }),
          eye: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
          limb: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.0 }),
        };
      }

      case 'penyu_garam': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.7, metalness: 0.1 }), // sea green skin
          accent: new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, metalness: 0.7, emissive: 0x0284c7, emissiveIntensity: 0.7 }), // salt crystal clusters
          belly: new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.8, metalness: 0.0 }),
          horn: new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.6, metalness: 0.2 }),
          eye: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
          limb: new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.75, metalness: 0.1 }),
        };
      }

      case 'banaspati_fiend': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3, metalness: 0.4, emissive: 0xbe123c, emissiveIntensity: 0.9 }), // blazing magma core
          accent: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.6, emissive: 0xd97706, emissiveIntensity: 0.8 }), // flame crest
          belly: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9, metalness: 0.1 }), // volcanic ash jaw
          horn: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.5 }),
          eye: new THREE.MeshBasicMaterial({ color: 0xfffbeb }),
          limb: new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.5, metalness: 0.2 }),
        };
      }

      case 'harimau_cindaku': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8, metalness: 0.05 }), // midnight tiger pelt
          accent: new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2, metalness: 0.6, emissive: 0x0891b2, emissiveIntensity: 0.8 }), // cyan mist stripes
          belly: new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.85, metalness: 0.0 }),
          horn: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.5 }), // white fangs
          eye: new THREE.MeshBasicMaterial({ color: 0x22d3ee }),
          limb: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8, metalness: 0.0 }),
        };
      }

      case 'buaya_puang': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.7, metalness: 0.3 }), // ulin wood grey armor
          accent: new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.2, metalness: 0.5, emissive: 0x16a34a, emissiveIntensity: 0.6 }), // glowing green swamp moss scutes
          belly: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.1 }),
          horn: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.4 }),
          eye: new THREE.MeshBasicMaterial({ color: 0x4ade80 }),
          limb: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.75, metalness: 0.2 }),
        };
      }

      case 'rangda_corrupted': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x701a75, roughness: 0.4, metalness: 0.4, emissive: 0x581c87, emissiveIntensity: 0.7 }), // violet void mask
          accent: new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3, metalness: 0.5, emissive: 0xbe123c, emissiveIntensity: 0.9 }), // red flame tongue
          belly: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9, metalness: 0.1 }),
          horn: new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.2, metalness: 0.6 }),
          eye: new THREE.MeshBasicMaterial({ color: 0xf0abfc }),
          limb: new THREE.MeshStandardMaterial({ color: 0x4c1d95, roughness: 0.6, metalness: 0.3 }),
        };
      }

      case 'poci_kelep': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.9, metalness: 0.1 }), // karst stone
          accent: new THREE.MeshStandardMaterial({ color: 0xa1a1aa, roughness: 0.8, metalness: 0.2 }), // limestone ridges
          belly: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.95, metalness: 0.0 }),
          horn: new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.6, metalness: 0.3 }),
          eye: new THREE.MeshBasicMaterial({ color: 0xef4444 }),
          limb: new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.9, metalness: 0.1 }),
        };
      }

      case 'asmat_war_phantom': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.0 }), // shadow phantom body
          accent: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5, metalness: 0.2 }), // carved red ancestral shield
          belly: new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.8, metalness: 0.0 }), // white war paint geometry
          horn: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.3 }),
          eye: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
          limb: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85, metalness: 0.0 }),
        };
      }

      case 'rimba_pari': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4, metalness: 0.2, emissive: 0x059669, emissiveIntensity: 0.5 }), // emerald flora dress
          accent: new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3, metalness: 0.3, emissive: 0xe11d48, emissiveIntensity: 0.6 }), // rafflesia flower crown
          belly: new THREE.MeshStandardMaterial({ color: 0xd1fae5, roughness: 0.6, metalness: 0.1 }),
          horn: new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.3, metalness: 0.4 }),
          eye: new THREE.MeshBasicMaterial({ color: 0xa7f3d0 }),
          limb: new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.6, metalness: 0.2 }),
        };
      }

      case 'warak_ngendog': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.5, metalness: 0.3 }), // vibrant crimson bovid body
          accent: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.6, emissive: 0xd97706, emissiveIntensity: 0.5 }), // golden dragon crest
          belly: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, metalness: 0.4 }), // blue sea scales
          horn: new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.2, metalness: 0.7 }),
          eye: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
          limb: new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.6, metalness: 0.2 }),
        };
      }

      case 'candi_sentinel': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.9, metalness: 0.1 }), // ancient andesite stone
          accent: new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2, metalness: 0.8, emissive: 0x0891b2, emissiveIntensity: 0.8 }), // glowing Aether eye core & carvings
          belly: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.95, metalness: 0.0 }),
          horn: new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.8, metalness: 0.2 }),
          eye: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
          limb: new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.9, metalness: 0.1 }),
        };
      }

      case 'raksasa_ulin': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9, metalness: 0.05 }), // petrified dark ulin wood
          accent: new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8, metalness: 0.0, emissive: 0x166534, emissiveIntensity: 0.4 }), // glowing moss roots
          belly: new THREE.MeshStandardMaterial({ color: 0x271306, roughness: 0.95, metalness: 0.0 }),
          horn: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85, metalness: 0.1 }),
          eye: new THREE.MeshBasicMaterial({ color: 0x4ade80 }),
          limb: new THREE.MeshStandardMaterial({ color: 0x361304, roughness: 0.9, metalness: 0.05 }),
        };
      }

      case 'hyang_batara_bhumi': {
        return {
          body: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.2 }), // basalt rock titan skin
          accent: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.8, emissive: 0x0369a1, emissiveIntensity: 0.9 }), // Aether crystal chest core
          belly: new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3, metalness: 0.5, emissive: 0xbe123c, emissiveIntensity: 0.7 }), // lava veins
          horn: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.7, emissive: 0xd97706, emissiveIntensity: 0.8 }), // golden volcanic crown spires
          eye: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
          limb: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85, metalness: 0.2 }),
        };
      }

      default:
        return this.createPaletteForType('stag', variant);
    }
  }

  public static dispose(): void {
    this.paletteCache.forEach((palette) => {
      Object.values(palette).forEach((mat) => {
        if (mat instanceof THREE.Material) mat.dispose();
      });
    });
    this.paletteCache.clear();

    if (this.shadowMaterial) {
      this.shadowMaterial.dispose();
      this.shadowMaterial = null;
    }
    if (this.shadowTexture) {
      this.shadowTexture.dispose();
      this.shadowTexture = null;
    }
    if (this.shadowGeometry) {
      this.shadowGeometry.dispose();
      this.shadowGeometry = null;
    }
  }
}
