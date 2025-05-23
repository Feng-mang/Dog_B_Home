const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 默认API凭证
const API_KEY = '3b91c6b4-fcc9-4a59-b73a-a45b2506e5e7';
const API_SECRET = '80867A32C659E547E57B682615F0E522';
const PASSPHRASE = '123';
const CORRECT_PASSPHRASE = 'YourRealPassphrase2024';

function getSign(timestamp, method, requestPath, body = '', apiSecret) {
  const preHash = timestamp + method + requestPath + body;
  return crypto.createHmac('sha256', apiSecret).update(preHash).digest('base64');
}

// API路由
app.get('/api/okx/ticker', async (req, res) => {
  try {
    const apiKey = req.headers['ok-access-key'] || API_KEY;
    const apiSecret = req.headers['ok-access-secret'] || API_SECRET;
    const passphrase = req.headers['ok-access-passphrase'] || PASSPHRASE;

    const { symbol = 'DOGE-USDT' } = req.query;
    const requestPath = `/api/v5/market/ticker?instId=${symbol}`;
    const url = `https://www.okx.com${requestPath}`;
    const timestamp = new Date().toISOString();

    const sign = getSign(timestamp, 'GET', requestPath, '', apiSecret);

    const headers = {
      'OK-ACCESS-KEY': apiKey,
      'OK-ACCESS-SIGN': sign,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': passphrase,
      'Content-Type': 'application/json'
    };

    const response = await axios.get(url, { headers });
    res.json(response.data);
  } catch (err) {
    console.error('Ticker API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 验证passphrase
app.post('/api/verify-passphrase', (req, res) => {
  try {
    const { passphrase } = req.body;
    
    if (!passphrase) {
      return res.status(400).json({ 
        success: false, 
        message: '请输入Passphrase！' 
      });
    }
    
    if (passphrase.trim() === CORRECT_PASSPHRASE) {
      return res.json({ 
        success: true, 
        message: '验证成功！' 
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        message: '❌ Passphrase错误，请检查后重试！' 
      });
    }
    
  } catch (error) {
    console.error('Passphrase验证错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器验证错误' 
    });
  }
});

// 主页路由
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DOGE实时数据监控</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #1a1a2e 100%);
            color: #e1e5e9;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { 
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 16px; 
            padding: 24px; 
            margin-bottom: 20px;
        }
        .btn { 
            padding: 12px 24px; 
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white; 
            border: none; 
            border-radius: 12px; 
            cursor: pointer; 
            font-weight: 600;
            margin: 4px;
        }
        .btn:hover { 
            background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        }
        .btn.active { 
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }
        .form-input { 
            width: 100%; 
            padding: 14px 16px; 
            background: rgba(51, 65, 85, 0.8);
            border: 1px solid rgba(71, 85, 105, 0.4);
            border-radius: 12px; 
            color: #e1e5e9;
            font-size: 16px;
            margin-bottom: 16px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .chart-canvas { 
            border: 1px solid rgba(71, 85, 105, 0.3); 
            border-radius: 16px; 
            width: 100%; 
            height: 350px; 
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%);
            display: block; 
        }
        .data-table {
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 12px;
            overflow: hidden;
            background: rgba(15, 23, 42, 0.6);
        }
        .table-header, .table-row {
            display: grid;
            grid-template-columns: 1fr 1.2fr 1fr 1fr 1fr 1.2fr;
            padding: 12px;
            border-bottom: 1px solid rgba(71, 85, 105, 0.2);
        }
        .table-header {
            background: rgba(51, 65, 85, 0.8);
            font-weight: 600;
        }
        .table-row:hover {
            background: rgba(51, 65, 85, 0.4);
        }
        .error { color: #ef4444; }
        .success { color: #22c55e; }
    </style>
</head>
<body>
    <div class="container">
        <div id="app">
            <div class="card">
                <h1 style="text-align: center;">DOGE/USDT 实时数据监控</h1>
                <div id="loginSection" style="display: block;">
                    <h2>🔐 系统登录</h2>
                    <input class="form-input" id="passphraseInput" type="password" placeholder="请输入您的API Passphrase">
                    <button class="btn" onclick="login()">🚀 登录系统</button>
                    <p style="margin-top: 16px; font-size: 12px; color: #666;">📋 测试密码：YourRealPassphrase2024</p>
                </div>
                
                <div id="mainSection" style="display: none;">
                    <button class="btn" onclick="logout()" style="float: right;">退出登录</button>
                    <div style="clear: both;"></div>
                    
                    <!-- 统计卡片 -->
                    <div class="stats-grid">
                        <div class="card">
                            <h4>💰 当前价格</h4>
                            <div id="currentPrice" style="font-size: 24px; font-weight: bold; color: #3b82f6;">加载中...</div>
                        </div>
                        <div class="card">
                            <h4>⏰ 运行时间</h4>
                            <div id="runTime" style="font-size: 20px; font-weight: bold; color: #10b981;">00:00:00</div>
                        </div>
                        <div class="card">
                            <h4>⏱️ 最后更新</h4>
                            <div id="lastUpdate" style="font-size: 16px; color: #64748b;">从未</div>
                        </div>
                        <div class="card">
                            <h4>⚠️ 状态</h4>
                            <div id="status" style="font-size: 16px; color: #22c55e;">✅ 正常</div>
                        </div>
                    </div>
                    
                    <!-- 价格走势图 -->
                    <div class="card">
                        <h3>📈 实时价格走势图</h3>
                        <canvas id="priceChart" class="chart-canvas"></canvas>
                        <div style="text-align: center; margin-top: 16px;">
                            <button class="btn" id="btn1m" onclick="changeTimeRange('1m')">1分钟</button>
                            <button class="btn active" id="btn15m" onclick="changeTimeRange('15m')">15分钟</button>
                            <button class="btn" id="btn1h" onclick="changeTimeRange('1h')">1小时</button>
                            <button class="btn" id="btn12h" onclick="changeTimeRange('12h')">12小时</button>
                        </div>
                        <div style="margin-top: 8px; color: #94a3b8; font-size: 12px; text-align: center;">
                            📊 当前显示：最近<span id="currentRange">15分钟</span>的价格走势（滑动时间窗口）
                        </div>
                    </div>
                    
                    <!-- 实时数据流 -->
                    <div class="card">
                        <h3>📊 实时数据流</h3>
                        
                        <!-- 数据流时间选择器 -->
                        <div style="text-align: center; margin-bottom: 16px;">
                            <button class="btn" id="dataBtn1m" onclick="changeDataTimeRange('1m')">1分钟</button>
                            <button class="btn active" id="dataBtn15m" onclick="changeDataTimeRange('15m')">15分钟</button>
                            <button class="btn" id="dataBtn1h" onclick="changeDataTimeRange('1h')">1小时</button>
                            <button class="btn" id="dataBtn12h" onclick="changeDataTimeRange('12h')">12小时</button>
                        </div>
                        <div style="margin-bottom: 16px; color: #94a3b8; font-size: 12px; text-align: center;">
                            📊 当前显示：<span id="currentDataRange">15分钟</span>内的价格变化率 | <span id="dataInterval">每分钟记录一次</span>
                        </div>
                        
                        <div class="data-table">
                            <div class="table-header">
                                <div>时间</div>
                                <div>价格 (USDT)</div>
                                <div>变化</div>
                                <div>变化率</div>
                                <div>成交量变化</div>
                                <div>总成交量 (DOGE)</div>
                            </div>
                            <div id="dataTable">
                                <div class="table-row">
                                    <div style="grid-column: 1/-1; text-align: center; color: #64748b;">暂无数据</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let isLoggedIn = false;
        let credentials = null;
        
        // 为每个时间范围维护独立的数据流
        let dataStreams = {
            '1m': [],    // 1分钟数据流（每秒记录）
            '15m': [],   // 15分钟数据流（每分钟记录）
            '1h': [],    // 1小时数据流（每3分钟记录）
            '12h': []    // 12小时数据流（每36分钟记录）
        };
        
        // 为每个时间范围维护上次记录时间
        let lastRecordTimes = {
            '1m': 0,
            '15m': 0,
            '1h': 0,
            '12h': 0
        };
        
        // 各时间范围的记录间隔（毫秒）
        const recordIntervals = {
            '1m': 1000,              // 每秒记录
            '15m': 60 * 1000,        // 每分钟记录
            '1h': 3 * 60 * 1000,     // 每3分钟记录
            '12h': 36 * 60 * 1000    // 每36分钟记录
        };
        
        // 旧的data数组，保持兼容性（现在通过dataStreams[dataTimeRange]访问）
        let data = [];
        let chartData = [];
        let currentPrice = null;
        let error = null;
        let lastUpdate = null;
        let chartTimeRange = '15m';
        let dataTimeRange = '15m';  // 数据流时间范围
        let chart = null;
        let serverStartTime = new Date();  // 服务器启动时间
        let lastDataRecordTime = 0;  // 上次记录数据的时间
        let dataRecordInterval = 1000;  // 数据记录间隔(毫秒)
        
        // 初始化数据流引用
        data = dataStreams[dataTimeRange];
        
        // 登录函数
        async function login() {
            const passphrase = document.getElementById('passphraseInput').value;
            
            try {
                const response = await fetch('/api/verify-passphrase', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ passphrase: passphrase })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    credentials = {
                        apiKey: '3b91c6b4-fcc9-4a59-b73a-a45b2506e5e7',
                        apiSecret: '80867A32C659E547E57B682615F0E522',
                        passphrase: passphrase.trim()
                    };
                    isLoggedIn = true;
                    showMainSection();
                    startDataFetch();
                } else {
                    alert(result.message);
                }
            } catch (error) {
                alert('⚠️ 网络错误，请检查连接后重试！');
            }
        }
        
        // 退出登录
        function logout() {
            isLoggedIn = false;
            credentials = null;
            data = [];
            chartData = [];
            currentPrice = null;
            error = null;
            lastUpdate = null;
            document.getElementById('loginSection').style.display = 'block';
            document.getElementById('mainSection').style.display = 'none';
            document.getElementById('passphraseInput').value = '';
        }
        
        // 显示主界面
        function showMainSection() {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('mainSection').style.display = 'block';
            initChart();
        }
        
        // 初始化图表
        function initChart() {
            const canvas = document.getElementById('priceChart');
            if (!canvas) return;
            
            chart = canvas.getContext('2d');
            canvas.width = canvas.offsetWidth;
            canvas.height = 300;
            
            drawChart();
        }
        
        // 绘制图表
        function drawChart() {
            if (!chart || !chartData.length) return;
            
            const canvas = chart.canvas;
            const width = canvas.width;
            const height = canvas.height;
            
            // 清空画布
            chart.clearRect(0, 0, width, height);
            
            // 设置边距
            const margin = { top: 20, right: 20, bottom: 40, left: 80 };
            const chartWidth = width - margin.left - margin.right;
            const chartHeight = height - margin.top - margin.bottom;
            
            if (chartData.length < 2) {
                chart.fillStyle = '#94a3b8';
                chart.font = '16px Arial';
                chart.textAlign = 'center';
                chart.fillText('数据收集中...', width / 2, height / 2);
                return;
            }
            
            // 滑动时间窗口数据过滤
            const now = new Date().getTime();
            let timeRangeMs;
            
            switch(chartTimeRange) {
                case '1m': timeRangeMs = 60 * 1000; break;
                case '15m': timeRangeMs = 15 * 60 * 1000; break;
                case '1h': timeRangeMs = 60 * 60 * 1000; break;
                case '12h': timeRangeMs = 12 * 60 * 60 * 1000; break;
                default: timeRangeMs = 15 * 60 * 1000;
            }
            
            const windowStartTime = now - timeRangeMs;
            
            // 过滤时间窗口内的数据
            const filteredData = chartData.filter(point => {
                return point.timestampMs >= windowStartTime && point.timestampMs <= now;
            }).sort((a, b) => a.timestampMs - b.timestampMs);
            
            if (filteredData.length < 2) {
                chart.fillStyle = '#94a3b8';
                chart.font = '16px Arial';
                chart.textAlign = 'center';
                chart.fillText('等待更多数据...', width / 2, height / 2);
                chart.fillText('当前已收集 ' + filteredData.length + ' 个数据点', width / 2, height / 2 + 25);
                return;
            }
            
            // 计算价格范围
            const prices = filteredData.map(d => d.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const priceRange = maxPrice - minPrice || 0.000001;
            
            // 绘制网格线
            chart.strokeStyle = 'rgba(71, 85, 105, 0.2)';
            chart.lineWidth = 1;
            
            // 垂直网格线
            for (let i = 0; i <= 10; i++) {
                const x = margin.left + (chartWidth * i / 10);
                chart.beginPath();
                chart.moveTo(x, margin.top);
                chart.lineTo(x, height - margin.bottom);
                chart.stroke();
            }
            
            // 水平网格线
            for (let i = 0; i <= 5; i++) {
                const y = margin.top + (chartHeight * i / 5);
                chart.beginPath();
                chart.moveTo(margin.left, y);
                chart.lineTo(width - margin.right, y);
                chart.stroke();
            }
            
            // 绘制折线
            chart.strokeStyle = '#3b82f6';
            chart.lineWidth = 3;
            chart.beginPath();
            
            filteredData.forEach((point, index) => {
                const x = margin.left + (chartWidth * index / Math.max(filteredData.length - 1, 1));
                const y = margin.top + chartHeight - (chartHeight * (point.price - minPrice) / priceRange);
                
                if (index === 0) {
                    chart.moveTo(x, y);
                } else {
                    chart.lineTo(x, y);
                }
            });
            
            chart.stroke();
            
            // 绘制数据点
            chart.fillStyle = '#3b82f6';
            filteredData.forEach((point, index) => {
                const x = margin.left + (chartWidth * index / Math.max(filteredData.length - 1, 1));
                const y = margin.top + chartHeight - (chartHeight * (point.price - minPrice) / priceRange);
                
                chart.beginPath();
                chart.arc(x, y, 3, 0, 2 * Math.PI);
                chart.fill();
            });
            
            // 绘制Y轴标签（价格）
            chart.fillStyle = '#94a3b8';
            chart.font = '12px Arial';
            chart.textAlign = 'right';
            
            for (let i = 0; i <= 5; i++) {
                const price = minPrice + (priceRange * i / 5);
                const y = margin.top + chartHeight - (chartHeight * i / 5);
                chart.fillText(price.toFixed(6), margin.left - 5, y + 4);
            }
            
            // 绘制X轴标签（时间）
            chart.textAlign = 'center';
            if (filteredData.length > 1) {
                const firstTime = new Date(filteredData[0].timestampMs).toLocaleTimeString('zh-CN', {hour12: false});
                const lastTime = new Date(filteredData[filteredData.length - 1].timestampMs).toLocaleTimeString('zh-CN', {hour12: false});
                
                chart.fillText(firstTime, margin.left, height - 10);
                chart.fillText(lastTime, width - margin.right, height - 10);
                
                if (filteredData.length > 4) {
                    const midIndex = Math.floor(filteredData.length / 2);
                    const midTime = new Date(filteredData[midIndex].timestampMs).toLocaleTimeString('zh-CN', {hour12: false});
                    chart.fillText(midTime, width / 2, height - 10);
                }
            }
            
            // 绘制标题
            chart.fillStyle = '#f1f5f9';
            chart.font = 'bold 16px Arial';
            chart.textAlign = 'center';
            const startTime = new Date(windowStartTime).toLocaleTimeString('zh-CN', {hour12: false, hour: '2-digit', minute: '2-digit'});
            const endTime = new Date(now).toLocaleTimeString('zh-CN', {hour12: false, hour: '2-digit', minute: '2-digit'});
            chart.fillText('DOGE/USDT 实时价格走势 (' + startTime + ' - ' + endTime + ')', width / 2, 15);
            
            // 显示统计信息
            chart.fillStyle = '#94a3b8';
            chart.font = '11px Arial';
            chart.textAlign = 'right';
            
            if (filteredData.length >= 2) {
                const priceChange = filteredData[filteredData.length - 1].price - filteredData[0].price;
                const changePercent = (priceChange / filteredData[0].price) * 100;
                chart.fillText('数据点: ' + filteredData.length, width - 10, height - 30);
                
                chart.fillStyle = priceChange >= 0 ? '#22c55e' : '#ef4444';
                chart.fillText('变化: ' + (priceChange >= 0 ? '+' : '') + priceChange.toFixed(6) + ' (' + (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%)', width - 10, height - 15);
            }
        }
        
        // 切换时间范围
        function changeTimeRange(range) {
            chartTimeRange = range;
            
            // 更新按钮状态
            document.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('btn' + range).classList.add('active');
            
            // 更新显示文字
            const rangeNames = {
                '1m': '1分钟',
                '15m': '15分钟', 
                '1h': '1小时',
                '12h': '12小时'
            };
            document.getElementById('currentRange').textContent = rangeNames[range];
            
            // 重新绘制图表
            setTimeout(drawChart, 100);
        }
        
        // 切换数据流时间范围
        function changeDataTimeRange(range) {
            dataTimeRange = range;
            
            // 根据不同时间范围设置数据记录间隔
            let intervalText = '';
            switch(range) {
                case '1m': 
                    dataRecordInterval = 1000; // 每秒记录
                    intervalText = '每秒记录一次';
                    break;
                case '15m': 
                    dataRecordInterval = 60 * 1000; // 每分钟记录
                    intervalText = '每分钟记录一次';
                    break;
                case '1h': 
                    dataRecordInterval = 3 * 60 * 1000; // 每3分钟记录
                    intervalText = '每3分钟记录一次';
                    break;
                case '12h': 
                    dataRecordInterval = 36 * 60 * 1000; // 每36分钟记录
                    intervalText = '每36分钟记录一次';
                    break;
                default: 
                    dataRecordInterval = 60 * 1000;
                    intervalText = '每分钟记录一次';
            }
            
            // 更新按钮状态
            document.querySelectorAll('[id^="dataBtn"]').forEach(btn => btn.classList.remove('active'));
            document.getElementById('dataBtn' + range).classList.add('active');
            
            // 更新显示文字
            const rangeNames = {
                '1m': '1分钟',
                '15m': '15分钟', 
                '1h': '1小时',
                '12h': '12小时'
            };
            document.getElementById('currentDataRange').textContent = rangeNames[range];
            document.getElementById('dataInterval').textContent = intervalText;
            
            // 切换到对应时间范围的数据流
            data = dataStreams[range];
            
            // 重新更新数据表格
            setTimeout(updateDataTable, 100);
        }
        
        // 获取数据
        async function fetchOkxTicker() {
            try {
                const headers = {};
                if (credentials) {
                    headers['ok-access-key'] = credentials.apiKey;
                    headers['ok-access-secret'] = credentials.apiSecret;
                    headers['ok-access-passphrase'] = credentials.passphrase;
                }

                const response = await fetch('/api/okx/ticker?symbol=DOGE-USDT', { headers });

                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }

                const result = await response.json();
                
                if (result.code === '0' && result.data && result.data.length > 0) {
                    const tickerData = result.data[0];
                    const now = new Date();
                    
                    return {
                        symbol: tickerData.instId,
                        price: parseFloat(tickerData.last),
                        change24h: parseFloat(tickerData.last) - parseFloat(tickerData.open24h),
                        changePercent24h: ((parseFloat(tickerData.last) - parseFloat(tickerData.open24h)) / parseFloat(tickerData.open24h)),
                        volume: parseFloat(tickerData.vol24h || '0'),
                        timestamp: now.toLocaleTimeString(),
                        timestampMs: now.getTime()
                    };
                } else {
                    throw new Error(result.msg || 'API返回错误数据');
                }
            } catch (err) {
                console.error('获取OKX数据失败:', err);
                throw err;
            }
        }
        
        // 添加新数据
        async function addNewDataEntry() {
            try {
                const newData = await fetchOkxTicker();
                const now = newData.timestampMs;
                
                // 为每个时间范围独立检查和记录数据
                Object.keys(recordIntervals).forEach(timeRange => {
                    const interval = recordIntervals[timeRange];
                    const shouldRecord = (now - lastRecordTimes[timeRange]) >= interval;
                    
                    if (shouldRecord) {
                        // 计算相对于该时间范围上一次记录的变化率
                        let change = 0;
                        let changePercent = 0;
                        let volumeChange = 0;
                        
                        const streamData = dataStreams[timeRange];
                        if (streamData.length > 0) {
                            const lastRecord = streamData[0];
                            change = newData.price - lastRecord.price;
                            changePercent = (change / lastRecord.price) * 100;
                            volumeChange = newData.volume - lastRecord.volume;
                        }
                        
                        // 创建包含计算后变化率的数据对象
                        const dataWithChange = {
                            ...newData,
                            change: change,
                            changePercent: changePercent,
                            volumeChange: volumeChange,
                            timeRange: timeRange  // 标记数据来源
                        };
                        
                        // 添加到对应时间范围的数据流（保持最多20条记录）
                        dataStreams[timeRange] = [dataWithChange, ...streamData.slice(0, 19)];
                        lastRecordTimes[timeRange] = now;
                    }
                });
                
                // 更新当前显示的数据流引用
                data = dataStreams[dataTimeRange];
                
                // 无论是否记录到数据流，都要更新图表数据
                chartData.push({
                    price: newData.price,
                    timestamp: newData.timestamp,
                    timestampMs: newData.timestampMs
                });
                
                // 保留12小时的图表数据 (43200秒)
                if (chartData.length > 43200) {
                    chartData = chartData.slice(-43200);
                }
                
                currentPrice = newData.price;
                lastUpdate = new Date().toLocaleTimeString();
                error = null;
                
                // 更新界面
                updateDisplay();
                
                // 更新图表
                setTimeout(drawChart, 50);
                
            } catch (err) {
                error = '获取数据失败: ' + err.message;
                console.error(error);
                updateDisplay();
            }
        }
        
        // 更新显示
        function updateDisplay() {
            document.getElementById('currentPrice').textContent = 
                currentPrice ? currentPrice.toFixed(6) + ' USDT' : '加载中...';
            
            // 计算运行时间
            const now = new Date();
            const runTimeMs = now - serverStartTime;
            const hours = Math.floor(runTimeMs / (1000 * 60 * 60));
            const minutes = Math.floor((runTimeMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((runTimeMs % (1000 * 60)) / 1000);
            const runTimeStr = String(hours).padStart(2, '0') + ':' + 
                              String(minutes).padStart(2, '0') + ':' + 
                              String(seconds).padStart(2, '0');
            
            document.getElementById('runTime').textContent = runTimeStr;
            document.getElementById('lastUpdate').textContent = lastUpdate || '从未';
            document.getElementById('status').textContent = error || '✅ 正常';
            document.getElementById('status').className = error ? 'error' : 'success';
            
            // 更新数据表格
            updateDataTable();
        }
        
        // 更新数据表格
        function updateDataTable() {
            const tableBody = document.getElementById('dataTable');
            
            if (!data.length) {
                tableBody.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center; color: #64748b;">暂无数据</div></div>';
                return;
            }
            
            const rows = data.map((item, index) => {
                const changeColor = item.change >= 0 ? '#22c55e' : '#ef4444';
                const changeIcon = item.change >= 0 ? '📈' : '📉';
                const volumeChangeColor = item.volumeChange >= 0 ? '#22c55e' : '#ef4444';
                const volumeChangeIcon = item.volumeChange >= 0 ? '📈' : '📉';
                
                return '<div class="table-row">' +
                    '<div>' + item.timestamp + '</div>' +
                    '<div>' + item.price.toFixed(6) + '</div>' +
                    '<div style="color: ' + changeColor + ';">' +
                        changeIcon + ' ' + (item.change >= 0 ? '+' : '') + item.change.toFixed(6) +
                    '</div>' +
                    '<div style="color: ' + changeColor + ';">' +
                        (item.changePercent >= 0 ? '+' : '') + item.changePercent.toFixed(2) + '%' +
                    '</div>' +
                    '<div style="color: ' + volumeChangeColor + ';">' +
                        volumeChangeIcon + ' ' + (item.volumeChange >= 0 ? '+' : '') + item.volumeChange.toLocaleString() +
                    '</div>' +
                    '<div>' + item.volume.toLocaleString() + '</div>' +
                '</div>';
            }).join('');
            
            tableBody.innerHTML = rows;
        }
        
        // 开始数据获取
        function startDataFetch() {
            addNewDataEntry();
            setInterval(addNewDataEntry, 1000);
        }
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 DOGE实时数据服务器启动成功!');
  console.log('📊 访问地址: http://localhost:' + PORT);
  console.log('💡 在浏览器中打开上述地址即可使用');
}); 