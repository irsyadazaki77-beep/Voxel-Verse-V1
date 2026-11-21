// Land Claim / Wilayah Kerajaan Territory Protection Manager (v7.1.0)
// Protects player-built Nusantara creations at chunk granularity (16x16) with trusted member permissions.
import { CHUNK_SIZE_X, CHUNK_SIZE_Z } from '../world/WorldConfig';

export interface LandClaim {
  claimId: string;
  realmId: string;
  cx: number;
  cz: number;
  ownerId: string;
  ownerName: string;
  kingdomName: string;
  trustedPlayerIds: string[];
  createdAt: number;
}

export interface ClaimActionResult {
  ok: boolean;
  reason?: string;
  claim?: LandClaim;
}

export interface BlockModifyPermission {
  allowed: boolean;
  reason?: string;
  claim?: LandClaim;
}

export class LandClaimManager {
  // key: `${realmId}:${cx},${cz}` -> LandClaim
  private claims: Map<string, LandClaim> = new Map();
  public maxClaimsPerPlayerPerRealm: number = 16;

  private static makeKey(realmId: string, cx: number, cz: number): string {
    return `${realmId}:${cx},${cz}`;
  }

  public static worldToChunk(wx: number, wz: number): { cx: number; cz: number } {
    return {
      cx: Math.floor(wx / CHUNK_SIZE_X),
      cz: Math.floor(wz / CHUNK_SIZE_Z),
    };
  }

  public hydrate(claimsList: LandClaim[]): void {
    this.claims.clear();
    for (const c of claimsList) {
      this.claims.set(LandClaimManager.makeKey(c.realmId, c.cx, c.cz), {
        ...c,
        trustedPlayerIds: Array.isArray(c.trustedPlayerIds) ? [...c.trustedPlayerIds] : [],
      });
    }
  }

  public getAllClaims(): LandClaim[] {
    return Array.from(this.claims.values());
  }

  public getClaimsForRealm(realmId: string): LandClaim[] {
    const out: LandClaim[] = [];
    for (const c of this.claims.values()) {
      if (c.realmId === realmId) out.push(c);
    }
    return out;
  }

  public getClaimAtChunk(realmId: string, cx: number, cz: number): LandClaim | null {
    return this.claims.get(LandClaimManager.makeKey(realmId, cx, cz)) || null;
  }

  public getClaimAtWorld(realmId: string, wx: number, wz: number): LandClaim | null {
    const { cx, cz } = LandClaimManager.worldToChunk(wx, wz);
    return this.getClaimAtChunk(realmId, cx, cz);
  }

  public countPlayerClaims(realmId: string, ownerId: string): number {
    let count = 0;
    for (const c of this.claims.values()) {
      if (c.realmId === realmId && c.ownerId === ownerId) count++;
    }
    return count;
  }

  public claimChunk(
    realmId: string,
    cx: number,
    cz: number,
    ownerId: string,
    ownerName: string,
    kingdomName: string = 'Wilayah Nusantara'
  ): ClaimActionResult {
    const key = LandClaimManager.makeKey(realmId, cx, cz);
    const existing = this.claims.get(key);
    if (existing) {
      if (existing.ownerId === ownerId) {
        return { ok: false, reason: 'ALREADY_OWNED_BY_YOU', claim: existing };
      }
      return { ok: false, reason: 'CHUNK_ALREADY_CLAIMED', claim: existing };
    }

    if (this.countPlayerClaims(realmId, ownerId) >= this.maxClaimsPerPlayerPerRealm) {
      return { ok: false, reason: 'MAX_CLAIMS_REACHED' };
    }

    const claim: LandClaim = {
      claimId: `claim_${realmId}_${cx}_${cz}_${Date.now()}`,
      realmId,
      cx,
      cz,
      ownerId,
      ownerName,
      kingdomName: (kingdomName || 'Wilayah Nusantara').trim().slice(0, 40),
      trustedPlayerIds: [],
      createdAt: Date.now(),
    };

    this.claims.set(key, claim);
    return { ok: true, claim };
  }

  public unclaimChunk(
    realmId: string,
    cx: number,
    cz: number,
    actorId: string,
    isModerator: boolean = false
  ): ClaimActionResult {
    const key = LandClaimManager.makeKey(realmId, cx, cz);
    const existing = this.claims.get(key);
    if (!existing) {
      return { ok: false, reason: 'CLAIM_NOT_FOUND' };
    }
    if (existing.ownerId !== actorId && !isModerator) {
      return { ok: false, reason: 'NOT_CLAIM_OWNER', claim: existing };
    }
    this.claims.delete(key);
    return { ok: true, claim: existing };
  }

  public trustPlayer(
    realmId: string,
    cx: number,
    cz: number,
    ownerId: string,
    targetPlayerId: string
  ): ClaimActionResult {
    const key = LandClaimManager.makeKey(realmId, cx, cz);
    const existing = this.claims.get(key);
    if (!existing) return { ok: false, reason: 'CLAIM_NOT_FOUND' };
    if (existing.ownerId !== ownerId) return { ok: false, reason: 'NOT_CLAIM_OWNER' };
    if (!targetPlayerId || targetPlayerId === ownerId) return { ok: false, reason: 'INVALID_TARGET' };

    if (!existing.trustedPlayerIds.includes(targetPlayerId)) {
      existing.trustedPlayerIds.push(targetPlayerId);
    }
    return { ok: true, claim: existing };
  }

  public untrustPlayer(
    realmId: string,
    cx: number,
    cz: number,
    ownerId: string,
    targetPlayerId: string
  ): ClaimActionResult {
    const key = LandClaimManager.makeKey(realmId, cx, cz);
    const existing = this.claims.get(key);
    if (!existing) return { ok: false, reason: 'CLAIM_NOT_FOUND' };
    if (existing.ownerId !== ownerId) return { ok: false, reason: 'NOT_CLAIM_OWNER' };

    existing.trustedPlayerIds = existing.trustedPlayerIds.filter((id) => id !== targetPlayerId);
    return { ok: true, claim: existing };
  }

  /**
   * Authoritative server check for whether actorId can break or place a block at (wx, wz).
   */
  public canModifyBlock(
    realmId: string,
    wx: number,
    wz: number,
    actorId: string,
    isRealmOwnerOrMod: boolean = false
  ): BlockModifyPermission {
    const claim = this.getClaimAtWorld(realmId, wx, wz);
    if (!claim) return { allowed: true };
    if (isRealmOwnerOrMod || claim.ownerId === actorId || claim.trustedPlayerIds.includes(actorId)) {
      return { allowed: true, claim };
    }
    return {
      allowed: false,
      reason: `TERRITORY_PROTECTED:${claim.kingdomName}`,
      claim,
    };
  }
}
