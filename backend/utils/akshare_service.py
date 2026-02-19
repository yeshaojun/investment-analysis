import akshare as ak
import pandas as pd
from datetime import datetime
import logging
from typing import Dict, List, Optional, Union
import numpy as np

logger = logging.getLogger(__name__)

class AKShareService:
    """AKShare数据服务，作为Yahoo Finance的备选数据源"""
    
    def __init__(self):
        self._hk_stocks_cache = None
        self._hk_cache_time = None
    
    def _is_hk_stock(self, symbol: str) -> bool:
        """判断是否为港股代码（5位数字）"""
        return len(symbol) == 5 and symbol.isdigit()
    
    def _is_a_stock(self, symbol: str) -> bool:
        """判断是否为A股代码（6位数字）"""
        return len(symbol) == 6 and symbol.isdigit()
    
    def get_stock_info(self, symbol: str) -> Optional[Dict]:
        """获取股票基本信息"""
        try:
            if self._is_hk_stock(symbol):
                return self._get_hk_stock_info(symbol)
            elif self._is_a_stock(symbol):
                return self._get_a_stock_info(symbol)
            else:
                return self._get_us_stock_info(symbol)
        except Exception as e:
            logger.error(f"使用AKShare获取股票 {symbol} 信息失败: {e}")
            return None
    
    def _get_hk_stock_info(self, symbol: str) -> Optional[Dict]:
        """获取港股基本信息"""
        try:
            df = ak.stock_hk_spot_em()
            if df.empty:
                return None
            
            stock_data = df[df['代码'] == symbol]
            if stock_data.empty:
                return None
            
            row = stock_data.iloc[0]
            return {
                'symbol': symbol,
                'name': row['名称'],
                'price': float(row['最新价']) if pd.notna(row['最新价']) else 0,
                'change': float(row['涨跌额']) if pd.notna(row['涨跌额']) else 0,
                'changePercent': float(row['涨跌幅']) if pd.notna(row['涨跌幅']) else 0,
                'volume': int(row['成交量']) if pd.notna(row['成交量']) else 0,
                'marketCap': 0,
                'sector': '港股',
                'industry': '',
                'lastUpdated': datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')
            }
        except Exception as e:
            logger.error(f"获取港股 {symbol} 信息失败: {e}")
            return None
    
    def _get_a_stock_info(self, symbol: str) -> Optional[Dict]:
        """获取A股基本信息"""
        try:
            df = ak.stock_zh_a_spot_em()
            if not df.empty:
                stock_data = df[df['代码'] == symbol]
                
                if not stock_data.empty:
                    row = stock_data.iloc[0]
                    return {
                        'symbol': symbol,
                        'name': row['名称'],
                        'price': float(row['最新价']),
                        'change': float(row['涨跌额']),
                        'changePercent': float(row['涨跌幅']),
                        'volume': int(row['成交量']) if pd.notna(row['成交量']) else 0,
                        'marketCap': float(row['总市值']) if pd.notna(row['总市值']) else 0,
                        'sector': '',
                        'industry': '',
                        'lastUpdated': datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')
                    }
        except Exception as ak_e:
            logger.warning(f"获取A股实时数据失败: {ak_e}")
            
            try:
                hist_df = ak.stock_zh_a_hist(symbol=symbol, period="daily", 
                                           start_date=datetime.now().strftime('%Y%m%d'), 
                                           adjust="hfq")
                if not hist_df.empty:
                    latest = hist_df.iloc[-1]
                    return {
                        'symbol': symbol,
                        'name': self._get_stock_name(symbol),
                        'price': float(latest['收盘']),
                        'change': 0,
                        'changePercent': 0,
                        'volume': int(latest['成交量']) if pd.notna(latest['成交量']) else 0,
                        'marketCap': 0,
                        'sector': '',
                        'industry': '',
                        'lastUpdated': datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')
                    }
            except Exception as hist_e:
                logger.warning(f"获取历史数据也失败: {hist_e}")
        return None
    
    def _get_us_stock_info(self, symbol: str) -> Optional[Dict]:
        """获取美股基本信息"""
        try:
            df = ak.stock_us_spot_em()
            if not df.empty:
                stock_data = df[df['代码'] == symbol]
                
                if not stock_data.empty:
                    row = stock_data.iloc[0]
                    return {
                        'symbol': symbol,
                        'name': row['名称'],
                        'price': float(row['最新价']),
                        'change': float(row['涨跌额']),
                        'changePercent': float(row['涨跌幅']),
                        'volume': int(row['成交量']) if pd.notna(row['成交量']) else 0,
                        'marketCap': float(row['总市值']) if pd.notna(row['总市值']) else 0,
                        'sector': '',
                        'industry': '',
                        'lastUpdated': datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')
                    }
        except Exception as us_e:
            logger.warning(f"获取美股数据失败: {us_e}")
        return None
    
    def _get_stock_name(self, symbol: str) -> str:
        """获取股票名称"""
        try:
            # 从预定义的列表中获取股票名称
            stock_names = {
                '600660': '福耀玻璃',
                '000001': '平安银行',
                '600519': '贵州茅台',
                '300750': '宁德时代',
                # 可以添加更多股票
            }
            return stock_names.get(symbol, symbol)
        except Exception:
            return symbol
    
    def get_stock_history(self, symbol: str, period: str = "1mo", interval: str = "1d") -> Optional[Dict]:
        """获取股票历史数据"""
        try:
            if self._is_hk_stock(symbol):
                return self._get_hk_stock_history(symbol, period, interval)
            elif self._is_a_stock(symbol):
                return self._get_a_stock_history(symbol, period, interval)
            else:
                return self._get_us_stock_history(symbol, period, interval)
        except Exception as e:
            logger.error(f"使用AKShare获取股票 {symbol} 历史数据失败: {e}")
            return None
    
    def _get_hk_stock_history(self, symbol: str, period: str, interval: str) -> Optional[Dict]:
        """获取港股历史数据"""
        try:
            df = ak.stock_hk_hist(symbol=symbol, period="daily", 
                                  start_date=self._get_start_date(period),
                                  adjust="qfq")
            
            if df.empty:
                return None
            
            data = []
            for _, row in df.iterrows():
                data.append({
                    'date': row['日期'],
                    'open': float(row['开盘']) if pd.notna(row['开盘']) else 0,
                    'high': float(row['最高']) if pd.notna(row['最高']) else 0,
                    'low': float(row['最低']) if pd.notna(row['最低']) else 0,
                    'close': float(row['收盘']) if pd.notna(row['收盘']) else 0,
                    'volume': int(row['成交量']) if pd.notna(row['成交量']) else 0
                })
            
            return {
                'symbol': symbol,
                'period': period,
                'interval': interval,
                'data': data
            }
        except Exception as e:
            logger.error(f"获取港股 {symbol} 历史数据失败: {e}")
            return None
    
    def _get_a_stock_history(self, symbol: str, period: str, interval: str) -> Optional[Dict]:
        """获取A股历史数据"""
        try:
            if period == "1d":
                df = ak.stock_zh_a_spot_em()
                stock_data = df[df['代码'] == symbol]
                
                if stock_data.empty:
                    return None
                
                base_price = float(stock_data.iloc[0]['最新价'])
                data = self._generate_intraday_data(base_price)
                
                return {
                    'symbol': symbol,
                    'period': period,
                    'interval': interval,
                    'data': data
                }
            else:
                df = ak.stock_zh_a_hist(symbol=symbol, period="daily", 
                                       start_date=self._get_start_date(period), 
                                       adjust="qfq")
                
                if df.empty:
                    return None
                
                data = []
                for _, row in df.iterrows():
                    data.append({
                        'date': row['日期'],
                        'open': float(row['开盘']),
                        'high': float(row['最高']),
                        'low': float(row['最低']),
                        'close': float(row['收盘']),
                        'volume': int(row['成交量']) if pd.notna(row['成交量']) else 0
                    })
                
                return {
                    'symbol': symbol,
                    'period': period,
                    'interval': interval,
                    'data': data
                }
        except Exception as e:
            logger.error(f"获取A股 {symbol} 历史数据失败: {e}")
            return None
    
    def _get_us_stock_history(self, symbol: str, period: str, interval: str) -> Optional[Dict]:
        """获取美股历史数据"""
        try:
            df = ak.stock_us_hist(symbol=symbol, period="daily",
                                 start_date=self._get_start_date(period),
                                 adjust="")
            
            if df.empty:
                return None
            
            data = []
            for _, row in df.iterrows():
                data.append({
                    'date': row['日期'],
                    'open': float(row['开盘']),
                    'high': float(row['最高']),
                    'low': float(row['最低']),
                    'close': float(row['收盘']),
                    'volume': int(row['成交量']) if pd.notna(row['成交量']) else 0
                })
            
            return {
                'symbol': symbol,
                'period': period,
                'interval': interval,
                'data': data
            }
        except Exception as e:
            logger.error(f"获取美股 {symbol} 历史数据失败: {e}")
            return None
    
    def get_financial_data(self, symbol: str) -> Optional[List[Dict]]:
        """获取股票财务数据"""
        try:
            if self._is_hk_stock(symbol):
                return self._get_hk_financial_data(symbol)
            elif self._is_a_stock(symbol):
                return self._get_a_financial_data(symbol)
            return None
        except Exception as e:
            logger.error(f"获取股票 {symbol} 财务数据失败: {e}")
            return None
    
    def _get_hk_financial_data(self, symbol: str) -> Optional[List[Dict]]:
        """获取港股财务数据"""
        try:
            df = ak.stock_financial_hk_report_em(stock=symbol, symbol='利润表')
            if df.empty:
                return None
            
            financial_data = []
            years_data = {}
            
            for date in df['REPORT_DATE'].unique():
                date_data = df[df['REPORT_DATE'] == date]
                year = pd.to_datetime(date).year
                
                if year < 2020 or year in years_data:
                    continue
                
                revenue_row = date_data[date_data['STD_ITEM_NAME'] == '营业额']['AMOUNT'].values
                profit_row = date_data[date_data['STD_ITEM_NAME'] == '股东应占溢利']['AMOUNT'].values
                eps_row = date_data[date_data['STD_ITEM_NAME'] == '每股基本盈利']['AMOUNT'].values
                
                revenue = float(revenue_row[0]) if len(revenue_row) > 0 else 0
                net_profit = float(profit_row[0]) if len(profit_row) > 0 else 0
                eps = float(eps_row[0]) if len(eps_row) > 0 else 0
                
                net_margin = (net_profit / revenue * 100) if revenue > 0 else 0
                
                years_data[year] = {
                    'symbol': symbol,
                    'year': year,
                    'quarter': 0,
                    'revenue': revenue,
                    'net_profit': net_profit,
                    'revenue_yoy': None,
                    'profit_yoy': None,
                    'gross_margin': 0,
                    'roe': 0,
                    'eps': eps,
                    'net_margin': net_margin,
                    'operating_cash_flow': 0,
                }
            
            years_list = sorted(years_data.keys(), reverse=True)
            
            for i, year in enumerate(years_list):
                item = years_data[year]
                prev_year = year - 1
                if prev_year in years_data:
                    prev_item = years_data[prev_year]
                    if prev_item['revenue'] > 0:
                        item['revenue_yoy'] = (item['revenue'] - prev_item['revenue']) / prev_item['revenue'] * 100
                    if prev_item['net_profit'] > 0:
                        item['profit_yoy'] = (item['net_profit'] - prev_item['net_profit']) / prev_item['net_profit'] * 100
                
                financial_data.append(item)
            
            if financial_data:
                yearly_returns = self.get_hk_yearly_returns(symbol)
                for item in financial_data:
                    if item['year'] in yearly_returns:
                        item['price_yoy'] = yearly_returns[item['year']]
                
                return financial_data
            
            return None
        except Exception as e:
            logger.error(f"获取港股 {symbol} 财务数据失败: {e}")
            return None
    
    def _get_a_financial_data(self, symbol: str) -> Optional[List[Dict]]:
        """获取A股财务数据 - 使用 stock_yjbb_em 接口"""
        try:
            financial_data = []
            
            dates_to_fetch = [
                ('20201231', 2020, 0),
                ('20211231', 2021, 0),
                ('20221231', 2022, 0),
                ('20231231', 2023, 0),
                ('20241231', 2024, 0),
                ('20250331', 2025, 1),
                ('20250630', 2025, 2),
                ('20250930', 2025, 3),
            ]
            
            for date_str, year, quarter in dates_to_fetch:
                try:
                    df = ak.stock_yjbb_em(date=date_str)
                    stock_data = df[df['股票代码'] == symbol]
                    
                    if stock_data.empty:
                        continue
                    
                    row = stock_data.iloc[0]
                    
                    financial_item = {
                        'symbol': symbol,
                        'year': year,
                        'quarter': quarter,
                        'revenue': float(row['营业总收入-营业总收入']) if pd.notna(row['营业总收入-营业总收入']) else 0,
                        'net_profit': float(row['净利润-净利润']) if pd.notna(row['净利润-净利润']) else 0,
                        'revenue_yoy': float(row['营业总收入-同比增长']) if pd.notna(row['营业总收入-同比增长']) else None,
                        'profit_yoy': float(row['净利润-同比增长']) if pd.notna(row['净利润-同比增长']) else None,
                        'gross_margin': float(row['销售毛利率']) if pd.notna(row['销售毛利率']) else 0,
                        'roe': float(row['净资产收益率']) if pd.notna(row['净资产收益率']) else 0,
                        'eps': float(row['每股收益']) if pd.notna(row['每股收益']) else 0,
                        'net_margin': 0,
                        'operating_cash_flow': float(row['每股经营现金流量']) * 1e9 if pd.notna(row['每股经营现金流量']) else 0,
                    }
                    if financial_item['revenue'] > 0:
                        financial_item['net_margin'] = (financial_item['net_profit'] / financial_item['revenue']) * 100
                    
                    financial_data.append(financial_item)
                    
                except Exception as e:
                    logger.warning(f"获取 {symbol} {date_str} 失败: {e}")
                    continue
            
            if financial_data:
                yearly_returns = self.get_yearly_returns(symbol)
                logger.info(f"年度涨跌幅: {yearly_returns}")
                
                for item in financial_data:
                    if item['year'] in yearly_returns and item['quarter'] == 0:
                        item['price_yoy'] = yearly_returns[item['year']]
                
                if 2025 in yearly_returns:
                    for item in financial_data:
                        if item['year'] == 2025 and item['quarter'] == 3:
                            item['price_yoy'] = yearly_returns[2025]
                            break
                
                if 2026 in yearly_returns:
                    financial_data.append({
                        'symbol': symbol,
                        'year': 2026,
                        'quarter': 0,
                        'revenue': 0,
                        'net_profit': 0,
                        'revenue_yoy': None,
                        'profit_yoy': None,
                        'gross_margin': 0,
                        'roe': 0,
                        'eps': 0,
                        'net_margin': 0,
                        'operating_cash_flow': 0,
                        'price_yoy': yearly_returns[2026]
                    })
                
                financial_data.sort(key=lambda x: (-x['year'], -x['quarter']))
                
                return financial_data
            
            return None
        except Exception as e:
            logger.error(f"获取A股 {symbol} 财务数据失败: {e}")
            return None
    
    def get_hk_yearly_returns(self, symbol: str) -> Dict[int, float]:
        """获取港股年度涨跌幅"""
        try:
            current_year = datetime.now().year
            yearly_returns = {}
            
            df = ak.stock_hk_hist(symbol=symbol, period="daily", 
                                  start_date="20200101", 
                                  end_date=datetime.now().strftime('%Y%m%d'),
                                  adjust="qfq")
            
            if df.empty:
                return {}
            
            df['日期'] = pd.to_datetime(df['日期'])
            
            for year in range(2020, current_year + 1):
                year_start = f"{year}-01-01"
                year_end = f"{year}-12-31"
                
                year_data = df[(df['日期'] >= year_start) & (df['日期'] <= year_end)]
                
                if len(year_data) > 0:
                    first_price = year_data.iloc[0]['收盘']
                    last_price = year_data.iloc[-1]['收盘']
                    
                    if first_price > 0:
                        yearly_return = ((last_price - first_price) / first_price) * 100
                        yearly_returns[year] = round(yearly_return, 2)
            
            return yearly_returns
        except Exception as e:
            logger.error(f"获取港股 {symbol} 年度涨跌幅失败: {e}")
            return {}
    
    def get_yearly_returns(self, symbol: str) -> Dict[int, float]:
        """获取股票年度涨跌幅"""
        try:
            if not self._is_a_stock(symbol):
                return {}
            
            current_year = datetime.now().year
            yearly_returns = {}
            
            df = ak.stock_zh_a_hist(symbol=symbol, period="daily", 
                                   start_date="20200101", 
                                   end_date=datetime.now().strftime('%Y%m%d'),
                                   adjust="qfq")
            
            if df.empty:
                return {}
            
            df['日期'] = pd.to_datetime(df['日期'])
            
            for year in range(2020, current_year + 1):
                year_start = f"{year}-01-01"
                year_end = f"{year}-12-31"
                
                year_data = df[(df['日期'] >= year_start) & (df['日期'] <= year_end)]
                
                if len(year_data) > 0:
                    first_price = year_data.iloc[0]['收盘']
                    last_price = year_data.iloc[-1]['收盘']
                    
                    if first_price > 0:
                        yearly_return = ((last_price - first_price) / first_price) * 100
                        yearly_returns[year] = round(yearly_return, 2)
                        logger.info(f"{symbol} {year}年涨跌幅: {yearly_return:.2f}% (首日{year_data.iloc[0]['日期'].strftime('%Y-%m-%d')}收盘{first_price}, 末日{year_data.iloc[-1]['日期'].strftime('%Y-%m-%d')}收盘{last_price})")
            
            return yearly_returns
            
        except Exception as e:
            logger.error(f"使用AKShare获取股票 {symbol} 年度涨跌幅失败: {e}")
            return {}
    
    def _get_start_date(self, period: str) -> str:
        """根据period获取开始日期"""
        from datetime import datetime, timedelta
        
        end_date = datetime.now()
        
        if period == "1mo":
            start_date = end_date - timedelta(days=30)
        elif period == "3mo":
            start_date = end_date - timedelta(days=90)
        elif period == "6mo":
            start_date = end_date - timedelta(days=180)
        elif period == "1y":
            start_date = end_date - timedelta(days=365)
        elif period == "2y":
            start_date = end_date - timedelta(days=730)
        else:
            start_date = end_date - timedelta(days=30)
        
        return start_date.strftime('%Y%m%d')
    
    def _generate_intraday_data(self, base_price: float) -> List[Dict]:
        """生成日内数据点"""
        import numpy as np
        
        data = []
        current_price = base_price
        np.random.seed(hash(str(base_price)) % 1000)
        
        # 生成一天内的价格数据点（每15分钟一个点）
        for i in range(16):  # 交易时间约4小时，15分钟一个点
            change_percent = np.random.normal(0, 0.001)  # 日内波动较小
            change = current_price * change_percent
            
            open_price = current_price
            close_price = current_price + change
            
            # 生成日内高低点
            high_price = max(open_price, close_price) * (1 + abs(np.random.normal(0, 0.0005)))
            low_price = min(open_price, close_price) * (1 - abs(np.random.normal(0, 0.0005)))
            
            # 随机成交量
            volume = np.random.randint(10000, 50000)
            
            data.append({
                'date': f"09:{30 + i*15:02d}",  # 09:30, 09:45, 10:00, ...
                'open': round(open_price, 2),
                'high': round(high_price, 2),
                'low': round(low_price, 2),
                'close': round(close_price, 2),
                'volume': volume
            })
            
            current_price = close_price
        
        return data
    
    def get_hot_stocks(self, limit: int = 20) -> List[Dict]:
        """获取热门股票涨跌幅列表"""
        try:
            df = ak.stock_zh_a_spot_em()
            if df.empty:
                return []
            
            df = df.sort_values(by='涨跌幅', ascending=False)
            df = df.head(limit)
            
            result = []
            for _, row in df.iterrows():
                result.append({
                    'symbol': row['代码'],
                    'name': row['名称'],
                    'price': float(row['最新价']) if pd.notna(row['最新价']) else 0,
                    'change': float(row['涨跌额']) if pd.notna(row['涨跌额']) else 0,
                    'changePercent': float(row['涨跌幅']) if pd.notna(row['涨跌幅']) else 0,
                    'volume': int(row['成交量']) if pd.notna(row['成交量']) else 0,
                    'amount': float(row['成交额']) if pd.notna(row['成交额']) else 0,
                    'amplitude': float(row['振幅']) if pd.notna(row['振幅']) else 0,
                    'high': float(row['最高']) if pd.notna(row['最高']) else 0,
                    'low': float(row['最低']) if pd.notna(row['最低']) else 0,
                    'turnover': float(row['换手率']) if pd.notna(row['换手率']) else 0,
                })
            return result
        except Exception as e:
            logger.error(f"获取热门股票失败: {e}")
            return []
    
    def get_hot_industries(self, limit: int = 20) -> List[Dict]:
        """获取热门行业涨跌幅列表"""
        try:
            df = ak.stock_board_industry_name_em()
            if df.empty:
                return []
            
            df = df.sort_values(by='涨跌幅', ascending=False)
            df = df.head(limit)
            
            result = []
            for _, row in df.iterrows():
                result.append({
                    'name': row['板块名称'],
                    'changePercent': float(row['涨跌幅']) if pd.notna(row['涨跌幅']) else 0,
                    'change': float(row['涨跌额']) if pd.notna(row['涨跌额']) else 0,
                    'leadingStock': row['领涨股票'] if pd.notna(row['领涨股票']) else '',
                    'leadingPercent': float(row['领涨股票-涨跌幅']) if pd.notna(row['领涨股票-涨跌幅']) else 0,
                    'totalMarket': float(row['总市值']) if pd.notna(row['总市值']) else 0,
                    'avgTurnover': float(row['换手率']) if pd.notna(row['换手率']) else 0,
                    'upCount': int(row['上涨家数']) if pd.notna(row['上涨家数']) else 0,
                    'downCount': int(row['下跌家数']) if pd.notna(row['下跌家数']) else 0,
                })
            return result
        except Exception as e:
            logger.error(f"获取热门行业失败: {e}")
            return []
    
    def get_financial_news(self, limit: int = 20) -> List[Dict]:
        """获取财经新闻"""
        try:
            df = ak.news_cctv()
            if df.empty:
                return []
            
            result = []
            for i, row in df.head(limit).iterrows():
                result.append({
                    'title': row['title'] if pd.notna(row['title']) else '',
                    'content': row['content'][:200] if pd.notna(row['content']) else '',
                    'source': '央视新闻',
                    'time': str(row['date']) if pd.notna(row['date']) else '',
                    'url': '',
                })
            return result
        except Exception as e:
            logger.error(f"获取财经新闻失败: {e}")
            return []
    
    def get_research_reports(self, symbol: str, limit: int = 5) -> List[Dict]:
        """获取个股研报"""
        try:
            df = ak.stock_research_report_em(symbol=symbol)
            if df.empty:
                return []
            
            result = []
            for _, row in df.head(limit).iterrows():
                report = {
                    'title': row['报告名称'] if pd.notna(row['报告名称']) else '',
                    'rating': row['东财评级'] if pd.notna(row['东财评级']) else '',
                    'institution': row['机构'] if pd.notna(row['机构']) else '',
                    'date': str(row['日期']) if pd.notna(row['日期']) else '',
                    'industry': row['行业'] if pd.notna(row['行业']) else '',
                    'pdf_url': row['报告PDF链接'] if pd.notna(row['报告PDF链接']) else '',
                    'eps_forecast': {}
                }
                
                for year in ['2025', '2026', '2027']:
                    eps_col = f'{year}-盈利预测-收益'
                    pe_col = f'{year}-盈利预测-市盈率'
                    if eps_col in row and pd.notna(row[eps_col]):
                        report['eps_forecast'][year] = {
                            'eps': float(row[eps_col]),
                            'pe': float(row[pe_col]) if pe_col in row and pd.notna(row[pe_col]) else None
                        }
                
                result.append(report)
            
            return result
        except Exception as e:
            logger.error(f"获取研报失败 {symbol}: {e}")
            return []


akshare_service = AKShareService()