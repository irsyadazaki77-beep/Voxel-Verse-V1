// Aether Engineering Network Manager - Topology Graph, Energy Balancing & Event-Driven Signal Engine
import { BlockType, ItemStack } from '../../types';
import { VoxelWorld } from '../world/VoxelWorld';
import { Logger } from '../ui/Logger';
import {
  AetherNode,
  AetherNodeConfig,
  Direction6,
  EngineeringNodeType,
  LogicGateType,
  MachineStateSaveData,
  NetworkGraph,
} from './AetherNetworkTypes';

import { ActuatorEngine } from './ActuatorEngine';
import { ItemFunnelEngine } from './ItemFunnelEngine';
import { AutoHarvesterEngine } from './AutoHarvesterEngine';
import { ResonanceFabricatorEngine } from './ResonanceFabricatorEngine';

export class AetherNetworkManager {
  private static instance: AetherNetworkManager | null = null;

  public nodeMap: Map<string, AetherNode> = new Map();
  public networks: Map<string, NetworkGraph> = new Map();
  private dirtyNodes: Set<string> = new Set();
  private networkCounter: number = 0;

  private world: VoxelWorld | null = null;

  // Machine Engine Callbacks (registered by specialized engines)
  public onMachineTickHandler: ((node: AetherNode, dt: number, world: VoxelWorld) => void) | null = null;
  public onActuatorTriggerHandler: ((node: AetherNode, world: VoxelWorld) => void) | null = null;

  constructor() {
    this.onActuatorTriggerHandler = (node, world) => {
      ActuatorEngine.triggerActuator(node, world);
    };

    this.onMachineTickHandler = (node, dt, world) => {
      if (node.nodeType === 'funnel') {
        ItemFunnelEngine.tick(node, dt);
      } else if (node.nodeType === 'harvester') {
        AutoHarvesterEngine.tick(node, dt, world);
      } else if (node.nodeType === 'fabricator') {
        ResonanceFabricatorEngine.tick(node, dt);
      }
    };
  }

  public static getInstance(): AetherNetworkManager {
    if (!AetherNetworkManager.instance) {
      AetherNetworkManager.instance = new AetherNetworkManager();
    }
    return AetherNetworkManager.instance;
  }

  public setWorld(world: VoxelWorld): void {
    this.world = world;
  }

  // Get engineering node type from BlockType
  public static getNodeTypeFromBlock(blockType: BlockType): EngineeringNodeType | null {
    switch (blockType) {
      case BlockType.AETHER_CORE:
      case BlockType.AETHER_CORE_ADVANCED:
        return 'core';
      case BlockType.LEY_GENERATOR:
        return 'generator';
      case BlockType.LEY_CONDUIT:
        return 'conduit';
      case BlockType.CRYSTAL_SENSOR:
        return 'sensor';
      case BlockType.LOGIC_RUNE:
        return 'logic_rune';
      case BlockType.DELAY_RUNE:
        return 'delay_rune';
      case BlockType.PULSE_RUNE:
        return 'pulse_rune';
      case BlockType.LATCH_RUNE:
        return 'latch_rune';
      case BlockType.AETHER_ACTUATOR:
        return 'actuator';
      case BlockType.ITEM_FUNNEL:
        return 'funnel';
      case BlockType.AETHER_STORAGE_RELAY:
        return 'storage_relay';
      case BlockType.LEY_HARVESTER:
        return 'harvester';
      case BlockType.IRRIGATION_NODE:
        return 'irrigation';
      case BlockType.RESONANCE_FABRICATOR:
        return 'fabricator';
      case BlockType.AETHER_SENTINEL_TURRET:
        return 'turret';
      case BlockType.AETHER_SPIKE:
      case BlockType.SHOCK_RUNE:
      case BlockType.FLAME_VENT:
        return 'trap';
      case BlockType.AETHER_LAMP:
        return 'lamp';
      case BlockType.AETHER_RAIL:
      case BlockType.AETHER_RAIL_SWITCH:
        return 'rail';
      default:
        return null;
    }
  }

  // Helper: Convert position to string key
  public static getPosKey(pos: [number, number, number]): string {
    return `${Math.floor(pos[0])},${Math.floor(pos[1])},${Math.floor(pos[2])}`;
  }

  // Helper: Parse string key to position array
  public static parsePosKey(key: string): [number, number, number] {
    const parts = key.split(',').map(Number);
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  }

  // Helper: Get 6 cardinal neighbor keys
  public static getNeighborKeys(pos: [number, number, number]): string[] {
    const [x, y, z] = pos;
    return [
      `${x + 1},${y},${z}`,
      `${x - 1},${y},${z}`,
      `${x},${y + 1},${z}`,
      `${x},${y - 1},${z}`,
      `${x},${y},${z + 1}`,
      `${x},${y},${z - 1}`,
    ];
  }

