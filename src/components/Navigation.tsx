import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './Section';

interface NavigationProps {
  onNavigate: (page: 'main' | 'chomsky') => void;
  currentPage: 'main' | 'chomsky';
}

// Scroll to an element id, accounting for the fixed navbar height
const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  const nav = document.querySelector('nav');
  const navHeight = nav ? nav.getBoundingClientRect().height : 80;
  const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 16; // 16px breathing room
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
};

export const Navigation: React.FC<NavigationProps> = ({ onNavigate, currentPage }) => {
  const [activeId, setActiveId] = useState('home');
  const [scrolled, setScrolled] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { id: 'home', label: 'HOME' },
    { 
      id: 'essence', 
      label: 'WHAT IS CFG', 
      hasDropdown: true,
      subSections: ['essence', 'tuples'],
      dropdownItems: [
        { label: 'OVERVIEW', targetId: 'essence' },
        { label: 'DEFINITION', targetId: 'tuples' },
      ]
    },
    { id: 'cfg-checker', label: 'CFG VALIDATOR' },
    { 
      id: 'theory', 
      label: 'PARSING CONCEPTS',
      hasDropdown: true,
      subSections: ['theory', 'parse-tree', 'ambiguity'],
      dropdownItems: [
        { label: 'DERIVATIONS', targetId: 'theory' },
        { label: 'PARSE TREES', targetId: 'parse-tree' },
        { label: 'AMBIGUITY', targetId: 'ambiguity' },
      ]
    },
    { id: 'workshop', label: 'TRY GENERATOR', subSections: ['workshop'], isHighlighted: true },
    { 
      id: 'results', 
      label: 'RESULTS',
      hasDropdown: true,
      subSections: ['results', 'derivations-section', 'parse-tree-section'],
      dropdownItems: [
        { label: 'DERIVATION', targetId: 'derivations-section' },
        { label: 'TREE', targetId: 'parse-tree-section' },
      ]
    },
    { 
      id: 'chomsky-heading', 
      label: (
        <div className="flex flex-col items-center leading-tight">
          <span>LEARN MORE</span>
          <span className="text-[8px] opacity-70">(Chomsky Hierarchy)</span>
        </div>
      ), 
      isPage: true,
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      
      if (currentPage === 'chomsky') {
        setActiveId('chomsky-heading');
        return;
      }

      let current = 'home';
      const nav = document.querySelector('nav');
      const navHeight = nav ? nav.getBoundingClientRect().height : 80;
      const threshold = navHeight + 32; // just below nav + small buffer

      for (const link of links) {
        const idsToCheck = (link as any).subSections || [link.id];
        for (const id of idsToCheck) {
          const element = document.getElementById(id);
          if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= threshold && rect.bottom > threshold) {
              current = link.id;
            }
          }
        }
      }
      setActiveId(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPage]);

  const handleNavClick = (e: React.MouseEvent, link: any) => {
    if (link.isPage) {
      e.preventDefault();
      onNavigate('chomsky');
      window.scrollTo(0, 0);
      return;
    }
    if (link.id === 'home') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    e.preventDefault();
    if (currentPage !== 'main') {
      onNavigate('main');
      setTimeout(() => scrollToId(link.id), 120);
    } else {
      scrollToId(link.id);
    }
  };

  const handleDropdownClick = (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();
    if (currentPage !== 'main') {
      onNavigate('main');
      setTimeout(() => scrollToId(targetId), 120);
    } else {
      scrollToId(targetId);
    }
  };

  const handleMobileNavClick = (e: React.MouseEvent, link: any) => {
    setMobileMenuOpen(false);
    if (link.isPage) {
      e.preventDefault();
      onNavigate('chomsky');
      window.scrollTo(0, 0);
      return;
    }
    if (link.id === 'home') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    e.preventDefault();
    if (currentPage !== 'main') {
      onNavigate('main');
      setTimeout(() => scrollToId(link.id), 120);
    } else {
      scrollToId(link.id);
    }
  };

  return (
    <nav className={cn(
      "fixed top-0 z-50 w-full transition-all duration-500 border-b",
      scrolled 
        ? "bg-black border-white/10 py-2 shadow-2xl"
        : "bg-black border-transparent py-4"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <motion.div 
          className="flex items-center gap-2 group cursor-pointer"
          whileHover="hover"
          onClick={() => {
            if (currentPage !== 'main') onNavigate('main');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="text-white font-bold tracking-tighter text-base sm:text-lg md:text-2xl uppercase font-mono">
            CFG <span className="text-[#facc15]">Studio</span>
          </span>
        </motion.div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5 lg:gap-2">
          {links.map((link) => (
            <div 
              key={link.id} 
              className="relative"
              onMouseEnter={() => setHoveredLink(link.id)}
              onMouseLeave={() => setHoveredLink(null)}
            >
              <a
                href={link.isPage ? undefined : `#${link.id}`}
                onClick={(e) => handleNavClick(e, link)}
                className={cn(
                  "px-2 lg:px-4 py-2 text-[9px] lg:text-[11px] font-bold uppercase tracking-widest transition-all duration-500 relative flex items-center gap-1 cursor-pointer",
                  (link as any).isHighlighted 
                    ? "rounded-xl bg-purple-600/80 text-white hover:bg-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-300/60"
                    : cn(
                        "rounded-full",
                        activeId === link.id 
                          ? "text-[#facc15]" 
                          : "text-gray-400 hover:text-white"
                      )
                )}
              >
                {activeId === link.id && !(link as any).isHighlighted && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full -z-10 bg-[#facc15]/10 border border-[#facc15]/30 shadow-[0_0_15px_rgba(250,204,21,0.1)]"
                    transition={{ type: "spring", stiffness: 400, damping: 40 }}
                  />
                )}
                {link.label}
                {link.hasDropdown && (
                  <motion.svg 
                    viewBox="0 0 24 24" 
                    className="w-3 h-3 fill-current"
                    animate={{ rotate: hoveredLink === link.id ? 180 : 0 }}
                  >
                    <path d="M7 10l5 5 5-5z" />
                  </motion.svg>
                )}
              </a>

              <AnimatePresence>
                {link.hasDropdown && hoveredLink === link.id && link.dropdownItems && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
                  >
                    <div className="py-2">
                      {link.dropdownItems.map((item, idx) => (
                        <a
                          key={idx}
                          href={`#${item.targetId}`}
                          onClick={(e) => handleDropdownClick(e, item.targetId)}
                          className="block px-6 py-3 text-[10px] font-bold text-gray-400 hover:text-[#facc15] hover:bg-white/5 transition-colors tracking-widest"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <div 
          className="md:hidden flex flex-col gap-1.5 cursor-pointer p-3.5 z-[60] bg-white/5 rounded-xl border border-white/10 active:scale-95 transition-all min-h-[44px] min-w-[44px] items-center justify-center"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <motion.div animate={mobileMenuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }} className="w-6 h-0.5 bg-white rounded-full" />
          <motion.div animate={mobileMenuOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }} className="w-6 h-0.5 bg-[#22d3ee] rounded-full" />
          <motion.div animate={mobileMenuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }} className="w-6 h-0.5 bg-white rounded-full" />
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 bg-[#050505] z-50 flex flex-col pt-24 px-6 overflow-y-auto"
          >
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <div key={link.id} className="border-b border-white/5 py-2.5">
                  <a
                    href={link.isPage ? undefined : `#${link.id}`}
                    onClick={(e) => handleMobileNavClick(e, link)}
                    className={cn(
                      "text-xl font-bold uppercase tracking-widest block transition-colors",
                      activeId === link.id ? "text-[#facc15]" : "text-white hover:text-cyan-400"
                    )}
                  >
                    {typeof link.label === 'string' ? link.label : 'LEARN MORE'}
                  </a>
                  {link.hasDropdown && link.dropdownItems && (
                    <div className="mt-2 flex flex-col gap-2 pl-4 border-l border-white/10">
                      {link.dropdownItems.map((item, idx) => (
                        <a
                          key={idx}
                          href={`#${item.targetId}`}
                          onClick={(e) => { setMobileMenuOpen(false); handleDropdownClick(e, item.targetId); }}
                          className="text-sm font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-center pb-8">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-[0.3em]">CFG Studio &copy; 2026</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
