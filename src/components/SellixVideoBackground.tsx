import { useEffect, useRef, useState } from 'react';

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104036_bd6924f6-3c8e-417e-8465-6d03c8c2e9e6.mp4';
const POSTER_URL = 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/82e7eb75-c65f-490a-99b5-f3d1cad54200.webp';
const FADE_DURATION_SEC = 0.9;
const FADE_DURATION_MS = 900;

export const SellixVideoBackground = () => {
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);

  const [activeLayer, setActiveLayer] = useState<'A' | 'B'>('A');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const isTransitioningRef = useRef(false);
  const activeLayerRef = useRef<'A' | 'B'>('A');

  useEffect(() => {
    // 1. Verificação de preferência por movimento reduzido (Acessibilidade)
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', handleMotionChange);
    } else if (motionQuery.addListener) {
      motionQuery.addListener(handleMotionChange);
    }

    return () => {
      if (motionQuery.removeEventListener) {
        motionQuery.removeEventListener('change', handleMotionChange);
      } else if (motionQuery.removeListener) {
        motionQuery.removeListener(handleMotionChange);
      }
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      videoARef.current?.pause();
      videoBRef.current?.pause();
      return;
    }

    const vA = videoARef.current;
    const vB = videoBRef.current;
    if (!vA || !vB) return;

    vA.muted = true;
    vB.muted = true;

    const startVideo = (video: HTMLVideoElement) => {
      video.muted = true;
      const p = video.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    };

    // Iniciar vídeo ativo inicial
    startVideo(activeLayerRef.current === 'A' ? vA : vB);

    let animId: number;

    const triggerCrossfade = () => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;

      const currentVideo = activeLayerRef.current === 'A' ? vA : vB;
      const nextVideo = activeLayerRef.current === 'A' ? vB : vA;

      nextVideo.currentTime = 0;
      startVideo(nextVideo);

      const nextLayer = activeLayerRef.current === 'A' ? 'B' : 'A';
      activeLayerRef.current = nextLayer;
      setActiveLayer(nextLayer);

      setTimeout(() => {
        currentVideo.pause();
        currentVideo.currentTime = 0;
        isTransitioningRef.current = false;
      }, FADE_DURATION_MS);
    };

    const checkLoop = () => {
      const activeVideo = activeLayerRef.current === 'A' ? vA : vB;
      if (!isTransitioningRef.current && activeVideo.duration && !isNaN(activeVideo.duration)) {
        const timeLeft = activeVideo.duration - activeVideo.currentTime;
        if (timeLeft <= FADE_DURATION_SEC && timeLeft > 0) {
          triggerCrossfade();
        }
      }
      animId = requestAnimationFrame(checkLoop);
    };

    animId = requestAnimationFrame(checkLoop);

    const unlock = () => {
      const activeVideo = activeLayerRef.current === 'A' ? vA : vB;
      startVideo(activeVideo);
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [prefersReducedMotion]);

  return (
    <div 
      className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0 select-none bg-black"
      aria-hidden="true"
    >
      {/* Fallback de Imagem Estática para modo prefers-reduced-motion */}
      <img
        src={POSTER_URL}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-700 ${
          prefersReducedMotion ? 'opacity-100 block' : 'opacity-0 hidden'
        }`}
        style={{ objectPosition: '51% 8%' }}
      />

      {/* Camadas de Vídeo A e B para Crossfade Seamless */}
      {!prefersReducedMotion && (
        <>
          <video
            ref={videoARef}
            src={VIDEO_URL}
            poster={POSTER_URL}
            muted
            playsInline
            loop
            preload="auto"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[900ms] ease-out pointer-events-none ${
              activeLayer === 'A' ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ 
              objectPosition: '51% 8%',
              willChange: 'opacity' 
            }}
          />

          <video
            ref={videoBRef}
            src={VIDEO_URL}
            poster={POSTER_URL}
            muted
            playsInline
            loop
            preload="auto"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[900ms] ease-out pointer-events-none ${
              activeLayer === 'B' ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ 
              objectPosition: '51% 8%',
              willChange: 'opacity' 
            }}
          />
        </>
      )}

      {/* Camada de Atmosfera e Contraste Fintech */}
      {/* Gradiente radial escurecido nas bordas para garantir legibilidade dos cards com nitidez absoluta */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 90% 60% at 50% 12%, rgba(6, 7, 10, 0.12) 0%, rgba(6, 7, 10, 0.55) 60%, #06070a 100%)'
        }}
      />

      {/* Leve gradiente vertical para base escura nos cards e ledger */}
      <div 
        className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-[#06070a]/35 to-[#06070a]/85" 
      />
    </div>
  );
};
