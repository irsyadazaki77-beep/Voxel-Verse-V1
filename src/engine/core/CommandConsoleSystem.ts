// VoxelVerse v6.1.0: Minecraft Java & Bedrock Slash Command Console Engine (/tp, /time, /weather, /give, /gamemode, /effect, /fill, /seed, /locate)
import { BlockType, GameMode } from '../../types';
import { SETTLEMENT_REGISTRY } from '../settlement/SettlementManager';
import {
  EnchantmentAndStatusSystem,
  StatusEffectId,
} from '../progression/EnchantmentAndStatusSystem';

export interface CommandExecutionResult {
  ok: boolean;
  output: string;
}

export const AVAILABLE_SLASH_COMMANDS: Array<{ cmd: string; usage: string; desc: string }> = [
  { cmd: '/help', usage: '/help', desc: 'Tampilkan semua perintah slash' },
  { cmd: '/tp', usage: '/tp <x> <y> <z>', desc: 'Teleportasi pemain ke koordinat' },
  { cmd: '/time', usage: '/time set <day|noon|sunset|night|0-24>', desc: 'Atur waktu dunia' },
  { cmd: '/weather', usage: '/weather <clear|rain|storm>', desc: 'Ubah cuaca dunia' },
  { cmd: '/gamemode', usage: '/gamemode <survival|creative|adventure>', desc: 'Ubah mode permainan' },
  { cmd: '/give', usage: '/give <itemId> [jumlah]', desc: 'Berikan item ke inventaris' },
  { cmd: '/effect', usage: '/effect <speed|strength|regeneration|haste|night_vision> [detik] [level]', desc: 'Terapkan efek ramuan/jamu' },
  { cmd: '/fill', usage: '/fill <x1> <y1> <z1> <x2> <y2> <z2> <blockId>', desc: 'Isi area blok (maks 1000 blok)' },
  { cmd: '/seed', usage: '/seed', desc: 'Tampilkan seed dunia saat ini' },
  { cmd: '/locate', usage: '/locate <nama_desa>', desc: 'Cari koordinat pemukiman Nusantara' },
];

export class CommandConsoleSystem {
  public static history: string[] = [];
  public static logs: Array<{ text: string; ok: boolean; timestamp: number }> = [];

  public static getSuggestions(prefix: string): string[] {
    const clean = prefix.trim().toLowerCase();
    if (!clean.startsWith('/')) return [];
    return AVAILABLE_SLASH_COMMANDS
      .filter((c) => c.cmd.startsWith(clean) || c.usage.toLowerCase().startsWith(clean))
      .map((c) => c.usage);
  }

