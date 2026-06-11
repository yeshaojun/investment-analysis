import numpy as np
from typing import List, Dict

class TechnicalIndicators:
    """技术指标计算类"""
    
    @staticmethod
    def sma(data: List[float], period: int) -> List[float]:
        """简单移动平均线"""
        if len(data) < period:
            return []
        
        sma_values = []
        for i in range(period - 1, len(data)):
            sma_values.append(sum(data[i - period + 1:i + 1]) / period)
        
        # 前面的数据用NaN填充
        return [np.nan] * (period - 1) + sma_values
    
    @staticmethod
    def ema(data: List[float], period: int) -> List[float]:
        """指数移动平均线"""
        if len(data) < period:
            return []
        
        ema_values = []
        multiplier = 2 / (period + 1)
        
        # 第一个EMA值使用SMA
        sma = sum(data[:period]) / period
        ema_values.append(sma)
        
        for i in range(period, len(data)):
            ema = (data[i] - ema_values[-1]) * multiplier + ema_values[-1]
            ema_values.append(ema)
        
        # 前面的数据用NaN填充
        return [np.nan] * (period - 1) + ema_values
    
    @staticmethod
    def macd(data: List[float], fast_period: int = 12, slow_period: int = 26, signal_period: int = 9) -> Dict[str, List[float]]:
        """MACD指标"""
        if len(data) < slow_period:
            return {'macd': [], 'signal': [], 'histogram': []}
        
        # 计算快速和慢速EMA
        fast_ema = TechnicalIndicators.ema(data, fast_period)
        slow_ema = TechnicalIndicators.ema(data, slow_period)
        
        # 计算MACD线
        macd_line = []
        for i in range(len(fast_ema)):
            if not np.isnan(fast_ema[i]) and not np.isnan(slow_ema[i]):
                macd_line.append(fast_ema[i] - slow_ema[i])
            else:
                macd_line.append(np.nan)
        
        # 计算信号线
        valid_macd = [x for x in macd_line if not np.isnan(x)]
        if len(valid_macd) < signal_period:
            return {'macd': macd_line, 'signal': [np.nan] * len(macd_line), 'histogram': [np.nan] * len(macd_line)}
        
        signal_line = TechnicalIndicators.ema(valid_macd, signal_period)
        
        # 填充信号线
        signal_filled = []
        macd_index = 0
        for i in range(len(macd_line)):
            if np.isnan(macd_line[i]):
                signal_filled.append(np.nan)
            else:
                if macd_index < len(signal_line):
                    signal_filled.append(signal_line[macd_index])
                    macd_index += 1
                else:
                    signal_filled.append(np.nan)
        
        # 计算MACD柱状图
        histogram = []
        for i in range(len(macd_line)):
            if not np.isnan(macd_line[i]) and not np.isnan(signal_filled[i]):
                histogram.append(macd_line[i] - signal_filled[i])
            else:
                histogram.append(np.nan)
        
        return {
            'macd': macd_line,
            'signal': signal_filled,
            'histogram': histogram
        }
    
    @staticmethod
    def rsi(data: List[float], period: int = 14) -> List[float]:
        """RSI指标"""
        if len(data) < period + 1:
            return []
        
        # 计算价格变化
        changes = []
        for i in range(1, len(data)):
            changes.append(data[i] - data[i - 1])
        
        # 分离上涨和下跌
        gains = []
        losses = []
        for change in changes:
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))
        
        # 计算平均增益和平均损失
        rsi_values = []
        
        # 第一个平均增益和损失
        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period
        
        if avg_loss == 0:
            rs = 100
        else:
            rs = avg_gain / avg_loss
        
        rsi = 100 - (100 / (1 + rs))
        rsi_values.append(rsi)
        
        # 后续使用指数平滑
        for i in range(period, len(gains)):
            avg_gain = (avg_gain * (period - 1) + gains[i]) / period
            avg_loss = (avg_loss * (period - 1) + losses[i]) / period
            
            if avg_loss == 0:
                rs = 100
            else:
                rs = avg_gain / avg_loss
            
            rsi = 100 - (100 / (1 + rs))
            rsi_values.append(rsi)
        
        # 前面的数据用NaN填充
        return [np.nan] * period + rsi_values
    
    @staticmethod
    def bollinger_bands(data: List[float], period: int = 20, std_dev: float = 2) -> Dict[str, List[float]]:
        """布林带"""
        if len(data) < period:
            return {'upper': [], 'middle': [], 'lower': []}
        
        middle_band = TechnicalIndicators.sma(data, period)
        
        upper_band = []
        lower_band = []
        
        for i in range(period - 1, len(data)):
            subset = data[i - period + 1:i + 1]
            mean = sum(subset) / period
            variance = sum((x - mean) ** 2 for x in subset) / period
            std = np.sqrt(variance)
            
            upper_band.append(mean + std_dev * std)
            lower_band.append(mean - std_dev * std)
        
        # 前面的数据用NaN填充
        upper_filled = [np.nan] * (period - 1) + upper_band
        lower_filled = [np.nan] * (period - 1) + lower_band
        
        return {
            'upper': upper_filled,
            'middle': middle_band,
            'lower': lower_filled
        }
    
    @staticmethod
    def kdj(high_data: List[float], low_data: List[float], close_data: List[float], period: int = 9) -> Dict[str, List[float]]:
        """KDJ指标"""
        if len(close_data) < period:
            return {'k': [], 'd': [], 'j': []}
        
        rsv_values = []
        for i in range(period - 1, len(close_data)):
            high = max(high_data[i - period + 1:i + 1])
            low = min(low_data[i - period + 1:i + 1])
            close = close_data[i]
            
            if high == low:
                rsv = 50
            else:
                rsv = (close - low) / (high - low) * 100
            
            rsv_values.append(rsv)
        
        # 计算K值 (RSV的3日EMA)
        k_values = []
        k_values.append(rsv_values[0])  # 第一个K值等于第一个RSV
        
        for i in range(1, len(rsv_values)):
            k = (k_values[-1] * 2 + rsv_values[i]) / 3
            k_values.append(k)
        
        # 计算D值 (K值的3日EMA)
        d_values = []
        d_values.append(k_values[0])  # 第一个D值等于第一个K值
        
        for i in range(1, len(k_values)):
            d = (d_values[-1] * 2 + k_values[i]) / 3
            d_values.append(d)
        
        # 计算J值
        j_values = []
        for i in range(len(k_values)):
            j = 3 * k_values[i] - 2 * d_values[i]
            j_values.append(j)
        
        # 前面的数据用NaN填充
        padding = [np.nan] * (period - 1)
        
        return {
            'k': padding + k_values,
            'd': padding + d_values,
            'j': padding + j_values
        }
    
    @staticmethod
    def volume_analysis(volume_data: List[float], price_data: List[float], period: int = 20) -> Dict[str, List[float]]:
        """成交量分析"""
        if len(volume_data) < period:
            return {'volume_ma': [], 'volume_ratio': []}
        
        # 计算成交量移动平均
        volume_ma = TechnicalIndicators.sma(volume_data, period)
        
        # 计算成交量比率
        volume_ratio = []
        for i in range(len(volume_data)):
            if i < period - 1 or np.isnan(volume_ma[i]):
                volume_ratio.append(np.nan)
            else:
                ratio = volume_data[i] / volume_ma[i] if volume_ma[i] != 0 else 0
                volume_ratio.append(ratio)
        
        return {
            'volume_ma': volume_ma,
            'volume_ratio': volume_ratio
        }

