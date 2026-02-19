import os
import httpx
import json
import asyncio
import logging
from typing import Dict, List, Optional
from dotenv import load_dotenv
from bs4 import BeautifulSoup

load_dotenv()

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.deepseek_api_key = os.getenv('deepseek')
        self.qwen_api_key = os.getenv('qw')
        self.deepseek_base_url = os.getenv('deepseek_base_url', 'https://api.deepseek.com')
        self.qwen_base_url = os.getenv('qw_base_url', 'https://dashscope.aliyuncs.com/compatible-mode/v1')
        self.timeout = 60.0
        
    async def search_web(self, query: str, max_results: int = 5) -> List[Dict]:
        """通过搜索引擎搜索网页"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(
                    "https://www.baidu.com/s",
                    params={"wd": query, "rn": max_results},
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                    }
                )
                response.encoding = 'utf-8'
                
            soup = BeautifulSoup(response.text, 'html.parser')
            results = []
            
            for item in soup.select('.result')[:max_results]:
                title_elem = item.select_one('h3 a')
                snippet_elem = item.select_one('.c-abstract') or item.select_one('.c-span9')
                
                if title_elem:
                    results.append({
                        'title': title_elem.get_text(strip=True),
                        'link': title_elem.get('href', ''),
                        'snippet': snippet_elem.get_text(strip=True) if snippet_elem else ''
                    })
            
            if not results:
                results.append({
                    'title': f'{query} 相关信息',
                    'link': '',
                    'snippet': f'关于 {query} 的搜索结果'
                })
            
            return results
        except Exception as e:
            logger.error(f"搜索失败: {e}")
            return [{'title': query, 'link': '', 'snippet': ''}]
    
    async def fetch_page_content(self, url: str) -> str:
        """获取网页内容"""
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(
                    url,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    }
                )
                text = response.text
                
            soup = BeautifulSoup(text, 'html.parser')
            
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
            
            content_text = soup.get_text(separator='\n', strip=True)
            lines = [line.strip() for line in content_text.splitlines() if line.strip()]
            content = '\n'.join(lines[:200])
            
            return content
        except Exception as e:
            logger.error(f"获取网页内容失败 {url}: {e}")
            return ""
    
    async def search_and_collect(self, query: str, max_pages: int = 3) -> str:
        """搜索并收集网页内容"""
        try:
            search_results = await self.search_web(query, max_results=max_pages)
            
            all_content = []
            for result in search_results:
                if result.get('link'):
                    content = await self.fetch_page_content(result['link'])
                    if content:
                        all_content.append(f"【来源: {result['title']}】\n{content[:2000]}")
                elif result.get('snippet'):
                    all_content.append(f"【{result['title']}】\n{result['snippet']}")
            
            if not all_content:
                return f"关于「{query}」的搜索结果，请根据您的专业知识进行分析。"
            
            return "\n\n".join(all_content)
        except Exception as e:
            logger.error(f"搜索收集失败: {e}")
            return f"关于「{query}」的信息，请根据您的专业知识进行分析。"
    
    async def call_deepseek(self, messages: List[Dict]) -> str:
        """调用DeepSeek API"""
        if not self.deepseek_api_key:
            raise ValueError("deepseek API密钥未配置")
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.deepseek_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.deepseek_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 4000
                }
            )
            
        if response.status_code != 200:
            raise Exception(f"DeepSeek API 错误: {response.status_code} - {response.text}")
        
        data = response.json()
        return data['choices'][0]['message']['content']
    
    async def call_qwen(self, messages: List[Dict]) -> str:
        """调用阿里千问 API (OpenAI兼容模式)"""
        if not self.qwen_api_key:
            raise ValueError("qw API密钥未配置")
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.qwen_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.qwen_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "qwen-plus",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 4000
                }
            )
            
        if response.status_code != 200:
            raise Exception(f"千问 API 错误: {response.status_code} - {response.text}")
        
        data = response.json()
        return data['choices'][0]['message']['content']
    
    async def analyze_with_ai(self, prompt: str, context: str, provider: str = "deepseek") -> str:
        """使用AI分析"""
        messages = [
            {"role": "system", "content": "你是一位专业的股票分析师，擅长分析公司财务数据、行业趋势和投资价值。请基于提供的信息进行客观、专业的分析。"},
            {"role": "user", "content": f"{prompt}\n\n参考资料：\n{context}"}
        ]
        
        if provider == "qwen":
            return await self.call_qwen(messages)
        else:
            return await self.call_deepseek(messages)
    
    async def analyze_industry(self, symbol: str, stock_info: Dict) -> Dict:
        """行业分析"""
        industry = stock_info.get('industry', '') or stock_info.get('sector', '')
        name = stock_info.get('name', symbol)
        
        if not industry:
            industry = f"{name}所属行业"
        
        logger.info(f"开始行业分析: {industry}")
        
        search_query = f"{industry} 行业分析 发展趋势 市场规模 2024 2025"
        web_content = await self.search_and_collect(search_query, max_pages=5)
        
        prompt = f"""
