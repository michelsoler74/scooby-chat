// --- Avatar.tsx ---
import React from 'react';

interface AvatarProps {
  isSpeaking: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ isSpeaking }) => {
  return (
    <div className="relative w-full aspect-square">
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                 <linearGradient id="eyeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00d2ff" />
                    <stop offset="100%" stopColor="#3a7bd5" />
                </linearGradient>
            </defs>
            
            {/* Body Shadow */}
            <ellipse cx="200" cy="380" rx="120" ry="20" fill="rgba(0,0,0,0.3)" filter="url(#glow)" />

            {/* Head */}
            <g transform="translate(0, -20)">
                <path d="M 120,100 C 50,100 20,180 20,250 C 20,320 80,350 120,350 L 280,350 C 320,350 380,320 380,250 C 380,180 350,100 280,100 Z" fill="#E5E7EB" />
                <path d="M 125,100 C 60,100 30,170 30,240 C 30,310 85,340 125,340 L 275,340 C 315,340 370,310 370,240 C 370,170 340,100 275,100 Z" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2" />

                {/* Ears */}
                <g>
                    {/* Left Ear */}
                    <path d="M 60,120 C 10,140 0,220 30,260 C 40,280 70,260 60,220 C 50,180 80,140 60,120 Z" fill="#E5E7EB" />
                    <path d="M 55,125 C 20,145 10,215 35,250 C 45,265 65,250 55,220 C 48,190 75,150 55,125 Z" fill="#1E40AF" className="opacity-70" />
                </g>
                <g transform="translate(340, 0) scale(-1, 1) translate(-60, 0)">
                    {/* Right Ear */}
                    <path d="M 60,120 C 10,140 0,220 30,260 C 40,280 70,260 60,220 C 50,180 80,140 60,120 Z" fill="#E5E7EB" />
                    <path d="M 55,125 C 20,145 10,215 35,250 C 45,265 65,250 55,220 C 48,190 75,150 55,125 Z" fill="#1E40AF" className="opacity-70" />
                </g>
                
                {/* Eyes */}
                <g>
                    {/* Left Eye */}
                    <circle cx="130" cy="200" r="45" fill="url(#eyeGradient)" className={`transition-all duration-300 ${isSpeaking ? 'filter brightness-150' : ''}`} filter={isSpeaking ? "url(#glow)" : "none"} />
                    <circle cx="130" cy="200" r="40" fill="#020617" />
                    <circle cx="140" cy="190" r="10" fill="white" className="opacity-90"/>
                </g>
                 <g>
                    {/* Right Eye */}
                    <circle cx="270" cy="200" r="45" fill="url(#eyeGradient)" className={`transition-all duration-300 ${isSpeaking ? 'filter brightness-150' : ''}`} filter={isSpeaking ? "url(#glow)" : "none"} />
                    <circle cx="270" cy="200" r="40" fill="#020617" />
                    <circle cx="280" cy="190" r="10" fill="white" className="opacity-90"/>
                </g>
                
                {/* Nose */}
                <path d="M 200,240 C 180,240 180,260 200,260 C 220,260 220,240 200,240 Z" fill="#1F2937" />
                
                {/* Mouth Area */}
                <g>
                   <path d="M 170 280 Q 200 290 230 280" stroke="#9CA3AF" strokeWidth="2" fill="none" />
                    <path 
                      // --- ESTA ES LA LÍNEA MÁGICA ---
                      // Cambia el dibujo de la boca si 'isSpeaking' es true
                      d={isSpeaking ? "M 180 295 Q 200 310 220 295" : "M 190 295 L 210 295"} 
                      stroke="#4B5563" 
                      strokeWidth="3" 
                      fill="none" 
                      strokeLinecap="round" 
                      className="transition-all duration-150"
                    />
                </g>
                
                {/* Head details */}
                <path d="M 180,105 L 220,105" stroke="#9CA3AF" strokeWidth="2" fill="none" />
                <path d="M 195,95 L 195,105" stroke="#9CA3AF" strokeWidth="2" fill="none" />
                <path d="M 205,95 L 205,105" stroke="#9CA3AF" strokeWidth="2" fill="none" />
            </g>
        </svg>
    </div>
  );
};

// Si usas módulos de ES6, deberías exportarlo así:
// export default Avatar;