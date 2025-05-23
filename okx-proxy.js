const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 提供静态文件 (React build)
app.use(express.static(path.join(__dirname, 'build')));

// 默认API凭证（可通过请求头覆盖）
const API_KEY = '3b91c6b4-fcc9-4a59-b73a-a45b2506e5e7';
const API_SECRET = '80867A32C659E547E57B682615F0E522';
const PASSPHRASE = 'YourPassphrase123'; // 请替换为你在OKX创建API时设置的英文passphrase

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

// API路由：获取K线数据
app.get('/api/okx/kline', async (req, res) => {
  try {
    const apiKey = req.headers['ok-access-key'] || API_KEY;
    const apiSecret = req.headers['ok-access-secret'] || API_SECRET;
    const passphrase = req.headers['ok-access-passphrase'] || PASSPHRASE;

    const { symbol = 'DOGE-USDT', bar = '1h', start, end, limit = 100 } = req.query;
    const requestPath = `/api/v5/market/candles?instId=${symbol}&bar=${bar}&after=${start}&before=${end}&limit=${limit}`;
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
    console.error('KLine API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 所有其他路由返回React应用
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`统一服务器运行在 http://localhost:${PORT}`);
  console.log('前端和API服务已集成在一个端口上');
});