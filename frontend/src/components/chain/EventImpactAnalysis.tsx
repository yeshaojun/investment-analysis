'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Textarea } from '@/src/components/ui/textarea';
import { Input } from '@/src/components/ui/input';
import { analyzeEventImpact } from '@/src/lib/chainApi';
import type { AnalyzeEventImpactResponse, EventClassification, EventImpactAnalysis } from '@/src/types/chain';

export default function EventImpactAnalysis() {
  const [eventText, setEventText] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeEventImpactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!eventText.trim()) {
      setError('请输入事件描述');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await analyzeEventImpact({
        event_text: eventText,
        event_date: eventDate || undefined,
      });
      
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>事件影响分析</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">事件描述</label>
            <Textarea
              placeholder="输入AI计算相关事件，例如：NVIDIA宣布增加资本开支用于AI服务器采购"
              value={eventText}
              onChange={(e) => setEventText(e.target.value)}
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">事件日期 (可选)</label>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !eventText.trim()}
            className="w-full"
          >
            {loading ? '分析中...' : '分析事件影响'}
          </Button>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Classification */}
          <ClassificationCard classification={result.classification} />
          
          {/* Impact Analysis */}
          {result.impact && (
            <ImpactAnalysisCard impact={result.impact} />
          )}
          
          {/* Manual Required */}
          {result.message && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-600">
                  <p className="mb-2">⚠️ {result.message}</p>
                  <p className="text-sm">该事件类型需要人工分类</p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Snapshot Info */}
          {result.snapshot && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600">
                  <p>快照已保存: {result.snapshot.snapshot_id}</p>
                  <p>创建时间: {new Date(result.snapshot.created_at).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ClassificationCard({ classification }: { classification: EventClassification }) {
  const getConfidenceBadgeColor = (band: string) => {
    switch (band) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">事件分类</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">事件类型:</span>
            <Badge variant="outline">{classification.event_type}</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">置信度:</span>
            <Badge className={getConfidenceBadgeColor(classification.confidence_band)}>
              {classification.confidence_band}
            </Badge>
          </div>
          
          {classification.matched_keyword && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">匹配关键词:</span>
              <span className="text-sm font-medium">{classification.matched_keyword}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">分类方法:</span>
            <span className="text-sm">{classification.method}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ImpactAnalysisCard({ impact }: { impact: EventImpactAnalysis }) {
  const getImpactDirectionColor = (direction: string) => {
    switch (direction) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      case 'mixed': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getImpactDirectionLabel = (direction: string) => {
    switch (direction) {
      case 'positive': return '正面影响';
      case 'negative': return '负面影响';
      case 'mixed': return '混合影响';
      default: return '未知影响';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">影响分析</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold">{impact.affected_node_count}</div>
            <div className="text-sm text-gray-600">受影响节点</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold">{impact.rule_count}</div>
            <div className="text-sm text-gray-600">匹配规则</div>
          </div>
        </div>

        {/* Impact Paths */}
        {impact.impact_paths.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3">影响路径</h3>
            <div className="space-y-3">
              {impact.impact_paths.map((path, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{path.rule_id}</Badge>
                    <span className={`text-sm font-medium ${getImpactDirectionColor(path.impact_direction)}`}>
                      {getImpactDirectionLabel(path.impact_direction)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">影响级别: </span>
                      <span>{path.impact_level}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">强度: </span>
                      <span>{path.strength_band}</span>
                    </div>
                    {path.time_lag_days && (
                      <div>
                        <span className="text-gray-600">时间滞后: </span>
                        <span>{path.time_lag_days}天</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">置信度: </span>
                      <span>{path.confidence_band}</span>
                    </div>
                  </div>
                  
                  {path.rationale && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">理由: </span>
                      {path.rationale}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Affected Nodes */}
        {impact.affected_nodes.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3">受影响节点</h3>
            <div className="space-y-3">
              {impact.affected_nodes.map(node => (
                <div key={node.node_id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{node.name}</span>
                    <Badge variant="outline">{node.level}</Badge>
                  </div>
                  
                  {node.description && (
                    <p className="text-sm text-gray-600 mb-2">{node.description}</p>
                  )}
                  
                  {node.representative_companies && node.representative_companies.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">相关公司:</div>
                      <div className="flex flex-wrap gap-2">
                        {node.representative_companies.slice(0, 5).map(company => (
                          <Badge key={company.company_id} variant="secondary" className="text-xs">
                            {company.canonical_name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}