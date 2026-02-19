from flask import Flask, request, jsonify
from flask_cors import CORS
from utils.stock_service import stock_service
from utils.ai_service import ai_service
import os
import asyncio
import logging
import traceback
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/Users/rsvp/demo/ai_money/api_debug.log')
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Stock Query API is running'})

@app.route('/api/stock/<symbol>', methods=['GET'])
def get_stock_info(symbol):
    try:
        stock_info = stock_service.get_stock_info(symbol)
        return jsonify(stock_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/stock/<symbol>/history', methods=['GET'])
def get_stock_history(symbol):
    try:
        period = request.args.get('period', '1mo')
        interval = request.args.get('interval', '1d')
        include_indicators = request.args.get('indicators', 'true').lower() == 'true'
        
        history_data = stock_service.get_stock_history(symbol, period, interval, include_indicators)
        return jsonify(history_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/stock/<symbol>/financials', methods=['GET'])
def get_financial_data(symbol):
    try:
        financial_data = stock_service.get_financial_data(symbol)
        return jsonify({'symbol': symbol, 'financials': financial_data})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/industry/<industry_name>', methods=['GET'])
def get_industry_info(industry_name):
    try:
        industry_info = stock_service.get_industry_info(industry_name)
        if industry_info:
            return jsonify(industry_info)
        else:
            return jsonify({'error': '行业信息未找到'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/stock/<symbol>/analysis', methods=['GET'])
def get_company_analysis(symbol):
    try:
        company_analysis = stock_service.get_company_analysis(symbol)
        if company_analysis:
            return jsonify(company_analysis)
        else:
            return jsonify({'error': '公司分析未找到'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/stock/<symbol>/research', methods=['GET'])
def get_investment_research(symbol):
    try:
        research_data = stock_service.get_investment_research(symbol)
        return jsonify({'symbol': symbol, 'research': research_data})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/industry', methods=['POST'])
def create_industry_info():
    try:
        data = request.get_json()
        
        if not data or 'industry_name' not in data:
            return jsonify({'error': '行业名称是必需的'}), 400
        
        stock_service.save_industry_info(data)
        return jsonify({'success': True, 'message': '行业信息保存成功'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/stock/<symbol>/analysis', methods=['POST'])
def create_company_analysis(symbol):
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '缺少请求数据'}), 400
        
        data['symbol'] = symbol
        stock_service.save_company_analysis(data)
        return jsonify({'success': True, 'message': '公司分析保存成功'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/stock/<symbol>/research', methods=['POST'])
def create_investment_research(symbol):
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '缺少请求数据'}), 400
        
        data['symbol'] = symbol
        stock_service.save_investment_research(data)
        return jsonify({'success': True, 'message': '投资研报保存成功'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/search', methods=['GET'])
def search_stocks():
    try:
        query = request.args.get('q', '')
        
        if not query or len(query.strip()) < 2:
            return jsonify({'error': '搜索关键词至少需要2个字符'}), 400
        
        results = stock_service.search_stocks(query)
        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/popular', methods=['GET'])
def get_popular_stocks():
    try:
        limit = request.args.get('limit', 10, type=int)
        popular_stocks = stock_service.get_popular_stocks(limit)
        return jsonify({'popular_stocks': popular_stocks})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/stock/<symbol>/competitiveness', methods=['GET'])
def get_stock_competitiveness(symbol):
    try:
        competitiveness = stock_service.get_company_competitiveness(symbol)
        return jsonify(competitiveness)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/stock/<symbol>/investment-value', methods=['GET'])
def get_investment_value(symbol):
    try:
        investment_value = stock_service.get_investment_value(symbol)
        return jsonify(investment_value)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/industry/<industry_name>/analysis', methods=['GET'])
def get_industry_analysis(industry_name):
    try:
        industry_analysis = stock_service.analyze_industry(industry_name)
        return jsonify(industry_analysis)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/rankings/sectors', methods=['GET'])
def get_sector_rankings():
    try:
        period = request.args.get('period', 'year')
        rankings = stock_service.get_sector_rankings(period)
        return jsonify({'rankings': rankings, 'period': period})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/rankings/stocks', methods=['GET'])
def get_stock_rankings():
    try:
        period = request.args.get('period', 'year')
        limit = request.args.get('limit', 50, type=int)
        rankings = stock_service.get_stock_rankings(period, limit)
        return jsonify({'rankings': rankings, 'period': period})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/stock/<symbol>/ai/investment-value', methods=['GET'])
def ai_analyze_investment_value(symbol):
    """AI综合投资分析 - 行业、竞争力、投资价值综合分析"""
    logger.info(f"=== 开始AI综合投资分析: {symbol} ===")
    try:
        logger.debug(f"步骤1: 获取股票信息 {symbol}")
        stock_info = stock_service.get_stock_info(symbol)
        logger.debug(f"股票信息: {stock_info}")
        
        logger.debug(f"步骤2: 获取财务数据 {symbol}")
        financial_data = stock_service.get_financial_data(symbol)
        logger.debug(f"财务数据: {financial_data}")
        
        logger.debug(f"步骤3: 调用AI综合分析服务")
        result = asyncio.run(ai_service.analyze_comprehensive(symbol, stock_info, financial_data))
        logger.info(f"=== AI综合投资分析完成: {symbol} ===")
        return jsonify(result)
    except Exception as e:
        logger.error(f"AI综合投资分析失败: {symbol}")
        logger.error(f"错误类型: {type(e).__name__}")
        logger.error(f"错误信息: {str(e)}")
        logger.error(f"堆栈跟踪:\n{traceback.format_exc()}")
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@app.route('/api/market/news', methods=['GET'])
def get_market_news():
    try:
        limit = request.args.get('limit', 20, type=int)
        from utils.akshare_service import akshare_service
        news = akshare_service.get_financial_news(limit)
        return jsonify({'news': news})
    except Exception as e:
        logger.error(f"获取财经新闻失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/market/hot-stocks', methods=['GET'])
def get_hot_stocks():
    try:
        limit = request.args.get('limit', 20, type=int)
        from utils.akshare_service import akshare_service
        stocks = akshare_service.get_hot_stocks(limit)
        return jsonify({'stocks': stocks})
    except Exception as e:
        logger.error(f"获取热门股票失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/market/hot-industries', methods=['GET'])
def get_hot_industries():
    try:
        limit = request.args.get('limit', 20, type=int)
        from utils.akshare_service import akshare_service
        industries = akshare_service.get_hot_industries(limit)
        return jsonify({'industries': industries})
    except Exception as e:
        logger.error(f"获取热门行业失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/cache/clear', methods=['POST'])
def clear_cache():
    try:
        from utils.cache import cache
        cache.clear()
        logger.info("缓存已清除")
        return jsonify({'success': True, 'message': '缓存已清除'})
    except Exception as e:
        logger.error(f"清除缓存失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stock/<symbol>/research-reports', methods=['GET'])
def get_research_reports(symbol):
    """获取个股研报"""
    try:
        limit = request.args.get('limit', 5, type=int)
        from utils.akshare_service import akshare_service
        reports = akshare_service.get_research_reports(symbol, limit)
        return jsonify({'symbol': symbol, 'reports': reports})
    except Exception as e:
        logger.error(f"获取研报失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stock/<symbol>/ai/research-summary', methods=['GET'])
def ai_research_summary(symbol):
    """AI研报总结"""
    logger.info(f"=== 开始AI研报总结: {symbol} ===")
    try:
        limit = request.args.get('limit', 5, type=int)
        
        stock_info = stock_service.get_stock_info(symbol)
        
        from utils.akshare_service import akshare_service
        reports = akshare_service.get_research_reports(symbol, limit)
        
        result = asyncio.run(ai_service.summarize_research_reports(symbol, stock_info, reports))
        logger.info(f"=== AI研报总结完成: {symbol} ===")
        return jsonify(result)
    except Exception as e:
        logger.error(f"AI研报总结失败: {symbol}")
        logger.error(f"错误信息: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    app.run(debug=debug, host='0.0.0.0', port=port)