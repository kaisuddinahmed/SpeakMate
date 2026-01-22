export function Logo({ className = "h-44", onClick }: { className?: string; onClick?: () => void }) {
  return (
    <div
      className={`relative ${className} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={onClick}
    >
      <img
        src="/assets/Logo.svg"
        alt="SpeakMate Logo"
        className="h-full w-auto max-w-full object-contain drop-shadow-lg"
      />
    </div>
  );
}
