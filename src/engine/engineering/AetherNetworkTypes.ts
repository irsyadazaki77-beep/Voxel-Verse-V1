// Aether Engineering & Automation System 1.0 - Core Types & Network Interfaces
import { BlockType, ItemStack } from '../../types';

export type EngineeringNodeType =
  | 'core'
  | 'conduit'
  | 'sensor'
  | 'logic_rune'
  | 'delay_rune'
  | 'pulse_rune'
  | 'latch_rune'
  | 'actuator'
  | 'funnel'
  | 'storage_relay'
  | 'harvester'
  | 'irrigation'
  | 'fabricator'
  | 'turret'
  | 'trap'
  | 'lamp'
  | 'rail'
  | 'generator';

export type SensorMode =
  | 'player_proximity'
  | 'hostile_proximity'
  | 'passive_proximity'
  | 'item_proximity'
  | 'daylight'
  | 'night'
  | 'weather'
  | 'anomaly_warning';

export type LogicGateType = 'AND' | 'OR' | 'NOT' | 'XOR';

export type Direction6 = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';

export interface AetherNodeConfig {
  sensorMode?: SensorMode;
  sensorRange?: number; // 1 to 16
  logicGate?: LogicGateType;
  logicOp?: LogicGateType;
  delayTicks?: number;
  delaySeconds?: number; // 0.1 to 5.0
  actuatorMode?: 'push' | 'pull' | 'toggle';
  filterItemId?: string | null;
  recipeId?: string | null;
  mode?: string;
  turretTargetMode?: 'all_hostiles' | 'bosses_only' | 'flying_only';
  invertSignal?: boolean;
  facing?: Direction6;
}

export interface AetherNode {
  posKey: string; // "x,y,z"
  pos: [number, number, number];
  blockType: BlockType;
  nodeType: EngineeringNodeType;
  networkId: string;
  signalState: boolean; // active / inactive
  signalPower: number; // 0 to 15 (attenuates with distance unless amplified)
  energyProvided: number; // AE/s
  energyDemand: number; // AE/s
  energyCapacity: number;
  energyStored: number;
  config: AetherNodeConfig;
  facing: Direction6;
  internalState: {
    timer?: number;
    cooldown?: number;
    latchState?: boolean;
    prevSignal?: boolean;
    bufferItems?: (ItemStack | null)[];
    fuelRemaining?: number;
    [key: string]: any;
  };
}

export interface NetworkGraph {
  networkId: string;
  nodes: Map<string, AetherNode>;
  totalEnergyCapacity: number; // AE/s generated
  totalEnergyDemand: number; // AE/s consumed
  isPowered: boolean; // capacity >= demand
  isOverloaded: boolean; // demand > capacity
  activeSignals: Set<string>; // posKeys with signalState === true
}

export interface MachineStateSaveData {
  posKey: string;
  blockType: number;
  config: AetherNodeConfig;
  internalState: Record<string, any>;
  facing: Direction6;
}

export interface BlueprintStructure {
  id: string;
  name: string;
  dimensions: [number, number, number]; // width, height, depth
  blocks: Array<{ relPos: [number, number, number]; blockType: BlockType }>;
  requiredItems: Array<{ itemId: string; count: number }>;
}
