import React from 'react';

interface TooltipProps {
  node: any;
  position: { x: number; y: number };
}

export const Tooltip: React.FC<TooltipProps> = ({ node, position }) => {
  const isTerminal = !node.children || node.children.length === 0;
  
  // If the node is near the top of the container, show the tooltip below/to the side
  const isTooHigh = position.y < 160;

  return (
    <div
      className="absolute z-50 p-3 bg-[rgba(15,15,15,0.95)] border border-cyan-500/50 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.2)] text-white font-mono pointer-events-none backdrop-blur-md transition-all duration-200 max-w-[200px] sm:max-w-[240px]"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`, 
        transform: isTooHigh ? 'translate(20px, -50%)' : 'translate(-50%, -110%)',
        maxWidth: 'min(240px, calc(100vw - 32px))'
      }}
    >
      <div 
        className="absolute w-3 h-3 bg-cyan-500 rotate-45" 
        style={{ 
          display: isTooHigh ? 'block' : 'none',
          left: '-6px',
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)'
        }}
      ></div>
      <div 
        className="absolute w-3 h-3 bg-cyan-500 rotate-45" 
        style={{ 
          display: isTooHigh ? 'none' : 'block',
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)'
        }}
      ></div>
      {isTerminal ? (
        <div className="text-xs sm:text-sm">Terminal Token</div>
      ) : (
        <div className="text-xs sm:text-sm space-y-2">
          <div>
            <span className="text-slate-400 text-[10px] sm:text-xs">Rule:</span>
            <div className="text-white break-all">{node.ruleApplied?.replace('->', '→')}</div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] sm:text-xs">Substitution:</span>
            <div className="text-white break-all">{node.children?.map((c: any) => c.name).join(' ')}</div>
          </div>
        </div>
      )}
    </div>
  );
};
