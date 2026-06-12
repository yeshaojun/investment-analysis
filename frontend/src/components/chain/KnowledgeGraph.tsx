'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import type { ChainNode, ChainEdge } from '@/src/types/chain';

interface KnowledgeGraphProps {
  nodes: ChainNode[];
  edges: ChainEdge[];
  onNodeClick?: (node: ChainNode) => void;
}

interface NodePosition {
  node: ChainNode;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface KnowledgeGraphProps {
  nodes: ChainNode[];
  edges: ChainEdge[];
  onNodeClick?: (_node: ChainNode) => void;
}

export function KnowledgeGraph({ nodes, edges, onNodeClick }: KnowledgeGraphProps) {
  const [selectedNode, setSelectedNode] = useState<ChainNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodePositions = useMemo(() => {
    const positions: NodePosition[] = [];
    const nodeWidth = 140;
    const nodeHeight = 60;
    const gapX = 60;
    const gapY = 40;

    // Group nodes by level and tier
    const l1Core = nodes.filter(n => n.level === 'L1' && n.tier === 'core');
    const l1Important = nodes.filter(n => n.level === 'L1' && n.tier === 'important');
    const l2Core = nodes.filter(n => n.level === 'L2' && n.tier === 'core');
    const l2Important = nodes.filter(n => n.level === 'L2' && n.tier === 'important');

    // Layout: left to right flow
    // Column 0: Upstream L1 (no upstream nodes) - chip design, optical, PCB, cooling, power
    // Column 1: Mid L1 (manufacturing) + L2 specializations
    // Column 2: Server systems (hub)
    // Column 3: Downstream (IDC, Cloud)

    const col0 = [...l1Core.filter(n => n.node_id === 'gpu-design'), ...l1Important];
    const col1 = [...l1Core.filter(n => n.node_id === 'gpu-manufacturing'), ...l2Important];
    const col2 = [...l1Core.filter(n => n.node_id === 'server-systems'), ...l2Core.filter(n => n.node_id === 'ai-server')];
    const col3 = [...l1Core.filter(n => n.node_id === 'idc'), ...l2Core.filter(n => n.node_id === 'cloud-idc')];

    const columns = [col0, col1, col2, col3];
    const startX = 40;
    const startY = 30;

    columns.forEach((col, colIdx) => {
      col.forEach((node, rowIdx) => {
        positions.push({
          node,
          x: startX + colIdx * (nodeWidth + gapX),
          y: startY + rowIdx * (nodeHeight + gapY),
          width: nodeWidth,
          height: nodeHeight,
        });
      });
    });

    return positions;
  }, [nodes]);

  const positionMap = useMemo(() => {
    const map = new Map<string, NodePosition>();
    nodePositions.forEach(p => map.set(p.node.node_id, p));
    return map;
  }, [nodePositions]);

  const svgWidth = 800;
  const svgHeight = Math.max(...nodePositions.map(p => p.y + p.height), 300) + 60;

  const getEdgeColor = (edge: ChainEdge) => {
    if (edge.layer === 'core') return '#3b82f6';
    if (edge.layer === 'important') return '#8b5cf6';
    return '#94a3b8';
  };

  const getNodeColor = (node: ChainNode) => {
    if (node.tier === 'core') return { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' };
    if (node.tier === 'important') return { bg: '#f5f3ff', border: '#8b5cf6', text: '#5b21b6' };
    return { bg: '#f8fafc', border: '#94a3b8', text: '#475569' };
  };

  const isNodeHighlighted = (nodeId: string) => {
    if (!hoveredNode) return false;
    if (nodeId === hoveredNode) return true;
    return edges.some(e =>
      (e.source_node_id === hoveredNode && e.target_node_id === nodeId) ||
      (e.target_node_id === hoveredNode && e.source_node_id === nodeId)
    );
  };

  const isEdgeHighlighted = (edge: ChainEdge) => {
    if (!hoveredNode) return false;
    return edge.source_node_id === hoveredNode || edge.target_node_id === hoveredNode;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">产业链知识图谱</CardTitle>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-100 border border-blue-500"></span>
              核心节点
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-purple-100 border border-purple-500"></span>
              重要节点
            </span>
            <span className="flex items-center gap-1">
              <span className="w-8 h-0.5 bg-blue-500"></span>
              核心链路
            </span>
            <span className="flex items-center gap-1">
              <span className="w-8 h-0.5 bg-purple-500"></span>
              重要链路
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} className="min-w-[700px]">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
            </marker>
            <marker id="arrowhead-highlighted" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map(edge => {
            const sourcePos = positionMap.get(edge.source_node_id);
            const targetPos = positionMap.get(edge.target_node_id);
            if (!sourcePos || !targetPos) return null;

            const highlighted = isEdgeHighlighted(edge);
            const color = highlighted ? '#3b82f6' : getEdgeColor(edge);
            const strokeWidth = edge.layer === 'core' ? 2.5 : edge.layer === 'important' ? 2 : 1.5;
            const opacity = hoveredNode && !highlighted ? 0.2 : 1;

            const x1 = sourcePos.x + sourcePos.width / 2;
            const y1 = sourcePos.y + sourcePos.height;
            const x2 = targetPos.x + targetPos.width / 2;
            const y2 = targetPos.y;

            return (
              <g key={edge.edge_id} opacity={opacity}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={edge.layer !== 'core' ? '4,2' : undefined}
                  markerEnd={highlighted ? 'url(#arrowhead-highlighted)' : 'url(#arrowhead)'}
                  style={{ transition: 'opacity 0.2s' }}
                />
                {/* Value chain label */}
                {edge.value_chain_position && highlighted && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#64748b"
                    className="pointer-events-none"
                  >
                    {edge.value_chain_position}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodePositions.map(({ node, x, y, width, height }) => {
            const colors = getNodeColor(node);
            const highlighted = isNodeHighlighted(node.node_id);
            const selected = selectedNode?.node_id === node.node_id;
            const opacity = hoveredNode && !highlighted ? 0.3 : 1;

            return (
              <g
                key={node.node_id}
                opacity={opacity}
                style={{ transition: 'opacity 0.2s' }}
                onMouseEnter={() => setHoveredNode(node.node_id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => {
                  setSelectedNode(selected ? null : node);
                  onNodeClick?.(node);
                }}
                className="cursor-pointer"
              >
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  rx={8}
                  fill={selected ? colors.border : colors.bg}
                  stroke={selected ? '#1e40af' : colors.border}
                  strokeWidth={highlighted ? 2.5 : selected ? 2 : 1.5}
                />
                <text
                  x={x + width / 2}
                  y={y + height / 2 - 4}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill={selected ? '#ffffff' : colors.text}
                >
                  {node.name.length > 8 ? node.name.slice(0, 8) + '…' : node.name}
                </text>
                <text
                  x={x + width / 2}
                  y={y + height / 2 + 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill={selected ? '#e0e7ff' : '#94a3b8'}
                >
                  {node.level} · {node.tier === 'core' ? '核心' : node.tier === 'important' ? '重要' : '一般'}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Node Detail */}
        {selectedNode && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">{selectedNode.name}</h3>
              <Badge variant={selectedNode.tier === 'core' ? 'default' : 'secondary'}>
                {selectedNode.tier === 'core' ? '核心节点' : selectedNode.tier === 'important' ? '重要节点' : '一般节点'}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-3">{selectedNode.description}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              {selectedNode.market_size && (
                <div>
                  <span className="text-gray-500">市场规模</span>
                  <p className="font-medium">{selectedNode.market_size}</p>
                </div>
              )}
              {selectedNode.concentration && (
                <div>
                  <span className="text-gray-500">集中度</span>
                  <p className="font-medium">{selectedNode.concentration}</p>
                </div>
              )}
            </div>

            {selectedNode.key_technologies && selectedNode.key_technologies.length > 0 && (
              <div className="mb-4">
                <span className="text-sm text-gray-500 mb-2 block">关键技术</span>
                <div className="flex flex-wrap gap-2">
                  {selectedNode.key_technologies.map(tech => (
                    <Badge key={tech} variant="outline" className="text-xs">{tech}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Upstream */}
              <div>
                <span className="text-sm text-gray-500 mb-2 block">⬆️ 上游（供应方）</span>
                {selectedNode.upstream_node_ids && selectedNode.upstream_node_ids.length > 0 ? (
                  <div className="space-y-1">
                    {selectedNode.upstream_node_ids.map(id => {
                      const upstreamNode = nodes.find(n => n.node_id === id);
                      return upstreamNode ? (
                        <div key={id} className="text-sm bg-white p-2 rounded border">
                          <span className="font-medium">{upstreamNode.name}</span>
                          <span className="text-gray-400 ml-2">{upstreamNode.level}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">产业链最上游</p>
                )}
              </div>

              {/* Downstream */}
              <div>
                <span className="text-sm text-gray-500 mb-2 block">⬇️ 下游（需求方）</span>
                {selectedNode.downstream_node_ids && selectedNode.downstream_node_ids.length > 0 ? (
                  <div className="space-y-1">
                    {selectedNode.downstream_node_ids.map(id => {
                      const downstreamNode = nodes.find(n => n.node_id === id);
                      return downstreamNode ? (
                        <div key={id} className="text-sm bg-white p-2 rounded border">
                          <span className="font-medium">{downstreamNode.name}</span>
                          <span className="text-gray-400 ml-2">{downstreamNode.level}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">产业链最下游</p>
                )}
              </div>
            </div>

            {/* Associated Companies */}
            {selectedNode.representative_companies && selectedNode.representative_companies.length > 0 && (
              <div className="mt-4">
                <span className="text-sm text-gray-500 mb-2 block">🏢 关联公司</span>
                <div className="flex flex-wrap gap-2">
                  {selectedNode.representative_companies.map(company => (
                    <Badge key={company.company_id} variant="secondary" className="text-xs">
                      {company.canonical_name}
                      {company.exposure_band && ` (${company.exposure_band})`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}