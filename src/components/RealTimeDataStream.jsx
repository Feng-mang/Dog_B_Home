import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Alert, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const RealTimeDataStream = ({ credentials }) => {
  const [data, setData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchOkxTicker = async () => {
    try {
      const headers = {};
      if (credentials) {
        headers['ok-access-key'] = credentials.apiKey;
        headers['ok-access-secret'] = credentials.apiSecret;
        headers['ok-access-passphrase'] = credentials.passphrase;
      }

      const response = await fetch('/api/okx/ticker?symbol=DOGE-USDT', {
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.code === '0' && result.data && result.data.length > 0) {
        const tickerData = result.data[0];
        return {
          symbol: tickerData.instId,
          price: parseFloat(tickerData.last),
          change: parseFloat(tickerData.chgUtc),
          changePercent: parseFloat(tickerData.chgUtcPct),
          volume: parseFloat(tickerData.vol24h),
          timestamp: new Date().toLocaleTimeString()
        };
      } else {
        throw new Error(result.msg || 'API返回错误数据');
      }
    } catch (err) {
      console.error('获取OKX数据失败:', err);
      throw err;
    }
  };

  const addNewDataEntry = async () => {
    try {
      const newData = await fetchOkxTicker();
      
      setData(prevData => {
        const updated = [newData, ...prevData.slice(0, 19)];
        return updated;
      });
      
      if (currentPrice !== null) {
        setPriceChange(newData.price - currentPrice);
      }
      
      setCurrentPrice(newData.price);
      setLastUpdate(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      setError(`获取数据失败: ${err.message}`);
    }
  };

  useEffect(() => {
    addNewDataEntry();
    const interval = setInterval(addNewDataEntry, 2000);
    return () => clearInterval(interval);
  }, [credentials]);

  const formatPrice = (price) => {
    return price ? price.toFixed(6) : '0.000000';
  };

  const formatChange = (change) => {
    return change ? (change >= 0 ? `+${change.toFixed(6)}` : change.toFixed(6)) : '0.000000';
  };

  const formatPercent = (percent) => {
    return percent ? `${(percent * 100).toFixed(2)}%` : '0.00%';
  };

  if (error) {
    return (
      <Alert
        message="数据获取错误"
        description={error}
        type="error"
        showIcon
        style={{ margin: '20px 0' }}
      />
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>DOGE/USDT 实时数据</h2>
      
      {currentPrice && (
        <Row gutter={16} style={{ marginBottom: '20px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="当前价格"
                value={formatPrice(currentPrice)}
                precision={6}
                suffix="USDT"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="价格变化"
                value={formatChange(priceChange)}
                precision={6}
                valueStyle={{ color: priceChange >= 0 ? '#3f8600' : '#cf1322' }}
                prefix={priceChange >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                suffix="USDT"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="24h变化率"
                value={data[0] ? formatPercent(data[0].changePercent) : '0.00%'}
                valueStyle={{ color: data[0] && data[0].changePercent >= 0 ? '#3f8600' : '#cf1322' }}
                prefix={data[0] && data[0].changePercent >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="24h交易量"
                value={data[0] ? data[0].volume.toFixed(0) : '0'}
                suffix="DOGE"
              />
            </Card>
          </Col>
        </Row>
      )}

      {lastUpdate && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Tag color="blue">最后更新: {lastUpdate}</Tag>
        </div>
      )}

      <Card title="实时数据流" style={{ maxHeight: '400px', overflow: 'auto' }}>
        {data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>加载中...</div>
        ) : (
          data.map((item, index) => (
            <div
              key={index}
              style={{
                padding: '10px',
                borderBottom: '1px solid #f0f0f0',
                backgroundColor: index === 0 ? '#f6ffed' : 'transparent'
              }}
            >
              <Row>
                <Col span={4}>
                  <strong>{item.symbol}</strong>
                </Col>
                <Col span={4}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    ${formatPrice(item.price)}
                  </span>
                </Col>
                <Col span={4}>
                  <span style={{ color: item.change >= 0 ? '#52c41a' : '#ff4d4f' }}>
                    {formatChange(item.change)}
                  </span>
                </Col>
                <Col span={4}>
                  <span style={{ color: item.changePercent >= 0 ? '#52c41a' : '#ff4d4f' }}>
                    {formatPercent(item.changePercent)}
                  </span>
                </Col>
                <Col span={4}>
                  <span>{item.volume.toFixed(0)} DOGE</span>
                </Col>
                <Col span={4}>
                  <span style={{ color: '#666' }}>{item.timestamp}</span>
                </Col>
              </Row>
            </div>
          ))
        )}
      </Card>
    </div>
  );
};

export default RealTimeDataStream; 