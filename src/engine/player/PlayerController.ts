// Physics-based Player Controller 2.0: Voxel Collision, Step-Up, Crouch Sneak, Swimming, Flying, Third-Person Spring Arm
import * as THREE from 'three';
import { BlockType, GameMode } from '../../types';
import { BLOCK_DEFS } from '../world/BlockRegistry';
import { VoxelWorld } from '../world/VoxelWorld';
import { InputManager } from './InputManager';
import { CameraMotionSystem } from './CameraMotionSystem';

export type PlayerState = 'grounded' | 'airborne' | 'swimming' | 'climbing' | 'flying' | 'dead';

export interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  crouch: boolean;
  fly: boolean;
}

export interface PlayerPhysicsConfig {
  walkSpeed: number;
  sprintSpeed: number;
  crouchSpeed: number;
  swimSpeed: number;
  flySpeed: number;
  jumpForce: number;
  gravity: number;
  airControl: number;
  acceleration: number;
  friction: number;
  stepHeight: number;
}

export const DEFAULT_PHYSICS_CONFIG: PlayerPhysicsConfig = {
  walkSpeed: 4.3,
  sprintSpeed: 6.8,
  crouchSpeed: 2.1,
  swimSpeed: 3.0,
  flySpeed: 12.0,
  jumpForce: 8.5,
  gravity: 25.0,
  airControl: 0.35,
  acceleration: 45.0,
  friction: 12.0,
  stepHeight: 0.55,
};

export class PlayerController {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public pitch: number = 0; // Look up/down (-89 to +89 deg in radians)
  public yaw: number = 0;   // Look left/right (radians)

  public camera: THREE.PerspectiveCamera;
  public cameraMotion: CameraMotionSystem | null = null;
  public playerGroup: THREE.Group;
  public avatarMesh: THREE.Group; // 3D Voxel Explorer Avatar for 3rd Person

  public cameraMode: 'first_person' | 'third_person_back' | 'third_person_front' = 'first_person';
  public targetFov: number = 75;
  public currentFov: number = 75;

  // State Machine
  public state: PlayerState = 'airborne';
  public isGrounded: boolean = false;
  public isSwimming: boolean = false;
  public isEyesInWater: boolean = false;
  public isClimbing: boolean = false;
  public isFlying: boolean = false;
  public isSprinting: boolean = false;
  public isCrouching: boolean = false;

  // Arm & Viewmodel animation
  public swingProgress: number = 0;
  public isSwinging: boolean = false;
  public rightArm: THREE.Group;
  public heldItemAnchor: THREE.Group;

  // Dimensions
  public readonly width: number = 0.6;
  public currentHeight: number = 1.8;
  public readonly standingHeight: number = 1.8;
  public readonly crouchHeight: number = 1.45;
  public currentEyeHeight: number = 1.62;
  public readonly standingEyeHeight: number = 1.62;
  public readonly crouchEyeHeight: number = 1.30;

  // Physics tuning
  public config: PlayerPhysicsConfig = { ...DEFAULT_PHYSICS_CONFIG };

  // Jump buffering & Coyote time
  private coyoteTimer: number = 0; // seconds
  private jumpBufferTimer: number = 0; // seconds

  // Fall damage calculation
  private highestFallY: number = 0;
  public lastFallDistance: number = 0;

  // Camera animations & landing impact dip
  private bobTimer: number = 0;
  public landingDip: number = 0;
  public damageTilt: number = 0;
  public screenShakeAmount: number = 0;

  // Combat posture states
  public isBlockingShield: boolean = false;
  public bowDrawRatio: number = 0; // 0..1

  // Dodge roll states
  public isDodging: boolean = false;
  public dodgeTimer: number = 0;
  public dodgeCooldown: number = 0;
  public dodgeDir: THREE.Vector3 = new THREE.Vector3();
  public pendingStaminaDeduction: number = 0;
  public wantsDodge: boolean = false;