  // Default energy specs for block types
  public static getEnergyCapacity(blockType: BlockType): number {
    if (blockType === BlockType.AETHER_CORE) return 20; // 20 AE/s
    if (blockType === BlockType.AETHER_CORE_ADVANCED) return 50; // 50 AE/s
    if (blockType === BlockType.LEY_GENERATOR) return 15; // 15 AE/s
    return 0;
  }

  public static getEnergyDemand(blockType: BlockType): number {
    switch (blockType) {
      case BlockType.AETHER_ACTUATOR:
        return 5;
      case BlockType.ITEM_FUNNEL:
        return 2;
      case BlockType.LEY_HARVESTER:
        return 8;
      case BlockType.IRRIGATION_NODE:
        return 3;
      case BlockType.RESONANCE_FABRICATOR:
        return 12;
      case BlockType.AETHER_SENTINEL_TURRET:
        return 10;
      case BlockType.SHOCK_RUNE:
      case BlockType.FLAME_VENT:
        return 4;
      default:
        return 0;
    }
  }

  // Generate unique Network ID
  private generateNetworkId(): string {
    this.networkCounter++;
    return `net_${Date.now().toString(36)}_${this.networkCounter}`;
  }

  // Place engineering block into node map & recalculate network topology
  public onBlockPlaced(
    pos: [number, number, number],
    blockType: BlockType,
    configOverride?: AetherNodeConfig,
    facing: Direction6 = 'north'
  ): AetherNode | null {
    const nodeType = AetherNetworkManager.getNodeTypeFromBlock(blockType);
    if (!nodeType) return null;

    const posKey = AetherNetworkManager.getPosKey(pos);
    const neighbors = AetherNetworkManager.getNeighborKeys(pos);

    // Find connected engineering networks
    const neighborNodes: AetherNode[] = [];
    const connectedNetworkIds = new Set<string>();

    neighbors.forEach((nKey) => {
      const nNode = this.nodeMap.get(nKey);
      if (nNode) {
        neighborNodes.push(nNode);
        connectedNetworkIds.add(nNode.networkId);
      }
    });

    let assignedNetworkId = '';

    if (connectedNetworkIds.size === 0) {
      // Create a brand new network
      assignedNetworkId = this.generateNetworkId();
      this.networks.set(assignedNetworkId, {
        networkId: assignedNetworkId,
        nodes: new Map(),
        totalEnergyCapacity: 0,
        totalEnergyDemand: 0,
        isPowered: true,
        isOverloaded: false,
        activeSignals: new Set(),
      });
    } else if (connectedNetworkIds.size === 1) {
      // Join single existing network
      assignedNetworkId = Array.from(connectedNetworkIds)[0];
    } else {
      // Merge multiple networks into one
      const networkList = Array.from(connectedNetworkIds);
      assignedNetworkId = networkList[0];
      const primaryNet = this.networks.get(assignedNetworkId)!;

      for (let i = 1; i < networkList.length; i++) {
        const otherNetId = networkList[i];
        const otherNet = this.networks.get(otherNetId);
        if (otherNet) {
          otherNet.nodes.forEach((n) => {
            n.networkId = assignedNetworkId;
            primaryNet.nodes.set(n.posKey, n);
          });
          this.networks.delete(otherNetId);
        }
      }
    }

    const defaultConfig: AetherNodeConfig = {
      sensorMode: 'player_proximity',
      sensorRange: 5,
      logicGate: 'AND',
      delaySeconds: 1.0,
      actuatorMode: 'push',
      filterItemId: null,
      recipeId: null,
      turretTargetMode: 'all_hostiles',
      invertSignal: false,
      facing,
      ...configOverride,
    };

    const node: AetherNode = {
      posKey,
      pos,
      blockType,
      nodeType,
      networkId: assignedNetworkId,
      signalState: false,
      signalPower: 0,
      energyProvided: AetherNetworkManager.getEnergyCapacity(blockType),
      energyDemand: AetherNetworkManager.getEnergyDemand(blockType),
      energyCapacity: AetherNetworkManager.getEnergyCapacity(blockType) * 10,
      energyStored: 0,
      config: defaultConfig,
      facing,
      internalState: {
        timer: 0,
        cooldown: 0,
        latchState: false,
        prevSignal: false,
        bufferItems: [],
      },
    };

    this.nodeMap.set(posKey, node);
    const net = this.networks.get(assignedNetworkId);
    if (net) {
      net.nodes.set(posKey, node);
    }

    this.recalculateNetworkPower(assignedNetworkId);
    this.markDirty(posKey);

    Logger.info('AetherNetworkManager', `Placed engineering node ${nodeType} at ${posKey} [Network: ${assignedNetworkId}]`);
    return node;
  }

