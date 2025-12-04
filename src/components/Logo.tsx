export function Logo({ className = "", onClick }: { className?: string; onClick?: () => void }) {
  return (
    <div 
      className={`flex items-center gap-2 ${className} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={onClick}
    >
      {/* Modern Mic Icon with Gradient */}
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="micGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Microphone body */}
        <rect x="15" y="8" width="10" height="14" rx="5" fill="url(#micGradient)" />
        
        {/* Microphone stand */}
        <path d="M 12 22 Q 12 28 20 28 Q 28 28 28 22" stroke="url(#micGradient)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <line x1="20" y1="28" x2="20" y2="34" stroke="url(#micGradient)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="14" y1="34" x2="26" y2="34" stroke="url(#micGradient)" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Sound waves */}
        <path d="M 8 18 Q 6 20 8 22" stroke="url(#micGradient)" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
        <path d="M 32 18 Q 34 20 32 22" stroke="url(#micGradient)" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
      </svg>
      
      {/* SpeakMate Text */}
      <div className="flex items-baseline">
        <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Speak</span>
        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Mate</span>
      </div>
    </div>
  );
}
