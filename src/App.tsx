import React, { useState, useEffect, useRef } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { Navigation } from './components/Navigation';
import { Section } from './components/Section';
import { ParseTreeViz } from './components/ParseTreeViz';
import { LogicMesh } from './components/LogicMesh';
import { ChomskyPage } from './components/ChomskyPage';
import { CHOMSKY_DATA, GRAMMAR_EXAMPLES_LIST } from './constants';
import { parseGrammar, findDerivations, buildParseTree, generateLMD, generateRMD, generateValidString, generateExactLengthString, TreeNode, DerivationSequenceStep } from './utils/cfgParser';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Play, 
  AlertCircle, 
  CheckCircle2, 
  Mail, 
  Linkedin,
  Monitor,
  MessageSquare,
  Search,
  FileCode,
  Bot,
  Wrench,
  Layers,
  Cpu,
  Code2,
  XCircle,
  Star,
  HelpCircle,
  GitBranch,
  Terminal,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { cn } from './components/Section';

// Scroll to element accounting for fixed navbar height + 16px breathing room
const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  const nav = document.querySelector('nav');
  const navH = nav ? nav.getBoundingClientRect().height : 80;
  const top = el.getBoundingClientRect().top + window.scrollY - navH - 16;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
};

const DEFAULT_GRAMMAR = `S -> A B
A -> a A | ε
B -> b B | ε`;
const DEFAULT_TARGET = `aab`;

