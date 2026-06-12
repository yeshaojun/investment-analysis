/**
 * Tests for AI compute chain components
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChainPositionCard } from '@/src/components/stock/ChainPositionCard';
import EventImpactAnalysis from '@/src/components/chain/EventImpactAnalysis';

// Mock the API calls
jest.mock('@/src/lib/chainApi', () => ({
  getStockChainPosition: jest.fn(),
  analyzeEventImpact: jest.fn(),
}));

import { getStockChainPosition, analyzeEventImpact } from '@/src/lib/chainApi';

describe('ChainPositionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', async () => {
    (getStockChainPosition as jest.Mock).mockResolvedValue({
      status: 'unmapped',
      message: '该公司不在AI计算链中',
      exposures: [],
    });
    
    render(<ChainPositionCard symbol="NVDA" />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('产业链定位')).toBeInTheDocument();
    });
  });

  it('renders unmapped company state', async () => {
    (getStockChainPosition as jest.Mock).mockResolvedValue({
      status: 'unmapped',
      message: '该公司不在AI计算链中',
      exposures: [],
    });
    
    render(<ChainPositionCard symbol="UNKNOWN" />);
    
    await waitFor(() => {
      expect(screen.getByText('该公司不在AI计算链中')).toBeInTheDocument();
    });
  });

  it('renders mapped company with exposures', async () => {
    (getStockChainPosition as jest.Mock).mockResolvedValue({
      status: 'mapped',
      company: {
        company_id: 'nvidia-china',
        symbol: 'NVDA',
        exchange: 'US',
        canonical_name: 'NVIDIA Corporation',
        aliases: ['英伟达'],
      },
      exposures: [
        {
          exposure_id: 'nvidia-gpu-design',
          node_id: 'gpu-design',
          role: 'GPU设计厂商',
          exposure_band: 'high',
          relationship_status: 'verified',
          evidence_tier: 'primary_fact',
          staleness_status: 'fresh',
          node: {
            node_id: 'gpu-design',
            name: 'GPU芯片设计',
            level: 'L1',
            tier: 'core',
          },
        },
      ],
      node_count: 1,
      chain_id: 'ai-compute',
      chain_context: {
        upstream_nodes: [],
        downstream_nodes: [],
        related_edges: [],
      },
    });
    
    render(<ChainPositionCard symbol="NVDA" />);
    
    await waitFor(() => {
      expect(screen.getAllByText('NVIDIA Corporation').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('GPU芯片设计').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('GPU设计厂商').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('does not contain prohibited recommendation language', async () => {
    (getStockChainPosition as jest.Mock).mockResolvedValue({
      status: 'mapped',
      company: {
        company_id: 'nvidia-china',
        symbol: 'NVDA',
        exchange: 'US',
        canonical_name: 'NVIDIA Corporation',
        aliases: [],
      },
      exposures: [],
      node_count: 0,
      chain_id: 'ai-compute',
      chain_context: {
        upstream_nodes: [],
        downstream_nodes: [],
        related_edges: [],
      },
    });
    
    render(<ChainPositionCard symbol="NVDA" />);
    
    await waitFor(() => {
      const text = screen.getByText('NVIDIA Corporation').textContent;
      expect(text).not.toMatch(/beneficiary|buy opportunity|recommended|target price|certain winner/i);
      expect(text).not.toMatch(/受益股|买入机会|推荐|目标价|确定赢家/);
    });
  });
});

describe('EventImpactAnalysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders input form', () => {
    render(<EventImpactAnalysis />);
    
    expect(screen.getByText('事件影响分析')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/输入AI计算相关事件/)).toBeInTheDocument();
    expect(screen.getByText('分析事件影响')).toBeInTheDocument();
  });

  it('validates required event text', async () => {
    render(<EventImpactAnalysis />);
    
    const submitButton = screen.getByText('分析事件影响');
    fireEvent.click(submitButton);
    
    // Button should be disabled when text is empty
    expect(submitButton).toBeDisabled();
  });

  it('submits event and shows classification', async () => {
    (analyzeEventImpact as jest.Mock).mockResolvedValue({
      classification: {
        event_type: 'capex_increase',
        confidence_band: 'high',
        matched_keyword: 'capital expenditure',
        method: 'keyword_match',
      },
      impact: {
        event_type: 'capex_increase',
        affected_nodes: [],
        impact_paths: [],
        affected_node_count: 0,
        rule_count: 1,
      },
      snapshot: {
        snapshot_id: 'test-snapshot-id',
        created_at: '2024-01-15T10:00:00',
        status: 'saved',
      },
    });
    
    render(<EventImpactAnalysis />);
    
    const textarea = screen.getByPlaceholderText(/输入AI计算相关事件/);
    fireEvent.change(textarea, { target: { value: '公司宣布增加资本开支' } });
    
    const submitButton = screen.getByText('分析事件影响');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('事件分类')).toBeInTheDocument();
      expect(screen.getByText('capex_increase')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
    });
  });

  it('shows manual required message for unsupported events', async () => {
    (analyzeEventImpact as jest.Mock).mockResolvedValue({
      classification: {
        event_type: 'manual_required',
        confidence_band: 'low',
        method: 'no_match',
      },
      impact: null,
      message: 'Event type requires manual classification',
    });
    
    render(<EventImpactAnalysis />);
    
    const textarea = screen.getByPlaceholderText(/输入AI计算相关事件/);
    fireEvent.change(textarea, { target: { value: '公司发布新的AI模型' } });
    
    const submitButton = screen.getByText('分析事件影响');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Event type requires manual classification/)).toBeInTheDocument();
    });
  });

  it('does not contain prohibited recommendation language', () => {
    render(<EventImpactAnalysis />);
    
    const text = screen.getByText('事件影响分析').textContent;
    expect(text).not.toMatch(/beneficiary|buy opportunity|recommended|target price|certain winner/i);
    expect(text).not.toMatch(/受益股|买入机会|推荐|目标价|确定赢家/);
  });
});