  public getNode(pos: [number, number, number]): AetherNode | undefined {
    return this.nodeMap.get(AetherNetworkManager.getPosKey(pos));
  }

  public updateNodeConfig(pos: [number, number, number], config: Partial<AetherNodeConfig>): void {
    const node = this.getNode(pos);
    if (node) {
      node.config = { ...node.config, ...config };
      this.markDirty(node.posKey);
    }
  }

  // Remove engineering block & partition split networks if necessary
  public onBlockRemoved(pos: [number, number, number]): void {
    const posKey = AetherNetworkManager.getPosKey(pos);
    const node = this.nodeMap.get(posKey);
    if (!node) return;

    const oldNetworkId = node.networkId;
    this.nodeMap.delete(posKey);

    const net = this.networks.get(oldNetworkId);
    if (net) {
      net.nodes.delete(posKey);
      net.activeSignals.delete(posKey);

      if (net.nodes.size === 0) {
        this.networks.delete(oldNetworkId);
        return;
      }

      // Check if network is split into multiple components via BFS
      this.repartitionNetwork(oldNetworkId);
    }

    this.dirtyNodes.delete(posKey);
    Logger.info('AetherNetworkManager', `Removed engineering node at ${posKey}`);
  }

  // Partition a network into connected components via BFS
  private repartitionNetwork(networkId: string): void {
    const oldNet = this.networks.get(networkId);
    if (!oldNet || oldNet.nodes.size === 0) return;

    const unvisited = new Set<string>(oldNet.nodes.keys());
    const components: string[][] = [];

    while (unvisited.size > 0) {
      const startKey = unvisited.values().next().value;
      const component: string[] = [];
      const queue: string[] = [startKey];

      unvisited.delete(startKey);

      while (queue.length > 0) {
        const currKey = queue.shift()!;
        component.push(currKey);

        const currNode = this.nodeMap.get(currKey);
        if (!currNode) continue;

        const neighbors = AetherNetworkManager.getNeighborKeys(currNode.pos);
        neighbors.forEach((nKey) => {
          if (unvisited.has(nKey)) {
            unvisited.delete(nKey);
            queue.push(nKey);
          }
        });
      }

      components.push(component);
    }

    if (components.length <= 1) {
      this.recalculateNetworkPower(networkId);
      return;
    }

    // Split into multiple networks
    for (let i = 1; i < components.length; i++) {
      const newNetId = this.generateNetworkId();
      const newNet: NetworkGraph = {
        networkId: newNetId,
        nodes: new Map(),
        totalEnergyCapacity: 0,
        totalEnergyDemand: 0,
        isPowered: true,
        isOverloaded: false,
        activeSignals: new Set(),
      };

      components[i].forEach((key) => {
        const n = oldNet.nodes.get(key);
        if (n) {
          oldNet.nodes.delete(key);
          n.networkId = newNetId;
          newNet.nodes.set(key, n);
        }
      });

      this.networks.set(newNetId, newNet);
      this.recalculateNetworkPower(newNetId);
    }

    this.recalculateNetworkPower(networkId);
  }

  // Recalculate total energy capacity vs total energy demand for a network
  public recalculateNetworkPower(networkId: string): void {
    const net = this.networks.get(networkId);
    if (!net) return;

    let cap = 0;
    let dem = 0;

    net.nodes.forEach((node) => {
      cap += node.energyProvided;
      dem += node.energyDemand;
    });

    net.totalEnergyCapacity = cap;
    net.totalEnergyDemand = dem;
    net.isOverloaded = dem > cap && dem > 0;
    net.isPowered = !net.isOverloaded;
  }

  // Mark node dirty for signal propagation recalculation
  public markDirty(posKey: string): void {
    this.dirtyNodes.add(posKey);
  }

  // Event-Driven Fixed Update Step
  public update(deltaTime: number): void {
    if (!this.world) return;

    // 1. Process dirty nodes queue & propagate signals
    if (this.dirtyNodes.size > 0) {
      this.processSignalPropagation();
    }

    // 2. Tick machines & active nodes (scheduled or power-dependent)
    this.nodeMap.forEach((node) => {
      const net = this.networks.get(node.networkId);
      if (net && net.isOverloaded) {
        // Overloaded power -> machine brownout
        return;
      }

      if (this.onMachineTickHandler && this.world) {
        this.onMachineTickHandler(node, deltaTime, this.world);
      }
    });
  }

