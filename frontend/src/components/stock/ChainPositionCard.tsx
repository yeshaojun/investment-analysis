'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Skeleton } from '@/src/components/ui/skeleton';
import { getStockChainPosition } from '@/src/lib/chainApi';
import { CompanyKnowledgeGraph } from '@/src/components/chain/CompanyKnowledgeGraph';
import type { CompanyChainPosition, CompanyNodeExposure, ChainContextNode } from '@/src/types/chain';

interface ChainPositionCardProps {
  symbol: string;
}

export function ChainPositionCard({ symbol }: ChainPositionCardProps) {
  const [position, setPosition] = useState<CompanyChainPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChainPosition() {
      try {
        setLoading(true);
        const data = await getStockChainPosition(symbol);
        setPosition(data);
      } catch (err) {
        if (err instanceof Error && err.message.includes('404')) {
          setPosition({
            status: 'unmapped',
            message: '该公司不在AI计算链中',
            exposures: [],
          });
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load chain position');
        }
      } finally {
        setLoading(false);
      }
    }

    loadChainPosition();
  }, [symbol]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-500">加载失败: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!position || position.status === 'unmapped') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">产业链定位</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600">{position?.message || '该公司不在AI计算链中'}</p>
            <p className="text-sm text-gray-500 mt-1">该股票可能不涉及AI计算产业链</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const mainExposure = position.exposures[0];
  const mainNode = mainExposure?.node;
  const context = position.chain_context;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">产业链定位</CardTitle>
              {mainNode?.tier && (
                <Badge variant={mainNode.tier === 'core' ? 'default' : 'secondary'}>
                  {mainNode.tier === 'core' ? '核心环节' : mainNode.tier === 'important' ? '重要环节' : '一般环节'}
                </Badge>
              )}
            </div>
            <Badge variant="outline">{position.chain_id}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-3">
            <span className="font-semibold">{position.company?.canonical_name}</span>
            <Badge variant="secondary">{position.company?.symbol}</Badge>
            {mainExposure?.role && (
              <span className="text-sm text-gray-500">{mainExposure.role}</span>
            )}
          </div>

          {/* Node info */}
          {mainNode && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {mainNode.market_size && (
                <div className="p-2 bg-gray-50 rounded">
                  <span className="text-gray-500 text-xs">市场规模</span>
                  <p className="font-medium">{mainNode.market_size}</p>
                </div>
              )}
              {mainNode.concentration && (
                <div className="p-2 bg-gray-50 rounded">
                  <span className="text-gray-500 text-xs">集中度</span>
                  <p className="font-medium text-xs">{mainNode.concentration}</p>
                </div>
              )}
              {mainExposure?.exposure_band && (
                <div className="p-2 bg-gray-50 rounded">
                  <span className="text-gray-500 text-xs">曝光度</span>
                  <p className="font-medium">{mainExposure.exposure_band}</p>
                </div>
              )}
              {mainExposure?.business_scope && (
                <div className="p-2 bg-gray-50 rounded">
                  <span className="text-gray-500 text-xs">业务范围</span>
                  <p className="font-medium text-xs">{mainExposure.business_scope}</p>
                </div>
              )}
            </div>
          )}

          {/* Key technologies */}
          {mainNode?.key_technologies && mainNode.key_technologies.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-1">
                {mainNode.key_technologies.map(tech => (
                  <Badge key={tech} variant="outline" className="text-xs">{tech}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Knowledge Graph */}
      {mainNode && context && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">产业链知识图谱</CardTitle>
          </CardHeader>
          <CardContent>
            <CompanyKnowledgeGraph
              currentNode={mainNode}
              upstreamNodes={context.upstream_nodes}
              downstreamNodes={context.downstream_nodes}
              edges={context.related_edges}
              exposureBand={mainExposure?.exposure_band}
              role={mainExposure?.role}
            />
          </CardContent>
        </Card>
      )}

      {/* Upstream Companies Detail */}
      {context?.upstream_nodes && context.upstream_nodes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">⬆️ 上游供应链</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {context.upstream_nodes.map(node => (
                <UpstreamNodeDetail key={node.node_id} node={node} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Downstream Companies Detail */}
      {context?.downstream_nodes && context.downstream_nodes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">⬇️ 下游需求方</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {context.downstream_nodes.map(node => (
                <DownstreamNodeDetail key={node.node_id} node={node} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UpstreamNodeDetail({ node }: { node: ChainContextNode }) {
  return (
    <div className="p-3 border rounded-lg bg-purple-50/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{node.name}</span>
          <Badge variant="outline" className="text-xs">{node.level}</Badge>
          {node.tier === 'core' && <Badge className="text-xs bg-blue-100 text-blue-800">核心</Badge>}
        </div>
      </div>
      {node.description && (
        <p className="text-xs text-gray-600 mb-2">{node.description}</p>
      )}
      {node.companies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {node.companies.map(company => (
            <div key={company.company_id} className="text-xs bg-white px-2 py-1 rounded border">
              <span className="font-medium">{company.canonical_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DownstreamNodeDetail({ node }: { node: ChainContextNode }) {
  return (
    <div className="p-3 border rounded-lg bg-blue-50/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{node.name}</span>
          <Badge variant="outline" className="text-xs">{node.level}</Badge>
          {node.tier === 'core' && <Badge className="text-xs bg-blue-100 text-blue-800">核心</Badge>}
        </div>
      </div>
      {node.description && (
        <p className="text-xs text-gray-600 mb-2">{node.description}</p>
      )}
      {node.companies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {node.companies.map(company => (
            <div key={company.company_id} className="text-xs bg-white px-2 py-1 rounded border">
              <span className="font-medium">{company.canonical_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