  public static execute(rawInput: string, runtime?: any): CommandExecutionResult {
    const trimmed = rawInput.trim();
    if (!trimmed) return { ok: false, output: 'Perintah kosong.' };

    this.history.unshift(trimmed);
    if (this.history.length > 50) this.history.pop();

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    let result: CommandExecutionResult;

    switch (cmd) {
      case '/help': {
        const list = AVAILABLE_SLASH_COMMANDS.map((c) => `${c.usage} — ${c.desc}`).join('\n');
        result = { ok: true, output: `Daftar Perintah VoxelVerse:\n${list}` };
        break;
      }

      case '/tp': {
        const x = Number(parts[1]);
        const y = Number(parts[2]);
        const z = Number(parts[3]);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
          result = { ok: false, output: 'Format: /tp <x> <y> <z>' };
        } else {
          if (runtime?.player?.position) {
            runtime.player.position.set(x, y, z);
          }
          result = { ok: true, output: `Teleportasi berhasil ke [${x}, ${y}, ${z}].` };
        }
        break;
      }

      case '/time': {
        if (parts[1]?.toLowerCase() !== 'set' || !parts[2]) {
          result = { ok: false, output: 'Format: /time set <day|noon|sunset|night|0-24>' };
        } else {
          const arg = parts[2].toLowerCase();
          const presets: Record<string, number> = {
            day: 7,
            noon: 12,
            sunset: 17.5,
            night: 22,
          };
          const targetHour = presets[arg] !== undefined ? presets[arg] : Number(arg);
          if (!Number.isFinite(targetHour)) {
            result = { ok: false, output: `Nilai waktu tidak valid: ${arg}` };
          } else {
            const normalized = ((targetHour % 24) + 24) % 24;
            if (runtime?.sky) {
              runtime.sky.timeOfDay = normalized;
            }
            result = { ok: true, output: `Waktu dunia diatur ke jam ${normalized.toFixed(1)}:00.` };
          }
        }
        break;
      }

      case '/weather': {
        const w = (parts[1] || '').toLowerCase();
        if (!['clear', 'rain', 'storm'].includes(w)) {
          result = { ok: false, output: 'Format: /weather <clear|rain|storm>' };
        } else {
          if (runtime?.weather?.setWeather) {
            runtime.weather.setWeather(w === 'storm' ? 'thunderstorm' : w);
          }
          result = { ok: true, output: `Cuaca diubah menjadi: ${w}.` };
        }
        break;
      }

      case '/gamemode': {
        const mode = (parts[1] || '').toLowerCase() as GameMode;
        if (!['survival', 'creative', 'adventure', 'hardcore'].includes(mode)) {
          result = { ok: false, output: 'Format: /gamemode <survival|creative|adventure|hardcore>' };
        } else {
          if (runtime) {
            runtime.gameMode = mode;
          }
          result = { ok: true, output: `Mode permainan diubah ke ${mode.toUpperCase()}.` };
        }
        break;
      }

      case '/give': {
        const itemId = parts[1];
        const count = Math.max(1, Math.min(64, Number(parts[2] || 1) || 1));
        if (!itemId) {
          result = { ok: false, output: 'Format: /give <itemId> [jumlah]' };
        } else {
          if (runtime?.addItemToInventory) {
            runtime.addItemToInventory(itemId, count);
          }
          result = { ok: true, output: `Diberikan ${count}x ${itemId} ke inventaris.` };
        }
        break;
      }

      case '/effect': {
        const effRaw = (parts[1] || '').toUpperCase() as StatusEffectId;
        const duration = Math.max(5, Math.min(600, Number(parts[2] || 60) || 60));
        const amp = Math.max(1, Math.min(5, Number(parts[3] || 1) || 1));
        const valid: StatusEffectId[] = [
          'SPEED',
          'STRENGTH',
          'REGENERATION',
          'NIGHT_VISION',
          'FIRE_RESISTANCE',
          'WATER_BREATHING',
          'HASTE',
        ];
        if (!valid.includes(effRaw)) {
          result = { ok: false, output: `Efek valid: ${valid.join(', ').toLowerCase()}` };
        } else {
          const applied = EnchantmentAndStatusSystem.applyEffect(effRaw, duration, amp);
          result = {
            ok: true,
            output: `Efek ${applied.name} Lv.${applied.amplifier} aktif selama ${duration} detik.`,
          };
        }
        break;
      }

      case '/fill': {
        const coords = parts.slice(1, 7).map(Number);
        const blockId = Number(parts[7]);
        if (coords.length < 6 || coords.some((n) => !Number.isFinite(n)) || !Number.isFinite(blockId)) {
          result = { ok: false, output: 'Format: /fill <x1> <y1> <z1> <x2> <y2> <z2> <blockId>' };
        } else {
          const minX = Math.floor(Math.min(coords[0], coords[3]));
          const maxX = Math.floor(Math.max(coords[0], coords[3]));
          const minY = Math.floor(Math.min(coords[1], coords[4]));
          const maxY = Math.floor(Math.max(coords[1], coords[4]));
          const minZ = Math.floor(Math.min(coords[2], coords[5]));
          const maxZ = Math.floor(Math.max(coords[2], coords[5]));
          const volume = (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1);
          if (volume > 1000) {
            result = { ok: false, output: `Volume ${volume} terlalu besar (maksimal 1000 blok).` };
          } else {
            if (runtime?.world?.setBlock) {
              for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                  for (let z = minZ; z <= maxZ; z++) {
                    runtime.world.setBlock(x, y, z, blockId as BlockType);
                  }
                }
              }
            }
            result = { ok: true, output: `Berhasil mengisi ${volume} blok dengan BlockType ${blockId}.` };
          }
        }
        break;
      }

      case '/seed': {
        const seed = runtime?.world?.seed ?? 'UNKNOWN';
        result = { ok: true, output: `World Seed: ${seed}` };
        break;
      }

      case '/locate': {
        const query = (parts[1] || '').toLowerCase();
        const matches = Object.values(SETTLEMENT_REGISTRY).filter(
          (s) =>
            !query ||
            s.id.toLowerCase().includes(query) ||
            s.name.toLowerCase().includes(query)
        );
        if (matches.length === 0) {
          result = { ok: false, output: `Pemukiman '${query}' tidak ditemukan.` };
        } else {
          const s = matches[0];
          result = {
            ok: true,
            output: `📍 ${s.name} berada di koordinat [${s.originPos.join(', ')}] (Bioma: ${s.biomeId}).`,
          };
        }
        break;
      }

      default:
        result = { ok: false, output: `Perintah tidak dikenal: ${cmd}. Ketik /help untuk daftar.` };
    }

    this.logs.unshift({ text: result.output, ok: result.ok, timestamp: Date.now() });
    if (this.logs.length > 40) this.logs.pop();
    return result;
  }
}
