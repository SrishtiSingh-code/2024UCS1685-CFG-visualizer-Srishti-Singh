import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Layers, Cpu, Code2, Mail, Search, FileCode2, MessageSquare, TerminalSquare, Box } from 'lucide-react';
import { InlineMath } from 'react-katex';
import { cn } from './Section';

// Assuming CHOMSKY_DATA is needed here, I might need to move it or export it.
// For now, I'll keep it in App.tsx and pass it as a prop or move it to a constants file.
// Let's move it to a constants file later.
// For now, I will just import it from a new constants file.

import { CHOMSKY_DATA } from '../constants';

interface ChomskyPageProps {
  onBack: () => void;
  activeChomskyIndex: number;
  setActiveChomskyIndex: (index: number) => void;
}

export const ChomskyPage: React.FC<ChomskyPageProps> = ({ onBack, activeChomskyIndex, setActiveChomskyIndex }) => {
  return (
    <div className="min-h-screen bg-[#05070a] text-white">
      <div className="px-4 sm:px-6 pt-6 pb-16">
        <div className="mb-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-6xl xl:text-8xl font-bold tracking-tighter uppercase text-white mb-4">
            Chomsky Hierarchy
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-cyan-500 to-purple-500 mx-auto rounded-full"></div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 xl:gap-12 items-center">
          {/* Left: Interactive Diagram */}
          <div className="relative aspect-square w-full max-w-[260px] sm:max-w-[360px] md:max-w-[420px] lg:max-w-[380px] xl:max-w-[420px] mx-auto lg:ml-auto lg:mr-16">
            <div className="absolute -top-8 left-0 w-full flex justify-between px-4 text-[10px] sm:text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">
              <span>Grammars</span>
              <span>Automata</span>
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              {CHOMSKY_DATA.map((item, idx) => {
                const size = 100 - (idx * 22);
                const isActive = activeChomskyIndex === idx;
                return (
                  <motion.div
                    key={item.type}
                    onMouseEnter={() => setActiveChomskyIndex(idx)}
                    className={cn(
                      "absolute rounded-full border transition-all duration-500 cursor-pointer flex items-center justify-center",
                      isActive ? "border-white/40 bg-white/5" : "border-white/10 hover:border-white/20",
                      isActive && item.glow
                    )}
                    style={{ 
                      width: `${size}%`, 
                      height: `${size}%`,
                      zIndex: 10 + idx
                    }}
                    initial={false}
                    animate={{
                      scale: isActive ? 1.02 : 1,
                    }}
                  >
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-20 group-hover:opacity-100 transition-opacity">
                      <span className="text-[7px] sm:text-[8px] font-bold tracking-[0.15em] uppercase whitespace-nowrap">{item.type}</span>
                    </div>
                    
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between items-center px-3 sm:px-5 pointer-events-none">
                      <span className={cn(
                        "text-[8px] sm:text-[10px] md:text-xs font-bold tracking-tight max-w-[60px] sm:max-w-[80px] leading-tight truncate",
                        isActive ? "text-white" : "text-slate-600"
                      )}>
                        {item.name}
                      </span>
                      <span className={cn(
                        "text-[8px] sm:text-[10px] md:text-xs font-mono tracking-tighter text-right max-w-[60px] sm:max-w-[80px] leading-tight opacity-60 truncate",
                        isActive ? "text-white opacity-100" : "text-slate-500"
                      )}>
                        {item.automaton}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right: Detail Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeChomskyIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "glass-card p-6 md:p-8 rounded-[24px] relative overflow-hidden border-t border-l border-white/10",
                CHOMSKY_DATA[activeChomskyIndex].glow
              )}
            >
              <div className={cn(
                "absolute top-0 right-0 w-48 h-48 blur-[80px] -mr-24 -mt-24 opacity-20 transition-colors duration-500",
                CHOMSKY_DATA[activeChomskyIndex].accentColor
              )}></div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <span className={cn("text-xs font-bold tracking-[0.3em] uppercase", CHOMSKY_DATA[activeChomskyIndex].textColor)}>
                    {CHOMSKY_DATA[activeChomskyIndex].type}
                  </span>
                  <div className="p-2 bg-white/5 rounded-lg">
                    <Layers className={cn("w-4 h-4", CHOMSKY_DATA[activeChomskyIndex].iconColor)} />
                  </div>
                </div>

                <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-6xl font-bold tracking-tight mb-3">
                  {CHOMSKY_DATA[activeChomskyIndex].name}
                </h3>
                
                <p className="text-base md:text-lg xl:text-2xl text-slate-400 leading-relaxed mb-4 italic">
                  {CHOMSKY_DATA[activeChomskyIndex].desc}
                </p>

                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-md">
                      <Cpu className="w-3 h-3 text-slate-500" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-0">Automaton</span>
                      <span className="text-xs font-semibold text-slate-200">{CHOMSKY_DATA[activeChomskyIndex].automaton}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-md">
                      <Code2 className="w-3 h-3 text-slate-500" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-0">Production Rule</span>
                      <div className={cn("text-sm font-mono flex flex-col gap-0.5", CHOMSKY_DATA[activeChomskyIndex].textColor)}>
                        <InlineMath math={CHOMSKY_DATA[activeChomskyIndex].rule} />
                        <InlineMath math={CHOMSKY_DATA[activeChomskyIndex].ruleX} />
                        <InlineMath math={CHOMSKY_DATA[activeChomskyIndex].ruleY} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-12 sm:mt-16 px-4 sm:px-6 w-full">
        <div className="mb-8">
          <h3 className="text-2xl sm:text-3xl md:text-4xl xl:text-6xl font-bold tracking-tighter uppercase mb-2">
            Key Differences
          </h3>
          <p className="text-base md:text-lg xl:text-2xl text-slate-400 max-w-3xl leading-relaxed">
            A technical comparison of the four grammar types, their computational limits, and formal rule structures.
          </p>
        </div>

        <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
          <table className="w-full text-left border-collapse min-w-[520px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="py-3 px-3 sm:px-6 text-[9px] sm:text-xs font-bold tracking-[0.25em] text-slate-500 uppercase">Type</th>
                <th className="py-3 px-3 sm:px-6 text-[9px] sm:text-xs font-bold tracking-[0.25em] text-slate-500 uppercase">Grammar</th>
                <th className="py-3 px-3 sm:px-6 text-[9px] sm:text-xs font-bold tracking-[0.25em] text-slate-500 uppercase">Language</th>
                <th className="py-3 px-3 sm:px-6 text-[9px] sm:text-xs font-bold tracking-[0.25em] text-slate-500 uppercase">Automaton</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {[...CHOMSKY_DATA].reverse().map((item, idx) => {
                const isType2 = item.type === 'TYPE 2';
                return (
                  <tr 
                    key={item.type} 
                    className={cn(
                      "border-b border-white/5 transition-colors group",
                      isType2 ? "bg-cyan-500/5" : "hover:bg-white/[0.02]"
                    )}
                  >
                    <td className="py-3 md:py-4 px-3 sm:px-5">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-xs font-bold tracking-widest uppercase border whitespace-nowrap",
                        item.type === 'TYPE 3' && "bg-amber-500/10 border-amber-500/30 text-amber-400",
                        item.type === 'TYPE 2' && "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
                        item.type === 'TYPE 1' && "bg-purple-500/10 border-purple-500/30 text-purple-400",
                        item.type === 'TYPE 0' && "bg-slate-500/10 border-slate-500/30 text-slate-400"
                      )}>
                        {item.type}
                      </div>
                    </td>
                    <td className="py-3 md:py-4 px-3 sm:px-5">
                      <span className="text-sm md:text-base lg:text-lg font-bold text-white tracking-tight">
                        {item.name}
                      </span>
                    </td>
                    <td className="py-3 md:py-4 px-3 sm:px-5">
                      <span className="text-xs md:text-sm lg:text-base font-medium text-slate-400">
                        {item.language}
                      </span>
                    </td>
                    <td className="py-3 md:py-4 px-3 sm:px-5">
                      <span className="text-xs md:text-sm lg:text-base font-medium text-slate-400">
                        {item.automaton}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Containment Principle Section */}
      <div className="mt-16 sm:mt-20 px-4 sm:px-6 w-full">
        <div className="mb-8">
          <h3 className="text-2xl sm:text-3xl md:text-4xl xl:text-6xl font-bold tracking-tighter uppercase mb-2">
            The Containment Principle
          </h3>
          <p className="text-base md:text-lg xl:text-2xl text-slate-400 max-w-3xl leading-relaxed">
            The Chomsky Hierarchy is strictly inclusive. Every grammar of Type <InlineMath math="i" /> is also a grammar of Type <InlineMath math="i-1" />.
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-6 sm:p-8 md:p-12 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-purple-500/5 opacity-50"></div>
          
          <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
            {/* Type 0 */}
            <div className="w-full p-6 rounded-3xl border border-slate-500/30 bg-slate-500/10 flex flex-col items-center">
              <span className="text-xs font-bold tracking-[0.3em] text-slate-400 uppercase mb-4">Type 0: Unrestricted</span>
              
              {/* Type 1 */}
              <div className="w-[90%] p-6 rounded-2xl border border-purple-500/30 bg-purple-500/10 flex flex-col items-center">
                <span className="text-xs font-bold tracking-[0.3em] text-purple-400 uppercase mb-4">Type 1: Context-Sensitive</span>
                
                {/* Type 2 */}
                <div className="w-[90%] p-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 flex flex-col items-center shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                  <span className="text-xs font-bold tracking-[0.3em] text-cyan-400 uppercase mb-4">Type 2: Context-Free</span>
                  
                  {/* Type 3 */}
                  <div className="w-[90%] p-6 rounded-lg border border-amber-500/30 bg-amber-500/10 flex flex-col items-center">
                    <span className="text-xs font-bold tracking-[0.3em] text-amber-400 uppercase">Type 3: Regular</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-center text-slate-400 text-sm max-w-2xl">
              <p>
                This means that <strong className="text-amber-400">Regular Languages</strong> are a subset of <strong className="text-cyan-400">Context-Free Languages</strong>, which are a subset of <strong className="text-purple-400">Context-Sensitive Languages</strong>, which are a subset of <strong className="text-slate-400">Recursively Enumerable Languages</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-World Applications Section */}
      <div className="mt-16 sm:mt-20 mb-16 sm:mb-24 px-4 sm:px-6 w-full">
        <div className="mb-8">
          <h3 className="text-2xl sm:text-3xl md:text-4xl xl:text-6xl font-bold tracking-tighter uppercase mb-2">
            Real-World Applications
          </h3>
          <p className="text-base md:text-lg xl:text-2xl text-slate-400 max-w-3xl leading-relaxed">
            How each level of the hierarchy powers the technology we use every day.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-2xl border-amber-500/20 hover:border-amber-500/40 transition-colors group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl group-hover:bg-amber-500/20 transition-colors">
                <Search className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Type 3: Regular</h4>
                <span className="text-xs font-bold tracking-widest text-amber-400/70 uppercase">Text Search & Validation</span>
              </div>
            </div>
            <p className="text-base md:text-lg text-slate-400 leading-relaxed">
              Powers <strong>Regular Expressions (Regex)</strong> for pattern matching, form validation, and lexical analysis in compilers.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border-cyan-500/20 hover:border-cyan-500/40 transition-colors group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-cyan-500/10 rounded-xl group-hover:bg-cyan-500/20 transition-colors">
                <FileCode2 className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Type 2: Context-Free</h4>
                <span className="text-xs font-bold tracking-widest text-cyan-400/70 uppercase">Programming Languages</span>
              </div>
            </div>
            <p className="text-base md:text-lg text-slate-400 leading-relaxed">
              The foundation of <strong>Syntax Analysis (Parsing)</strong>. Defines the structure of programming languages (C, Java, Python) and markup (HTML, XML).
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border-purple-500/20 hover:border-purple-500/40 transition-colors group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                <MessageSquare className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Type 1: Context-Sensitive</h4>
                <span className="text-xs font-bold tracking-widest text-purple-400/70 uppercase">Natural Language & Semantics</span>
              </div>
            </div>
            <p className="text-base md:text-lg text-slate-400 leading-relaxed">
              Used in <strong>Natural Language Processing (NLP)</strong> for context-dependent meaning, and in compilers for semantic checks (e.g., variable declarations).
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border-slate-500/20 hover:border-slate-500/40 transition-colors group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-slate-500/10 rounded-xl group-hover:bg-slate-500/20 transition-colors">
                <TerminalSquare className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Type 0: Unrestricted</h4>
                <span className="text-xs font-bold tracking-widest text-slate-400/70 uppercase">General Computation</span>
              </div>
            </div>
            <p className="text-base md:text-lg text-slate-400 leading-relaxed">
              Represents the absolute limits of mechanical computation. Models any algorithm that can be written in any programming language (<strong>Turing Completeness</strong>).
            </p>
          </div>
        </div>
      </div>

      <footer className="bg-[#05070a] border-t border-white/10 py-8 px-4 sm:px-6 text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img src="/nsut-logo.jpg" alt="NSUT Logo" className="w-10 h-10 rounded-full object-cover" />
          </div>
          <div className="text-center">
            <p>&copy; {new Date().getFullYear()} Designed and Developed by Srishti Singh</p>
            <p className="text-xs">Roll No. 2024UCS1685</p>
          </div>
          <a href="mailto:srishti.singh_ug24@nsut.ac.in" className="flex items-center gap-2 hover:text-cyan-400 transition-colors break-all text-center sm:text-left">
            <Mail className="w-4 h-4 shrink-0" />
            srishti.singh_ug24@nsut.ac.in
          </a>
        </div>
      </footer>
    </div>
  );
};