请对{industry}行业进行全面分析，包括：

1. 行业概述
   - 行业定义和主要业务范围
   - 产业链结构

2. 市场规模与增长
   - 当前市场规模
   - 近年增长趋势
   - 未来增长预期

3. 竞争格局
   - 主要企业及市场份额
   - 行业集中度
   - 竞争态势

4. 政策环境
   - 相关政策法规
   - 政策对行业的影响

5. 发展趋势
   - 技术发展趋势
   - 市场发展方向
   - 投资机会与风险

6. 投资建议
   - 行业投资价值评估
   - 关注重点

请用中文回答，结构清晰，数据准确。
"""
        
        try:
            analysis = await self.analyze_with_ai(prompt, web_content)
            return {
                "industry_name": industry,
                "analysis": analysis,
                "sources": "基于网络搜索数据分析"
            }
        except Exception as e:
            logger.error(f"行业分析失败: {e}")
            return {"error": str(e), "industry_name": industry}
    
    async def analyze_competitiveness(self, symbol: str, stock_info: Dict, financial_data: List[Dict]) -> Dict:
        """竞争力分析"""
        name = stock_info.get('name', symbol)
        industry = stock_info.get('industry', '') or stock_info.get('sector', '')
        
        logger.info(f"开始竞争力分析: {name}")
        
        search_query = f"{name} {symbol} 竞争力分析 核心优势 行业地位 同行对比"
        web_content = await self.search_and_collect(search_query, max_pages=5)
        
        fin_summary = ""
        if financial_data:
            latest = financial_data[0]
            fin_summary = f"""
最新财务数据：
- 年份：{latest.get('year', '')}Q{latest.get('quarter', 0)}
- 营收：{latest.get('revenue', 0)/1e8:.2f}亿
- 净利润：{latest.get('net_profit', 0)/1e8:.2f}亿
- 毛利率：{latest.get('gross_margin', 0):.2f}%
- 净利率：{latest.get('net_margin', 0):.2f}%
- ROE：{latest.get('roe', 0):.2f}%
- EPS：{latest.get('eps', 0):.2f}
"""
        
        prompt = f"""
请对{name}（{symbol}）进行竞争力深度分析，包括：

1. 公司概况
   - 主营业务
   - 市场地位
   - 行业：{industry}

2. 核心竞争力
   - 技术优势
   - 品牌优势
   - 渠道优势
   - 成本优势
   - 管理团队

3. 财务表现
   {fin_summary}
   - 盈利能力分析
   - 成长性分析
   - 财务健康度

4. 竞争对手对比
   - 主要竞争对手
   - 各自优劣势
   - 市场份额对比

5. SWOT分析
   - 优势(Strengths)
   - 劣势(Weaknesses)
   - 机会(Opportunities)
   - 威胁(Threats)

6. 综合评价
   - 竞争力评分（1-10分）
   - 投资价值判断

