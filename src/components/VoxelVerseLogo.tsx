import React from 'react';

interface VoxelVerseLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
  animated?: boolean;
  className?: string;
}

export const VoxelVerseLogo: React.FC<VoxelVerseLogoProps> = ({
  size = 'md',
  variant = 'full',
  animated = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-sm', subtitle: 'text-[8px]', gap: 'gap-2' },
    md: { icon: 40, text: 'text-xl', subtitle: 'text-[10px]', gap: 'gap-3' },
    lg: { icon: 56, text: 'text-3xl', subtitle: 'text-xs', gap: 'gap-4' },
    xl: { icon: 80, text: 'text-5xl', subtitle: 'text-sm', gap: 'gap-5' },
  };

  const currentSize = sizeMap[size];

  return (
    <div id="app-logo" data-testid="app-logo" className={`app-logo inline-flex items-center ${currentSize.gap} ${className}`}>
      {/* 3D Voxel Emblem SVG */}
      <div className="relative flex items-center justify-center shrink-0">
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-sky-500/30 rounded-full blur-xl animate-pulse pointer-events-none" />
        
        <svg
          width={currentSize.icon}
          height={currentSize.icon}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`relative z-10 filter drop-shadow-[0_4px_12px_rgba(14,165,233,0.4)] ${animated ? 'hover:scale-105 transition-transform duration-300' : ''}`}
        >
          <defs>
            {/* Top Face Gradient */}
            <linearGradient id="topFaceGrad" x1="10" y1="10" x2="90" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>

            {/* Left Face Gradient */}
            <linearGradient id="leftFaceGrad" x1="10" y1="50" x2="50" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0c4a6e" />
              <stop offset="100%" stopColor="#082f49" />
            </linearGradient>

            {/* Right Face Gradient */}
            <linearGradient id="rightFaceGrad" x1="50" y1="50" x2="90" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Gold Crystal Core Gradient */}
            <linearGradient id="coreGrad" x1="30" y1="30" x2="70" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>

            {/* Aether Glow Overlay */}
            <linearGradient id="aetherLineGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Isometric Outer Cube Base */}
          {/* Top Polygon */}
          <polygon points="50,12 88,32 50,52 12,32" fill="url(#topFaceGrad)" stroke="#7dd3fc" strokeWidth="1.5" strokeLinejoin="round" />
          
          {/* Left Polygon */}
          <polygon points="12,32 50,52 50,88 12,68" fill="url(#leftFaceGrad)" stroke="#0284c7" strokeWidth="1.5" strokeLinejoin="round" />
          
          {/* Right Polygon */}
          <polygon points="50,52 88,32 88,68 50,88" fill="url(#rightFaceGrad)" stroke="#0369a1" strokeWidth="1.5" strokeLinejoin="round" />

          {/* Inner Voxel Matrix Lines */}
          <path d="M50,12 L50,52 M12,32 L88,32 M12,68 L50,88 L88,68" stroke="url(#aetherLineGrad)" strokeWidth="1" strokeDasharray="3 2" />

          {/* Central Floating Aether Rune Core */}
          <g filter="url(#glow)">
            <polygon points="50,30 65,40 50,50 35,40" fill="url(#coreGrad)" opacity="0.9" />
            <polygon points="35,40 50,50 50,68 35,58" fill="#ca8a04" opacity="0.85" />
            <polygon points="50,50 65,40 65,58 50,68" fill="#eab308" opacity="0.95" />
          </g>

          {/* Floating Voxel Sparkles */}
          <rect x="22" y="18" width="4" height="4" fill="#7dd3fc" rx="1" className={animated ? 'animate-bounce' : ''} />
          <rect x="74" y="24" width="3" height="3" fill="#fef08a" rx="0.5" />
          <rect x="78" y="72" width="4" height="4" fill="#38bdf8" rx="1" />
          <rect x="18" y="60" width="3" height="3" fill="#eab308" rx="0.5" />

          {/* Central Aether Star Glyph */}
          <path d="M50,38 L52,43 L57,45 L52,47 L50,52 L48,47 L43,45 L48,43 Z" fill="#ffffff" />
        </svg>
      </div>

      {/* Brand Text Header */}
      {variant === 'full' && (
        <div className="flex flex-col">
          <span className={`font-black tracking-widest ${currentSize.text} text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-100 to-sky-400 font-sans leading-none flex items-center gap-1.5`}>
            VOXEL<span className="text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">VERSE</span>
          </span>
          <span className={`font-mono tracking-widest ${currentSize.subtitle} text-sky-300/60 uppercase font-semibold mt-0.5`}>
            Procedural 3D Sandbox RPG
          </span>
        </div>
      )}
    </div>
  );
};