export default function App() {
  const [grammarText, setGrammarText] = useState(DEFAULT_GRAMMAR);
  const [targetString, setTargetString] = useState(DEFAULT_TARGET);
  const [error, setError] = useState<string | null>(null);
  const [parsingError, setParsingError] = useState<{
    prefix: string,
    failedAt: string,
    closestForm: string,
    ruleInfo: string
  } | null>(null);
  
  const [lmdSteps, setLmdSteps] = useState<DerivationSequenceStep[] | null>(null);
  const [rmdSteps, setRmdSteps] = useState<DerivationSequenceStep[] | null>(null);
  const [parseTree, setParseTree] = useState<TreeNode | null>(null);
  const [allParseTrees, setAllParseTrees] = useState<TreeNode[]>([]);
  const [currentTreeIndex, setCurrentTreeIndex] = useState(0);
  const [isAmbiguous, setIsAmbiguous] = useState(false);
  const [derivationType, setDerivationType] = useState<'left' | 'right' | 'both'>('both');
  const [suggestion, setSuggestion] = useState("");
  const [suggestionLength, setSuggestionLength] = useState(10);
  const [customSuggestion, setCustomSuggestion] = useState<string | null>(null);
  const [customSuggestionError, setCustomSuggestionError] = useState<string | null>(null);

  const [checkerInput, setCheckerInput] = useState('S -> aS');
  const [checkerResult, setCheckerResult] = useState<{valid: boolean, message: string} | null>(null);
  const [bgColor, setBgColor] = useState('#0f1115');
  const [currentPage, setCurrentPage] = useState<'main' | 'chomsky'>('main');
  const [activeChomskyIndex, setActiveChomskyIndex] = useState(2); // Default to Type 2 (CFG)
  const [hoveredExample, setHoveredExample] = useState<{name: string, grammar: string, target: string, desc: string} | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const grammarInputRef = useRef<HTMLTextAreaElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);

  const insertSymbol = (symbol: string, isTarget: boolean = false) => {
    const input = isTarget ? targetInputRef.current : grammarInputRef.current;

    if (input) {
      // Ref available (phone layout) — insert at cursor position
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const text = input.value;
      const newText = text.substring(0, start) + symbol + text.substring(end);
      if (isTarget) { setTargetString(newText); } else { setGrammarText(newText); }
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + symbol.length, start + symbol.length);
      }, 0);
    } else {
      // No ref (tablet/desktop layout) — append to end
      if (isTarget) {
        setTargetString(prev => prev + symbol);
      } else {
        setGrammarText(prev => prev + symbol);
      }
    }
  };

  const CHOMSKY_DATA = [
    {
      type: 'TYPE 0',
      name: 'Unrestricted',
      language: 'Recursively Enumerable',
      desc: 'The most general class of grammars. No restrictions on production rules. Can simulate any computational process.',
      automaton: 'Turing Machine',
      rule: 'X \\rightarrow Y',
      ruleX: 'X \\in (V \\cup \\Sigma)^* V (V \\cup \\Sigma)^* \\text{ (X has } \\ge 1 \\text{ non-terminal)}',
      ruleY: 'Y \\in (V \\cup \\Sigma)^*',
      color: 'slate',
      borderColor: 'border-slate-500/30',
      textColor: 'text-slate-400',
      accentColor: 'bg-slate-500/10',
      iconColor: 'text-slate-400',
      glow: 'shadow-[0_0_50px_rgba(148,163,184,0.1)]'
    },
    {
      type: 'TYPE 1',
      name: 'Context-Sensitive',
      language: 'CSLs',
      desc: 'Rules are dependent on surrounding context. The length of the string never decreases during derivation.',
      automaton: 'LBA',
      rule: 'X \\rightarrow Y',
      ruleX: 'X \\in (V \\cup \\Sigma)^* V (V \\cup \\Sigma)^*',
      ruleY: 'Y \\in (V \\cup \\Sigma)^* \\text{ and } |Y| \\ge |X| \\text{ (length does not decrease)}',
      color: 'purple',
      borderColor: 'border-purple-500/30',
      textColor: 'text-purple-400',
      accentColor: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      glow: 'shadow-[0_0_50px_rgba(168,85,247,0.1)]'
    },
    {
      type: 'TYPE 2',
      name: 'Context-Free',
      language: 'CFLs',
      desc: 'LHS is exactly one non-terminal variable. Replacement is independent of the surrounding symbols.',
      automaton: 'PDA',
      rule: 'X \\rightarrow Y',
      ruleX: 'X \\in V \\text{ (exactly 1 non-terminal)}',
      ruleY: 'Y \\in (V \\cup \\Sigma)^*',
      color: 'cyan',
      borderColor: 'border-cyan-500/30',
      textColor: 'text-cyan-400',
      accentColor: 'bg-cyan-500/10',
      iconColor: 'text-cyan-400',
      glow: 'shadow-[0_0_50px_rgba(34,211,238,0.1)]'
    },
    {
      type: 'TYPE 3',
      name: 'Regular',
      language: 'Regular Languages',
      desc: 'The simplest class of grammars. Used for lexical analysis and pattern matching in strings.',
      automaton: 'DFA / NFA',
      rule: 'X \\rightarrow Y',
      ruleX: 'X \\in V \\text{ (exactly 1 non-terminal)}',
      ruleY: '\\text{Right-Linear: } Y \\in \\{aT, a, \\epsilon\\}, \\text{ Left-Linear: } Y \\in \\{Ta, a, \\epsilon\\}',
      color: 'emerald',
      borderColor: 'border-emerald-500/30',
      textColor: 'text-emerald-400',
      accentColor: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      glow: 'shadow-[0_0_50px_rgba(16,185,129,0.1)]'
    }
  ];

  useEffect(() => {
    const applySnap = () => {
      const isXl = window.innerWidth >= 1280;
      if (currentPage === 'main' && isXl) {
        document.documentElement.classList.add('snap-enabled');
      } else {
        document.documentElement.classList.remove('snap-enabled');
      }
    };
    applySnap();
    window.addEventListener('resize', applySnap);
    return () => {
      window.removeEventListener('resize', applySnap);
      document.documentElement.classList.remove('snap-enabled');
    };
  }, [currentPage]);

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        { id: 'home', color: '#0f1115' },
        { id: 'essence', color: '#f5f5f2' },
        { id: 'tuples', color: '#0f1115' },
        { id: 'chomsky', color: '#05070a' },
        { id: 'chomsky-comparison', color: '#0a0c10' },
        { id: 'cfg-checker', color: '#0d1a1a' },
        { id: 'theory', color: '#0d1a1a' },
        { id: 'parse-tree', color: '#050505' },
        { id: 'workshop', color: '#0f1115' },
        { id: 'results', color: '#0f1115' },
        { id: 'real-world', color: '#f5f5f2' },
      ];
      
      let current = '#0f1115';
      const viewportHeight = window.innerHeight;
      const threshold = viewportHeight * 0.4;

      for (const sec of sections) {
        const el = document.getElementById(sec.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // If the top of the section has passed the threshold
          if (rect.top <= threshold && rect.bottom >= threshold) {
            current = sec.color;
            break;
          }
        }
      }
      setBgColor(current);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCheckCFG = () => {
    const parts = checkerInput.split(/(?:->|→)/);
    if (parts.length !== 2) {
      setCheckerResult({ valid: false, message: "Invalid format. Use '->' or '→' to separate LHS and RHS." });
      return;
    }
    
    const lhs = parts[0].trim();
    const rhs = parts[1].trim();

    if (lhs.length === 0) {
      setCheckerResult({ valid: false, message: "Invalid: Left-Hand Side (LHS) cannot be empty." });
      return;
    }

    // Strict CFG check: LHS must be exactly one uppercase letter
    if (lhs.length === 1) {
      if (/^[A-Z]$/.test(lhs)) {
        setCheckerResult({ valid: true, message: "Valid CFG Rule!" });
      } else {
        setCheckerResult({ valid: false, message: `Invalid: LHS contains a terminal "${lhs}".` });
      }
    } else {
      // LHS length > 1
      const terminals = lhs.match(/[^A-Z]/);
      if (terminals) {
        setCheckerResult({ valid: false, message: `Invalid: LHS contains a terminal "${terminals[0]}".` });
      } else {
        setCheckerResult({ valid: false, message: "Invalid: LHS has multiple variables." });
      }
    }
  };

  const handleGenerate = () => {
    setError(null);
    setParsingError(null);
    setLmdSteps(null);
    setRmdSteps(null);
    setParseTree(null);
    setAllParseTrees([]);
    setCurrentTreeIndex(0);
    setIsAmbiguous(false);
    setCustomSuggestion(null);

    try {
      if (!targetString.trim()) {
        throw new Error("Please enter a target string. Use 'ε' or 'epsilon' to represent the empty string.");
      }

      const grammar = parseGrammar(grammarText);
      if (!grammar.startSymbol) {
        throw new Error("Invalid grammar: No start symbol found.");
      }

      const { derivations, closestPrefix, closestForm, closestSteps } = findDerivations(grammar, targetString, 2); // Find up to 2 to show ambiguity
      if (derivations.length === 0) {
        const failedAt = targetString.substring(closestPrefix.length) || "end of string";
        const closestFormStr = closestForm.filter(s => s !== 'ε').join('');
        
        // Add rule info
        let ruleInfo = "";
        if (closestSteps.length > 0) {
            const lastStep = closestSteps[closestSteps.length - 1];
            const rhsStr = lastStep.rhs.length === 0 ? 'ε' : lastStep.rhs.join(' ');
            ruleInfo = ` (via rule ${lastStep.nt} → ${rhsStr})`;
        }
        
        setParsingError({
            prefix: closestPrefix,
            failedAt: failedAt,
            closestForm: closestFormStr,
            ruleInfo: ruleInfo
        });
        
        throw new Error(`Syntax Error: The string "${targetString}" cannot be derived from the given grammar.`);
      }

      const trees = derivations.map(steps => buildParseTree(grammar.startSymbol, steps));
      setAllParseTrees(trees);
      setParseTree(trees[0]);
      setIsAmbiguous(trees.length > 1);

      const lmd = generateLMD(trees[0]);
      const rmd = generateRMD(trees[0]);

      setLmdSteps(lmd);
      setRmdSteps(rmd);
      
    } catch (err: any) {
      setError(err.message || "An error occurred during parsing.");
      try {
        const grammar = parseGrammar(grammarText);
        let s: string | null = generateValidString(grammar, suggestionLength);
        if (s === null || (s === "" && suggestionLength > 0)) {
           s = generateExactLengthString(grammar, suggestionLength);
        }
        setSuggestion(s || "No suggestion available");
      } catch (e) {
        setSuggestion("");
      }
    } finally {
      // Always scroll to results if we attempted generation
      setTimeout(() => {
        scrollToId('results');
      }, 100);
    }
  };

  const handleSwitchTree = (index: number) => {
    setCurrentTreeIndex(index);
    const tree = allParseTrees[index];
    setParseTree(tree);
    setLmdSteps(generateLMD(tree));
    setRmdSteps(generateRMD(tree));
  };

  return (
    <div 
      className="flex flex-col min-h-screen text-[#e2e8f0] font-sans selection:bg-cyan-500/30 selection:text-cyan-100 transition-colors duration-500 ease-in-out"
      style={{ backgroundColor: bgColor }}
    >
      <Navigation onNavigate={setCurrentPage} currentPage={currentPage} />

      {currentPage === 'main' ? (
        <main className="flex-1">
        {/* Hero Section */}
        <section id="home" className="relative min-h-screen md:min-h-[100dvh] flex flex-col items-center justify-center pt-24 px-4 sm:px-6 overflow-hidden bg-[#0f1115]">
          <LogicMesh />
          
          <div className="relative z-10 flex flex-col items-start text-left max-w-5xl w-full">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-start"
            >
              <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter leading-none uppercase font-mono">
                <span className="text-white">CONTEXT</span>
                <br />
                <span className="flex items-center gap-2 sm:gap-4">
                  <span className="text-[#facc15]">FREE</span>
                  <span className="text-white">GRAMMAR</span>
                </span>
              </h1>
              
              <p className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl font-medium leading-relaxed">
                A visual journey through derivations, parse trees, and the formal structure of language — from symbol to syntax.
              </p>

              <div className="mt-4 sm:mt-6 text-[8px] sm:text-[10px] md:text-xs tracking-[0.3em] font-bold text-cyan-400 uppercase">
                BY SRISHTI SINGH
              </div>

              <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-start gap-3 sm:gap-6 w-full sm:w-auto">
                <button 
                  onClick={() => scrollToId('intro')}
                  className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 bg-[#facc15] text-black font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(250,204,21,0.3)] text-sm sm:text-base min-h-[44px] text-center"
                >
                  Explore Theory
                </button>
                <button 
                  onClick={() => scrollToId('workshop')}
                  className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 bg-[#facc15] text-black font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(250,204,21,0.3)] flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
                >
                  Try Derivation & Tree Generator <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                </button>
              </div>
            </motion.div>
          </div>

          {/* Scroll Indicator */}
          <motion.div 
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-[10px] tracking-[0.2em] font-bold text-slate-500 uppercase">SCROLL TO EXPLORE</span>
            <div className="w-px h-12 bg-gradient-to-b from-slate-500 to-transparent" />
          </motion.div>
        </section>

        {/* Essence Section */}
        <section id="essence" className="bg-[#f5f5f2] text-[#0a0a0a] min-h-screen flex flex-col justify-start pt-6 pb-12 px-4 sm:px-6 relative overflow-hidden scroll-mt-20">
          <div className="max-w-[95rem] mx-auto grid lg:grid-cols-2 gap-8 lg:gap-6 xl:gap-8 items-center w-full">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.3em] text-slate-400 uppercase mb-4">
                01 — FOUNDATION
              </div>
              <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl font-bold tracking-tighter leading-[0.9] mb-6 sm:mb-8 lg:mb-4 uppercase">
                THE OVERVIEW <br /> OF CFG
              </h2>
              <div className="max-w-2xl space-y-6">
                <p className="text-lg sm:text-xl md:text-2xl lg:text-lg xl:text-xl leading-relaxed">
                  A <span className="font-bold">Context-Free Grammar (CFG)</span> is a <br className="hidden sm:block" />
                  formal system that describes how to generate <br className="hidden sm:block" />
                  all valid strings in a language using a set of <br className="hidden sm:block" />
                  recursive production rules.
                </p>
                <p className="text-sm sm:text-base md:text-lg lg:text-base text-slate-600 leading-relaxed">
                  CFGs are the backbone of compiler design, <br className="hidden sm:block" />
                  natural language processing, and programming <br className="hidden sm:block" />
                  language theory. Every time you write code, <br className="hidden sm:block" />
                  a CFG-based parser reads it.
                </p>
              </div>
            </motion.div>

            <div className="flex flex-col gap-8 lg:gap-5 max-w-xl mx-auto w-full">
              {/* Production Rule Definition */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="p-6 bg-white border-2 border-black rounded-3xl shadow-[10px_10px_0_rgba(0,0,0,0.05)] w-full"
              >
                <div className="mb-6">
                  <motion.div 
                    whileHover={{ scale: 1.02, brightness: 1.1 }}
                    className="inline-flex items-center px-4 py-2 bg-black text-white rounded-xl shadow-[5px_5px_0_rgba(0,0,0,0.1)] border border-black/20 cursor-default"
                  >
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] leading-none">Production Rule Structure</h4>
                  </motion.div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <BlockMath math="X \to Y" />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <InlineMath math="X \in V" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">LHS</span>
                      </div>
                      <p className="text-sm text-slate-500 leading-tight">(exactly 1 non-terminal)</p>
                    </div>
                    
                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <InlineMath math="Y \in (V \cup \Sigma)^*" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">RHS</span>
                      </div>
                      <p className="text-sm text-slate-500 leading-tight">(any combination of variables and terminals)</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative w-full"
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Example of CFG</div>
                <div className="bg-white border-2 border-black rounded-[32px] p-5 md:p-6 shadow-[20px_20px_0_rgba(0,0,0,0.05)]">
                  <div className="space-y-3 font-mono text-lg md:text-xl">
                    <div className="space-y-1">
                      <div className="flex gap-6">
                        <span className="text-slate-300">01</span>
                        <span className="font-bold">S → aSb</span>
                      </div>
                      <div className="flex gap-6">
                        <span className="text-slate-300">02</span>
                        <span className="font-bold">S → ε</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Generates strings like:</div>
                        <div className="text-slate-600 font-sans text-base">ε, ab, aabb, aaabbb</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute -z-10 inset-0 bg-gradient-to-tr from-cyan-100/50 to-transparent blur-3xl" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Tuples Section */}
        <section id="tuples" className="bg-white text-[#0a0a0a] h-screen flex flex-col justify-start pt-6 pb-4 px-4 sm:px-6 relative overflow-hidden scroll-mt-20">
          <div className="max-w-[95rem] mx-auto w-full flex flex-col flex-1 min-h-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-3 shrink-0"
            >
              <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter uppercase">
                THE DEFINITION
              </h2>
            </motion.div>

            <div className="grid lg:grid-cols-12 gap-4 lg:gap-6 items-start flex-1 min-h-0">
              {/* Left Definition Card — compact, centered in column */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="lg:col-span-6 flex flex-col items-center justify-start"
              >
                <div className="bg-[#f8f8f6] border-2 border-black rounded-[24px] p-5 sm:p-6 shadow-xl w-full max-w-lg">
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-xl xl:text-2xl italic font-serif mb-4 text-center">
                    A CFG is defined as <span className="font-bold not-italic">G = (V, Σ, P, S)</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { symbol: 'V', label: 'VARIABLES' },
                      { symbol: 'Σ', label: 'TERMINALS' },
                      { symbol: 'P', label: 'PRODUCTIONS' },
                      { symbol: 'S', label: 'START' }
                    ].map((item) => (
                      <div key={item.symbol} className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#facc15] flex items-center justify-center font-bold text-lg sm:text-xl rounded-md shrink-0">
                          {item.symbol}
                        </div>
                        <span className="text-sm font-bold tracking-widest text-slate-800">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Right Detail Cards */}
              <div className="lg:col-span-6 grid grid-cols-2 gap-3 content-start">
                {[
                  {
                    title: 'VARIABLES',
                    desc: 'Non-terminals like S, A, B that get replaced during derivation. Represented in UPPERCASE.',
                    example: 'S, A, B, EXPR, STMT',
                    color: 'border-b-[#facc15]'
                  },
                  {
                    title: 'TERMINALS',
                    desc: 'Actual symbols of the language — letters, digits, operators. They appear in the final string.',
                    example: 'a, b, 0, 1, +, *, (, )',
                    color: 'border-b-[#22d3ee]'
                  },
                  {
                    title: 'PRODUCTIONS',
                    desc: 'Rules that define substitutions. A non-terminal on the left, a string of symbols on the right.',
                    example: 'E → E + T | T',
                    color: 'border-b-[#ec4899]'
                  },
                  {
                    title: 'START SYMBOL',
                    desc: 'The initial non-terminal from which all derivations begin. Every sentence derives from S.',
                    example: 'S ⇒ ... ⇒ w',
                    color: 'border-b-[#10b981]'
                  }
                ].map((card, idx) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className={`bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm border-b-4 ${card.color} flex flex-col`}
                  >
                    <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2 text-right">
                      {card.title}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 mb-2 sm:mb-3 leading-relaxed flex-1">
                      {card.desc}
                    </p>
                    <div className="bg-slate-50 p-2 rounded-lg font-mono text-xs text-slate-500">
                      {card.example}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Real World Section removed from here */}

        {/* CFG Checker Section */}
        <section id="cfg-checker" className="bg-[#05070a] text-white min-h-screen flex flex-col justify-start pt-6 pb-12 px-4 sm:px-6 relative overflow-hidden border-b border-white/5 scroll-mt-20">
          <div className="max-w-[95rem] mx-auto w-full">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-[10px] font-bold tracking-[0.3em] text-slate-500 uppercase">02 — Parsing Concepts & Tool</span>
                  <div className="h-px w-12 bg-slate-800"></div>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tighter uppercase mb-3">
                  CFG Validator
                </h2>
                <p className="text-lg text-slate-300 leading-relaxed mb-3">
                  The defining characteristic of a <span className="text-[#facc15] font-bold">Context-Free Grammar</span> is that the Left-Hand Side (LHS) of every production rule must consist of <span className="border-b-2 border-[#facc15] pb-0.5">exactly one non-terminal variable</span>.
                </p>
                <p className="text-base text-slate-500 leading-relaxed mb-4">
                  This means the replacement of the variable is independent of its context — it doesn't matter what symbols surround it; the rule always applies the same way.
                </p>

                <div className="space-y-4">
                  <span className="block text-xs font-bold tracking-[0.4em] text-slate-600 uppercase mb-4">Quick Reference</span>
                  
                  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl group hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="font-mono text-base text-emerald-400">S → aSb</span>
                    </div>
                    <span className="text-xs font-bold tracking-widest text-slate-600 uppercase">Valid</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl group hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-rose-500/10 rounded-lg">
                        <XCircle className="w-5 h-5 text-rose-400" />
                      </div>
                      <span className="font-mono text-base text-rose-400">aSa → b</span>
                    </div>
                    <span className="text-xs font-bold tracking-widest text-slate-600 uppercase text-right">Invalid: LHS Has Terminals</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl group hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-rose-500/10 rounded-lg">
                        <XCircle className="w-5 h-5 text-rose-400" />
                      </div>
                      <span className="font-mono text-base text-rose-400">AB → c</span>
                    </div>
                    <span className="text-xs font-bold tracking-widest text-slate-600 uppercase text-right">Invalid: Multiple Variables</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 bg-[#facc15]/5 blur-3xl rounded-full"></div>
                <div className="relative glass-card p-8 md:p-10 rounded-[32px] border-white/10 shadow-2xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-2.5 bg-[#facc15]/10 rounded-xl">
                      <ArrowRight className="w-5 h-5 text-[#facc15]" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Test a Production Rule</h3>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold tracking-[0.3em] text-slate-500 uppercase mb-3">
                        Enter Rule (e.g., A → BAC)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={checkerInput}
                          onChange={(e) => setCheckerInput(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 font-mono text-lg text-white focus:outline-none focus:border-[#facc15] focus:ring-1 focus:ring-[#facc15] transition-all"
                          placeholder="S -> aSb"
                          spellCheck={false}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleCheckCFG}
                      className="w-full bg-[#facc15] hover:bg-[#eab308] text-black font-bold py-4 rounded-xl transition-all shadow-[0_10px_30px_rgba(250,204,21,0.2)] active:scale-[0.98] uppercase tracking-widest text-sm"
                    >
                      Verify Rule
                    </button>

                    <AnimatePresence mode="wait">
                      {checkerResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={cn(
                            "p-4 rounded-xl border flex items-start gap-3",
                            checkerResult.valid 
                              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                              : "bg-rose-500/5 border-rose-500/20 text-rose-400"
                          )}
                        >
                          {checkerResult.valid ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                          <div>
                            <span className="block font-bold text-[10px] uppercase tracking-widest mb-0.5">
                              {checkerResult.valid ? 'Valid CFG Rule' : 'Invalid Rule'}
                            </span>
                            <p className="text-xs opacity-80 leading-relaxed">{checkerResult.message}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Theory Section: Derivation Strategies */}
        <Section 
          id="theory" 
          title="" 
          className="min-h-screen flex flex-col justify-start pt-6 pb-12 border-b-0 scroll-mt-20"
          contentClassName="max-w-[95rem] w-full justify-center"
        >
          <div className="relative mb-6 text-center">
            <motion.h2 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold tracking-tighter uppercase text-white leading-none"
            >
              Derivation <br className="md:hidden" /> Strategies
            </motion.h2>
            
            {/* Decorative Arrows (Desktop only) */}
            <div className="hidden lg:block absolute top-full left-1/2 -translate-x-1/2 w-full max-w-5xl h-12 pointer-events-none z-0">
              <svg className="w-full h-full" viewBox="0 0 1000 100" fill="none" preserveAspectRatio="none">
                {/* Left Arrow (Cyan) */}
                <motion.path 
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.8 }}
                  transition={{ duration: 1.2, delay: 0.5 }}
                  d="M480 0 C 480 40, 300 40, 200 90" 
                  stroke="#22d3ee" 
                  strokeWidth="3" 
                  strokeDasharray="6 6"
                />
                <motion.path 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 0.9 }}
                  transition={{ delay: 1.7 }}
                  d="M215 75 L 200 90 L 225 85" 
                  stroke="#22d3ee" 
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Right Arrow (Purple) */}
                <motion.path 
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.8 }}
                  transition={{ duration: 1.2, delay: 0.5 }}
                  d="M520 0 C 520 40, 700 40, 800 90" 
                  stroke="#a855f7" 
                  strokeWidth="3" 
                  strokeDasharray="6 6"
                />
                <motion.path 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 0.9 }}
                  transition={{ delay: 1.7 }}
                  d="M785 75 L 800 90 L 775 85" 
                  stroke="#a855f7" 
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="max-w-[95rem] mx-auto w-full grid lg:grid-cols-2 gap-6 items-stretch relative z-10">
            {/* Leftmost Derivation */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="glass-card p-4 rounded-3xl border-t-4 border-cyan-500/50 flex flex-col"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-lg font-bold border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]">L</div>
                <div>
                  <h3 className="text-xl font-bold text-white">Leftmost Derivation</h3>
                  <span className="text-cyan-400/70 text-[10px] font-mono uppercase tracking-widest">LMD Strategy</span>
                </div>
              </div>
              
              <div className="space-y-3 flex-1">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                  <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                    In a <strong className="text-cyan-400">Leftmost Derivation</strong>, the leftmost non-terminal variable in the current sentential form is always the next one to be replaced by a production rule.
                  </p>
                </div>

                <div className="font-mono text-[11px] text-slate-300 bg-black/40 p-4 rounded-2xl border border-white/5 space-y-1.5">
                  <div className="flex items-center gap-3 px-3 py-1.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 mb-2">
                    <p className="text-[10px] font-bold text-white tracking-tight">
                      <span className="text-cyan-400 uppercase mr-2 text-[9px] tracking-widest">grammar:</span>
                      <span className="text-cyan-100">S → AB, A → a | aA, B → cB | d</span>
                    </p>
                  </div>

                  <div className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[8px] font-bold text-cyan-400">1</div>
                        <div className="w-px h-full bg-gradient-to-b from-cyan-500/30 to-transparent mt-0.5"></div>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">S</span>
                        </div>
                        <p className="text-[10px] text-slate-300 font-sans uppercase tracking-widest hidden sm:block">Start Symbol</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[8px] font-bold text-cyan-400">2</div>
                        <div className="w-px h-full bg-gradient-to-b from-cyan-500/30 to-cyan-500/30 mt-0.5"></div>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 text-xs">⇒</span>
                          <span className="text-white font-bold text-sm"><span className="text-cyan-400 underline decoration-cyan-400/50 underline-offset-4">A</span>B</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-sans uppercase tracking-wider hidden sm:block">Replace <span className="text-white">S</span> with <span className="text-cyan-400 font-bold">AB</span></p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[8px] font-bold text-cyan-400">3</div>
                        <div className="w-px h-full bg-gradient-to-b from-cyan-500/30 to-cyan-500/30 mt-0.5"></div>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 text-xs">⇒</span>
                          <span className="text-white font-bold text-sm">a<span className="text-cyan-400 underline decoration-cyan-400/50 underline-offset-4">A</span>B</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-sans uppercase tracking-wider hidden sm:block">Replace <span className="text-white">A</span> with <span className="text-cyan-400 font-bold">aA</span></p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[8px] font-bold text-cyan-400">4</div>
                        <div className="w-px h-full bg-gradient-to-b from-cyan-500/30 to-cyan-500/30 mt-0.5"></div>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 text-xs">⇒</span>
                          <span className="text-white font-bold text-sm">aa<span className="text-cyan-400 underline decoration-cyan-400/50 underline-offset-4">B</span></span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-sans uppercase tracking-wider hidden sm:block">Replace <span className="text-white">A</span> with <span className="text-cyan-400 font-bold">a</span></p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[8px] font-bold text-cyan-400">5</div>
                        <div className="w-px h-full bg-gradient-to-b from-cyan-500/30 to-cyan-500/30 mt-0.5"></div>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 text-xs">⇒</span>
                          <span className="text-white font-bold text-sm">aac<span className="text-cyan-400 underline decoration-cyan-400/50 underline-offset-4">B</span></span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-sans uppercase tracking-wider hidden sm:block">Replace <span className="text-white">B</span> with <span className="text-cyan-400 font-bold">cB</span></p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="w-4 h-4 rounded-full bg-cyan-500 border border-cyan-400 flex items-center justify-center text-[8px] font-bold text-black shadow-[0_0_10px_rgba(34,211,238,0.5)]">6</div>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 text-xs">⇒</span>
                          <span className="text-white font-bold text-sm tracking-widest">aacd</span>
                        </div>
                        <p className="text-[11px] text-cyan-400 font-sans uppercase tracking-widest font-bold hidden sm:block">Final String Reached</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

            {/* Rightmost Derivation */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="glass-card p-4 rounded-3xl border-t-4 border-purple-500/50 flex flex-col"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-lg font-bold border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]">R</div>
                <div>
                  <h3 className="text-xl font-bold text-white">Rightmost Derivation</h3>
                  <span className="text-purple-400/70 text-[10px] font-mono uppercase tracking-widest">RMD Strategy</span>
                </div>
              </div>
              
              <div className="space-y-3 flex-1">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                  <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                    In a <strong className="text-purple-400">Rightmost Derivation</strong>, the rightmost non-terminal variable in the current sentential form is always the next one to be replaced by a production rule.
                  </p>
                </div>

                <div className="font-mono text-[11px] text-slate-300 bg-black/40 p-4 rounded-2xl border border-white/5 space-y-1.5">
                  <div className="flex items-center gap-3 px-3 py-1.5 bg-purple-500/10 rounded-xl border border-purple-500/20 mb-2">
                    <p className="text-[10px] font-bold text-white tracking-tight">
                      <span className="text-purple-400 uppercase mr-2 text-[9px] tracking-widest">grammar:</span>
                      <span className="text-purple-100">S → AB, A → a | aA, B → cB | d</span>
                    </p>
                  </div>

                  <div className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-[8px] font-bold text-purple-400">1</div>
                        <div className="w-px h-full bg-gradient-to-b from-purple-500/30 to-transparent mt-0.5"></div>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">S</span>
                        </div>
                        <p className="text-[10px] text-slate-300 font-sans uppercase tracking-widest hidden sm:block">Start Symbol</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-[8px] font-bold text-purple-400">2</div>
                        <div className="w-px h-full bg-gradient-to-b from-purple-500/30 to-purple-500/30 mt-0.5"></div>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 text-xs">⇒</span>
                          <span className="text-white font-bold text-sm">A<span className="text-purple-400 underline decoration-purple-500/50 underline-offset-4">B</span></span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-sans uppercase tracking-wider hidden sm:block">Replace <span className="text-white">S</span> with <span className="text-purple-400 font-bold">AB</span></p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-[8px] font-bold text-purple-400">3</div>
                        <div className="w-px h-full bg-gradient-to-b from-purple-500/30 to-purple-500/30 mt-0.5"></div>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 text-xs">⇒</span>
                          <span className="text-white font-bold text-sm">Ac<span className="text-purple-400 underline decoration-purple-500/50 underline-offset-4">B</span></span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-sans uppercase tracking-wider hidden sm:block">Replace <span className="text-white">B</span> with <span className="text-purple-400 font-bold">cB</span></p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-[8px] font-bold text-purple-400">4</div>
                        <div className="w-px h-full bg-gradient-to-b from-purple-500/30 to-purple-500/30 mt-0.5"></div>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 text-xs">⇒</span>
                          <span className="text-white font-bold text-sm"><span className="text-purple-400 underline decoration-purple-500/50 underline-offset-4">A</span>cd</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-sans uppercase tracking-wider hidden sm:block">Replace <span className="text-white">B</span> with <span className="text-purple-400 font-bold">d</span></p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-[8px] font-bold text-purple-400">5</div>
                        <div className="w-px h-full bg-gradient-to-b from-purple-500/30 to-purple-500/30 mt-0.5"></div>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 text-xs">⇒</span>
                          <span className="text-white font-bold text-sm">a<span className="text-purple-400 underline decoration-purple-500/50 underline-offset-4">A</span>cd</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-sans uppercase tracking-wider hidden sm:block">Replace <span className="text-white">A</span> with <span className="text-purple-400 font-bold">aA</span></p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="w-4 h-4 rounded-full bg-purple-500 border border-purple-400 flex items-center justify-center text-[8px] font-bold text-black shadow-[0_0_10px_rgba(168,85,247,0.5)]">6</div>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 text-xs">⇒</span>
                          <span className="text-white font-bold text-sm tracking-widest">aacd</span>
                        </div>
                        <p className="text-[11px] text-purple-400 font-sans uppercase tracking-widest font-bold hidden sm:block">Final String Reached</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
          </div>
        </Section>

        <Section 
          id="parse-tree" 
          title=""
          className="min-h-screen flex flex-col justify-start pt-6 pb-12 border-b-0 scroll-mt-20"
          contentClassName="max-w-[95rem] w-full justify-center"
        >
          <div className="max-w-[95rem] mx-auto w-full">
            <div className="relative mb-6 text-center">
              <motion.h2 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter uppercase text-white leading-none mb-3"
              >
                Parse Tree
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-slate-400 text-base sm:text-xl md:text-2xl lg:text-3xl max-w-4xl mx-auto"
              >
                A tree representation of how a string is generated from a context-free grammar (CFG)
              </motion.p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
              {/* Left Column: Text Content */}
              <div className="flex flex-col h-full">
                <div className="flex-1 flex flex-col">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex-1 p-6 md:p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-3xl flex flex-col"
                  >
                    <h4 className="text-white font-bold mb-4 flex items-center gap-3 text-lg md:text-xl uppercase tracking-wider">
                      DERIVATIONS AND PARSE TREES
                    </h4>
                    <ul className="space-y-4 text-base md:text-lg text-slate-400 mb-6">
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                        <span><strong className="text-slate-200">Leftmost Derivation:</strong> Expands the leftmost variable first</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                        <span><strong className="text-slate-200">Rightmost Derivation:</strong> Expands the rightmost variable first</span>
                      </li>
                      <li className="pt-3 border-t border-white/5 text-emerald-400 font-medium italic text-base">
                        Both will produce the same parse tree structure if grammar is unambiguous
                      </li>
                    </ul>

                    <div className="mt-auto p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                      <p className="text-lg text-emerald-300/70 italic leading-relaxed text-center">
                        "A derivation shows <span className="text-emerald-400/80 font-bold">how</span> a string is generated, while a parse tree shows <span className="text-emerald-400/80 font-bold">what</span> structure it represents."
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Right Column: Diagram */}
              <div className="relative h-full">
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-purple-500/10 blur-[100px] -z-10"></div>
                
                <div className="h-full bg-black/40 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <div className="text-[13px] font-bold tracking-[0.3em] text-slate-600 uppercase">Component Breakdown</div>
                  </div>

                  <div className="flex flex-col items-center space-y-6 sm:space-y-8">
                    {/* Root Node */}
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      className="relative group w-full max-w-[280px] sm:max-w-xs"
                    >
                      <div className="px-4 sm:px-6 py-3 bg-white/5 border-2 border-white/20 rounded-2xl group-hover:border-white/40 transition-colors duration-300 text-center w-full">
                        <div className="text-[11px] sm:text-[13px] font-bold text-slate-500 uppercase tracking-widest mb-1">Root</div>
                        <div className="text-white font-bold text-lg sm:text-xl">Start Symbol (S)</div>
                        <div className="text-xs sm:text-sm text-slate-400 mt-1">Where derivation begins</div>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 h-6 sm:h-8 w-0.5 bg-gradient-to-b from-white/20 to-cyan-400/40"></div>
                    </motion.div>

                    {/* Internal Nodes */}
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="relative group w-full max-w-[280px] sm:max-w-xs"
                    >
                      <div className="px-4 sm:px-6 py-3 bg-cyan-500/5 border-2 border-cyan-400/30 group-hover:border-cyan-400/60 rounded-2xl transition-colors duration-300 text-center w-full">
                        <div className="text-[11px] sm:text-[13px] font-bold text-cyan-500/70 uppercase tracking-widest mb-1">Internal Nodes</div>
                        <div className="text-cyan-400 font-bold text-lg sm:text-xl">Variables</div>
                        <div className="text-xs sm:text-sm text-slate-400 mt-1 italic">Intermediate expansion steps</div>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 h-6 sm:h-8 w-0.5 bg-gradient-to-b from-cyan-400/40 to-purple-500/40"></div>
                    </motion.div>

                    {/* Leaf Nodes */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="relative group w-full max-w-[280px] sm:max-w-xs"
                    >
                      <div className="px-4 sm:px-6 py-3 bg-purple-500/5 border-2 border-purple-500/30 group-hover:border-purple-500/60 rounded-2xl transition-colors duration-300 text-center w-full">
                        <div className="text-[11px] sm:text-[13px] font-bold text-purple-500/70 uppercase tracking-widest mb-1">Leaf Nodes</div>
                        <div className="text-purple-400 font-bold text-lg sm:text-xl">Terminals</div>
                        <div className="text-xs sm:text-sm text-slate-400 mt-1">Final output string (L → R)</div>
                      </div>
                    </motion.div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </Section>
        
        <Section 
          id="ambiguity" 
          title=""
          className="min-h-screen flex flex-col justify-start pt-6 pb-12 border-b-0 bg-slate-950/30 scroll-mt-20"
          contentClassName="max-w-[95rem] w-full justify-center"
        >
          <div className="max-w-[95rem] mx-auto w-full">
            <div className="relative mb-8 text-center">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tighter uppercase text-white leading-none mb-4"
              >
                Ambiguity in CFG
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-slate-400 text-lg md:text-2xl max-w-4xl mx-auto"
              >
                When a single string can be interpreted in multiple ways by the same grammar.
              </motion.p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <motion.div 
                whileHover={{ y: -5 }}
                className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-6 border border-rose-500/30">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl font-bold text-white mb-3 uppercase tracking-tight">What is Ambiguity?</h3>
                <p className="text-slate-400 text-sm md:text-lg leading-relaxed">
                  A grammar is <strong className="text-rose-400">ambiguous</strong> if there exists at least one string in its language that has more than one leftmost derivation, more than one rightmost derivation, or <strong className="text-white">more than one parse tree</strong>.
                </p>
              </motion.div>

              <motion.div 
                whileHover={{ y: -5 }}
                className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col lg:col-span-2"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl font-bold text-white uppercase tracking-tight">The Classic Example: Arithmetic</h3>
                  <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-bold text-amber-400 uppercase tracking-widest">Precedence Issue</div>
                </div>
                
                <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
                  <div className="space-y-4">
                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Ambiguous Grammar</div>
                      <code className="text-cyan-400 font-mono text-lg">E → E + E | E * E | id</code>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      For the string <code className="text-white bg-white/10 px-1 rounded">id + id * id</code>, this grammar doesn't know if addition or multiplication should happen first.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                        <div className="text-[9px] font-bold text-slate-500 uppercase mb-2">Tree 1</div>
                        <div className="text-xs text-slate-300 font-mono">(id + id) * id</div>
                      </div>
                      <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                        <div className="text-[9px] font-bold text-slate-500 uppercase mb-2">Tree 2</div>
                        <div className="text-xs text-slate-300 font-mono">id + (id * id)</div>
                      </div>
                    </div>
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                      <p className="text-xs text-emerald-400 italic">
                        In compilers, we resolve this by rewriting the grammar to enforce operator precedence.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </Section>

        {/* Generator Section */}
        {/* ═══════════════════════════════════════════════════════════
            WORKSHOP — full-viewport layout, cards fill remaining space
            Nav = 80px. Section fills remaining viewport after nav.
            ═══════════════════════════════════════════════════════════ */}
        <section
          id="workshop"
          className="w-full bg-[#0f1115] flex flex-col"
          style={{ minHeight: 'calc(100vh - 80px)' }}
        >
          <div className="flex flex-col flex-1 px-4 sm:px-6 md:px-8 lg:px-10 pt-4 pb-4">

            {/* ── Heading ── */}
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight uppercase text-white text-center mb-3 shrink-0">
              Derivation and Parse Tree Generator
            </h2>

            {/* ── Example pills ── */}
            <div className="w-full mb-3 shrink-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Try Examples</span>
                <span className="text-xs text-slate-500">● Hover to see details</span>
              </div>
              <div className="flex flex-row flex-wrap gap-2">
                {GRAMMAR_EXAMPLES_LIST.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { setGrammarText(ex.grammar); setTargetString(ex.target); }}
                    onMouseEnter={(e) => { setHoveredExample(ex); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                    onMouseLeave={() => setHoveredExample(null)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 rounded-full text-[10px] sm:text-xs font-bold text-slate-300 hover:text-white uppercase tracking-wide transition-all whitespace-nowrap"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Tooltip */}
            {hoveredExample && (
              <div
                className="fixed z-50 p-3 bg-[#1a1a1a]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-[0_10px_40px_rgba(34,211,238,0.15)] text-white pointer-events-none"
                style={{ left: tooltipPos.x + 15, top: tooltipPos.y + 15, maxWidth: 'min(280px, calc(100vw - 32px))' }}
              >
                <p className="text-xs font-bold text-cyan-400 mb-1">{hoveredExample.name}</p>
                <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">{hoveredExample.desc}</p>
                <div className="bg-black/50 rounded-lg p-1.5 border border-white/5">
                  <p className="text-[9px] text-slate-500 uppercase mb-0.5">Grammar</p>
                  <p className="font-mono text-[11px] text-purple-400 break-all">{hoveredExample.grammar}</p>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════
                PHONE < 640px — scroll freely, no fixed heights
                ═══════════════════════════════════════════════ */}
            <div className="flex sm:hidden flex-col gap-3 w-full">
              {/* Card 1 — Production Rules */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] border border-cyan-500/30 flex items-center justify-center shrink-0">1</span>
                    Production Rules
                  </h3>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest">Use helper buttons</span>
                    <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                      {[{ l: '→', v: '->' }, { l: '|', v: '|' }, { l: 'ε', v: 'ε' }].map(b => (
                        <button key={b.l} onClick={() => insertSymbol(b.v)}
                          className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-cyan-500/20 rounded-md text-white font-mono text-sm font-bold transition-all active:scale-95">
                          {b.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <textarea
                  ref={grammarInputRef} value={grammarText} onChange={e => setGrammarText(e.target.value)}
                  className="w-full h-32 p-3 font-mono text-sm font-bold bg-black/40 border border-white/5 rounded-xl focus:ring-2 focus:ring-cyan-500/50 outline-none resize-none text-slate-200"
                  placeholder="S -> a S b | ε" spellCheck={false}
                />
              </div>
              {/* Card 2 — Target String */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] border border-purple-500/30 flex items-center justify-center shrink-0">2</span>
                    Target String
                  </h3>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest">Use helper button</span>
                    <button onClick={() => insertSymbol('ε', true)}
                      className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-cyan-500/20 rounded-md text-white font-mono text-sm font-bold transition-all active:scale-95">
                      ε
                    </button>
                  </div>
                </div>
                <input ref={targetInputRef} type="text" value={targetString} onChange={e => setTargetString(e.target.value)}
                  className="w-full p-3 font-mono text-sm bg-black/40 border border-white/5 rounded-xl focus:ring-2 focus:ring-cyan-500/50 outline-none text-white"
                  placeholder="e.g. aab or ε" spellCheck={false}
                />
              </div>
              {/* Card 3 — Settings + Generate */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-slate-500/20 text-slate-400 text-[10px] border border-slate-500/30 flex items-center justify-center shrink-0">3</span>
                  Derivation Type
                </h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[{ id: 'left', label: 'Left' }, { id: 'right', label: 'Right' }, { id: 'both', label: 'Both' }].map(t => (
                    <button key={t.id} onClick={() => setDerivationType(t.id as any)}
                      className={cn("py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        derivationType === t.id ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]" : "bg-white/5 text-slate-400 border border-white/5")}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <button onClick={handleGenerate}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                  <Play className="w-4 h-4 fill-black shrink-0" /> Generate
                </button>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                TABLET 640–1023px  +  DESKTOP 1024px+
                Two column layout matching reference image
                ═══════════════════════════════════════════════════════════ */}
            <div className="hidden sm:flex flex-row gap-3 w-full flex-1 min-h-0">

              {/* ── LEFT COLUMN: Card 1 — Define Production Rules ── */}
              <div className="flex flex-col flex-1 min-h-0 min-w-0 rounded-3xl border border-white/10 bg-[#1a1d26] p-5">
                <div className="mb-2.5 shrink-0">
                  <h3 className="text-lg font-bold text-white mb-1.5">
                    <span className="text-2xl font-bold">1.</span> Define Production Rules
                  </h3>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">
                      Format: <code className="text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded">S → a B</code> <span className="text-slate-600">|</span> <code className="text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded">b A</code>. Separate symbols with spaces.
                    </p>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">Use helper buttons</span>
                      <div className="flex gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                        {[{ l: '→', v: '->' }, { l: '|', v: '|' }, { l: 'ε', v: 'ε' }].map(b => (
                          <button key={b.l} onClick={() => insertSymbol(b.v)}
                            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-cyan-500/20 rounded-lg text-white font-mono text-base font-bold transition-all active:scale-95">
                            {b.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <textarea
                  value={grammarText} onChange={e => setGrammarText(e.target.value)}
                  className="flex-1 min-h-[120px] w-full p-4 font-mono text-base font-bold bg-black/60 border border-white/5 rounded-2xl focus:ring-2 focus:ring-cyan-500/50 outline-none resize-none text-slate-200 leading-relaxed"
                  placeholder="S -> A B
A -> a A | ε
B -> b B | ε" spellCheck={false}
                />
              </div>

              {/* ── RIGHT COLUMN: Card 2 & Card 3 stacked ── */}
              <div className="flex flex-col gap-3 w-[420px] shrink-0 min-h-0">
                
                {/* Card 2 — Target String */}
                <div className="shrink-0 rounded-3xl border border-white/10 bg-[#1a1d26] p-5">
                  <div className="mb-2.5">
                    <h3 className="text-lg font-bold text-white mb-1.5">
                      <span className="text-2xl font-bold">2.</span> Target String
                    </h3>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-400">
                        The string you want to derive. Use <code className="text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded">ε</code> or <code className="text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded">epsilon</code> for empty string.
                      </p>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">Use helper button</span>
                        <button onClick={() => insertSymbol('ε', true)}
                          className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-cyan-500/20 rounded-lg text-white font-mono text-base font-bold transition-all active:scale-95">
                          ε
                        </button>
                      </div>
                    </div>
                  </div>
                  <input type="text" value={targetString} onChange={e => setTargetString(e.target.value)}
                    className="w-full p-4 font-mono text-base font-bold bg-black/60 border border-white/5 rounded-2xl focus:ring-2 focus:ring-cyan-500/50 outline-none text-white"
                    placeholder="aab" spellCheck={false}
                  />
                </div>

                {/* Card 3 — Select Derivation Type */}
                <div className="flex-1 min-h-0 rounded-3xl border border-white/10 bg-[#1a1d26] p-5 flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-3 shrink-0">
                    <span className="text-2xl font-bold">3.</span> Select Derivation Type
                  </h3>
                  <div className="flex gap-3 mb-3 shrink-0">
                    {[{ id: 'left', label: 'Leftmost' }, { id: 'right', label: 'Rightmost' }, { id: 'both', label: 'Both' }].map(t => (
                      <button key={t.id} onClick={() => setDerivationType(t.id as any)}
                        className={cn("flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                          derivationType === t.id ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5")}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {/* Spacer */}
                  <div className="flex-1" />
                  <button onClick={handleGenerate}
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black rounded-2xl font-bold shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] transition-all flex items-center justify-center gap-3 group uppercase tracking-widest text-base shrink-0">
                    <Play className="w-5 h-5 fill-black group-hover:scale-110 transition-transform shrink-0" /> Generate Derivation & Tree
                  </button>
                </div>

              </div>

            </div>{/* end sm:flex */}

          </div>{/* end flex-col flex-1 */}
        </section>

        {/* Results Section */}
        <Section 
          id="results" 
          title="" 
          className="min-h-screen pt-6 pb-12 border-b-0 bg-[#050505] scroll-mt-20" 
          contentClassName="max-w-none px-0 w-full"
        >
          {!parseTree && !error ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 min-h-[50vh]">
              <div className="w-12 h-12 rounded-full bg-black/40 border border-white/5 flex items-center justify-center mb-4">
                <ArrowRight className="w-6 h-6 opacity-50" />
              </div>
              <p className="text-base">Enter your grammar and string above to see the results.</p>
            </div>
          ) : (
            <div className="flex relative items-stretch min-h-full">
              {/* Left Sidebar: Input Summary (Fixed/Sticky) — hidden on desktop, shown inside each section instead */}
              <div className="w-96 border-r border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md hidden relative z-20 shrink-0 h-full">
                <div className="sticky top-20 h-[calc(100vh-6rem)] p-6 flex flex-col">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card p-6 rounded-3xl border-white/10 h-full overflow-hidden"
                  >
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                          GRAMMAR RULES
                        </h3>
                        <div className="font-mono text-xs text-slate-300 whitespace-pre-wrap break-all bg-black/40 p-3.5 rounded-xl border border-white/5 leading-relaxed max-h-[25vh] overflow-y-auto custom-scrollbar">
                          {grammarText}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          INPUT STRING
                        </h3>
                        <div className="font-mono text-base font-bold text-white bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-3.5 rounded-xl border border-white/5 break-all shadow-inner">
                          {targetString}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 space-y-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                          {error ? (
                            <div className="flex items-center gap-2 text-rose-500">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Status: Failed
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-emerald-500">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Status: Derived
                            </div>
                          )}
                        </div>

                        {!error && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 pt-2">
                              <div className="h-px flex-1 bg-slate-800"></div>
                              <h3 className="text-xl font-black text-white uppercase tracking-[0.6em] font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                                JUMP TO
                              </h3>
                              <div className="h-px flex-1 bg-slate-800"></div>
                            </div>
                            
                            <div className="grid gap-4">
                              <button 
                                onClick={() => scrollToId('derivations-section')}
                                className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-3xl bg-cyan-500/5 border border-cyan-500/20 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all group"
                              >
                                <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                                  <GitBranch className="w-7 h-7" />
                                </div>
                                <span className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] text-center">Derivation Sequences</span>
                              </button>

                              <button 
                                onClick={() => scrollToId('parse-tree-section')}
                                className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-3xl bg-purple-500/5 border border-purple-500/20 hover:bg-purple-500/10 hover:border-purple-500/40 transition-all group"
                              >
                                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                                  <Layers className="w-7 h-7" />
                                </div>
                                <span className="text-xs font-black text-purple-400 uppercase tracking-[0.2em] text-center">Parse Tree</span>
                              </button>

                              <button 
                                onClick={() => scrollToId('workshop')}
                                className="w-full flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                              >
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center group-hover:text-white">Go back to generator</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Main Content Area: Snapping Pages (Desktop) */}
              <div className="hidden md:block flex-1">
                {error ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="max-w-lg w-full glass-card p-6 sm:p-8 rounded-3xl border-rose-500/20 bg-rose-500/5 backdrop-blur-xl"
                    >
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight uppercase">
                          <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-rose-500 inline mr-2 sm:mr-3" />
                          PARSING FAILED
                        </h2>
                      </div>
                      <p className="text-rose-400 font-bold text-base sm:text-lg mb-1">Syntax Error</p>
                      <p className="text-slate-400 text-xs sm:text-sm mb-6">Please check your grammar and input string.</p>
                      
                      <div className="bg-black/40 p-3 rounded-xl border border-white/10 text-left mb-4 font-mono text-[10px] sm:text-xs space-y-1">
                        {parsingError ? (
                          <>
                            <p className="text-slate-300">Derivation successful up to: <span className="text-cyan-400">"{parsingError.prefix}"</span></p>
                            <p className="text-slate-300">Failed at: <span className="text-rose-400">"{parsingError.failedAt}"</span></p>
                            <p className="text-slate-300">Closest form reached: <span className="text-amber-400">{parsingError.closestForm}</span><span className="text-slate-500">{parsingError.ruleInfo}</span></p>
                          </>
                        ) : (
                          <p className="text-slate-500 italic">No derivation details available.</p>
                        )}
                      </div>
                      {suggestion && (
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-left">
                          <p className="text-white font-bold text-[10px] sm:text-xs mb-1">Suggested valid string:</p>
                          <p className="text-cyan-400 font-mono text-[10px] sm:text-xs mb-2">"{suggestion}"</p>
                          
                          <div className="flex items-center gap-2 my-2">
                            <div className="h-px flex-1 bg-white/10"></div>
                            <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">OR</span>
                            <div className="h-px flex-1 bg-white/10"></div>
                          </div>

                          <p className="text-white font-bold text-[10px] sm:text-xs mb-2">Choose number of symbols (terminals):</p>
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <div className="flex items-center gap-2 w-full">
                              <input 
                                type="number" 
                                placeholder="Type custom length"
                                value={suggestionLength || ''}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val)) setSuggestionLength(val);
                                  else setSuggestionLength(0);
                                }}
                                className="flex-1 p-1.5 h-8 bg-black/40 rounded-lg border border-white/10 text-white text-[10px] sm:text-xs focus:outline-none focus:border-cyan-500"
                              />
                              <button 
                                onClick={() => {
                                  try {
                                    const grammar = parseGrammar(grammarText);
                                    const result = generateExactLengthString(grammar, suggestionLength);
                                    if (result !== null) {
                                      setCustomSuggestion(result);
                                      setCustomSuggestionError(null);
                                    } else {
                                      setCustomSuggestion(null);
                                      setCustomSuggestionError("string of this length not possible with current grammar");
                                    }
                                  } catch (e) {
                                    setCustomSuggestion(null);
                                    setCustomSuggestionError("Error generating string");
                                  }
                                }}
                                className="px-3 h-8 bg-cyan-500/20 text-cyan-400 rounded-lg text-[8px] sm:text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-500/30 transition-colors"
                              >
                                Generate
                              </button>
                            </div>
                          </div>
                          
                          {customSuggestion !== null && (
                            <div className="mt-2 p-2 bg-black/40 rounded-lg border border-white/5">
                              <p className="text-slate-400 text-[8px] sm:text-[10px] mb-0.5 uppercase tracking-widest font-bold">Result:</p>
                              <p className="text-cyan-400 font-mono text-[10px] sm:text-xs">"{customSuggestion}"</p>
                            </div>
                          )}
                          {customSuggestionError !== null && (
                            <div className="mt-2 p-2 bg-black/40 rounded-lg border border-red-500/20">
                              <p className="text-red-400 text-[10px] sm:text-xs">{customSuggestionError}</p>
                            </div>
                          )}
                        </div>
                      )}
                      <button 
                        onClick={() => scrollToId('workshop')}
                        className="px-6 sm:px-8 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold transition-all uppercase tracking-widest text-[10px] sm:text-xs mt-6 sm:mt-8"
                      >
                        Back to Generator
                      </button>
                    </motion.div>
                  </div>
                ) : (
                  <>
                    {/* Page 1: Derivations */}
                <div id="derivations-section" className="flex flex-col lg:flex-row bg-[#050505] relative scroll-mt-20">
                  {/* Desktop Left Sidebar for Derivation Section */}
                  <div className="hidden lg:flex w-80 xl:w-96 border-r border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md shrink-0 flex-col">
                    <div className="sticky top-20 p-4 flex flex-col max-h-[calc(100vh-5rem)] overflow-y-auto custom-scrollbar">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-4 xl:p-5 rounded-3xl border-white/10 flex flex-col"
                      >
                        <div className="space-y-3 xl:space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                          <div>
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                              GRAMMAR RULES
                            </h3>
                            <div className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap break-all bg-black/40 p-2.5 rounded-xl border border-white/5 leading-relaxed max-h-[18vh] overflow-y-auto custom-scrollbar">
                              {grammarText}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                              INPUT STRING
                            </h3>
                            <div className="font-mono text-sm font-bold text-white bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-2.5 rounded-xl border border-white/5 break-all shadow-inner">
                              {targetString}
                            </div>
                          </div>
                          <div className="pt-3 border-t border-white/5 space-y-3">
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                              {error ? (
                                <div className="flex items-center gap-2 text-rose-500">
                                  <AlertCircle className="w-3 h-3" />
                                  Status: Failed
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-emerald-500">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Status: Derived
                                </div>
                              )}
                            </div>
                            {!error && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 pt-1">
                                  <div className="h-px flex-1 bg-slate-800"></div>
                                  <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">JUMP TO</h3>
                                  <div className="h-px flex-1 bg-slate-800"></div>
                                </div>
                                <div className="grid gap-2">
                                  <button
                                    onClick={() => scrollToId('derivations-section')}
                                    className="w-full flex flex-row items-center justify-start gap-2 p-2.5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all group"
                                  >
                                    <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                                      <GitBranch className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.15em]">Derivation Sequences</span>
                                  </button>
                                  <button
                                    onClick={() => scrollToId('parse-tree-section')}
                                    className="w-full flex flex-row items-center justify-start gap-2 p-2.5 rounded-2xl bg-purple-500/5 border border-purple-500/20 hover:bg-purple-500/10 hover:border-purple-500/40 transition-all group"
                                  >
                                    <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                                      <Layers className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.15em]">Parse Tree</span>
                                  </button>
                                  <button
                                    onClick={() => scrollToId('workshop')}
                                    className="w-full flex flex-col items-center justify-center gap-1 p-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                                  >
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center group-hover:text-white">Go back to generator</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Derivation Main Content */}
                  <div className="flex-1 flex flex-col pt-4 pb-8">
                  {/* Results Header & Success Banner (Fixed at top) */}
                  <div className="shrink-0 p-4 sm:p-6 pb-0 pt-0">
                    <div id="results-header" className="relative mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <motion.h2 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tighter uppercase text-white leading-none"
                      >
                        Results
                      </motion.h2>
                      <button 
                        onClick={() => scrollToId('workshop')}
                        className="text-slate-500 hover:text-white transition-colors flex items-center gap-2 group"
                      >
                        <span className="text-[10px] uppercase tracking-widest font-bold">Go back to generator</span>
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10">
                          <ArrowRight className="w-3 h-3 rotate-180" />
                        </div>
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full mb-0"
                      >
                        <div className="w-full py-3 bg-emerald-500/10 border-y border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold uppercase tracking-[0.3em] text-xs backdrop-blur-sm">
                          <CheckCircle2 className="w-4 h-4 mr-3" />
                          Derivation Successful
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Derivation Content */}
                  <div className="flex flex-col p-4 sm:p-6 pt-2 gap-4">
                    <div className="flex flex-col gap-4">
                      {isAmbiguous && (
                        <div className="shrink-0 space-y-3">
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-amber-400 backdrop-blur-sm"
                          >
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-amber-300 text-sm">Ambiguity Detected!</h4>
                              <p className="text-xs mt-0.5">
                                Multiple parse trees possible. Here are 2 of them:
                              </p>
                            </div>
                          </motion.div>

                          <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10 w-fit">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Switch:</span>
                            {allParseTrees.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => handleSwitchTree(i)}
                                className={cn(
                                  "w-8 h-8 rounded-lg font-bold text-xs transition-all",
                                  currentTreeIndex === i 
                                    ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]" 
                                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                                )}
                              >
                                {i + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className={cn(
                        "grid gap-4",
                        derivationType === 'both' ? "md:grid-cols-2" : "grid-cols-1"
                      )}>
                        {(derivationType === 'left' || derivationType === 'both') && (
                          <div className="glass-card p-4 rounded-2xl border-white/5 bg-white/[0.01] flex flex-col overflow-hidden">
                            <h3 className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2 shrink-0">
                              <div className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs border border-cyan-500/30 shrink-0">L</div>
                              Leftmost Derivation
                            </h3>

                            {/* Header row */}
                            <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 mb-2 px-1 shrink-0">
                              <div className="w-5" />
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sentential Form</div>
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-right">Rule Applied</div>
                            </div>

                            <div className="space-y-1 overflow-x-auto custom-scrollbar">
                              {lmdSteps?.map((step, i) => {
                                const formStr = step.form.length === 0 ? 'ε' : step.form.join(' ');
                                const beforeActive = step.form.slice(0, step.activeNtIndex).join(' ');
                                const activeSym = step.activeNtIndex != null && step.activeNtIndex >= 0 ? step.form[step.activeNtIndex] : null;
                                const afterActive = step.activeNtIndex != null && step.activeNtIndex >= 0 ? step.form.slice(step.activeNtIndex + 1).join(' ') : '';
                                return (
                                  <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="grid grid-cols-[auto_1fr_auto] gap-x-3 items-center py-1.5 px-1 rounded-lg hover:bg-white/[0.03] transition-colors group min-w-0"
                                  >
                                    {/* Arrow */}
                                    <span className="text-slate-500 text-xs font-mono w-5 text-center shrink-0 select-none">
                                      {i === 0 ? 'S' : '⇒'}
                                    </span>
                                    {/* Sentential form — single line, scroll if needed */}
                                    <div className="font-mono text-xs text-slate-300 overflow-x-auto whitespace-nowrap custom-scrollbar min-w-0 bg-black/30 px-2 py-1 rounded border border-white/5">
                                      {step.form.length === 0 ? (
                                        <span className="text-slate-500 italic">ε</span>
                                      ) : activeSym != null ? (
                                        <>
                                          {beforeActive && <span>{beforeActive} </span>}
                                          <span className="text-cyan-400 font-bold underline decoration-cyan-400/50 underline-offset-2">{activeSym}</span>
                                          {afterActive && <span> {afterActive}</span>}
                                        </>
                                      ) : (
                                        <span>{formStr}</span>
                                      )}
                                    </div>
                                    {/* Rule */}
                                    <div className="text-[10px] text-cyan-500/80 font-mono bg-cyan-500/5 px-2 py-1 rounded border border-cyan-500/10 whitespace-nowrap shrink-0 max-w-[120px] lg:max-w-[160px] overflow-hidden text-ellipsis" title={step.rule}>
                                      {step.rule || <span className="text-slate-600 italic">start</span>}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {(derivationType === 'right' || derivationType === 'both') && (
                          <div className="glass-card p-4 rounded-2xl border-white/5 bg-white/[0.01] flex flex-col overflow-hidden">
                            <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2 shrink-0">
                              <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs border border-purple-500/30 shrink-0">R</div>
                              Rightmost Derivation
                            </h3>

                            {/* Header row */}
                            <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 mb-2 px-1 shrink-0">
                              <div className="w-5" />
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sentential Form</div>
                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-right">Rule Applied</div>
                            </div>

                            <div className="space-y-1 overflow-x-auto custom-scrollbar">
                              {rmdSteps?.map((step, i) => {
                                const formStr = step.form.length === 0 ? 'ε' : step.form.join(' ');
                                const beforeActive = step.form.slice(0, step.activeNtIndex).join(' ');
                                const activeSym = step.activeNtIndex != null && step.activeNtIndex >= 0 ? step.form[step.activeNtIndex] : null;
                                const afterActive = step.activeNtIndex != null && step.activeNtIndex >= 0 ? step.form.slice(step.activeNtIndex + 1).join(' ') : '';
                                return (
                                  <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: 8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-1.5 px-1 rounded-lg hover:bg-white/[0.03] transition-colors group min-w-0"
                                  >
                                    {/* Arrow */}
                                    <span className="text-slate-500 text-xs font-mono w-5 text-center shrink-0 select-none">
                                      {i === 0 ? 'S' : '⇒'}
                                    </span>
                                    {/* Sentential form — single line */}
                                    <div className="font-mono text-xs text-slate-300 overflow-x-auto whitespace-nowrap custom-scrollbar min-w-0 bg-black/30 px-2 py-1 rounded border border-white/5">
                                      {step.form.length === 0 ? (
                                        <span className="text-slate-500 italic">ε</span>
                                      ) : activeSym != null ? (
                                        <>
                                          {beforeActive && <span>{beforeActive} </span>}
                                          <span className="text-purple-400 font-bold underline decoration-purple-400/50 underline-offset-2">{activeSym}</span>
                                          {afterActive && <span> {afterActive}</span>}
                                        </>
                                      ) : (
                                        <span>{formStr}</span>
                                      )}
                                    </div>
                                    {/* Rule */}
                                    <div className="text-[10px] text-purple-500/80 font-mono bg-purple-500/5 px-2 py-1 rounded border border-purple-500/10 whitespace-nowrap shrink-0 max-w-[120px] lg:max-w-[160px] overflow-hidden text-ellipsis" title={step.rule}>
                                      {step.rule || <span className="text-slate-600 italic">start</span>}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center py-6 text-slate-500">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Scroll for Parse Tree</span>
                      <motion.div
                        animate={{ y: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    </div>
                  </div>
                  </div> {/* end derivation main content */}
                </div>

                {/* Page 2: Parse Tree */}
                <div id="parse-tree-section" className="flex flex-col lg:flex-row bg-[#050505] relative scroll-mt-20">
                  {/* Desktop Left Sidebar for Parse Tree Section */}
                  <div className="hidden lg:flex w-80 xl:w-96 border-r border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md shrink-0 flex-col">
                    <div className="sticky top-20 p-4 flex flex-col max-h-[calc(100vh-5rem)] overflow-y-auto custom-scrollbar">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-4 xl:p-5 rounded-3xl border-white/10 flex flex-col"
                      >
                        <div className="space-y-3 xl:space-y-4">
                          <div>
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                              GRAMMAR RULES
                            </h3>
                            <div className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap break-all bg-black/40 p-2.5 rounded-xl border border-white/5 leading-relaxed max-h-[18vh] overflow-y-auto custom-scrollbar">
                              {grammarText}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                              INPUT STRING
                            </h3>
                            <div className="font-mono text-sm font-bold text-white bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-2.5 rounded-xl border border-white/5 break-all shadow-inner">
                              {targetString}
                            </div>
                          </div>
                          <div className="pt-3 border-t border-white/5 space-y-3">
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                              {error ? (
                                <div className="flex items-center gap-2 text-rose-500">
                                  <AlertCircle className="w-3 h-3" />
                                  Status: Failed
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-emerald-500">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Status: Derived
                                </div>
                              )}
                            </div>
                            {!error && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 pt-1">
                                  <div className="h-px flex-1 bg-slate-800"></div>
                                  <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">JUMP TO</h3>
                                  <div className="h-px flex-1 bg-slate-800"></div>
                                </div>
                                <div className="grid gap-2">
                                  <button
                                    onClick={() => scrollToId('derivations-section')}
                                    className="w-full flex flex-row items-center justify-start gap-2 p-2.5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all group"
                                  >
                                    <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                                      <GitBranch className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.15em]">Derivation Sequences</span>
                                  </button>
                                  <button
                                    onClick={() => scrollToId('parse-tree-section')}
                                    className="w-full flex flex-row items-center justify-start gap-2 p-2.5 rounded-2xl bg-purple-500/5 border border-purple-500/20 hover:bg-purple-500/10 hover:border-purple-500/40 transition-all group"
                                  >
                                    <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                                      <Layers className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.15em]">Parse Tree</span>
                                  </button>
                                  <button
                                    onClick={() => scrollToId('workshop')}
                                    className="w-full flex flex-col items-center justify-center gap-1 p-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                                  >
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center group-hover:text-white">Go back to generator</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Parse Tree Main Content */}
                  <div className="flex-1 flex flex-col px-4 sm:px-6 pt-6 pb-8">
                    <div className="flex flex-col w-full gap-4">
                      <h3 className="text-base font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2 leading-none">
                        <div className="w-2 h-2 rounded-full bg-white shrink-0" />
                        Parse Tree
                      </h3>
                      {isAmbiguous ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                          {allParseTrees.map((tree, idx) => (
                            <div key={idx} className="glass-card p-2 rounded-3xl border-white/5 bg-white/[0.01] flex flex-col" style={{height: '480px'}}>
                              <h4 className="text-center text-cyan-400 font-bold mb-1 text-xs shrink-0">Parse Tree {idx + 1}</h4>
                              <div className="flex-1 w-full min-h-0">
                                <ParseTreeViz data={tree} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="glass-card p-2 rounded-3xl border-white/5 bg-white/[0.01] flex flex-col w-full" style={{height: '520px'}}>
                          <div className="flex-1 w-full min-h-0">
                            <ParseTreeViz data={parseTree} compact={!isAmbiguous} />
                          </div>
                        </div>
                      )}

                      <div className="glass-card px-3 py-2 rounded-xl border-white/5 bg-white/[0.01] w-full">
                        <div className="text-[10px] sm:text-[11px] text-slate-400 text-center py-1 w-full px-2 leading-snug">
                          Click on nodes to view production rule and substitution.{' '}
                          <span className="text-[#3A7BD5] font-semibold">Blue</span>: non-terminals,{' '}
                          <span className="text-[#E6C15A] font-semibold">Amber</span>: terminals.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile Results Layout */}
          <div className="md:hidden w-full px-4 pt-6 pb-12">
            {error ? (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20">
                  <AlertCircle className="w-8 h-8 text-rose-500" />
                </div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-2">Parsing Failed</h2>
                <p className="text-slate-400 text-sm mb-8">The string could not be derived from the grammar.</p>
                
                <div className="w-full glass-card p-5 rounded-2xl border-rose-500/20 bg-rose-500/5 mb-8">
                  <p className="text-rose-400 text-xs font-mono break-all leading-relaxed">
                    {parsingError ? `Failed at: "${parsingError.failedAt}"` : "Syntax error in grammar or string."}
                  </p>
                </div>

                <button 
                  onClick={() => scrollToId('workshop')}
                  className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold uppercase tracking-widest text-xs"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Results</h2>
                  <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Success</div>
                </div>

                {/* 1. Leftmost Derivation */}
                {(derivationType === 'left' || derivationType === 'both') && (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      Leftmost Derivation
                    </h3>
                    <div className="glass-card p-3 rounded-2xl border-white/5 bg-white/[0.01]">
                      {/* header */}
                      <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 mb-2 px-1">
                        <div className="w-5" />
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Form</div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Rule</div>
                      </div>
                      <div className="space-y-1">
                        {lmdSteps?.map((step, i) => {
                          const beforeActive = step.form.slice(0, step.activeNtIndex).join(' ');
                          const activeSym = step.activeNtIndex != null && step.activeNtIndex >= 0 ? step.form[step.activeNtIndex] : null;
                          const afterActive = step.activeNtIndex != null && step.activeNtIndex >= 0 ? step.form.slice(step.activeNtIndex + 1).join(' ') : '';
                          return (
                            <div key={i} className="grid grid-cols-[auto_1fr_auto] gap-x-2 items-center py-1 px-1 rounded hover:bg-white/[0.03]">
                              <span className="text-slate-500 text-xs font-mono w-5 text-center shrink-0">{i === 0 ? 'S' : '⇒'}</span>
                              <div className="font-mono text-xs text-slate-300 overflow-x-auto whitespace-nowrap bg-black/30 px-2 py-1 rounded border border-white/5 min-w-0">
                                {step.form.length === 0 ? <span className="text-slate-500 italic">ε</span>
                                  : activeSym != null ? (
                                    <>{beforeActive && <span>{beforeActive} </span>}<span className="text-cyan-400 font-bold underline decoration-cyan-400/40 underline-offset-2">{activeSym}</span>{afterActive && <span> {afterActive}</span>}</>
                                  ) : <span>{step.form.join(' ')}</span>}
                              </div>
                              <div className="text-[10px] font-mono text-cyan-500/70 bg-cyan-500/5 px-1.5 py-1 rounded border border-cyan-500/10 whitespace-nowrap shrink-0 max-w-[90px] overflow-hidden text-ellipsis" title={step.rule}>
                                {step.rule || <span className="text-slate-600 italic">start</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Rightmost Derivation */}
                {(derivationType === 'right' || derivationType === 'both') && (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                      Rightmost Derivation
                    </h3>
                    <div className="glass-card p-3 rounded-2xl border-white/5 bg-white/[0.01]">
                      {/* header */}
                      <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 mb-2 px-1">
                        <div className="w-5" />
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Form</div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Rule</div>
                      </div>
                      <div className="space-y-1">
                        {rmdSteps?.map((step, i) => {
                          const beforeActive = step.form.slice(0, step.activeNtIndex).join(' ');
                          const activeSym = step.activeNtIndex != null && step.activeNtIndex >= 0 ? step.form[step.activeNtIndex] : null;
                          const afterActive = step.activeNtIndex != null && step.activeNtIndex >= 0 ? step.form.slice(step.activeNtIndex + 1).join(' ') : '';
                          return (
                            <div key={i} className="grid grid-cols-[auto_1fr_auto] gap-x-2 items-center py-1 px-1 rounded hover:bg-white/[0.03]">
                              <span className="text-slate-500 text-xs font-mono w-5 text-center shrink-0">{i === 0 ? 'S' : '⇒'}</span>
                              <div className="font-mono text-xs text-slate-300 overflow-x-auto whitespace-nowrap bg-black/30 px-2 py-1 rounded border border-white/5 min-w-0">
                                {step.form.length === 0 ? <span className="text-slate-500 italic">ε</span>
                                  : activeSym != null ? (
                                    <>{beforeActive && <span>{beforeActive} </span>}<span className="text-purple-400 font-bold underline decoration-purple-400/40 underline-offset-2">{activeSym}</span>{afterActive && <span> {afterActive}</span>}</>
                                  ) : <span>{step.form.join(' ')}</span>}
                              </div>
                              <div className="text-[10px] font-mono text-purple-500/70 bg-purple-500/5 px-1.5 py-1 rounded border border-purple-500/10 whitespace-nowrap shrink-0 max-w-[90px] overflow-hidden text-ellipsis" title={step.rule}>
                                {step.rule || <span className="text-slate-600 italic">start</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Parse Tree */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    Parse Tree
                  </h3>
                  <div className="glass-card p-2 rounded-2xl border-white/5 bg-white/[0.01] w-full overflow-hidden" style={{height: '420px'}}>
                    <ParseTreeViz data={parseTree} />
                  </div>
                </div>

                <button 
                  onClick={() => scrollToId('workshop')}
                  className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-4"
                >
                  Back to Generator
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Section>

    {/* Real World & Footer Section */}
    <section id="real-world" className="bg-[#05070a] text-white min-h-screen flex flex-col relative overflow-hidden pt-6 pb-12 scroll-mt-20">
      <div className="flex-1 flex flex-col">
        {/* Top Half: Real World CFG */}
        <div className="flex flex-col justify-center pb-12 px-4 sm:px-6">
          <div className="max-w-[95rem] mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 md:mb-6"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-8xl font-bold tracking-tighter uppercase">
                CFGS IN THE REAL WORLD
              </h2>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 max-w-6xl mx-auto">
              {[
                { 
                  label: 'COMPILER DESIGN', 
                  Icon: Monitor, 
                  color: 'text-blue-400', 
                  bg: 'bg-blue-900/20',
                  description: 'CFGs define the syntax of programming languages, enabling compilers to transform source code into executable structures.'
                },
                { 
                  label: 'NLP', 
                  Icon: MessageSquare, 
                  color: 'text-purple-400', 
                  bg: 'bg-purple-900/20',
                  description: 'Used to model human language structure, helping machines understand grammar and complex sentence construction.'
                },
                { 
                  label: 'SYNTAX ANALYSIS', 
                  Icon: Search, 
                  color: 'text-cyan-400', 
                  bg: 'bg-cyan-900/20',
                  description: 'The core of data parsing, where grammars validate if a sequence of tokens follows a specific structural pattern.'
                },
                { 
                  label: 'XML/HTML PARSING', 
                  Icon: FileCode, 
                  color: 'text-orange-400', 
                  bg: 'bg-orange-900/20',
                  description: 'Describes the nested, hierarchical structure of markup languages, ensuring tags are correctly opened and closed.'
                }
              ].map((item, idx) => {
                const Icon = item.Icon;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 md:gap-3 shadow-sm hover:bg-white/10 transition-all duration-500 group border border-white/10"
                  >
                    <div className={cn("p-2.5 md:p-3 rounded-xl transition-transform duration-500 group-hover:scale-110", item.bg)}>
                      <Icon className={cn("w-5 h-5 md:w-6 md:h-6", item.color)} />
                    </div>
                    <div className="text-center">
                      <h3 className="text-[10px] md:text-sm font-bold tracking-[0.1em] uppercase text-white">
                        {item.label}
                      </h3>
                      <p className="hidden lg:block text-xs text-slate-400 leading-relaxed font-medium line-clamp-3 mt-1">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Half: Quick Reference */}
        <div className="bg-[#0a0c10] border-t border-white/10 py-10 px-4 sm:px-6 flex flex-col justify-center">
          <div className="max-w-[95rem] mx-auto w-full">
                <h3 className="text-xl font-bold tracking-tighter uppercase mb-6 text-center text-white">
                  Quick Reference
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  <div>
                    <h4 className="font-bold text-xs tracking-widest text-slate-400 uppercase mb-3">What is CFG</h4>
                    <ul className="space-y-1.5 text-xs font-medium text-slate-300">
                      <li><a href="#essence" className="hover:text-cyan-400 transition-colors">Overview</a></li>
                      <li><a href="#tuples" className="hover:text-cyan-400 transition-colors">Definition</a></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs tracking-widest text-slate-400 uppercase mb-3">Tools</h4>
                    <ul className="space-y-1.5 text-xs font-medium text-slate-300">
                      <li><a href="#cfg-checker" className="hover:text-cyan-400 transition-colors">CFG Validator</a></li>
                      <li><a href="#workshop" className="hover:text-cyan-400 transition-colors">Generator</a></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs tracking-widest text-slate-400 uppercase mb-3">Concepts</h4>
                    <ul className="space-y-1.5 text-xs font-medium text-slate-300">
                      <li><a href="#theory" className="hover:text-cyan-400 transition-colors">Derivations</a></li>
                      <li><a href="#parse-tree" className="hover:text-cyan-400 transition-colors">Parse Trees</a></li>
                      <li><a href="#ambiguity" className="hover:text-cyan-400 transition-colors">Ambiguity</a></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs tracking-widest text-slate-400 uppercase mb-3">Learn More</h4>
                    <ul className="space-y-1.5 text-xs font-medium text-slate-300">
                      <li><button onClick={() => {
                        setCurrentPage('chomsky');
                        setTimeout(() => scrollToId('chomsky-heading'), 100);
                      }} className="hover:text-cyan-400 transition-colors">Chomsky Hierarchy</button></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className="bg-[#05070a] border-t border-white/10 py-4 px-4 sm:px-6 text-slate-500 text-xs shrink-0">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
              <div className="flex items-center">
                <img src="/nsut-logo.jpg" alt="NSUT Logo" className="w-10 h-10 rounded-full object-cover" />
              </div>
              <div className="text-center">
                <p>&copy; {new Date().getFullYear()} Designed and Developed by Srishti Singh</p>
                <p className="text-[10px]">Roll No. 2024UCS1685</p>
              </div>
              <a href="mailto:srishti.singh_ug24@nsut.ac.in" className="flex items-center gap-1 hover:text-cyan-400 transition-colors break-all text-center sm:text-left">
                <Mail className="w-3 h-3 shrink-0" />
                srishti.singh_ug24@nsut.ac.in
              </a>
            </div>
          </footer>
        </section>
          </main>
      ) : (
        <ChomskyPage 
          onBack={() => {
            setCurrentPage('main');
            setTimeout(() => {
              scrollToId('chomsky-heading');
            }, 100);
          }} 
          activeChomskyIndex={activeChomskyIndex}
          setActiveChomskyIndex={setActiveChomskyIndex}
        />
      )}
    </div>
  );
}
