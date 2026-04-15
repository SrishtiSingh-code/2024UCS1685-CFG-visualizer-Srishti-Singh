import React from 'react';
import { motion } from 'motion/react';

const Orbs = [
  { char: 'b', color: 'rgba(34, 211, 238, 0.15)', top: '15%', left: '10%', size: 'w-12 h-12', delay: 0 },
  { char: '(', color: 'rgba(34, 211, 238, 0.25)', top: '45%', left: '8%', size: 'w-10 h-10', delay: 0.5 },
  { char: 'a', color: 'rgba(250, 204, 21, 0.1)', top: '10%', left: '50%', size: 'w-14 h-14', delay: 0.2 },
  { char: 'E', color: 'rgba(59, 130, 246, 0.3)', top: '40%', left: '48%', size: 'w-16 h-16', delay: 0.8 },
  { char: ')', color: 'rgba(34, 211, 238, 0.2)', top: '35%', left: '85%', size: 'w-10 h-10', delay: 1 },
  { char: 'ab', color: 'rgba(217, 70, 239, 0.15)', top: '75%', left: '80%', size: 'w-14 h-14', delay: 0.4 },
  { char: 'E', color: 'rgba(168, 85, 247, 0.35)', top: '80%', left: '45%', size: 'w-20 h-20', delay: 0.6 },
  { char: '◈', color: 'rgba(217, 70, 239, 0.1)', top: '15%', left: '82%', size: 'w-12 h-12', delay: 1.2 },
  { char: 'S', color: 'rgba(34, 211, 238, 0.25)', top: '25%', left: '20%', size: 'w-12 h-12', delay: 0.3 },
  { char: 'T', color: 'rgba(250, 204, 21, 0.15)', top: '65%', left: '15%', size: 'w-16 h-16', delay: 0.7 },
  { char: 'F', color: 'rgba(59, 130, 246, 0.2)', top: '55%', left: '70%', size: 'w-14 h-14', delay: 1.1 },
  { char: '+', color: 'rgba(168, 85, 247, 0.3)', top: '85%', left: '25%', size: 'w-10 h-10', delay: 0.9 },
  { char: '*', color: 'rgba(217, 70, 239, 0.1)', top: '5%', left: '35%', size: 'w-10 h-10', delay: 0.1 },
  { char: 'a', color: 'rgba(34, 211, 238, 0.25)', top: '90%', left: '60%', size: 'w-12 h-12', delay: 1.3 },
  { char: 'b', color: 'rgba(250, 204, 21, 0.15)', top: '20%', left: '65%', size: 'w-14 h-14', delay: 0.4 },
  { char: 'E', color: 'rgba(59, 130, 246, 0.2)', top: '60%', left: '30%', size: 'w-16 h-16', delay: 0.8 },
  { char: 'x', color: 'rgba(34, 211, 238, 0.1)', top: '50%', left: '5%', size: 'w-12 h-12', delay: 0.2 },
  { char: 'y', color: 'rgba(250, 204, 21, 0.3)', top: '10%', left: '90%', size: 'w-10 h-10', delay: 0.6 },
  { char: 'z', color: 'rgba(59, 130, 246, 0.15)', top: '70%', left: '50%', size: 'w-14 h-14', delay: 0.4 },
  { char: '1', color: 'rgba(168, 85, 247, 0.25)', top: '30%', left: '40%', size: 'w-10 h-10', delay: 0.9 },
  { char: '0', color: 'rgba(217, 70, 239, 0.2)', top: '5%', left: '15%', size: 'w-12 h-12', delay: 0.3 },
  { char: 'A', color: 'rgba(34, 211, 238, 0.1)', top: '80%', left: '10%', size: 'w-16 h-16', delay: 0.7 },
  { char: 'B', color: 'rgba(250, 204, 21, 0.3)', top: '40%', left: '90%', size: 'w-14 h-14', delay: 1.1 },
  { char: 'C', color: 'rgba(59, 130, 246, 0.15)', top: '95%', left: '75%', size: 'w-12 h-12', delay: 0.5 },
  { char: 'D', color: 'rgba(34, 211, 238, 0.25)', top: '5%', left: '5%', size: 'w-10 h-10', delay: 0.1 },
  { char: 'E', color: 'rgba(250, 204, 21, 0.2)', top: '50%', left: '95%', size: 'w-14 h-14', delay: 0.3 },
  { char: 'F', color: 'rgba(59, 130, 246, 0.1)', top: '20%', left: '40%', size: 'w-8 h-8', delay: 0.7 },
  { char: 'G', color: 'rgba(168, 85, 247, 0.3)', top: '60%', left: '10%', size: 'w-16 h-16', delay: 0.9 },
  { char: 'H', color: 'rgba(217, 70, 239, 0.15)', top: '85%', left: '50%', size: 'w-10 h-10', delay: 0.2 },
  { char: 'I', color: 'rgba(34, 211, 238, 0.25)', top: '30%', left: '60%', size: 'w-12 h-12', delay: 0.4 },
  { char: 'J', color: 'rgba(250, 204, 21, 0.2)', top: '70%', left: '90%', size: 'w-8 h-8', delay: 0.6 },
  { char: 'K', color: 'rgba(59, 130, 246, 0.1)', top: '10%', left: '20%', size: 'w-14 h-14', delay: 0.8 },
  { char: 'L', color: 'rgba(168, 85, 247, 0.3)', top: '40%', left: '30%', size: 'w-10 h-10', delay: 1.0 },
  { char: 'M', color: 'rgba(217, 70, 239, 0.15)', top: '90%', left: '5%', size: 'w-12 h-12', delay: 1.2 },
];

export const LogicMesh: React.FC = () => {
  const [screenSize, setScreenSize] = React.useState<'xs' | 'mobile' | 'desktop'>('desktop');

  React.useEffect(() => {
    const checkSize = () => {
      const w = window.innerWidth;
      if (w < 400) setScreenSize('xs');
      else if (w < 768) setScreenSize('mobile');
      else setScreenSize('desktop');
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const visibleOrbs = screenSize === 'xs' ? Orbs.slice(0, 6) : screenSize === 'mobile' ? Orbs.slice(0, 12) : Orbs;

  // On mobile, clamp any orb with left > 88% to avoid overflow
  const clampedOrbs = visibleOrbs.map(orb => ({
    ...orb,
    left: screenSize !== 'desktop' ? `${Math.min(parseInt(orb.left), 85)}%` : orb.left,
  }));

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} 
      />
      
      {/* Floating Orbs */}
      {clampedOrbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute ${orb.size} rounded-full flex items-center justify-center font-mono text-sm font-bold text-white/40 backdrop-blur-sm border border-white/10`}
          style={{
            top: orb.top,
            left: orb.left,
            backgroundColor: orb.color,
            boxShadow: `0 0 20px ${orb.color}`,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay,
          }}
        >
          {orb.char}
        </motion.div>
      ))}
    </div>
  );
};
