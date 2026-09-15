/**
 * Orientation & Mobile Landscape Utilities for VoxelVerse Android/Mobile Optimization
 */

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const mobileRegex = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i;
  return mobileRegex.test(userAgent) || (isTouch && window.innerWidth <= 1024);
}

export function isPortraitOrientation(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.screen?.orientation?.type) {
    return window.screen.orientation.type.startsWith('portrait');
  }
  return window.innerHeight > window.innerWidth;
}

export async function requestLandscapeOrientation(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const orientation = window.screen?.orientation as any;
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('landscape').catch(() => {
        return orientation.lock('landscape-primary');
      });
      return true;
    }
  } catch (err) {
    // Non-fatal: Screen Orientation API may require user gesture or fullscreen
    console.debug('[Orientation] Screen orientation lock not permitted or unsupported:', err);
  }
  return false;
}

export async function requestFullscreenMode(element?: HTMLElement): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const target = element || document.documentElement;
  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen();
      return true;
    } else if ((target as any).webkitRequestFullscreen) {
      await (target as any).webkitRequestFullscreen();
      return true;
    } else if ((target as any).msRequestFullscreen) {
      await (target as any).msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.debug('[Orientation] Fullscreen request failed:', err);
  }
  return false;
}

export async function exitFullscreenMode(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return true;
    } else if ((document as any).webkitFullscreenElement) {
      await (document as any).webkitExitFullscreen();
      return true;
    }
  } catch (err) {
    console.debug('[Orientation] Exit fullscreen failed:', err);
  }
  return false;
}

export function getAspectRatioCategory(width: number, height: number): 'tablet' | '16:9' | '18:9' | '19.5:9' | '20:9' | 'ultrawide' {
  const ratio = Math.max(width, height) / Math.max(1, Math.min(width, height));
  if (ratio < 1.6) return 'tablet';       // e.g. 4:3 (1.33), 16:10 (1.6)
  if (ratio < 1.88) return '16:9';        // ~1.77
  if (ratio < 2.05) return '18:9';        // ~2.00
  if (ratio < 2.18) return '19.5:9';      // ~2.16
  if (ratio < 2.3) return '20:9';         // ~2.22
  return 'ultrawide';
}