请用中文回答，客观专业。
"""
        
        try:
            analysis = await self.analyze_with_ai(prompt, web_content)
            return {
                "symbol": symbol,
                "name": name,
                "analysis": analysis,
                "sources": "基于网络搜索和财务数据分析"
            }
        except Exception as e:
            logger.error(f"竞争力分析失败: {e}")
            return {"error": str(e), "symbol": symbol, "name": name}
    
    async def analyze_investment_value(self, symbol: str, stock_info: Dict, financial_data: List[Dict]) -> Dict:
        """投资价值分析"""
        name = stock_info.get('name', symbol)
        price = stock_info.get('price', 0)
        industry = stock_info.get('industry', '') or stock_info.get('sector', '')
        
        logger.info(f"开始投资价值分析: {name}")
        
        search_query = f"{name} {symbol} 投资价值 估值分析 研报 目标价 2024 2025"
        web_content = await self.search_and_collect(search_query, max_pages=5)
        
        fin_summary = ""
        if financial_data:
            latest = financial_data[0]
            prev = financial_data[1] if len(financial_data) > 1 else {}
            
            rev = latest.get('revenue', 0) or 0
            np = latest.get('net_profit', 0) or 0
            rev_yoy = latest.get('revenue_yoy', 0) or 0
            profit_yoy = latest.get('profit_yoy', 0) or 0
            gm = latest.get('gross_margin', 0) or 0
            roe = latest.get('roe', 0) or 0
            eps = latest.get('eps', 0) or 0
            
            fin_summary = f"""
财务数据：
当前价格：{price}元

最新财报（{latest.get('year', '')}Q{latest.get('quarter', 0)}）：
- 营收：{rev/1e8:.2f}亿（同比{rev_yoy:.2f}%）
- 净利润：{np/1e8:.2f}亿（同比{profit_yoy:.2f}%）
- 毛利率：{gm:.2f}%
- ROE：{roe:.2f}%
- EPS：{eps:.2f}

近5年ROE趋势：{[f.get('roe', 0) for f in financial_data[:5] if f.get('roe')]}
"""
        
        prompt = f"""
请对{name}（{symbol}）进行投资价值深度分析，包括：

1. 投资亮点
   - 核心投资逻辑
   - 增长驱动因素
   - 护城河分析

2. 估值分析
   {fin_summary}
   - PE/PB估值分析
   - 与行业平均对比
   - 历史估值水平

3. 成长性分析
   - 营收增长趋势
   - 利润增长趋势
   - 未来增长预期

4. 风险因素
   - 行业风险
   - 公司风险
   - 市场风险

5. 投资建议
   - 投资评级（强烈推荐/推荐/中性/不推荐）
   - 目标价格区间
   - 建议持仓周期
   - 适合的投资者类型

6. 综合评分（1-10分）
   - 成长性评分
   - 估值评分
   - 安全边际评分
   - 综合投资价值评分

请用中文回答，数据详实，结论明确。
"""
        
        try:
            analysis = await self.analyze_with_ai(prompt, web_content)
            return {
                "symbol": symbol,
                "name": name,
                "current_price": price,
                "analysis": analysis,
                "sources": "基于网络搜索、财务数据和研报分析"
            }
        except Exception as e:
            logger.error(f"投资价值分析失败: {e}")
            return {"error": str(e), "symbol": symbol, "name": name}


    async def analyze_comprehensive(self, symbol: str, stock_info: Dict, financial_data: List[Dict]) -> Dict:
        name = stock_info.get('name', symbol)
        price = stock_info.get('price', 0)
        industry = stock_info.get('industry', '') or stock_info.get('sector', '')
        
        logger.info(f"开始综合投资分析: {name}")
        
        search_query = f"{name} {symbol} 行业分析 竞争力 投资价值 估值分析 研报 2024 2025"
        web_content = await self.search_and_collect(search_query, max_pages=5)
        
        fin_summary = ""
        if financial_data:
            latest = financial_data[0]
            prev = financial_data[1] if len(financial_data) > 1 else {}
            
            rev = latest.get('revenue', 0) or 0
            np = latest.get('net_profit', 0) or 0
            rev_yoy = latest.get('revenue_yoy', 0) or 0
            profit_yoy = latest.get('profit_yoy', 0) or 0
            gm = latest.get('gross_margin', 0) or 0
            roe = latest.get('roe', 0) or 0
            eps = latest.get('eps', 0) or 0
            
            fin_summary = f"""
财务数据：
当前价格：{price}元

最新财报（{latest.get('year', '')}Q{latest.get('quarter', 0)}）：
- 营收：{rev/1e8:.2f}亿（同比{rev_yoy:.2f}%）
- 净利润：{np/1e8:.2f}亿（同比{profit_yoy:.2f}%）
- 毛利率：{gm:.2f}%
- ROE：{roe:.2f}%
- EPS：{eps:.2f}

近5年ROE趋势：{[f.get('roe', 0) for f in financial_data[:5] if f.get('roe')]}
"""
        
        prompt = f"""
