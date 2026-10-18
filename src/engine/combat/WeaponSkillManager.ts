// Pusaka Weapon Arts & Special Skill Execution Engine
import { ItemStack } from '../../types';
import { GameEventBus } from '../events/GameEventBus';
import type { GameRuntime } from '../core/GameRuntime';
import * as THREE from 'three';
import { PoiseSystem } from './PoiseSystem';

export interface WeaponSkillDef {
  id: string;
  name: string;
  description: string;
  cooldownMax: number; // in seconds
  staminaCost: number;
  icon: string;
  color: string;
}

export class WeaponSkillManager {
  private static cooldownRemaining: number = 0;
  private static activeSkill: WeaponSkillDef | null = null;
  private static listeners: Set<(state: { skill: WeaponSkillDef | null; cooldownRatio: number; cooldownSeconds: number }) => void> = new Set();

  public static getSkillForWeapon(item: ItemStack | null): WeaponSkillDef {
    if (!item) {
      return {
        id: 'unarmed_force',
        name: 'Hantaman Tenaga Dalam',
        description: 'Hembusan gelombang angin bertekanan tinggi yang memukul mundur musuh.',
        cooldownMax: 3.5,
        staminaCost: 15,
        icon: '💨',
        color: '#38bdf8',
      };
    }

    const id = item.itemId.toLowerCase();
    if (id.includes('kris') || id.includes('keris') || id.includes('blade') || id.includes('saber') || id.includes('sword')) {
      return {
        id: 'kris_pamor_suci',
        name: 'Pusaran Pamor Suci',
        description: 'Tebasan 360° bilah pamor meteorit yang memancarkan aura pertahanan suci.',
        cooldownMax: 5.5,
        staminaCost: 24,
        icon: '⚔️',
        color: '#f59e0b',
      };
    }

    if (id.includes('spear') || id.includes('tombak') || id.includes('trident')) {
      return {
        id: 'spear_baruklinting',
        name: 'Kilat Baruklinting',
        description: 'Tusukan melesat berkecepatan kilat yang menembus armor dan membuyarkan poise.',
        cooldownMax: 4.8,
        staminaCost: 22,
        icon: '⚡',
        color: '#38bdf8',
      };
    }

    if (id.includes('axe') || id.includes('golok') || id.includes('hammer') || id.includes('pickaxe')) {
      return {
        id: 'axe_badai_remuk',
        name: 'Tebasan Badai Remuk',
        description: 'Hantaman gempa pemecah perisai musuh dan penghancur batu.',
        cooldownMax: 6.0,
        staminaCost: 28,
        icon: '🪓',
        color: '#ef4444',
      };
    }

    if (id.includes('bow') || id.includes('sumpit')) {
      return {
        id: 'bow_aether_volley',
        name: 'Hujan Panah Aether',
        description: 'Menembakkan rangkaian anak panah energi yang memburu sasaran.',
        cooldownMax: 5.0,
        staminaCost: 20,
        icon: '🏹',
        color: '#a855f7',
      };
    }

    return {
      id: 'unarmed_force',
      name: 'Hantaman Tenaga Dalam',
      description: 'Hembusan gelombang angin bertekanan tinggi yang memukul mundur musuh.',
      cooldownMax: 3.5,
      staminaCost: 15,
      icon: '💨',
      color: '#38bdf8',
    };
  }

