'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Skeleton } from '@/src/components/ui/skeleton';
import { getChainOverview } from '@/src/lib/chainApi';
import EventImpactAnalysis from '@/src/components/chain/EventImpactAnalysis';
import { KnowledgeGraph } from '@/src/components/chain/KnowledgeGraph';
import type { ChainOverview, ChainNode, CompanyWithExposure } from '@/src/types/chain';

export default function ChainPage() {
  const [chainData, setChainData] = useState<ChainOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChainData() {
      try {
        setLoading(true);
        const data = await getChainOverview();
        setChainData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chain data');
      } finally {
        setLoading(false);
      }
    }

    loadChainData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">AI计算链工作台</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">AI计算链工作台</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">加载失败: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!chainData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">AI计算链工作台</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500">暂无数据</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group nodes by level
  const l1Nodes = chainData.nodes.filter(node => node.level === 'L1');
  const l2Nodes = chainData.nodes.filter(node => node.level === 'L2');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI计算链工作台</h1>
        <p className="text-gray-600">
          探索AI计算产业链的节点、公司和关系
        </p>
      </div>

      {/* Chain Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{chainData.metadata.node_count}</div>
            <div className="text-sm text-gray-600">产业链节点</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{chainData.metadata.company_count}</div>
            <div className="text-sm text-gray-600">相关公司</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{chainData.metadata.edge_count}</div>
            <div className="text-sm text-gray-600">关系路径</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">AI计算</div>
            <div className="text-sm text-gray-600">产业链</div>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Graph */}
      <div className="mb-8">
        <KnowledgeGraph
          nodes={chainData.nodes}
          edges={chainData.edges}
        />
      </div>

      {/* L1 Nodes */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">L1 核心节点</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {l1Nodes.map(node => (
            <NodeCard key={node.node_id} node={node} />
          ))}
        </div>
      </div>

      {/* L2 Nodes */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">L2 细分节点</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {l2Nodes.map(node => (
            <NodeCard key={node.node_id} node={node} />
          ))}
        </div>
      </div>

      {/* Representative Companies */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">代表性公司</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chainData.companies.slice(0, 12).map(company => (
            <Card key={company.company_id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {company.symbol && company.symbol !== '未上市' ? (
                    <Link 
                      href={`/?symbol=${company.symbol}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {company.canonical_name}
                    </Link>
                  ) : (
                    company.canonical_name
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {company.symbol && company.symbol !== '未上市' ? (
                      <Link href={`/?symbol=${company.symbol}`}>
                        <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
                          {company.symbol}
                        </Badge>
                      </Link>
                    ) : (
                      <Badge variant="outline">{company.symbol}</Badge>
                    )}
                    <Badge variant="secondary">{company.exchange}</Badge>
                  </div>
                  {company.aliases.length > 0 && (
                    <div className="text-sm text-gray-600">
                      别名: {company.aliases.join(', ')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Event Impact Analysis */}
      <div>
        <h2 className="text-2xl font-bold mb-4">事件影响分析</h2>
        <EventImpactAnalysis />
      </div>
    </div>
  );
}

function NodeCard({ node }: { node: ChainNode }) {
  const getLevelBadgeColor = (level: string) => {
    return level === 'L1' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getTierBadgeColor = (tier?: string) => {
    switch (tier) {
      case 'core': return 'bg-red-100 text-red-800';
      case 'important': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const upstreamCount = node.upstream_node_ids?.length ?? 0;
  const downstreamCount = node.downstream_node_ids?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{node.name}</CardTitle>
          <div className="flex items-center gap-2">
            {node.tier && (
              <Badge className={getTierBadgeColor(node.tier)}>
                {node.tier === 'core' ? '核心' : node.tier === 'important' ? '重要' : '一般'}
              </Badge>
            )}
            <Badge className={getLevelBadgeColor(node.level)}>{node.level}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {node.description && (
          <p className="text-sm text-gray-600 mb-3">{node.description}</p>
        )}

        {/* Upstream/Downstream indicators */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
          {upstreamCount > 0 && (
            <span>⬆️ {upstreamCount} 个上游</span>
          )}
          {downstreamCount > 0 && (
            <span>⬇️ {downstreamCount} 个下游</span>
          )}
          {node.market_size && (
            <span>📊 {node.market_size}</span>
          )}
        </div>

        {/* Key technologies */}
        {node.key_technologies && node.key_technologies.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {node.key_technologies.slice(0, 3).map(tech => (
                <Badge key={tech} variant="outline" className="text-xs">{tech}</Badge>
              ))}
              {node.key_technologies.length > 3 && (
                <Badge variant="outline" className="text-xs">+{node.key_technologies.length - 3}</Badge>
              )}
            </div>
          </div>
        )}
        
        {node.representative_companies && node.representative_companies.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">代表性公司:</div>
            <div className="space-y-2">
              {node.representative_companies.slice(0, 3).map(company => (
                <CompanyRow key={company.company_id} company={company} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompanyRow({ company }: { company: CompanyWithExposure }) {
  const getExposureBadgeColor = (band?: string) => {
    switch (band) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Check if company has a valid stock symbol (not "未上市")
  const hasValidSymbol = company.symbol && company.symbol !== '未上市';

  return (
    <div className="flex items-center justify-between text-sm">
      <div>
        {hasValidSymbol ? (
          <Link 
            href={`/?symbol=${company.symbol}`}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {company.canonical_name}
          </Link>
        ) : (
          <span className="font-medium">{company.canonical_name}</span>
        )}
        {company.role && (
          <span className="text-gray-500 ml-2">({company.role})</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {company.exposure_band && (
          <Badge className={getExposureBadgeColor(company.exposure_band)}>
            {company.exposure_band}
          </Badge>
        )}
        {hasValidSymbol ? (
          <Link href={`/?symbol=${company.symbol}`}>
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
              {company.symbol}
            </Badge>
          </Link>
        ) : (
          <Badge variant="outline">{company.symbol}</Badge>
        )}
      </div>
    </div>
  );
}