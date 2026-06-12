'use client';

import { useState, useMemo, useCallback } from 'react';
import type { ChainNode, ChainContextNode, ChainContextEdge } from '@/src/types/chain';

interface GraphNode {
  id: string;
  name: string;
  level: string;
  tier: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isCurrent?: boolean;
  companies?: { name: string; band?: string }[];
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  layer: string;
}

interface CompanyKnowledgeGraphProps {
  currentNode: ChainNode;
  upstreamNodes: ChainContextNode[];
  downstreamNodes: ChainContextNode[];
  edges: ChainContextEdge[];
  exposureBand?: string;
  role?: string;
}

export function CompanyKnowledgeGraph({
  currentNode,
  upstreamNodes,
  downstreamNodes,
  edges,
  exposureBand,
  role,
}: CompanyKnowledgeGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const { graphNodes, graphEdges } = useMemo(() => {
    const nodeW = 130;
    const nodeH = 52;
    const gapX = 50;
    const gapY = 16;
    const startX = 30;
    const startY = 20;

    const nodes: GraphNode[] = [];
    const edgeList: GraphEdge[] = [];

    // Layout: upstream (left) → current (center) → downstream (right)
    const maxUpstream = Math.max(upstreamNodes.length, 1);
    const maxDownstream = Math.max(downstreamNodes.length, 1);

    // Upstream column
    const upStartY = startY;
    upstreamNodes.forEach((n, i) => {
      nodes.push({
        id: n.node_id,
        name: n.name,
        level: n.level,
        tier: n.tier,
        x: startX,
        y: upStartY + i * (nodeH + gapY),
        width: nodeW,
        height: nodeH,
        companies: n.companies?.slice(0, 3).map(c => ({ name: c.canonical_name, band: c.exposure_band })),
      });
    });

    // Current node (center)
    const currentX = startX + nodeW + gapX;
    const currentY = upStartY + (maxUpstream * (nodeH + gapY)) / 2 - nodeH / 2;
    nodes.push({
      id: currentNode.node_id,
      name: currentNode.name,
      level: currentNode.level,
      tier: currentNode.tier || 'general',
      x: currentX,
      y: currentY,
      width: nodeW + 20,
      height: nodeH + 12,
      isCurrent: true,
    });

    // Downstream column
    const downX = currentX + nodeW + 20 + gapX;
    const downStartY = startY;
    downstreamNodes.forEach((n, i) => {
      nodes.push({
        id: n.node_id,
        name: n.name,
        level: n.level,
        tier: n.tier,
        x: downX,
        y: downStartY + i * (nodeH + gapY),
        width: nodeW,
        height: nodeH,
        companies: n.companies?.slice(0, 3).map(c => ({ name: c.canonical_name, band: c.exposure_band })),
      });
    });

    // Build edges
    const allNodeIds = new Set([
      ...upstreamNodes.map(n => n.node_id),
      currentNode.node_id,
      ...downstreamNodes.map(n => n.node_id),
    ]);

    edges.forEach(e => {
      if (allNodeIds.has(e.source_node_id) && allNodeIds.has(e.target_node_id)) {
        edgeList.push({
          id: e.edge_id,
          source: e.source_node_id,
          target: e.target_node_id,
          label: e.value_chain_position || e.relationship_type,
          layer: e.layer,
        });
      }
    });

    // If no edges found, create implicit edges
    if (edgeList.length === 0) {
      upstreamNodes.forEach(n => {
        edgeList.push({
          id: `implicit-${n.node_id}-${currentNode.node_id}`,
          source: n.node_id,
          target: currentNode.node_id,
          label: '',
          layer: 'important',
        });
      });
      downstreamNodes.forEach(n => {
        edgeList.push({
          id: `implicit-${currentNode.node_id}-${n.node_id}`,
          source: currentNode.node_id,
          target: n.node_id,
          label: '',
          layer: 'important',
        });
      });
    }

    return { graphNodes: nodes, graphEdges: edgeList };
  }, [currentNode, upstreamNodes, downstreamNodes, edges]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    graphNodes.forEach(n => map.set(n.id, n));
    return map;
  }, [graphNodes]);

  const svgWidth = Math.max(...graphNodes.map(n => n.x + n.width), 400) + 40;
  const svgHeight = Math.max(...graphNodes.map(n => n.y + n.height), 200) + 40;

  const getNodeColor = useCallback((node: GraphNode) => {
    if (node.isCurrent) return { bg: '#2563eb', border: '#1d4ed8', text: '#ffffff' };
    if (node.tier === 'core') return { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' };
    if (node.tier === 'important') return { bg: '#f5f3ff', border: '#8b5cf6', text: '#5b21b6' };
    return { bg: '#f8fafc', border: '#94a3b8', text: '#475569' };
  }, []);

  const isHighlighted = useCallback((nodeId: string) => {
    if (!hoveredNode) return true;
    if (nodeId === hoveredNode) return true;
    return graphEdges.some(e =>
      (e.source === hoveredNode && e.target === nodeId) ||
      (e.target === hoveredNode && e.source === nodeId)
    );
  }, [hoveredNode, graphEdges]);

  const isEdgeHighlighted = useCallback((edge: GraphEdge) => {
    if (!hoveredNode) return true;
    return edge.source === hoveredNode || edge.target === hoveredNode;
  }, [hoveredNode]);

  return (
    <div className="relative">
      <svg width={svgWidth} height={svgHeight} className="w-full">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
          </marker>
          <marker id="arrow-hl" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
          </marker>
        </defs>

        {/* Edges */}
        {graphEdges.map(edge => {
          const src = nodeMap.get(edge.source);
          const tgt = nodeMap.get(edge.target);
          if (!src || !tgt) return null;

          const highlighted = isEdgeHighlighted(edge);
          const opacity = hoveredNode ? (highlighted ? 1 : 0.15) : 0.7;
          const color = highlighted ? '#3b82f6' : edge.layer === 'core' ? '#3b82f6' : '#94a3b8';
          const strokeW = edge.layer === 'core' ? 2.5 : 1.5;

          const x1 = src.x + src.width;
          const y1 = src.y + src.height / 2;
          const x2 = tgt.x;
          const y2 = tgt.y + tgt.height / 2;

          // Curved path
          const midX = (x1 + x2) / 2;
          const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

          return (
            <g key={edge.id} opacity={opacity}>
              <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={strokeW}
                markerEnd={highlighted ? 'url(#arrow-hl)' : 'url(#arrow)'}
              />
              {edge.label && highlighted && (
                <text x={midX} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize="9" fill="#64748b">
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {graphNodes.map(node => {
          const colors = getNodeColor(node);
          const hl = isHighlighted(node.id);
          const opacity = hoveredNode ? (hl ? 1 : 0.2) : 1;
          const selected = selectedNode === node.id;

          return (
            <g
              key={node.id}
              opacity={opacity}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => setSelectedNode(selected ? null : node.id)}
              className="cursor-pointer"
            >
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx={8}
                fill={selected ? colors.border : colors.bg}
                stroke={selected ? '#1e40af' : colors.border}
                strokeWidth={hl ? 2 : 1.5}
              />
              <text
                x={node.x + node.width / 2}
                y={node.y + node.height / 2 - (node.companies && node.companies.length > 0 ? 4 : 0)}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill={selected ? '#ffffff' : colors.text}
              >
                {node.name.length > 7 ? node.name.slice(0, 7) + '…' : node.name}
              </text>
              {!node.isCurrent && (
                <text
                  x={node.x + node.width / 2}
                  y={node.y + node.height / 2 + 10}
                  textAnchor="middle"
                  fontSize="9"
                  fill={selected ? '#e0e7ff' : '#94a3b8'}
                >
                  {node.level}
                </text>
              )}
              {node.isCurrent && (
                <text
                  x={node.x + node.width / 2}
                  y={node.y + node.height / 2 + 12}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#bfdbfe"
                >
                  ← 当前
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mt-2">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-600"></span> 当前节点
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-100 border border-blue-500"></span> 核心
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-100 border border-purple-500"></span> 重要
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-100 border border-gray-400"></span> 一般
        </span>
      </div>
    </div>
  );
}