  public keys: KeyState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    crouch: false,
    fly: false,
  };

  constructor(camera: THREE.PerspectiveCamera, startPos: [number, number, number] = [0, 80, 0]) {
    this.camera = camera;
    this.position = new THREE.Vector3(...startPos);
    this.highestFallY = startPos[1];

    this.playerGroup = new THREE.Group();
    this.playerGroup.position.copy(this.position);

    // Build Original Stylized Voxel Explorer Model
    this.avatarMesh = new THREE.Group();

    // Head
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xe0a880 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.5, 0);
    this.avatarMesh.add(head);

    // Explorer Goggles / Cap
    const capGeo = new THREE.BoxGeometry(0.42, 0.15, 0.42);
    const capMat = new THREE.MeshLambertMaterial({ color: 0x306085 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 1.65, 0);
    this.avatarMesh.add(cap);

    // Torso / Tunic
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.65, 0.28);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4a7c59 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.95, 0);
    this.avatarMesh.add(body);

    // Right Arm (Interactive swing)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.35, 1.2, 0);
    const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const armMat = new THREE.MeshLambertMaterial({ color: 0x4a7c59 });
    const armMesh = new THREE.Mesh(armGeo, armMat);
    armMesh.position.set(0, -0.25, 0);
    this.rightArm.add(armMesh);

    // Held Item Socket
    this.heldItemAnchor = new THREE.Group();
    this.heldItemAnchor.position.set(0, -0.5, 0.15);
    this.rightArm.add(this.heldItemAnchor);
    this.avatarMesh.add(this.rightArm);

    // Left Arm
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.35, 1.2, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, armMat);
    leftArmMesh.position.set(0, -0.25, 0);
    leftArm.add(leftArmMesh);
    this.avatarMesh.add(leftArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.22, 0.65, 0.22);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x3d352e });
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.14, 0.32, 0);
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.14, 0.32, 0);
    this.avatarMesh.add(rightLeg);
    this.avatarMesh.add(leftLeg);

    this.playerGroup.add(this.avatarMesh);
  }

  public handleMouseMove(movementX: number, movementY: number, sensitivity: number = 0.002, invertY: boolean = false): void {
    this.yaw -= movementX * sensitivity;
    this.pitch += (invertY ? movementY : -movementY) * sensitivity;

    // Clamp pitch between -89.5 and +89.5 degrees
    const maxPitch = (Math.PI / 2) - 0.01;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  public triggerSwing(): void {
    if (!this.isSwinging) {
      this.isSwinging = true;
      this.swingProgress = 0;
    }
  }

  public toggleFlyMode(): void {
    this.isFlying = !this.isFlying;
    this.velocity.set(0, 0, 0);
    if (this.isFlying) {
      this.state = 'flying';
    }
  }

  public applyDamageFeedback(): void {
    if (this.cameraMotion) {
      this.cameraMotion.triggerDamageTilt(0.12);
    } else {
      this.damageTilt = 0.12; // brief roll tilt
    }
  }

  // Synchronize with InputManager if provided
  public syncInputs(input: InputManager, gameMode: GameMode): void {
    this.keys.forward = input.isActionActive('MoveForward');
    this.keys.backward = input.isActionActive('MoveBackward');
    this.keys.left = input.isActionActive('MoveLeft');
    this.keys.right = input.isActionActive('MoveRight');
    this.keys.jump = input.isActionActive('Jump');
    this.keys.sprint = input.isActionActive('Sprint');
    this.keys.crouch = input.isActionActive('Crouch');

    if (input.doubleTapJumpTriggered && gameMode === 'creative') {
      this.toggleFlyMode();
    }
    if (input.wasActionPressed('Fly') && gameMode === 'creative') {
      this.toggleFlyMode();
    }
    if (input.wasActionPressed('Perspective')) {
      this.togglePerspective();
    }
    if (input.wasActionPressed('Dodge')) {
      this.wantsDodge = true;
    }
  }

  public update(
    deltaTime: number,
    world: VoxelWorld,
    gameMode: GameMode,
    viewBobbing: boolean = true,
    stamina: number = 100
  ): { fallDamage: number } {
    const dt = Math.min(deltaTime, 0.05);
    let fallDamageToApply = 0;

    // Process dodge roll state and timers
    if (this.dodgeCooldown > 0) {
      this.dodgeCooldown -= dt;
    }
    if (this.isDodging) {
      this.dodgeTimer -= dt;
      if (this.dodgeTimer <= 0) {
        this.isDodging = false;
      } else {
        // Keep moving at dodge speed
        this.velocity.x = this.dodgeDir.x * this.config.sprintSpeed * 1.8;
        this.velocity.z = this.dodgeDir.z * this.config.sprintSpeed * 1.8;
      }
    }

    if (this.wantsDodge) {
      this.wantsDodge = false;
      if (!this.isDodging && this.dodgeCooldown <= 0 && (stamina >= 25 || gameMode === 'creative')) {
        this.isDodging = true;
        this.dodgeTimer = 0.35; // 350ms active dodge roll window
        this.dodgeCooldown = 0.75; // 750ms total cooldown
        this.pendingStaminaDeduction = 25;

        // Determine dodge direction
        const moveDir = new THREE.Vector3();
        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;

        if (moveDir.lengthSq() > 0) {
          moveDir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
          this.dodgeDir.copy(moveDir);
        } else {
          // If stationary, dodge backward relative to look direction
          this.dodgeDir.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        }

        this.velocity.x = this.dodgeDir.x * this.config.sprintSpeed * 1.8;
        this.velocity.z = this.dodgeDir.z * this.config.sprintSpeed * 1.8;
        this.velocity.y = 2.2; // small hop for visual feel

        if (this.cameraMotion) {
          this.cameraMotion.triggerAttackRecoil(0.12);
        }
      }
    }

    // 1. Environment & Submersion Detection
    const feetX = Math.floor(this.position.x);
    const feetY = Math.floor(this.position.y + 0.15);
    const feetZ = Math.floor(this.position.z);

    const eyeX = Math.floor(this.position.x);
    const eyeY = Math.floor(this.position.y + this.currentEyeHeight);
    const eyeZ = Math.floor(this.position.z);

    const blockAtFeet = world.getBlock(feetX, feetY, feetZ);
    const blockAtEyes = world.getBlock(eyeX, eyeY, eyeZ);

    const isFeetInWater = blockAtFeet === BlockType.WATER;
    const isEyesInWater = blockAtEyes === BlockType.WATER;
    this.isEyesInWater = isEyesInWater;
    this.isSwimming = isFeetInWater || isEyesInWater;

    // Climbable check (ladders / vines)
    const feetDef = BLOCK_DEFS[blockAtFeet];
    this.isClimbing = Boolean(feetDef && feetDef.climbable);

    // Hazard block check (Lava / Magma)
    if (blockAtFeet === BlockType.LAVA || blockAtFeet === BlockType.MAGMA_ROCK) {
      fallDamageToApply += 10 * dt;
    }

    // 2. Crouch Transition with Ceiling Verification
    const wantsCrouch = this.keys.crouch && !this.isFlying && !this.isSwimming;
    if (wantsCrouch) {
      this.isCrouching = true;
    } else if (this.isCrouching) {
      // Check if ceiling prevents standing up
      const headCheckX = Math.floor(this.position.x);
      const headCheckY = Math.floor(this.position.y + this.standingHeight - 0.1);
      const headCheckZ = Math.floor(this.position.z);
      const ceilingBlock = world.getBlock(headCheckX, headCheckY, headCheckZ);
      const isCeilingSolid = ceilingBlock !== BlockType.AIR && Boolean(BLOCK_DEFS[ceilingBlock]?.solid);
      if (!isCeilingSolid) {
        this.isCrouching = false;
      }
    }

    // Smooth height & eye interpolation
    const targetHeight = this.isCrouching ? this.crouchHeight : this.standingHeight;
    const targetEye = this.isCrouching ? this.crouchEyeHeight : this.standingEyeHeight;
    this.currentHeight += (targetHeight - this.currentHeight) * 15 * dt;
    this.currentEyeHeight += (targetEye - this.currentEyeHeight) * 15 * dt;

    // 3. Sprinting & Speed Configuration
    const hasInput = this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;
    const canSprint = this.keys.sprint && !this.isCrouching && !this.isSwimming && (stamina > 5 || gameMode === 'creative');

    if (canSprint && hasInput && this.keys.forward) {
      this.isSprinting = true;
      this.targetFov = 84;
    } else {
      this.isSprinting = false;
      this.targetFov = 75;
    }

    let targetSpeed = this.config.walkSpeed;
    if (this.isFlying) {
      targetSpeed = this.isSprinting ? this.config.flySpeed * 1.5 : this.config.flySpeed;
    } else if (this.isSwimming) {
      targetSpeed = this.config.swimSpeed;
    } else if (this.isCrouching) {
      targetSpeed = this.config.crouchSpeed;
    } else if (this.isSprinting) {
      targetSpeed = this.config.sprintSpeed;
    }

    // 4. Movement Input Vector
    const moveDir = new THREE.Vector3();
    if (this.keys.forward) moveDir.z -= 1;
    if (this.keys.backward) moveDir.z += 1;
    if (this.keys.left) moveDir.x -= 1;
    if (this.keys.right) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      // Rotate by player yaw
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    }

    // 5. Horizontal Acceleration & Friction
    const accelFactor = this.isFlying ? 30.0 : this.isGrounded ? this.config.acceleration : this.config.acceleration * this.config.airControl;
    const frictionFactor = this.isFlying ? 8.0 : this.isGrounded ? this.config.friction : 2.0;

    if (this.isDodging) {
      // Keep moving at dodge speed without standard movement/friction interference
    } else if (moveDir.lengthSq() > 0) {
      this.velocity.x += moveDir.x * targetSpeed * accelFactor * dt;
      this.velocity.z += moveDir.z * targetSpeed * accelFactor * dt;

      // Limit horizontal velocity magnitude
      const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
      if (horizSpeed > targetSpeed) {
        this.velocity.x = (this.velocity.x / horizSpeed) * targetSpeed;
        this.velocity.z = (this.velocity.z / horizSpeed) * targetSpeed;
      }
    } else {
      // Horizontal friction damping
      this.velocity.x -= this.velocity.x * frictionFactor * dt;
      this.velocity.z -= this.velocity.z * frictionFactor * dt;
      if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;
    }

    // 6. Vertical Physics & Jump Logic
    // Coyote time & Jump buffering timers
    if (this.isGrounded) {
      this.coyoteTimer = 0.12; // 120ms coyote window
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (this.keys.jump) {
      this.jumpBufferTimer = 0.12; // 120ms jump buffer
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    if (this.isFlying) {
      if (this.keys.jump) this.velocity.y = 8.0;
      else if (this.keys.crouch) this.velocity.y = -8.0;
      else this.velocity.y -= this.velocity.y * 8.0 * dt;
      this.highestFallY = this.position.y;
    } else if (this.isClimbing) {
      if (this.keys.forward || this.keys.jump) {
        this.velocity.y = 3.5;
      } else if (this.keys.backward || this.keys.crouch) {
        this.velocity.y = -3.5;
      } else {
        this.velocity.y = 0;
      }
      this.highestFallY = this.position.y;
    } else if (this.isSwimming) {
      // Water physics: Buoyancy & Drag
      if (this.keys.jump) {
        this.velocity.y = 3.8; // Ascend
      } else if (this.keys.crouch) {
        this.velocity.y = -3.8; // Descend
      } else {
        // Neutral buoyancy drift
        this.velocity.y -= (this.velocity.y + 0.2) * 4.0 * dt;
      }
      this.highestFallY = this.position.y;
    } else {
      // Gravity in air
      this.velocity.y -= this.config.gravity * dt;
      // Cap terminal velocity
      if (this.velocity.y < -40) this.velocity.y = -40;

      // Track peak fall height for fall damage
      if (this.position.y > this.highestFallY) {
        this.highestFallY = this.position.y;
      }

      // Jump execution
      if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
        this.velocity.y = this.config.jumpForce;
        this.isGrounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
      }
    }

    // 7. Axis-Separated Collision & Step-Up Resolution
    const wasGroundedBefore = this.isGrounded;
    this.resolveVoxelCollisions(world, dt);

    // 8. Fall Impact & Damage
    if (!wasGroundedBefore && this.isGrounded) {
      const fallDist = Math.max(0, this.highestFallY - this.position.y);
      this.lastFallDistance = fallDist;
      this.highestFallY = this.position.y;

      // Camera landing impact dip
      if (this.cameraMotion) {
        this.cameraMotion.triggerLandingImpact(this.velocity.y, fallDist);
      } else {
        this.landingDip = Math.min(0.25, Math.abs(this.velocity.y) * 0.02 + fallDist * 0.03);
      }

      if (gameMode !== 'creative' && fallDist > 3.8) {
        const dmg = Math.round((fallDist - 3.5) * 8);
        fallDamageToApply += dmg;
        this.applyDamageFeedback();
      }
    }

    // 9. Arm Swing & Combat Posture Animations
    if (this.isSwinging) {
      this.swingProgress += dt * 6.0;
      if (this.swingProgress >= 1.0) {
        this.swingProgress = 0;
        this.isSwinging = false;
      }
      const swingAngle = Math.sin(this.swingProgress * Math.PI) * 1.35;
      this.rightArm.rotation.x = -swingAngle;
      this.rightArm.rotation.y = -swingAngle * 0.4;
      this.rightArm.rotation.z = Math.sin(this.swingProgress * Math.PI) * 0.2;
    } else if (this.isBlockingShield) {
      // Shield raise posture
      this.rightArm.rotation.set(-0.8, -0.6, 0.4);
    } else if (this.bowDrawRatio > 0) {
      // Bow draw tension posture
      this.rightArm.rotation.set(-1.2, 0.3 * this.bowDrawRatio, -0.2);
    } else {
      this.rightArm.rotation.set(0, 0, 0);
    }

    // 10. FOV & Camera Animations
    this.currentFov += (this.targetFov - this.currentFov) * 8.0 * dt;
    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();

    // View bobbing
    let bobOffset = 0;
    if (!this.cameraMotion) {
      if (hasInput && this.isGrounded && viewBobbing) {
        this.bobTimer += dt * (this.isSprinting ? 14 : 9);
      } else {
        this.bobTimer = 0;
      }
      bobOffset = Math.sin(this.bobTimer) * 0.035;

      // Decay landing dip, damage tilt, and screen shake
      this.landingDip = Math.max(0, this.landingDip - dt * 1.8);
      this.damageTilt = Math.max(0, this.damageTilt - dt * 0.8);
      this.screenShakeAmount = Math.max(0, this.screenShakeAmount - dt * 4.0);
    }

    // Update Player Group position & Avatar yaw
    this.playerGroup.position.copy(this.position);
    this.avatarMesh.rotation.y = this.yaw;

    // 11. Camera System Placement (First Person & Third Person Spring Arm)
    this.updateCamera(world, bobOffset);

    // Update State
    if (this.isFlying) this.state = 'flying';
    else if (this.isSwimming) this.state = 'swimming';
    else if (this.isClimbing) this.state = 'climbing';
    else if (this.isGrounded) this.state = 'grounded';
    else this.state = 'airborne';

    return { fallDamage: fallDamageToApply };
  }

  public applyScreenShake(amount: number = 0.5): void {
    if (this.cameraMotion) {
      this.cameraMotion.triggerScreenShake(amount);
    } else {
      this.screenShakeAmount = Math.min(1.0, this.screenShakeAmount + amount);
    }
  }

  // Camera placement with obstacle collision for third-person views
  private updateCamera(world: VoxelWorld, bobOffset: number): void {
    const shakeX = this.cameraMotion ? 0 : (Math.random() * 2 - 1) * this.screenShakeAmount * 0.08;
    const shakeY = this.cameraMotion ? 0 : (Math.random() * 2 - 1) * this.screenShakeAmount * 0.08;
    const effBob = this.cameraMotion ? 0 : bobOffset;
    const effDip = this.cameraMotion ? 0 : this.landingDip;
    const effTilt = this.cameraMotion ? 0 : this.damageTilt;

    const eyePos = new THREE.Vector3(
      this.position.x + shakeX,
      this.position.y + this.currentEyeHeight + effBob - effDip + shakeY,
      this.position.z
    );

    if (this.cameraMode === 'first_person') {
      this.avatarMesh.visible = false;
      this.camera.position.copy(eyePos);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
      this.camera.rotation.z = effTilt;
    } else if (this.cameraMode === 'third_person_back') {
      this.avatarMesh.visible = true;
      const targetDist = 3.6;
      // Desired third person position
      const dir = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(-this.pitch),
        Math.cos(this.yaw) * Math.cos(this.pitch)
      ).normalize();

      // Raycast to prevent camera clipping through solid terrain
      const actualDist = this.raycastCameraDistance(world, eyePos, dir, targetDist);
      const camPos = eyePos.clone().addScaledVector(dir, actualDist);

      this.camera.position.copy(camPos);
      this.camera.lookAt(eyePos.x, eyePos.y, eyePos.z);
    } else if (this.cameraMode === 'third_person_front') {
      this.avatarMesh.visible = true;
      const targetDist = 3.2;
      const dir = new THREE.Vector3(
        -Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(-this.pitch),
        -Math.cos(this.yaw) * Math.cos(this.pitch)
      ).normalize();

      const actualDist = this.raycastCameraDistance(world, eyePos, dir, targetDist);
      const camPos = eyePos.clone().addScaledVector(dir, actualDist);

      this.camera.position.copy(camPos);
      this.camera.lookAt(eyePos.x, eyePos.y, eyePos.z);
    }
  }

  // Spring arm obstacle raycast check
  private raycastCameraDistance(world: VoxelWorld, origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): number {
    const hit = world.raycast(origin, dir, maxDist);
    if (hit && hit.distance > 0.4) {
      return Math.max(0.4, hit.distance - 0.2);
    }
    return maxDist;
  }

  // Voxel Axis-Aligned Bounding Box (AABB) Collision Solver with Step-Up & Sneak Edge Safety
  private resolveVoxelCollisions(world: VoxelWorld, dt: number): void {
    const hw = this.width / 2;
    const height = this.currentHeight;

    const isSolid = (x: number, y: number, z: number): boolean => {
      const b = world.getBlock(x, y, z);
      if (b === BlockType.AIR || b === BlockType.WATER) return false;
      const def = BLOCK_DEFS[b];
      return Boolean(def && def.solid);
    };

    // Sneaking Edge Safety: If crouching and on ground, prevent walking off ledges
    if (this.isCrouching && this.isGrounded) {
      const testNextX = this.position.x + this.velocity.x * dt;
      const testNextZ = this.position.z + this.velocity.z * dt;
      const blockUnderNext = world.getBlock(Math.floor(testNextX), Math.floor(this.position.y - 0.5), Math.floor(testNextZ));
      if (blockUnderNext === BlockType.AIR || blockUnderNext === BlockType.WATER) {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }

    // 1. Move along X axis
    const dx = this.velocity.x * dt;
    this.position.x += dx;
    let minX = Math.floor(this.position.x - hw);
    let maxX = Math.floor(this.position.x + hw);
    let minY = Math.floor(this.position.y);
    let maxY = Math.floor(this.position.y + height - 0.05);
    let minZ = Math.floor(this.position.z - hw);
    let maxZ = Math.floor(this.position.z + hw);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (isSolid(x, y, z)) {
            // Auto step-up check for slabs / stairs
            const isStepObstacle = (y === minY) && !isSolid(x, y + 1, z) && !isSolid(Math.floor(this.position.x), y + 1, z);
            if (isStepObstacle && !this.isCrouching) {
              this.position.y += this.config.stepHeight;
              continue;
            }
            if (dx > 0) this.position.x = x - hw - 0.001;
            else if (dx < 0) this.position.x = x + 1 + hw + 0.001;
            this.velocity.x = 0;
          }
        }
      }
    }

    // 2. Move along Z axis
    const dz = this.velocity.z * dt;
    this.position.z += dz;
    minX = Math.floor(this.position.x - hw);
    maxX = Math.floor(this.position.x + hw);
    minZ = Math.floor(this.position.z - hw);
    maxZ = Math.floor(this.position.z + hw);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (isSolid(x, y, z)) {
            const isStepObstacle = (y === minY) && !isSolid(x, y + 1, z) && !isSolid(x, y + 1, Math.floor(this.position.z));
            if (isStepObstacle && !this.isCrouching) {
              this.position.y += this.config.stepHeight;
              continue;
            }
            if (dz > 0) this.position.z = z - hw - 0.001;
            else if (dz < 0) this.position.z = z + 1 + hw + 0.001;
            this.velocity.z = 0;
          }
        }
      }
    }

    // 3. Move along Y axis
    const dy = this.velocity.y * dt;
    this.position.y += dy;
    minX = Math.floor(this.position.x - hw);
    maxX = Math.floor(this.position.x + hw);
    minY = Math.floor(this.position.y);
    maxY = Math.floor(this.position.y + height);
    minZ = Math.floor(this.position.z - hw);
    maxZ = Math.floor(this.position.z + hw);

    this.isGrounded = false;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (isSolid(x, y, z)) {
            if (dy < 0) {
              this.position.y = y + 1;
              this.velocity.y = 0;
              this.isGrounded = true;
            } else if (dy > 0) {
              this.position.y = y - height - 0.001;
              this.velocity.y = 0;
            }
          }
        }
      }
    }

    // 4. Multi-point ground contact check (4 corners + center)
    if (!this.isGrounded) {
      const testOffsets = [
        [0, 0],
        [-hw * 0.8, -hw * 0.8],
        [hw * 0.8, -hw * 0.8],
        [-hw * 0.8, hw * 0.8],
        [hw * 0.8, hw * 0.8],
      ];
      for (const [ox, oz] of testOffsets) {
        const bx = Math.floor(this.position.x + ox);
        const by = Math.floor(this.position.y - 0.08);
        const bz = Math.floor(this.position.z + oz);
        if (isSolid(bx, by, bz) && this.velocity.y <= 0.01) {
          this.isGrounded = true;
          break;
        }
      }
    }
  }

  public togglePerspective(): void {
    if (this.cameraMode === 'first_person') {
      this.cameraMode = 'third_person_back';
    } else if (this.cameraMode === 'third_person_back') {
      this.cameraMode = 'third_person_front';
    } else {
      this.cameraMode = 'first_person';
    }
  }

  public getForwardVector(): THREE.Vector3 {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    return dir.normalize();
  }

  public getCameraPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  public getEyePosition(): THREE.Vector3 {
    return new THREE.Vector3(this.position.x, this.position.y + this.currentEyeHeight, this.position.z);
  }

  public getAABB(): THREE.Box3 {
    const hw = this.width / 2;
    return new THREE.Box3(
      new THREE.Vector3(this.position.x - hw, this.position.y, this.position.z - hw),
      new THREE.Vector3(this.position.x + hw, this.position.y + this.currentHeight, this.position.z + hw)
    );
  }
}
