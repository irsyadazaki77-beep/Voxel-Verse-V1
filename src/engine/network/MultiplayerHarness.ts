// Local Loopback Multiplayer Test Harness
import { NetworkSession } from './NetworkSession';
import { PROTOCOL_VERSION, TransformSnapshotMessage, ChatMessageMessage } from './NetworkProtocol';

export class MultiplayerHarness {
  private static botSessionId = 'simulated_bot_02';
  private static botName = 'Aetheria_Explorer_02';
  private static active = false;
  private static timer: any = null;
  private static botAngle = 0;

  public static start(session: NetworkSession, initialPos: [number, number, number]): void {
    if (this.active) return;
    this.active = true;

    console.log('[MultiplayerHarness] Spawning simulated loopback remote player...');

    // Announce Bot Join
    const joinMsg = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'PLAYER_JOIN' as const,
      sessionId: this.botSessionId,
      playerName: this.botName,
      isHost: false,
      spawnPos: initialPos,
      timestamp: Date.now(),
    };

    // Broadcast join into session
    (session as any).handleIncomingMessage(joinMsg);

    // Initial Chat greeting
    setTimeout(() => {
      const greeting: ChatMessageMessage = {
        protocolVersion: PROTOCOL_VERSION,
        type: 'CHAT_MESSAGE',
        senderId: this.botSessionId,
        senderName: this.botName,
        text: 'Greetings, Explorer! Local loopback replication active.',
        timestamp: Date.now(),
      };
      (session as any).handleIncomingMessage(greeting);
    }, 1000);

    // Simulate Bot movement in orbit
    this.timer = setInterval(() => {
      if (!this.active) return;

      this.botAngle += 0.05;
      const radius = 6.0;
      const bx = initialPos[0] + Math.cos(this.botAngle) * radius;
      const bz = initialPos[2] + Math.sin(this.botAngle) * radius;
      const by = initialPos[1];

      const snap: TransformSnapshotMessage = {
        protocolVersion: PROTOCOL_VERSION,
        type: 'TRANSFORM_SNAPSHOT',
        sessionId: this.botSessionId,
        position: [bx, by, bz],
        rotation: [0, this.botAngle + Math.PI / 2, 0],
        velocity: [0, 0, 0],
        animState: 'walk',
        timestamp: Date.now(),
      };

      (session as any).handleIncomingMessage(snap);
    }, 50); // 20 Hz update
  }

  public static stop(session: NetworkSession): void {
    if (!this.active) return;
    this.active = false;
    if (this.timer) clearInterval(this.timer);

    const leaveMsg = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'PLAYER_LEAVE' as const,
      sessionId: this.botSessionId,
      reason: 'Harness stopped',
      timestamp: Date.now(),
    };
    (session as any).handleIncomingMessage(leaveMsg);
    console.log('[MultiplayerHarness] Stopped simulated loopback remote player.');
  }

  public static isActive(): boolean {
    return this.active;
  }
}
