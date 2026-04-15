import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { TreeNode } from '../utils/cfgParser';
import { Tooltip } from './Tooltip';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

export const ParseTreeViz = ({ data, compact = false }: { data: TreeNode, compact?: boolean }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<TreeNode | null>(null);
  const [hoveredNodePos, setHoveredNodePos] = useState({ x: 0, y: 0 });
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');

  const [containerSize, setContainerSize] = useState({ width: 800, height: 500 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const root = useMemo(() => d3.hierarchy(data), [data]);
  const allNodes = useMemo(() => root.descendants(), [root]);
  
  const internalNodes = useMemo(() => {
    const internals = allNodes.filter(n => n.children && n.children.length > 0);
    internals.sort((a, b) => {
      const aChild = a.children?.[0];
      const bChild = b.children?.[0];
      if (aChild && bChild) {
        return aChild.data.id - bChild.data.id;
      }
      return 0;
    });
    return internals;
  }, [allNodes]);

  const maxSteps = internalNodes.length;
  const [currentStep, setCurrentStep] = useState(maxSteps);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setCurrentStep(maxSteps);
    setIsPlaying(false);
  }, [maxSteps]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && currentStep < maxSteps) {
      timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 800);
    } else if (currentStep >= maxSteps) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, maxSteps]);

  const visibleNodesSet = useMemo(() => {
    const visible = new Set<d3.HierarchyPointNode<TreeNode>>();
    visible.add(root);
    for (let i = 0; i < currentStep; i++) {
      const parent = internalNodes[i];
      if (parent) {
        parent.children?.forEach(child => visible.add(child));
      }
    }
    return visible;
  }, [root, internalNodes, currentStep]);

  // Calculate current yield (output)
  const currentYield = useMemo(() => {
    const leaves: d3.HierarchyPointNode<TreeNode>[] = [];
    const traverse = (node: d3.HierarchyPointNode<TreeNode>) => {
      if (!visibleNodesSet.has(node)) return;
      const firstChild = node.children?.[0];
      if (!node.children || !firstChild || !visibleNodesSet.has(firstChild)) {
        leaves.push(node);
      } else {
        node.children.forEach(traverse);
      }
    };
    traverse(root as d3.HierarchyPointNode<TreeNode>);
    return leaves.map(l => l.data.name).filter(n => n !== 'ε').join('');
  }, [root, visibleNodesSet]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Calculate tree metrics
    const depth = root.height || 1;
    let maxBreadth = 0;
    const nodesByDepth: Record<number, number> = {};
    allNodes.forEach(n => {
      nodesByDepth[n.depth] = (nodesByDepth[n.depth] || 0) + 1;
      maxBreadth = Math.max(maxBreadth, nodesByDepth[n.depth]);
    });

    // Dynamic spacing and sizing
    const padding = 100;
    const availableHeight = containerSize.height - padding;
    const availableWidth = containerSize.width - padding;

    // Calculate vertical spacing to fill height, with reasonable caps
    const verticalSpacing = Math.min(250, Math.max(120, availableHeight / depth));
    
    // Calculate horizontal spacing to fill width, with reasonable caps
    const horizontalSpacing = Math.min(200, Math.max(110, availableWidth / (maxBreadth || 1)));

    // Node radius is proportional to the smaller spacing to maintain "chunkiness"
    const nodeRadius = Math.min(65, Math.max(24, Math.min(verticalSpacing, horizontalSpacing) * 0.3));
    
    const margin = { top: 30, right: 60, bottom: 30, left: 60 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Use nodeSize with dynamic spacing
    const treeLayout = d3.tree<TreeNode>().nodeSize([horizontalSpacing, verticalSpacing]);
    treeLayout(root);

    // Calculate the actual bounds of the tree
    let xMin = 0, xMax = 0, yMin = 0, yMax = 0;
    root.each(d => {
      if (d.x < xMin) xMin = d.x;
      if (d.x > xMax) xMax = d.x;
      if (d.y < yMin) yMin = d.y;
      if (d.y > yMax) yMax = d.y;
    });

    const svgWidth = (xMax - xMin) + margin.left + margin.right + (nodeRadius * 2);
    const svgHeight = (yMax - yMin) + margin.top + margin.bottom + (nodeRadius * 2);

    // Set width and height to 100% and use viewBox for auto-scaling
    // We also set a minimum viewBox to prevent extreme upscaling of single nodes
    const minViewBoxWidth = 400;
    const minViewBoxHeight = 300;
    const finalViewBoxWidth = Math.max(minViewBoxWidth, svgWidth);
    const finalViewBoxHeight = Math.max(minViewBoxHeight, svgHeight);

    svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `${xMin - (finalViewBoxWidth - (xMax - xMin)) / 2} ${yMin - margin.top - nodeRadius} ${finalViewBoxWidth} ${finalViewBoxHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g');

    const isDark = document.documentElement.classList.contains('dark');
    const strokeColor = isDark ? '#475569' : '#94a3b8';

    // Define arrowhead markers
    const defs = svg.append('defs');
    
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10) // Tip of the arrow
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 12)
      .attr('markerHeight', 12)
      .attr('xoverflow', 'visible')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', strokeColor);

    defs.append('marker')
      .attr('id', 'arrowhead-highlight')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10) // Tip of the arrow
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 12)
      .attr('markerHeight', 12)
      .attr('xoverflow', 'visible')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#38bdf8');

    // Links
    const visibleLinks = root.links().filter(l => visibleNodesSet.has(l.source) && visibleNodesSet.has(l.target));

    const link = g.selectAll('.link')
      .data(visibleLinks)
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', 2) 
      .attr('marker-end', 'url(#arrowhead)')
      .attr('d', (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;
        
        const ux = dx / dist;
        const uy = dy / dist;
        
        // Shorten path to node boundary
        const targetX = d.target.x - ux * nodeRadius;
        const targetY = d.target.y - uy * nodeRadius;
        
        return `M${d.source.x},${d.source.y} L${targetX},${targetY}`;
      })
      .attr('opacity', 0)
      .transition()
      .duration(300)
      .attr('opacity', 1);

    // Nodes
    const visibleNodesData = allNodes.filter(n => visibleNodesSet.has(n));

    const node = g.selectAll('.node')
      .data(visibleNodesData)
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d: any) => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        hoverTimeout.current = setTimeout(() => {
          setHoveredNode(d.data);
          
          const containerRect = containerRef.current?.getBoundingClientRect();
          if (containerRect) {
            setHoveredNodePos({ 
              x: event.clientX - containerRect.left, 
              y: event.clientY - containerRect.top 
            });
          }
          
          // Highlight edges
          g.selectAll('.link')
              .attr('stroke', (l: any) => (l.source === d ? '#38bdf8' : strokeColor))
              .attr('stroke-width', (l: any) => (l.source === d ? 4 : 2))
              .attr('marker-end', (l: any) => (l.source === d ? 'url(#arrowhead-highlight)' : 'url(#arrowhead)'));
        }, 200);
      })
      .on('mouseout', () => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        setHoveredNode(null);
        g.selectAll('.link')
          .attr('stroke', strokeColor)
          .attr('stroke-width', 2)
          .attr('marker-end', 'url(#arrowhead)');
      });

    node.attr('opacity', 0)
      .transition()
      .duration(300)
      .attr('opacity', 1);

    const getFillColor = (d: any) => {
      if (d.children) return '#3A7BD5'; // Non-terminal (calm blue)
      return '#E6C15A'; // Terminal (muted amber)
    };

    const getTextColor = (d: any) => {
      if (d.children) return '#EAF2FF'; // Non-terminal text
      return '#1A1A1A'; // Terminal text
    };

    node.selectAll('circle').remove();
    node.append('circle')
      .attr('r', nodeRadius) 
      .attr('fill', getFillColor)
      .attr('stroke', 'none');

    node.selectAll('text').remove();
    node.append('text')
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', getTextColor)
      .attr('font-size', `${Math.floor(nodeRadius * 0.8)}px`) 
      .attr('font-weight', '700')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace') 
      .text((d: any) => d.data.name);

  }, [data, theme, currentStep, allNodes, root, containerSize]);

  return (
    <div className="flex flex-col gap-1.5 h-full overflow-hidden">
      <div className="text-left shrink-0">
        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-500">
          USE THE PLAYER BELOW TO VIEW STEP BY STEP CONSTRUCTION
        </span>
      </div>
      <div className="flex flex-row items-center justify-between gap-2 bg-black/20 p-1.5 rounded-xl border border-white/5 shrink-0 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={() => { setIsPlaying(false); setCurrentStep(0); }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            title="Reset"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => {
              if (currentStep >= maxSteps) setCurrentStep(0);
              setIsPlaying(!isPlaying);
            }}
            className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button 
            onClick={() => { setIsPlaying(false); setCurrentStep(Math.min(maxSteps, currentStep + 1)); }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            title="Next Step"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <div className="flex-1 min-w-[80px] px-2">
          <input 
            type="range" 
            min="0" 
            max={maxSteps} 
            value={currentStep}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStep(parseInt(e.target.value));
            }}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>
        
        <div className="text-[10px] font-mono text-slate-400 whitespace-nowrap shrink-0">
          {currentStep}/{maxSteps}
        </div>

        {compact && (
          <div className="flex items-center gap-2 border-l border-white/10 pl-3 shrink-0 max-w-[140px] sm:max-w-[180px] justify-end overflow-hidden">
            <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold whitespace-nowrap">Out:</span>
            <span className="font-mono text-sm text-cyan-400 font-bold tracking-wider truncate">{currentYield || 'ε'}</span>
          </div>
        )}
      </div>

      {!compact && (
        <div className="bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 flex flex-row items-center justify-between gap-4 shrink-0">
          <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold whitespace-nowrap shrink-0">Current Output:</div>
          <div className="font-mono text-sm text-white tracking-wider break-all text-right flex-1 min-w-0">
            {currentYield || 'ε'}
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full flex-1 overflow-hidden rounded-2xl glass-card relative flex justify-center items-center pt-0 pb-0">
        <svg ref={svgRef} className="w-full h-full block" />
        
        {hoveredNode && (
          <Tooltip node={hoveredNode} position={hoveredNodePos} />
        )}
      </div>
    </div>
  );
};