  public static update(deltaTime: number): void {
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining = Math.max(0, this.cooldownRemaining - deltaTime);
      this.notify();
    }
  }

  public static isReady(): boolean {
    return this.cooldownRemaining <= 0;
  }

  public static getCooldownRemaining(): number {
    return this.cooldownRemaining;
  }

  public static triggerSkill(runtime: GameRuntime): boolean {
    if (this.cooldownRemaining > 0) {
      runtime.audio.playTone(220, 0.08);
      return false;
    }

    const player = runtime.player;
    if (!player) return false;

    const activeItem = runtime.getActiveHotbarItem();
    const skill = this.getSkillForWeapon(activeItem);

    // Check stamina
    if (runtime.stats && runtime.gameMode !== 'creative') {
      if (runtime.stats.stamina < skill.staminaCost) {
        runtime.audio.playTone(180, 0.1);
        GameEventBus.emit('NOTIFICATION_SHOW', {
          title: '⚠️ STAMINA TIDAK CUKUP',
          message: `Dibutuhkan ${skill.staminaCost} stamina untuk jurus ${skill.name}!`,
          type: 'warning',
        });
        return false;
      }
      runtime.stats.stamina -= skill.staminaCost;
    }

    // Set cooldown
    this.cooldownRemaining = skill.cooldownMax;
    this.activeSkill = skill;

    // Trigger visual and auditory feedback
    player.triggerSwing();
    player.applyScreenShake(0.35);

    if (skill.id === 'kris_pamor_suci') {
      runtime.audio.playAncientGong();
      runtime.audio.playTone(780, 0.35);
      // Spawn golden aura particles
      if (runtime.particles) {
        runtime.particles.spawnCombatSparks(player.position.clone().add(new THREE.Vector3(0, 1.2, 0)), true);
      }
      // Radial sweep attack on nearby hostiles
      const radius = 6.0;
      let hitCount = 0;
      runtime.entities.entities.forEach((entity, id) => {
        const dist = player.position.distanceTo(entity.mesh.position);
        if (dist <= radius) {
          const dmg = 45;
          runtime.entities.attackEntity(id, dmg, player.position, true, 2, 1.4, 60);
          hitCount++;
        }
      });
      GameEventBus.emit('NOTIFICATION_SHOW', {
        title: `✨ ${skill.name}`,
        message: hitCount > 0 ? `Menyapu ${hitCount} musuh dengan pamor pusaka suci!` : 'Aura perlindungan pamor aktif!',
        type: 'success',
      });
    } else if (skill.id === 'spear_baruklinting') {
      runtime.audio.playCriticalHit();
      // Forward thrust impulse
      const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, player.yaw, 0)).normalize();
      player.velocity.x += forwardDir.x * 12;
      player.velocity.z += forwardDir.z * 12;
      // Strike in front
      const targetPos = player.position.clone().add(forwardDir.clone().multiplyScalar(4.0));
      runtime.entities.entities.forEach((entity, id) => {
        const dist = targetPos.distanceTo(entity.mesh.position);
        if (dist <= 3.8) {
          runtime.entities.attackEntity(id, 55, player.position, true, 1, 1.8, 75);
          PoiseSystem.applyPoiseDamage(id, 75);
        }
      });
      GameEventBus.emit('NOTIFICATION_SHOW', {
        title: `⚡ ${skill.name}`,
        message: 'Tusukan kilat melesat menembus barisan pertahanan!',
        type: 'info',
      });
    } else if (skill.id === 'axe_badai_remuk') {
      runtime.audio.playBlockHit('stone');
      runtime.audio.playTone(320, 0.25);
      player.applyScreenShake(0.65);
      // Ground slam
      const radius = 5.5;
      runtime.entities.entities.forEach((entity, id) => {
        const dist = player.position.distanceTo(entity.mesh.position);
        if (dist <= radius) {
          runtime.entities.attackEntity(id, 62, player.position, true, 0, 1.2, 90);
          PoiseSystem.applyPoiseDamage(id, 90);
        }
      });
      GameEventBus.emit('NOTIFICATION_SHOW', {
        title: `🔥 ${skill.name}`,
        message: 'Hantaman tanah meremukkan poise dan perisai musuh!',
        type: 'danger',
      });
    } else {
      runtime.audio.playTone(440, 0.15);
      GameEventBus.emit('NOTIFICATION_SHOW', {
        title: `💨 ${skill.name}`,
        message: 'Gelombang hembusan angin memukul mundur lawan!',
        type: 'info',
      });
    }

    GameEventBus.emit('WEAPON_SKILL_USED', { skillId: skill.id });
    this.notify();
    return true;
  }

  public static subscribe(fn: (state: { skill: WeaponSkillDef | null; cooldownRatio: number; cooldownSeconds: number }) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private static notify(): void {
    const activeItem = (window as any).__voxelRuntime?.getActiveHotbarItem() || null;
    const skill = this.getSkillForWeapon(activeItem);
    const max = skill ? skill.cooldownMax : 5.0;
    const ratio = max > 0 ? this.cooldownRemaining / max : 0;
    const state = {
      skill,
      cooldownRatio: ratio,
      cooldownSeconds: Math.ceil(this.cooldownRemaining),
    };
    this.listeners.forEach(fn => fn(state));
  }
}
