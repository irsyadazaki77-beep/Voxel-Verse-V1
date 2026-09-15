import { useState, useEffect, useCallback } from 'react';
import { 
  isMobileDevice, 
  isPortraitOrientation, 
  requestLandscapeOrientation, 
  requestFullscreenMode, 
  exitFullscreenMode,
  getAspectRatioCategory 
} from '../utils/orientation';

export interface OrientationState {
  isMobile: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  aspectRatio: number;
  aspectCategory: 'tablet' | '16:9' | '18:9' | '19.5:9' | '20:9' | 'ultrawide';
  isFullscreen: boolean;
  viewportWidth: number;
  viewportHeight: number;
  requestLandscape: () => Promise<boolean>;
  toggleFullscreen: () => Promise<boolean>;
}

export function useOrientation(): OrientationState {
  const [isMobile, setIsMobile] = useState(() => isMobileDevice());
  const [isPortrait, setIsPortrait] = useState(() => isPortraitOrientation());
  const [isFullscreen, setIsFullscreen] = useState(() => {
    return typeof document !== 'undefined' ? Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement) : false;
  });
  const [dimensions, setDimensions] = useState(() => {
    if (typeof window === 'undefined') return { width: 1920, height: 1080 };
    const vp = window.visualViewport;
    return {
      width: vp ? Math.round(vp.width) : window.innerWidth,
      height: vp ? Math.round(vp.height) : window.innerHeight,
    };
  });

  const updateState = useCallback(() => {
    const mobile = isMobileDevice();
    const portrait = isPortraitOrientation();
    const fs = typeof document !== 'undefined' ? Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement) : false;
    const vp = typeof window !== 'undefined' ? window.visualViewport : null;
    const width = vp ? Math.round(vp.width) : (typeof window !== 'undefined' ? window.innerWidth : 1920);
    const height = vp ? Math.round(vp.height) : (typeof window !== 'undefined' ? window.innerHeight : 1080);

    setIsMobile(mobile);
    setIsPortrait(portrait);
    setIsFullscreen(fs);
    setDimensions({ width, height });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    updateState();

    const handleResize = () => updateState();
    const handleOrientation = () => {
      // Delay slightly for screen orientation change to settle
      setTimeout(updateState, 100);
    };
    const handleFullscreenChange = () => updateState();

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientation, { passive: true });
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    }

    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientation);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientation);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientation);
      }
    };
  }, [updateState]);

  const requestLandscape = useCallback(async () => {
    const success = await requestLandscapeOrientation();
    updateState();
    return success;
  }, [updateState]);

  const toggleFullscreen = useCallback(async () => {
    let success = false;
    if (isFullscreen) {
      success = await exitFullscreenMode();
    } else {
      success = await requestFullscreenMode();
    }
    updateState();
    return success;
  }, [isFullscreen, updateState]);

  const aspectCategory = getAspectRatioCategory(dimensions.width, dimensions.height);
  const aspectRatio = dimensions.width / Math.max(1, dimensions.height);

  return {
    isMobile,
    isPortrait,
    isLandscape: !isPortrait,
    aspectRatio,
    aspectCategory,
    isFullscreen,
    viewportWidth: dimensions.width,
    viewportHeight: dimensions.height,
    requestLandscape,
    toggleFullscreen,
  };
}
