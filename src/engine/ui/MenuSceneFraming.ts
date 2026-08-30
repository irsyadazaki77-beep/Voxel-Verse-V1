// Dynamic Camera Framing Engine for VoxelVerse Main Menu
// Computes precise 3/4 isometric perspective, asymmetrical hero positioning (65-72% viewport X),
// UI safe-zone constraints, and responsive scaling across Desktop, Tablet, and Mobile.

export interface FramingConfig {
  viewportWidth: number;
  viewportHeight: number;
  aspectRatio: number;
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
  
  // Safe zones (pixels)
  uiSafeWidth: number;
  heroZoneStartX: number;
  
  // 3D Scene Framing
  dioramaScale: number;
  sceneOffset: { x: number; y: number; z: number };
  cameraDistance: number;
  cameraElevation: number;
  baseOrbitAngle: number;
  
  // Parallax & Motion limits
  maxParallaxX: number;
  maxParallaxY: number;
  orbitAmplitude: number;
  orbitSpeed: number;
  breathingAmplitude: number;
}

export class MenuSceneFraming {
  public static compute(width: number, height: number): FramingConfig {
    const aspectRatio = width / Math.max(height, 1);
    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;
    const isMobile = width < 768;

    if (isDesktop) {
      // 1920x1080 / Ultra-wide Desktop Framing
      // Places diorama visual center at ~68% X, ~54% Y
      // Diorama enlarged ~25% for cinematic hero presence
      const ultraWideFactor = Math.min(Math.max((aspectRatio - 1.77) * 0.3, 0), 0.5);
      const horizontalOffset = 4.8 + ultraWideFactor * 3.5;

      return {
        viewportWidth: width,
        viewportHeight: height,
        aspectRatio,
        isDesktop: true,
        isTablet: false,
        isMobile: false,
        uiSafeWidth: width * 0.40,
        heroZoneStartX: width * 0.42,
        dioramaScale: 1.28,
        sceneOffset: { x: horizontalOffset, y: -0.6, z: 0 },
        cameraDistance: 25.5,
        cameraElevation: 13.0,
        baseOrbitAngle: 0.72, // ~41 degrees 3/4 cinematic angle
        maxParallaxX: 1.2,
        maxParallaxY: 0.8,
        orbitAmplitude: 0.07, // ±4 degrees gentle orbit
        orbitSpeed: 0.15, // slower
        breathingAmplitude: 0.25,
      };
    } else if (isTablet) {
      // Tablet / Medium Landscape (768px - 1023px)
      // Places diorama at ~64% X, ~52% Y with moderate scaling
      return {
        viewportWidth: width,
        viewportHeight: height,
        aspectRatio,
        isDesktop: false,
        isTablet: true,
        isMobile: false,
        uiSafeWidth: width * 0.44,
        heroZoneStartX: width * 0.46,
        dioramaScale: 1.10,
        sceneOffset: { x: 3.2, y: -0.3, z: 0 },
        cameraDistance: 27.5,
        cameraElevation: 13.5,
        baseOrbitAngle: 0.75,
        maxParallaxX: 0.9,
        maxParallaxY: 0.6,
        orbitAmplitude: 0.06,
        orbitSpeed: 0.14,
        breathingAmplitude: 0.20,
      };
    } else {
      // Mobile / Portrait (< 768px)
      // Places diorama at center X (50%), elevated Y (~35%)
      return {
        viewportWidth: width,
        viewportHeight: height,
        aspectRatio,
        isDesktop: false,
        isTablet: false,
        isMobile: true,
        uiSafeWidth: width,
        heroZoneStartX: 0,
        dioramaScale: 0.92,
        sceneOffset: { x: 0, y: 2.2, z: 0 },
        cameraDistance: 29.5,
        cameraElevation: 14.0,
        baseOrbitAngle: 0.78,
        maxParallaxX: 0.5,
        maxParallaxY: 0.4,
        orbitAmplitude: 0.05,
        orbitSpeed: 0.13,
        breathingAmplitude: 0.15,
      };
    }
  }
}