  // Propagate signal state across connected graph deterministically
  private processSignalPropagation(): void {
    const queue = Array.from(this.dirtyNodes);
    this.dirtyNodes.clear();

    let iterations = 0;
    const maxIterations = 100; // Loop safety guard

    while (queue.length > 0 && iterations < maxIterations) {
      iterations++;
      const posKey = queue.shift()!;
      const node = this.nodeMap.get(posKey);
      if (!node) continue;

      const oldSignal = node.signalState;
      let newSignal = false;
      let maxInputPower = 0;

      // Evaluate logic based on node type
      if (node.nodeType === 'core' || node.nodeType === 'generator') {
        newSignal = true; // Always active signal source
        maxInputPower = 15;
      } else if (node.nodeType === 'sensor') {
        newSignal = Boolean(node.internalState.sensorTriggered);
        maxInputPower = newSignal ? 15 : 0;
      } else if (node.nodeType === 'logic_rune') {
        const inputSignals = this.getIncomingSignals(node);
        newSignal = this.evaluateLogicGate(node.config.logicGate || 'AND', inputSignals);
        maxInputPower = newSignal ? 15 : 0;
      } else if (node.nodeType === 'delay_rune') {
        newSignal = Boolean(node.internalState.delayOutput);
        maxInputPower = newSignal ? 15 : 0;
      } else if (node.nodeType === 'pulse_rune') {
        newSignal = Boolean(node.internalState.pulseActive);
        maxInputPower = newSignal ? 15 : 0;
      } else if (node.nodeType === 'latch_rune') {
        newSignal = Boolean(node.internalState.latchState);
        maxInputPower = newSignal ? 15 : 0;
      } else {
        // Standard conduit / machine signal pass-through
        const inputs = this.getIncomingSignals(node);
        if (inputs.some((s) => s.state)) {
          newSignal = true;
          maxInputPower = Math.max(0, ...inputs.map((s) => s.power - 1)); // Attenuate by 1 per voxel distance
        } else {
          newSignal = false;
          maxInputPower = 0;
        }
      }

      if (node.config.invertSignal) {
        newSignal = !newSignal;
      }

      node.signalState = newSignal;
      node.signalPower = maxInputPower;

      // Trigger actuator if edge triggered (rising edge)
      if (!oldSignal && newSignal && node.nodeType === 'actuator' && this.onActuatorTriggerHandler && this.world) {
        this.onActuatorTriggerHandler(node, this.world);
      }

      // If signal changed, notify cardinal neighbors
      if (oldSignal !== newSignal) {
        const neighbors = AetherNetworkManager.getNeighborKeys(node.pos);
        neighbors.forEach((nKey) => {
          if (this.nodeMap.has(nKey)) {
            this.dirtyNodes.add(nKey);
          }
        });
      }
    }
  }

  // Get signals from neighboring engineering nodes
  private getIncomingSignals(node: AetherNode): { state: boolean; power: number }[] {
    const neighbors = AetherNetworkManager.getNeighborKeys(node.pos);
    const signals: { state: boolean; power: number }[] = [];

    neighbors.forEach((nKey) => {
      const nNode = this.nodeMap.get(nKey);
      if (nNode && nNode.posKey !== node.posKey) {
        signals.push({ state: nNode.signalState, power: nNode.signalPower });
      }
    });

    return signals;
  }

  // Evaluate Logic Gate Boolean TRUTH TABLE
  private evaluateLogicGate(gate: LogicGateType, inputs: { state: boolean; power: number }[]): boolean {
    const activeInputs = inputs.filter((i) => i.state);
    switch (gate) {
      case 'AND':
        return inputs.length >= 2 && activeInputs.length === inputs.length;
      case 'OR':
        return activeInputs.length >= 1;
      case 'NOT':
        return activeInputs.length === 0;
      case 'XOR':
        return activeInputs.length % 2 === 1;
      default:
        return false;
    }
  }

  // Save Serialization
  public serialize(): Record<string, MachineStateSaveData> {
    const result: Record<string, MachineStateSaveData> = {};
    this.nodeMap.forEach((node, key) => {
      result[key] = {
        posKey: node.posKey,
        blockType: node.blockType,
        config: { ...node.config },
        internalState: { ...node.internalState },
        facing: node.facing,
      };
    });
    return result;
  }

  // Save Deserialization
  public deserialize(data?: Record<string, MachineStateSaveData>): void {
    this.nodeMap.clear();
    this.networks.clear();
    this.dirtyNodes.clear();

    if (!data) return;

    Object.values(data).forEach((item) => {
      if (item && item.posKey) {
        const pos = AetherNetworkManager.parsePosKey(item.posKey);
        this.onBlockPlaced(pos, item.blockType as BlockType, item.config, item.facing);
        const node = this.nodeMap.get(item.posKey);
        if (node && item.internalState) {
          node.internalState = { ...item.internalState };
        }
      }
    });
  }

  // Reset System State
  public clear(): void {
    this.nodeMap.clear();
    this.networks.clear();
    this.dirtyNodes.clear();
  }
}
