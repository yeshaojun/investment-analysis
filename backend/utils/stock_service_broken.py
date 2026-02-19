import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import time
import sqlite3
import os
from typing import Dict, List, Optional, Union
import logging
from .technical_indicators import TechnicalIndicators

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StockDataService:
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'data', 'database', 'stocks.db')
        
        self.db_path = db_path
        self.cache_timeout = 300  # 5分钟缓存
        self._init_database()
    
    def _init_database(self):
        """初始化数据库"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # 创建股票基本信息表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS stock_info (
                    symbol TEXT PRIMARY KEY,
                    name TEXT,
                    price REAL,
                    change REAL,
                    change_percent REAL,
                    volume INTEGER,
                    market_cap INTEGER,
                    sector TEXT,
                    industry TEXT,
                    last_updated TEXT
                )
            ''')
            
            # 创建历史数据表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS stock_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT,
                    date TEXT,
                    open REAL,
                    high REAL,
                    low REAL,
                    close REAL,
                    volume INTEGER,
                    UNIQUE(symbol, date)
                )
            ''')
            
            # 创建搜索记录表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS search_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT,
                    name TEXT,
                    searched_at TEXT
                )
            ''')
            
            # 创建财务数据表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS financial_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT,
                    year INTEGER,
                    quarter INTEGER,
                    revenue REAL,
                    net_profit REAL,
                    gross_margin REAL,
                    net_margin REAL,
                    operating_cash_flow REAL,
                    eps REAL,
                    roe REAL,
                    created_at TEXT,
                    UNIQUE(symbol, year, quarter)
                )
            ''')
            
            # 创建行业信息表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS industry_info (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    industry_name TEXT UNIQUE,
                    industry_code TEXT,
                    market_size REAL,
                    growth_rate REAL,
                    policy_support TEXT,
                    future_prospect TEXT,
                    description TEXT,
                    created_at TEXT
                )
            ''')
            
            # 创建公司分析表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS company_analysis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT UNIQUE,
                    company_profile TEXT,
                    business_model TEXT,
                    competitive_advantage TEXT,
                    management_team TEXT,
                    development_history TEXT,
                    created_at TEXT
                )
            ''')
            
            # 创建投资研报表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS investment_research (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT,
                    broker TEXT,
                    rating TEXT,
                    target_price REAL,
                    report_summary TEXT,
                    key_points TEXT,
                    report_date TEXT,
                    created_at TEXT
                )
            ''')
            
            # 创建用户自选股表（扩展）
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_watchlists (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    list_name TEXT,
                    category TEXT DEFAULT 'default',
                    symbol TEXT,
                    notes TEXT,
                    created_at TEXT,
                    UNIQUE(user_id, list_name, symbol)
                )
            ''')
            
            # 创建生成文章表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS generated_articles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    symbol TEXT,
                    title TEXT,
                    content TEXT,
                    article_type TEXT,
                    platform TEXT,
                    status TEXT DEFAULT 'draft',
                    created_at TEXT
                )
            ''')
            
            # 创建行业排行表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sector_rankings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    industry_name TEXT,
                    period TEXT,
                    rank_type TEXT,
                    change_percent REAL,
                    volume REAL,
                    market_cap REAL,
                    created_at TEXT
                )
            ''')
            
            # 创建股票排行表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS stock_rankings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT,
                    period TEXT,
                    rank_type TEXT,
                    change_percent REAL,
                    volume REAL,
                    market_cap REAL,
                    price REAL,
                    created_at TEXT
                )
            ''')
            
            conn.commit()
    
    def get_stock_info(self, symbol: str) -> Dict:
        """获取股票基本信息"""
        # 先检查缓存
        cached_data = self._get_cached_stock_info(symbol)
        if cached_data:
            return cached_data
        
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            stock_data = {
                'symbol': symbol,
                'name': info.get('longName', ''),
                'price': info.get('currentPrice', 0),
                'change': info.get('regularMarketChange', 0),
                'changePercent': info.get('regularMarketChangePercent', 0),
                'volume': info.get('volume', 0),
                'marketCap': info.get('marketCap', 0),
                'sector': info.get('sector', ''),
                'industry': info.get('industry', ''),
                'lastUpdated': datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')
            }
            
            # 缓存数据
            self._cache_stock_info(stock_data)
            
            return stock_data
        except Exception as e:
            logger.error(f"获取股票 {symbol} 信息失败: {e}")
            raise Exception(f"获取股票信息失败: {str(e)}")
    
    def get_stock_history(self, symbol: str, period: str = "1mo", interval: str = "1d", include_indicators: bool = True) -> Dict:
        """获取股票历史数据"""
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period, interval=interval)
            
            if hist.empty:
                return {
                    'symbol': symbol,
                    'period': period,
                    'interval': interval,
                    'data': []
                }
            
            # 转换数据格式
            data = []
            close_prices = []
            high_prices = []
            low_prices = []
            volume_data = []
            
            for index, row in hist.iterrows():
                close_price = float(row['Close'])
                high_price = float(row['High'])
                low_price = float(row['Low'])
                volume = int(row['Volume'])
                
                data.append({
                    'date': str(index),
                    'open': float(row['Open']),
                    'high': high_price,
                    'low': low_price,
                    'close': close_price,
                    'volume': volume
                })
                
                close_prices.append(close_price)
                high_prices.append(high_price)
                low_prices.append(low_price)
                volume_data.append(volume)
            
            # 计算技术指标
            indicators = {}
            if include_indicators and len(close_prices) >= 20:
                try:
                    # 移动平均线
                    indicators['ma5'] = TechnicalIndicators.sma(close_prices, 5)
                    indicators['ma10'] = TechnicalIndicators.sma(close_prices, 10)
                    indicators['ma20'] = TechnicalIndicators.sma(close_prices, 20)
                    indicators['ma60'] = TechnicalIndicators.sma(close_prices, 60)
                    
                    # EMA
                    indicators['ema12'] = TechnicalIndicators.ema(close_prices, 12)
                    indicators['ema26'] = TechnicalIndicators.ema(close_prices, 26)
                    
                    # MACD
                    macd_data = TechnicalIndicators.macd(close_prices)
                    indicators['macd'] = macd_data
                    
                    # RSI
                    indicators['rsi'] = TechnicalIndicators.rsi(close_prices)
                    
                    # 布林带
                    bb_data = TechnicalIndicators.bollinger_bands(close_prices)
                    indicators['bollinger_bands'] = bb_data
                    
                    # KDJ
                    kdj_data = TechnicalIndicators.kdj(high_prices, low_prices, close_prices)
                    indicators['kdj'] = kdj_data
                    
                    # 成交量分析
                    volume_analysis_data = TechnicalIndicators.volume_analysis(volume_data, close_prices)
                    indicators['volume_analysis'] = volume_analysis_data
                    
                except Exception as e:
                    logger.warning(f"计算技术指标时出错: {e}")
            
            # 缓存历史数据
            self._cache_stock_history(symbol, data)
            
            result = {
                'symbol': symbol,
                'period': period,
                'interval': interval,
                'data': data
            }
            
            # 添加技术指标数据
            if indicators:
                result['indicators'] = indicators
            
            return result
        except Exception as e:
            logger.error(f"获取股票 {symbol} 历史数据失败: {e}")
            raise Exception(f"获取历史数据失败: {str(e)}")
    
    def search_stocks(self, query: str) -> List[Dict]:
        """搜索股票"""
        try:
            # 这里使用预定义的股票列表作为示例
            # 实际应用中应该使用更完整的股票数据库
            stock_list = [
                {'symbol': 'AAPL', 'name': 'Apple Inc.'},
                {'symbol': 'GOOGL', 'name': 'Alphabet Inc.'},
                {'symbol': 'MSFT', 'name': 'Microsoft Corporation'},
                {'symbol': 'TSLA', 'name': 'Tesla Inc.'},
                {'symbol': 'AMZN', 'name': 'Amazon.com Inc.'},
                {'symbol': 'META', 'name': 'Meta Platforms Inc.'},
                {'symbol': 'NVDA', 'name': 'NVIDIA Corporation'},
                {'symbol': 'NFLX', 'name': 'Netflix Inc.'},
                {'symbol': 'AMD', 'name': 'Advanced Micro Devices'},
                {'symbol': 'INTC', 'name': 'Intel Corporation'}
            ]
            
            query_lower = query.lower()
            filtered_stocks = [
                stock for stock in stock_list
                if query_lower in stock['symbol'].lower() or query_lower in stock['name'].lower()
            ]
            
            # 记录搜索历史
            self._record_search_history(filtered_stocks)
            
            return filtered_stocks
        except Exception as e:
            logger.error(f"搜索股票失败: {e}")
            return []
    
    def get_financial_data(self, symbol: str) -> List[Dict]:
        """获取股票财务数据"""
        try:
            # 先检查缓存
            cached_data = self._get_cached_financial_data(symbol)
            if cached_data:
                return cached_data
            
            # 从yfinance获取财务数据
            ticker = yf.Ticker(symbol)
            
            # 获取财务报表数据
            financials = ticker.financials
            quarterly_financials = ticker.quarterly_financials
            
            if financials.empty:
                return []
            
            financial_data = []
            
            # 处理年度财务数据
            for column in financials.columns:
                year = column.year
                revenue = financials.loc['Total Revenue', column] if 'Total Revenue' in financials.index else 0
                net_income = financials.loc['Net Income', column] if 'Net Income' in financials.index else 0
                
                # 计算利润率
                gross_margin = 0
                if 'Gross Profit' in financials.index and 'Total Revenue' in financials.index:
                    gross_profit = financials.loc['Gross Profit', column]
                    if revenue != 0:
                        gross_margin = (gross_profit / revenue) * 100
                
                net_margin = 0
                if revenue != 0:
                    net_margin = (net_income / revenue) * 100
                
                # 获取其他财务指标
                operating_cash_flow = financials.loc['Operating Cash Flow', column] if 'Operating Cash Flow' in financials.index else 0
                
                # 获取EPS数据
                eps_data = ticker.earnings
                eps = 0
                if not eps_data.empty and year in eps_data.index:
                    eps = eps_data.loc[year, 'EPS'] if 'EPS' in eps_data.columns else 0
                
                financial_item = {
                    'symbol': symbol,
                    'year': year,
                    'quarter': 0,  # 年度数据
                    'revenue': float(revenue) if revenue != 0 else 0,
                    'net_profit': float(net_income) if net_income != 0 else 0,
                    'gross_margin': float(gross_margin),
                    'net_margin': float(net_margin),
                    'operating_cash_flow': float(operating_cash_flow) if operating_cash_flow != 0 else 0,
                    'eps': float(eps),
                    'roe': 0  # 需要计算
                }
                financial_data.append(financial_item)
            
            # 缓存财务数据
            self._cache_financial_data(financial_data)
            
            return financial_data
        except Exception as e:
            logger.error(f"获取股票 {symbol} 财务数据失败: {e}")
            return []
    
    def save_financial_data(self, financial_data: List[Dict]):
        """保存财务数据到数据库"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                for item in financial_data:
                    cursor.execute('''
                        INSERT OR REPLACE INTO financial_data 
                        (symbol, year, quarter, revenue, net_profit, gross_margin, 
                         net_margin, operating_cash_flow, eps, roe, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        item['symbol'],
                        item['year'],
                        item['quarter'],
                        item['revenue'],
                        item['net_profit'],
                        item['gross_margin'],
                        item['net_margin'],
                        item['operating_cash_flow'],
                        item['eps'],
                        item['roe'],
                        datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')
                    ))
                conn.commit()
        except Exception as e:
            logger.error(f"保存财务数据失败: {e}")
    
    def get_industry_info(self, industry_name: str) -> Optional[Dict]:
        """获取行业信息"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT * FROM industry_info WHERE industry_name = ?
                ''', (industry_name,))
                
                row = cursor.fetchone()
                if row:
                    return {
                        'id': row[0],
                        'industry_name': row[1],
                        'industry_code': row[2],
                        'market_size': row[3],
                        'growth_rate': row[4],
                        'policy_support': row[5],
                        'future_prospect': row[6],
                        'description': row[7],
                        'created_at': row[8]
                    }
                return None
        except Exception as e:
            logger.error(f"获取行业信息失败: {e}")
            return None
    
    def save_industry_info(self, industry_data: Dict):
        """保存行业信息到数据库"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO industry_info 
                    (industry_name, industry_code, market_size, growth_rate, 
                     policy_support, future_prospect, description, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    industry_data['industry_name'],
                    industry_data.get('industry_code', ''),
                    industry_data.get('market_size', 0),
                    industry_data.get('growth_rate', 0),
                    industry_data.get('policy_support', ''),
                    industry_data.get('future_prospect', ''),
                    industry_data.get('description', ''),
                    datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"保存行业信息失败: {e}")
    
    def get_company_analysis(self, symbol: str) -> Optional[Dict]:
        """获取公司分析数据"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT * FROM company_analysis WHERE symbol = ?
                ''', (symbol,))
                
                row = cursor.fetchone()
                if row:
                    return {
                        'id': row[0],
                        'symbol': row[1],
                        'company_profile': row[2],
                        'business_model': row[3],
                        'competitive_advantage': row[4],
                        'management_team': row[5],
                        'development_history': row[6],
                        'created_at': row[7]
                    }
                return None
        except Exception as e:
            logger.error(f"获取公司分析失败: {e}")
            return None
    
    def save_company_analysis(self, analysis_data: Dict):
        """保存公司分析数据到数据库"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO company_analysis 
                    (symbol, company_profile, business_model, competitive_advantage,
                     management_team, development_history, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    analysis_data['symbol'],
                    analysis_data.get('company_profile', ''),
                    analysis_data.get('business_model', ''),
                    analysis_data.get('competitive_advantage', ''),
                    analysis_data.get('management_team', ''),
                    analysis_data.get('development_history', ''),
                    datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"保存公司分析失败: {e}")
    
    def get_investment_research(self, symbol: str) -> List[Dict]:
        """获取投资研报数据"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT * FROM investment_research WHERE symbol = ? ORDER BY report_date DESC
                ''', (symbol,))
                
                research_data = []
                for row in cursor.fetchall():
                    research_data.append({
                        'id': row[0],
                        'symbol': row[1],
                        'broker': row[2],
                        'rating': row[3],
                        'target_price': row[4],
                        'report_summary': row[5],
                        'key_points': row[6],
                        'report_date': row[7],
                        'created_at': row[8]
                    })
                
                return research_data
        except Exception as e:
            logger.error(f"获取投资研报失败: {e}")
            return []
    
    def save_investment_research(self, research_data: Dict):
        """保存投资研报数据到数据库"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO investment_research 
                    (symbol, broker, rating, target_price, report_summary, key_points, report_date, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    research_data['symbol'],
                    research_data.get('broker', ''),
                    research_data.get('rating', ''),
                    research_data.get('target_price', 0),
                    research_data.get('report_summary', ''),
                    research_data.get('key_points', ''),
                    research_data.get('report_date', ''),
                    datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"保存投资研报失败: {e}")
    
    def get_popular_stocks(self, limit: int = 10) -> List[Dict]:
        """获取热门股票"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT symbol, name, COUNT(*) as search_count
                    FROM search_history
                    WHERE searched_at > datetime('now', '-7 days')
                    GROUP BY symbol, name
                    ORDER BY search_count DESC
                    LIMIT ?
                ''', (limit,))
                
                results = []
                for row in cursor.fetchall():
                    results.append({
                        'symbol': row[0],
                        'name': row[1],
                        'searchCount': row[2]
                    })
                
                return results
        except Exception as e:
            logger.error(f"获取热门股票失败: {e}")
            return []
    
    def _get_cached_stock_info(self, symbol: str) -> Optional[Dict]:
        """从缓存获取股票信息"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT * FROM stock_info 
                    WHERE symbol = ? AND datetime(last_updated) > datetime('now', '-5 minutes')
                ''', (symbol,))
                
                row = cursor.fetchone()
                if row:
                    return {
                        'symbol': row[0],
                        'name': row[1],
                        'price': row[2],
                        'change': row[3],
                        'changePercent': row[4],
                        'volume': row[5],
                        'marketCap': row[6],
                        'lastUpdated': row[9]
                    }
                return None
        except Exception as e:
            logger.error(f"获取缓存失败: {e}")
            return None
    
    def _cache_stock_info(self, stock_data: Dict):
        """缓存股票信息"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO stock_info 
                    (symbol, name, price, change, change_percent, volume, market_cap, sector, industry, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    stock_data['symbol'],
                    stock_data['name'],
                    stock_data['price'],
                    stock_data['change'],
                    stock_data['changePercent'],
                    stock_data['volume'],
                    stock_data['marketCap'],
                    stock_data.get('sector', ''),
                    stock_data.get('industry', ''),
                    stock_data['lastUpdated']
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"缓存股票信息失败: {e}")
    
    def _cache_stock_history(self, symbol: str, history_data: List[Dict]):
        """缓存历史数据"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                for item in history_data:
                    cursor.execute('''
                        INSERT OR REPLACE INTO stock_history 
                        (symbol, date, open, high, low, close, volume)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        symbol,
                        item['date'],
                        item['open'],
                        item['high'],
                        item['low'],
                        item['close'],
                        item['volume']
                    ))
                conn.commit()
        except Exception as e:
            logger.error(f"缓存历史数据失败: {e}")
    
    def _record_search_history(self, results: List[Dict]):
        """记录搜索历史"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                for stock in results:
                    cursor.execute('''
                        INSERT INTO search_history (symbol, name, searched_at)
                        VALUES (?, ?, ?)
                    ''', (stock['symbol'], stock['name'], datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')))
                conn.commit()
        except Exception as e:
            logger.error(f"记录搜索历史失败: {e}")
    
    def _get_cached_financial_data(self, symbol: str) -> Optional[List[Dict]]:
        """从缓存获取财务数据"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT * FROM financial_data 
                    WHERE symbol = ?
                    ORDER BY year DESC, quarter DESC
                ''', (symbol,))
                
                financial_data = []
                for row in cursor.fetchall():
                    financial_data.append({
                        'symbol': row[1],
                        'year': row[2],
                        'quarter': row[3],
                        'revenue': row[4],
                        'net_profit': row[5],
                        'gross_margin': row[6],
                        'net_margin': row[7],
                        'operating_cash_flow': row[8],
                        'eps': row[9],
                        'roe': row[10]
                    })
                
                return financial_data if financial_data else None
        except Exception as e:
            logger.error(f"获取缓存财务数据失败: {e}")
            return None
    
    def _cache_financial_data(self, financial_data: List[Dict]):
        """缓存财务数据"""
        try:
            self.save_financial_data(financial_data)
        except Exception as e:
            logger.error(f"缓存财务数据失败: {e}")

# 创建全局实例
stock_service = StockDataService()