请对{name}（{symbol}）进行全面的投资价值分析，需要从以下多个角度进行综合分析：

## 一、行业分析
1. 行业概述
   - 行业定义和主要业务范围
   - 产业链结构
2. 市场规模与增长
   - 当前市场规模
   - 近年增长趋势
3. 竞争格局
   - 主要竞争对手
   - 行业集中度
4. 政策环境
   - 相关政策法规
   - 政策对行业的影响

## 二、竞争力分析
1. 公司市场地位
   - 行业排名
   - 市场份额
2. 核心竞争力
   - 技术优势
   - 品牌优势
   - 成本优势
3. SWOT分析
   - 优势(Strengths)
   - 劣势(Weaknesses)
   - 机会(Opportunities)
   - 威胁(Threats)

## 三、财务分析
{fin_summary}
- 盈利能力分析
- 成长性分析
- 财务健康度

## 四、估值分析
- PE/PB估值分析
- 与行业平均对比
- 历史估值水平

## 五、投资建议
1. 投资亮点
   - 核心投资逻辑
   - 增长驱动因素
2. 风险因素
   - 行业风险
   - 公司风险
   - 市场风险
3. 投资评级（强烈推荐/推荐/中性/不推荐）
4. 目标价格区间
5. 建议持仓周期

## 六、综合评分（1-10分）
- 行业前景评分
- 竞争力评分
- 成长性评分
- 估值评分
- 安全边际评分
- 综合投资价值评分

请用中文回答，结构清晰，数据准确，结论明确。
"""
        
        try:
            analysis = await self.analyze_with_ai(prompt, web_content)
            return {
                "symbol": symbol,
                "name": name,
                "current_price": price,
                "industry": industry,
                "analysis": analysis,
                "sources": "基于网络搜索、财务数据和研报分析"
            }
        except Exception as e:
            logger.error(f"综合投资分析失败: {e}")
            return {"error": str(e), "symbol": symbol, "name": name}

    async def summarize_research_reports(self, symbol: str, stock_info: Dict, reports: List[Dict]) -> Dict:
        """总结研报并给出投资建议"""
        name = stock_info.get('name', symbol)
        price = stock_info.get('price', 0)
        
        logger.info(f"开始研报总结: {name}, 共{len(reports)}篇研报")
        
        if not reports:
            return {
                "symbol": symbol,
                "name": name,
                "summary": "暂无研报数据",
                "recommendation": "无法获取研报信息",
                "reports": []
            }
        
        reports_text = ""
        for i, r in enumerate(reports[:5], 1):
            eps_info = ""
            if r.get('eps_forecast'):
                eps_parts = []
                for year, data in r['eps_forecast'].items():
                    eps_parts.append(f"{year}年EPS:{data['eps']:.2f}")
                eps_info = f"（盈利预测: {', '.join(eps_parts)}）" if eps_parts else ""
            
            reports_text += f"""
{i}. 【{r['institution']}】{r['date']}
   标题: {r['title']}
   评级: {r['rating']}
   {eps_info}
"""
        
        prompt = f"""
请分析以下关于{name}（{symbol}）的券商研报，当前股价{price}元，并给出投资建议：

{reports_text}

请完成以下分析：

## 一、研报核心观点汇总
- 各机构对公司的主要看法
- 共识观点和分歧点
- 重点关注事项

## 二、盈利预测分析
- EPS预测趋势（2025-2027年）
- 预测增长率
- 预测一致性分析

## 三、投资评级统计
- 买入/增持/持有/卖出评级分布
- 机构看好/看空比例

## 四、风险提示
- 研报中提到的主要风险

## 五、投资建议
1. 综合评级建议（强烈推荐/推荐/中性/不推荐）
2. 目标价格区间
3. 关键催化剂
4. 需要关注的指标

请用中文回答，简洁专业，结论明确。
"""
        
        try:
            analysis = await self.analyze_with_ai(prompt, "")
            return {
                "symbol": symbol,
                "name": name,
                "current_price": price,
                "report_count": len(reports),
                "summary": analysis,
                "reports": reports[:5],
                "sources": f"基于{len(reports)}篇券商研报分析"
            }
        except Exception as e:
            logger.error(f"研报总结失败: {e}")
            return {
                "symbol": symbol,
                "name": name,
                "error": str(e),
                "reports": reports[:5]
            }


ai_service = AIService()
