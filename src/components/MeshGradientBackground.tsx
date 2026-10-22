export const MeshGradientBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Dynamic Iridescent Liquid Aura */}
      <div className="absolute top-[18%] left-[12%] w-[680px] h-[480px] rounded-full bg-gradient-to-tr from-[#FF007F]/20 via-[#FFB800]/25 to-[#00FF87]/20 blur-[130px] opacity-60 animate-mesh-slow" />
      <div className="absolute top-[35%] right-[5%] w-[600px] h-[520px] rounded-full bg-gradient-to-br from-[#00D2FF]/25 via-[#9D00FF]/25 to-[#FF007F]/20 blur-[140px] opacity-50 animate-mesh-slow [animation-delay:-8s]" />
      <div className="absolute bottom-[10%] left-[25%] w-[750px] h-[400px] rounded-full bg-gradient-to-r from-[#00FF87]/15 via-[#00D2FF]/20 to-[#9D00FF]/15 blur-[120px] opacity-40 animate-mesh-slow [animation-delay:-14s]" />
      
      {/* Fine Noise Texture Overlay */}
      <div className="absolute inset-0 bg-[#06070a]/75 backdrop-blur-[2px]" />
    </div>
  );
};