# 使用示例
if __name__ == "__main__":
    # 示例数据
    prices = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 111, 110, 112, 114, 113]
    highs = [101, 103, 102, 104, 106, 105, 107, 109, 108, 110, 112, 111, 113, 115, 114]
    lows = [99, 101, 100, 102, 104, 103, 105, 107, 106, 108, 110, 109, 111, 113, 112]
    volumes = [1000000, 1200000, 1100000, 1300000, 1400000, 1250000, 1350000, 1450000, 1300000, 1500000, 1600000, 1350000, 1550000, 1650000, 1500000]
    
    # 计算指标
    sma_5 = TechnicalIndicators.sma(prices, 5)
    ema_12 = TechnicalIndicators.ema(prices, 12)
    macd = TechnicalIndicators.macd(prices)
    rsi = TechnicalIndicators.rsi(prices)
    bb = TechnicalIndicators.bollinger_bands(prices)
    kdj = TechnicalIndicators.kdj(highs, lows, prices)
    volume_analysis = TechnicalIndicators.volume_analysis(volumes, prices)
    
    print("SMA(5):", sma_5)
    print("EMA(12):", ema_12)
    print("MACD:", macd)
    print("RSI:", rsi)
    print("Bollinger Bands:", bb)
    print("KDJ:", kdj)
    print("Volume Analysis:", volume_analysis)