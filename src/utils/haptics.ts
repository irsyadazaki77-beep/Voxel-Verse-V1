// Robust Haptic Feedback Engine for VoxelVerse Touchscreen
import { SettingsManager } from '../engine/ui/SettingsManager';

export type HapticStyle = 'light' | 'selection' | 'medium' | 'heavy' | 'impact' | 'double';

/**
 * Triggers subtle vibration feedback if supported by device and enabled in settings.
 */
export function triggerHaptic(style: HapticStyle = 'light'): void {
  try {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') return;

    const settings = SettingsManager.get();
    if (!settings.mobileControls?.hapticFeedback) return;

    switch (style) {
      case 'selection':
        navigator.vibrate(8);
        break;
      case 'light':
        navigator.vibrate(12);
        break;
      case 'medium':
        navigator.vibrate(22);
        break;
      case 'heavy':
        navigator.vibrate(40);
        break;
      case 'impact':
        navigator.vibrate([15, 30, 25]);
        break;
      case 'double':
        navigator.vibrate([10, 40, 10]);
        break;
      default:
        navigator.vibrate(10);
        break;
    }
  } catch {
    // Ignore unsupported browser / security restrictions
  }
}
