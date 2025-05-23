const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 默认API凭证（可通过请求头覆盖）
const API_KEY = '3b91c6b4-fcc9-4a59-b73a-a45b2506e5e7';
const API_SECRET = '80867A32C659E547E57B682615F0E522';
const PASSPHRASE = '123'; // 请替换为你在OKX创建API时设置的英文passphrase

// 添加正确的passphrase用于验证（你应该替换为真实的passphrase）
const CORRECT_PASSPHRASE = 'YourRealPassphrase2024'; // 请设置为您的真实passphrase

function getSign(timestamp, method, requestPath, body = '', apiSecret) {
  const preHash = timestamp + method + requestPath + body;
  return crypto.createHmac('sha256', apiSecret).update(preHash).digest('base64');
}

// API路由：获取实时ticker数据
app.get('/api/okx/ticker', async (req, res) => {
  try {
    // 从请求头获取API凭证，如果没有则使用默认值
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

// 验证passphrase的API端点
app.post('/api/verify-passphrase', (req, res) => {
  try {
    const { passphrase } = req.body;
    
    if (!passphrase) {
      return res.status(400).json({ 
        success: false, 
        message: '请输入Passphrase！' 
      });
    }
    
    if (passphrase === 'YourPassphrase123') {
      return res.status(400).json({ 
        success: false, 
        message: '请输入您的真实Passphrase，而非默认值！' 
      });
    }
    
    // 验证passphrase是否正确
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

// 提供简单的HTML页面
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DOGE实时数据监控</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body { 
            font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #1a1a2e 100%);
            background-attachment: fixed;
            color: #e1e5e9;
            min-height: 100vh;
            position: relative;
        }
        
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(34, 197, 94, 0.08) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(168, 85, 247, 0.05) 0%, transparent 50%);
            pointer-events: none;
            z-index: -1;
        }
        
        .login-form { 
            max-width: 420px; 
            margin: 100px auto; 
            padding: 40px; 
            background: rgba(30, 41, 59, 0.9);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 20px; 
            box-shadow: 
                0 25px 50px -12px rgba(0, 0, 0, 0.5),
                0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        }
        
        .data-container { 
            max-width: 1400px; 
            margin: 0 auto; 
            padding: 20px;
        }
        
        .card { 
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 16px; 
            padding: 24px; 
            margin-bottom: 20px;
            box-shadow: 
                0 10px 15px -3px rgba(0, 0, 0, 0.3),
                0 0 0 1px rgba(255, 255, 255, 0.05) inset;
            transition: all 0.3s ease;
        }
        
        .btn { 
            padding: 12px 24px; 
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white; 
            border: none; 
            border-radius: 12px; 
            cursor: pointer; 
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }
        
        .btn:hover { 
            background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
        }
        
        .form-input { 
            width: 100%; 
            padding: 14px 16px; 
            background: rgba(51, 65, 85, 0.8);
            border: 1px solid rgba(71, 85, 105, 0.4);
            border-radius: 12px; 
            color: #e1e5e9;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        
        .chart-canvas { 
            border: 1px solid rgba(71, 85, 105, 0.3); 
            border-radius: 16px; 
            width: 100%; 
            height: 350px; 
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%);
            display: block; 
        }
        
        .period-btn { 
            padding: 10px 20px; 
            background: rgba(51, 65, 85, 0.6); 
            color: #cbd5e1; 
            border: 1px solid rgba(71, 85, 105, 0.4);
            border-radius: 24px; 
            cursor: pointer; 
            font-weight: 600;
            transition: all 0.3s ease;
            font-size: 14px;
            margin: 4px;
        }
        
        .period-btn.active { 
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white; 
            border-color: #3b82f6;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }
    </style>
</head>
<body>
    <div id="root">
        <div style="text-align: center; padding: 50px;">加载中...</div>
    </div>

    <script>
        // 预设的API凭证
        const API_KEY = '3b91c6b4-fcc9-4a59-b73a-a45b2506e5e7';
        const API_SECRET = '80867A32C659E547E57B682615F0E522';
        
        // 应用状态
        let isLoggedIn = false;
        let credentials = null;
        let data = [];
        let currentPrice = null;
        let error = null;
        let lastUpdate = null;
        let selectedPeriod = '24h';
        let chartTimeRange = '15m';
        let historicalData = [];
        let chartData = [];
        let chart = null;
        let previousVolume = null;
        let priceAlertEnabled = false;
        let priceAlertUnit = 'second';
        let priceAlertThreshold = 0.001;

        // 工具函数
        function getPeriodName(period) {
            switch(period) {
                case '1m': return '1分钟';
                case '15m': return '15分钟';
                case '1h': return '1小时';
                case '24h': return '24小时';
                case 'second': return '每秒';
                case 'minute': return '每分钟';
                case 'hour': return '每小时';
                default: return '24小时';
            }
        }
        
        function getTimeRangeName(range) {
            switch(range) {
                case '1m': return '1分钟';
                case '15m': return '15分钟';
                case '1h': return '1小时';
                case '12h': return '12小时';
                default: return '15分钟';
            }
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
            
            if (chartData.length < 2) return;
            
            // 根据选择的时间范围过滤数据（滑动窗口）
            let displayData = [];
            let targetDataPoints;
            const now = new Date().getTime();
            let timeRangeMs;
            
            switch(chartTimeRange) {
                case '1m':
                    timeRangeMs = 60 * 1000;
                    targetDataPoints = 60;
                    break;
                case '15m':
                    timeRangeMs = 15 * 60 * 1000;
                    targetDataPoints = 90;
                    break;
                case '1h':
                    timeRangeMs = 60 * 60 * 1000;
                    targetDataPoints = 120;
                    break;
                case '12h':
                    timeRangeMs = 12 * 60 * 60 * 1000;
                    targetDataPoints = 144;
                    break;
                default:
                    timeRangeMs = 15 * 60 * 1000;
                    targetDataPoints = 90;
            }
            
            // 计算时间窗口的开始时间
            const windowStartTime = now - timeRangeMs;
            
            console.log('[DEBUG] 图表时间窗口: ' + new Date(windowStartTime).toLocaleTimeString() + ' - ' + new Date(now).toLocaleTimeString() + ' (' + getTimeRangeName(chartTimeRange) + ')');
            
            // 过滤指定时间范围内的数据
            const filteredData = chartData.filter(point => {
                return point.timestampMs >= windowStartTime && point.timestampMs <= now;
            }).sort((a, b) => a.timestampMs - b.timestampMs);
            
            console.log('[DEBUG] 过滤后数据点数量: ' + filteredData.length + ' (目标: ' + targetDataPoints + ' 个点)');
            
            // 智能抽样数据
            if (filteredData.length === 0) {
                displayData = [];
            } else if (filteredData.length <= targetDataPoints) {
                displayData = filteredData;
            } else {
                displayData = [];
                const step = Math.floor(filteredData.length / targetDataPoints);
                
                displayData.push(filteredData[0]);
                
                for (let i = step; i < filteredData.length - step; i += step) {
                    displayData.push(filteredData[i]);
                }
                
                if (filteredData.length > 1) {
                    displayData.push(filteredData[filteredData.length - 1]);
                }
            }
            
            if (displayData.length < 2) {
                chart.fillStyle = '#94a3b8';
                chart.font = '16px Arial';
                chart.textAlign = 'center';
                chart.fillText('数据收集中...', width / 2, height / 2);
                chart.fillText('需要' + getTimeRangeName(chartTimeRange) + '的数据', width / 2, height / 2 + 25);
                chart.fillText('当前已收集 ' + displayData.length + ' 个数据点', width / 2, height / 2 + 50);
                return;
            }
            
            // 计算价格范围
            const prices = displayData.map(d => d.price);
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
            
            displayData.forEach((point, index) => {
                const x = margin.left + (chartWidth * index / Math.max(displayData.length - 1, 1));
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
            displayData.forEach((point, index) => {
                const x = margin.left + (chartWidth * index / Math.max(displayData.length - 1, 1));
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
            if (displayData.length > 1) {
                const firstTime = new Date(displayData[0].timestampMs).toLocaleTimeString('zh-CN', {hour12: false});
                const lastTime = new Date(displayData[displayData.length - 1].timestampMs).toLocaleTimeString('zh-CN', {hour12: false});
                
                chart.fillText(firstTime, margin.left, height - 10);
                chart.fillText(lastTime, width - margin.right, height - 10);
                
                if (displayData.length > 4) {
                    const midIndex = Math.floor(displayData.length / 2);
                    const midTime = new Date(displayData[midIndex].timestampMs).toLocaleTimeString('zh-CN', {hour12: false});
                    chart.fillText(midTime, width / 2, height - 10);
                }
            }
            
            // 绘制标题
            chart.fillStyle = '#f1f5f9';
            chart.font = 'bold 16px Arial';
            chart.textAlign = 'center';
            if (displayData.length > 0) {
                const startTime = new Date(windowStartTime).toLocaleTimeString('zh-CN', {hour12: false, hour: '2-digit', minute: '2-digit'});
                const endTime = new Date(now).toLocaleTimeString('zh-CN', {hour12: false, hour: '2-digit', minute: '2-digit'});
                chart.fillText('DOGE/USDT 实时价格走势 (' + startTime + ' - ' + endTime + ')', width / 2, 15);
            } else {
                chart.fillText('DOGE/USDT 实时价格走势 - ' + getTimeRangeName(chartTimeRange), width / 2, 15);
            }
            
            // 显示数据点数量和价格变化
            chart.fillStyle = '#94a3b8';
            chart.font = '11px Arial';
            chart.textAlign = 'right';
            
            if (displayData.length >= 2) {
                const priceChange = displayData[displayData.length - 1].price - displayData[0].price;
                const changePercent = (priceChange / displayData[0].price) * 100;
                chart.fillText('数据点: ' + displayData.length, width - 10, height - 30);
                
                chart.fillStyle = priceChange >= 0 ? '#22c55e' : '#ef4444';
                chart.fillText('变化: ' + (priceChange >= 0 ? '+' : '') + priceChange.toFixed(6) + ' (' + (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%)', width - 10, height - 15);
            } else {
                chart.fillText('数据点: ' + displayData.length, width - 10, height - 30);
                chart.fillText('等待更多数据...', width - 10, height - 15);
            }
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

        // 全局函数
        window.changeChartTimeRange = (range) => {
            chartTimeRange = range;
            console.log('[DEBUG] 切换图表时间范围到: ' + range);
            
            // 更新按钮状态
            document.querySelectorAll('.chart-period-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector('.chart-period-btn[data-range="' + range + '"]').classList.add('active');
            
            // 重新绘制图表
            setTimeout(() => {
                drawChart();
            }, 100);
        };

        // 渲染函数
        function render() {
            const root = document.getElementById('root');
            
            if (!isLoggedIn) {
                root.innerHTML = 
                    '<div class="login-form">' +
                        '<div class="card">' +
                            '<h2 style="text-align: center; margin-bottom: 20px;">🔐 DOGE监控系统登录</h2>' +
                            '<form id="loginForm">' +
                                '<input class="form-input" name="passphrase" type="password" placeholder="请输入您的API Passphrase" required autofocus style="margin-bottom: 16px;">' +
                                '<button type="submit" class="btn" style="width: 100%;">🚀 登录系统</button>' +
                            '</form>' +
                            '<div style="margin-top: 16px; font-size: 12px; color: #666; text-align: center;">' +
                                '<p>📋 测试密码：YourRealPassphrase2024</p>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                
                document.getElementById('loginForm').onsubmit = async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const passphrase = formData.get('passphrase');
                    
                    try {
                        const response = await fetch('/api/verify-passphrase', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ passphrase: passphrase })
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            credentials = {
                                apiKey: API_KEY,
                                apiSecret: API_SECRET,
                                passphrase: passphrase.trim()
                            };
                            isLoggedIn = true;
                            render();
                            setTimeout(() => {
                                initChart();
                                startDataFetch();
                            }, 100);
                        } else {
                            alert(result.message);
                        }
                    } catch (error) {
                        alert('⚠️ 网络错误，请检查连接后重试！');
                    }
                };
                return;
            }

            root.innerHTML = 
                '<div class="data-container">' +
                    '<div style="text-align: center; margin-bottom: 20px;">' +
                        '<h1>狗币之家</h1>' +
                        '<button class="btn" onclick="logout()">退出登录</button>' +
                    '</div>' +
                    
                    '<!-- 统计卡片区域 -->' +
                    '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px;">' +
                        '<div class="card">' +
                            '<h4>💰 当前价格</h4>' +
                            '<div style="font-size: 24px; font-weight: bold; color: #3b82f6;">' +
                                (currentPrice ? currentPrice.toFixed(6) : '加载中...') + ' USDT' +
                            '</div>' +
                        '</div>' +
                        '<div class="card">' +
                            '<h4>📊 数据点数</h4>' +
                            '<div style="font-size: 24px; font-weight: bold; color: #10b981;">' +
                                data.length + '/20' +
                            '</div>' +
                        '</div>' +
                        '<div class="card">' +
                            '<h4>⏱️ 最后更新</h4>' +
                            '<div style="font-size: 16px; color: #64748b;">' +
                                (lastUpdate || '从未') +
                            '</div>' +
                        '</div>' +
                        '<div class="card">' +
                            '<h4>⚠️ 状态</h4>' +
                            '<div style="font-size: 16px; color: ' + (error ? '#ef4444' : '#22c55e') + ';">' +
                                (error || '✅ 正常') +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    
                    '<!-- 实时价格走势图 -->' +
                    '<div class="card">' +
                        '<h3>📈 实时价格走势图</h3>' +
                        '<canvas id="priceChart" class="chart-canvas"></canvas>' +
                        
                        '<div style="text-align: center; margin-top: 16px;">' +
                            '<button class="period-btn chart-period-btn ' + (chartTimeRange === '1m' ? 'active' : '') + '" data-range="1m" onclick="changeChartTimeRange(\'1m\')">1分钟</button>' +
                            '<button class="period-btn chart-period-btn ' + (chartTimeRange === '15m' ? 'active' : '') + '" data-range="15m" onclick="changeChartTimeRange(\'15m\')">15分钟</button>' +
                            '<button class="period-btn chart-period-btn ' + (chartTimeRange === '1h' ? 'active' : '') + '" data-range="1h" onclick="changeChartTimeRange(\'1h\')">1小时</button>' +
                            '<button class="period-btn chart-period-btn ' + (chartTimeRange === '12h' ? 'active' : '') + '" data-range="12h" onclick="changeChartTimeRange(\'12h\')">12小时</button>' +
                        '</div>' +
                        '<div style="margin-top: 8px; color: #94a3b8; font-size: 12px; text-align: center;">' +
                            '📊 当前显示：最近' + getTimeRangeName(chartTimeRange) + '的价格走势（滑动时间窗口）' +
                        '</div>' +
                    '</div>' +
                    
                    '<!-- 实时数据流 -->' +
                    '<div class="card">' +
                        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">' +
                            '<h3>📊 实时数据流</h3>' +
                            '<div>' +
                                '<button class="period-btn ' + (selectedPeriod === '1m' ? 'active' : '') + '" onclick="changePeriod(\'1m\')">1分钟</button>' +
                                '<button class="period-btn ' + (selectedPeriod === '15m' ? 'active' : '') + '" onclick="changePeriod(\'15m\')">15分钟</button>' +
                                '<button class="period-btn ' + (selectedPeriod === '1h' ? 'active' : '') + '" onclick="changePeriod(\'1h\')">1小时</button>' +
                                '<button class="period-btn ' + (selectedPeriod === '24h' ? 'active' : '') + '" onclick="changePeriod(\'24h\')">24小时</button>' +
                            '</div>' +
                        '</div>' +
                        
                        '<div class="data-table">' +
                            '<div class="table-header">' +
                                '<div class="table-cell">时间</div>' +
                                '<div class="table-cell">价格 (USDT)</div>' +
                                '<div class="table-cell">变化</div>' +
                                '<div class="table-cell">变化率</div>' +
                                '<div class="table-cell">成交量 (DOGE)</div>' +
                            '</div>' +
                            '<div class="table-body" id="dataTableBody">' +
                                renderDataRows() +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    
                    '<!-- 价格预警设置 -->' +
                    '<div class="card">' +
                        '<h3>🚨 价格预警设置</h3>' +
                        '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">' +
                            '<div class="form-group">' +
                                '<label>' +
                                    '<input type="checkbox" id="alertEnabled" ' + (priceAlertEnabled ? 'checked' : '') + ' onchange="toggleVolumeAlert()">' +
                                    '启用监控' +
                                '</label>' +
                                '<label>监控周期:</label>' +
                                '<select class="alert-select" id="alertUnit" onchange="changeAlertUnit()">' +
                                    '<option value="second" ' + (priceAlertUnit === 'second' ? 'selected' : '') + '>每秒</option>' +
                                    '<option value="minute" ' + (priceAlertUnit === 'minute' ? 'selected' : '') + '>每分钟</option>' +
                                    '<option value="hour" ' + (priceAlertUnit === 'hour' ? 'selected' : '') + '>每小时</option>' +
                                '</select>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label>变化阈值:</label>' +
                                '<div style="display: flex; align-items: center; gap: 8px;">' +
                                    '<input type="number" id="alertThreshold" class="alert-input" value="' + (priceAlertThreshold * 100).toFixed(3) + '" step="0.001" min="0" max="100" onchange="changeAlertThreshold()">' +
                                    '<span>%</span>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div id="alertStatus" class="alert-status">' +
                            (priceAlertEnabled ? 
                                '✅ 价格监控已启用 - 阈值: ' + (priceAlertThreshold * 100).toFixed(3) + '% (' + getPeriodName(priceAlertUnit) + ')' : 
                                '❌ 价格监控已禁用'
                            ) +
                        '</div>' +
                    '</div>' +
                '</div>';
            
            // 重新初始化图表
            setTimeout(() => {
                if (document.getElementById('priceChart')) {
                    initChart();
                }
            }, 100);
        }

        // 渲染数据表格行
        function renderDataRows() {
            if (!data.length) {
                return '<div class="table-row"><div class="table-cell" style="grid-column: 1/-1; text-align: center; color: #64748b;">暂无数据</div></div>';
            }
            
            return data.map((item, index) => {
                const changeColor = item.change24h >= 0 ? '#22c55e' : '#ef4444';
                const changeIcon = item.change24h >= 0 ? '📈' : '📉';
                
                return '<div class="table-row">' +
                    '<div class="table-cell">' + item.timestamp + '</div>' +
                    '<div class="table-cell">' + item.price.toFixed(6) + '</div>' +
                    '<div class="table-cell" style="color: ' + changeColor + ';">' +
                        changeIcon + ' ' + (item.change24h >= 0 ? '+' : '') + item.change24h.toFixed(6) +
                    '</div>' +
                    '<div class="table-cell" style="color: ' + changeColor + ';">' +
                        (item.changePercent24h * 100).toFixed(2) + '%' +
                    '</div>' +
                    '<div class="table-cell">' + item.volume.toLocaleString() + '</div>' +
                '</div>';
            }).join('');
        }

        // 周期切换功能
        window.changePeriod = (period) => {
            selectedPeriod = period;
            render();
        };

        // 价格预警功能
        window.toggleVolumeAlert = () => {
            const enabled = document.getElementById('alertEnabled').checked;
            priceAlertEnabled = enabled;
            render();
        };

        window.changeAlertUnit = () => {
            const unit = document.getElementById('alertUnit').value;
            priceAlertUnit = unit;
            render();
        };

        window.changeAlertThreshold = () => {
            const threshold = parseFloat(document.getElementById('alertThreshold').value);
            priceAlertThreshold = threshold / 100;
            render();
        };

        // CSS样式更新
        const additionalStyles = 
            '.data-table {' +
                'border: 1px solid rgba(71, 85, 105, 0.3);' +
                'border-radius: 12px;' +
                'overflow: hidden;' +
                'background: rgba(15, 23, 42, 0.6);' +
            '}' +
            
            '.table-header {' +
                'display: grid;' +
                'grid-template-columns: 1fr 1.2fr 1fr 1fr 1.2fr;' +
                'background: rgba(51, 65, 85, 0.8);' +
                'font-weight: 600;' +
                'font-size: 14px;' +
            '}' +
            
            '.table-body {' +
                'max-height: 400px;' +
                'overflow-y: auto;' +
            '}' +
            
            '.table-row {' +
                'display: grid;' +
                'grid-template-columns: 1fr 1.2fr 1fr 1fr 1.2fr;' +
                'border-bottom: 1px solid rgba(71, 85, 105, 0.2);' +
                'transition: background-color 0.2s ease;' +
            '}' +
            
            '.table-row:hover {' +
                'background: rgba(51, 65, 85, 0.4);' +
            '}' +
            
            '.table-row:last-child {' +
                'border-bottom: none;' +
            '}' +
            
            '.table-cell {' +
                'padding: 12px 16px;' +
                'display: flex;' +
                'align-items: center;' +
                'font-size: 14px;' +
                'border-right: 1px solid rgba(71, 85, 105, 0.2);' +
            '}' +
            
            '.table-cell:last-child {' +
                'border-right: none;' +
            '}' +
            
            '.form-group {' +
                'display: flex;' +
                'flex-direction: column;' +
                'gap: 8px;' +
            '}' +
            
            '.form-group label {' +
                'font-size: 14px;' +
                'font-weight: 600;' +
                'color: #e1e5e9;' +
            '}' +
            
            '.alert-select, .alert-input {' +
                'padding: 8px 12px;' +
                'background: rgba(51, 65, 85, 0.8);' +
                'border: 1px solid rgba(71, 85, 105, 0.4);' +
                'border-radius: 8px;' +
                'color: #e1e5e9;' +
                'font-size: 14px;' +
            '}' +
            
            '.alert-status {' +
                'padding: 12px 16px;' +
                'background: rgba(51, 65, 85, 0.6);' +
                'border-radius: 8px;' +
                'font-size: 14px;' +
                'font-weight: 600;' +
            '}';
        
        // 添加额外样式
        const styleSheet = document.createElement('style');
        styleSheet.textContent = additionalStyles;
        document.head.appendChild(styleSheet);

        // 数据获取函数
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

        async function addNewDataEntry() {
            try {
                const newData = await fetchOkxTicker();
                
                data = [newData, ...data.slice(0, 19)];
                
                chartData.push({
                    price: newData.price,
                    timestamp: newData.timestamp,
                    timestampMs: newData.timestampMs
                });
                
                if (chartData.length > 43200) {
                    chartData = chartData.slice(-43200);
                }
                
                currentPrice = newData.price;
                lastUpdate = new Date().toLocaleTimeString();
                error = null;
                
                // 更新界面
                render();
                
                // 更新图表
                setTimeout(() => {
                    drawChart();
                }, 50);
                
            } catch (err) {
                error = '获取数据失败: ' + err.message;
                console.error(error);
                render(); // 更新错误状态
            }
        }

        function startDataFetch() {
            addNewDataEntry();
            setInterval(addNewDataEntry, 1000);
        }

        window.logout = () => {
            isLoggedIn = false;
            credentials = null;
            data = [];
            currentPrice = null;
            error = null;
            lastUpdate = null;
            historicalData = [];
            chartData = [];
            selectedPeriod = '24h';
            chartTimeRange = '15m';
            chart = null;
            render();
        };

        // 启动应用
        render();
    </script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 DOGE实时数据服务器启动成功!`);
  console.log(`📊 访问地址: http://localhost:${PORT}`);
  console.log(`💡 在浏览器中打开上述地址即可使用`);
}); 