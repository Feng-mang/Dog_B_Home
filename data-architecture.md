# DOGE数据收集与AI训练架构设计

## 1. 数据库架构

### 主数据库：PostgreSQL + TimescaleDB
```sql
-- 实时价格数据表（时序数据）
CREATE TABLE price_data (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    volume_24h DECIMAL(20,2),
    change_24h DECIMAL(18,8),
    change_percent_24h DECIMAL(8,4),
    high_24h DECIMAL(18,8),
    low_24h DECIMAL(18,8),
    market_cap DECIMAL(20,2),
    source VARCHAR(50) DEFAULT 'okx'
);

-- 创建时序表（TimescaleDB扩展）
SELECT create_hypertable('price_data', 'timestamp');

-- 技术指标数据表
CREATE TABLE technical_indicators (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    rsi_14 DECIMAL(8,4),
    macd DECIMAL(18,8),
    bollinger_upper DECIMAL(18,8),
    bollinger_lower DECIMAL(18,8),
    sma_20 DECIMAL(18,8),
    ema_50 DECIMAL(18,8),
    volume_profile JSONB
);

-- 市场情绪数据表
CREATE TABLE market_sentiment (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    fear_greed_index INTEGER,
    social_mentions INTEGER,
    news_sentiment DECIMAL(4,2),
    whale_movements JSONB,
    funding_rates DECIMAL(8,6)
);

-- AI训练数据集表
CREATE TABLE ai_training_datasets (
    id BIGSERIAL PRIMARY KEY,
    dataset_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    feature_count INTEGER,
    sample_count INTEGER,
    file_path TEXT,
    model_version VARCHAR(50),
    accuracy DECIMAL(6,4),
    status VARCHAR(20) DEFAULT 'processing'
);

-- 预测结果表
CREATE TABLE ai_predictions (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    prediction_type VARCHAR(50), -- price_1h, price_24h, trend_direction
    predicted_value DECIMAL(18,8),
    confidence DECIMAL(4,2),
    actual_value DECIMAL(18,8),
    accuracy DECIMAL(6,4)
);
```

### 缓存数据库：Redis
```redis
# 实时数据缓存
SET doge:current:price "0.123456"
SET doge:current:volume "1234567890"
HSET doge:indicators rsi "65.4" macd "0.0012"

# 历史数据缓存（最近1小时）
ZADD doge:price:1h timestamp1 price1 timestamp2 price2

# AI模型缓存
SET ai:model:latest:version "v1.2.3"
SET ai:model:latest:accuracy "0.8567"
```

## 2. 数据收集架构

### Node.js数据收集服务
```javascript
// data-collector.js
const { Pool } = require('pg');
const Redis = require('redis');

class DataCollector {
    constructor() {
        // PostgreSQL连接
        this.db = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });
        
        // Redis连接
        this.redis = Redis.createClient({
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT
        });
    }

    // 保存实时价格数据
    async savePriceData(data) {
        const query = `
            INSERT INTO price_data 
            (timestamp, symbol, price, volume_24h, change_24h, change_percent_24h, high_24h, low_24h)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `;
        
        const values = [
            new Date(),
            data.symbol,
            data.price,
            data.volume,
            data.change24h,
            data.changePercent24h,
            data.high24h,
            data.low24h
        ];
        
        // 保存到PostgreSQL
        const result = await this.db.query(query, values);
        
        // 同时缓存到Redis
        await this.redis.hset(`${data.symbol.toLowerCase()}:current`, {
            price: data.price,
            volume: data.volume,
            timestamp: Date.now()
        });
        
        return result.rows[0].id;
    }

    // 批量保存用于AI训练
    async batchSaveForAI(dataArray) {
        const batchSize = 1000;
        const batches = [];
        
        for (let i = 0; i < dataArray.length; i += batchSize) {
            batches.push(dataArray.slice(i, i + batchSize));
        }
        
        for (const batch of batches) {
            await this.processBatch(batch);
        }
    }
}
```

## 3. AI训练数据格式

### 特征工程数据结构
```javascript
// ai-data-processor.js
class AIDataProcessor {
    // 生成AI训练特征
    async generateFeatures(startTime, endTime) {
        const features = await this.db.query(`
            SELECT 
                timestamp,
                price,
                volume_24h,
                LAG(price, 1) OVER (ORDER BY timestamp) as price_lag_1,
                LAG(price, 5) OVER (ORDER BY timestamp) as price_lag_5,
                LAG(price, 15) OVER (ORDER BY timestamp) as price_lag_15,
                
                -- 移动平均
                AVG(price) OVER (ORDER BY timestamp ROWS 20 PRECEDING) as sma_20,
                AVG(price) OVER (ORDER BY timestamp ROWS 50 PRECEDING) as sma_50,
                
                -- 波动率
                STDDEV(price) OVER (ORDER BY timestamp ROWS 20 PRECEDING) as volatility_20,
                
                -- 价格变化率
                (price - LAG(price, 1) OVER (ORDER BY timestamp)) / LAG(price, 1) OVER (ORDER BY timestamp) as return_1,
                (price - LAG(price, 5) OVER (ORDER BY timestamp)) / LAG(price, 5) OVER (ORDER BY timestamp) as return_5,
                
                -- 成交量相关
                volume_24h / AVG(volume_24h) OVER (ORDER BY timestamp ROWS 20 PRECEDING) as volume_ratio,
                
                -- 时间特征
                EXTRACT(hour FROM timestamp) as hour,
                EXTRACT(dow FROM timestamp) as day_of_week,
                
                -- 目标变量（未来1小时价格变化）
                LEAD(price, 60) OVER (ORDER BY timestamp) as target_price_1h
                
            FROM price_data 
            WHERE timestamp BETWEEN $1 AND $2
            ORDER BY timestamp
        `, [startTime, endTime]);
        
        return features.rows;
    }
    
    // 导出为CSV格式（AI训练使用）
    async exportToCSV(features, filename) {
        const fs = require('fs');
        const csv = require('csv-writer');
        
        const csvWriter = csv.createObjectCsvWriter({
            path: `./datasets/${filename}`,
            header: [
                {id: 'timestamp', title: 'timestamp'},
                {id: 'price', title: 'price'},
                {id: 'volume_24h', title: 'volume_24h'},
                {id: 'sma_20', title: 'sma_20'},
                {id: 'sma_50', title: 'sma_50'},
                {id: 'volatility_20', title: 'volatility_20'},
                {id: 'return_1', title: 'return_1'},
                {id: 'return_5', title: 'return_5'},
                {id: 'volume_ratio', title: 'volume_ratio'},
                {id: 'hour', title: 'hour'},
                {id: 'day_of_week', title: 'day_of_week'},
                {id: 'target_price_1h', title: 'target_price_1h'}
            ]
        });
        
        await csvWriter.writeRecords(features);
        return filename;
    }
}
```

## 4. 手机数据同步API

### RESTful API设计
```javascript
// api-routes.js
const express = require('express');
const router = express.Router();

// 手机端上传数据
router.post('/api/mobile/upload', async (req, res) => {
    try {
        const { deviceId, data, timestamp } = req.body;
        
        // 验证设备权限
        const isAuthorized = await verifyDevice(deviceId);
        if (!isAuthorized) {
            return res.status(403).json({ error: 'Device not authorized' });
        }
        
        // 保存数据
        const savedData = await dataCollector.saveMobileData({
            device_id: deviceId,
            data: data,
            timestamp: timestamp || new Date(),
            ip_address: req.ip
        });
        
        res.json({ 
            success: true, 
            id: savedData.id,
            received_at: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取最新数据（手机端查询）
router.get('/api/mobile/latest/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { limit = 100 } = req.query;
        
        const data = await dataCollector.getLatestData(symbol, limit);
        
        res.json({
            symbol: symbol,
            count: data.length,
            data: data,
            last_updated: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AI预测接口
router.get('/api/ai/prediction/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { timeframe = '1h' } = req.query;
        
        const prediction = await aiService.getPrediction(symbol, timeframe);
        
        res.json({
            symbol: symbol,
            timeframe: timeframe,
            prediction: prediction.value,
            confidence: prediction.confidence,
            model_version: prediction.model_version,
            generated_at: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

## 5. 数据备份与恢复策略

### 自动备份脚本
```bash
#!/bin/bash
# backup-script.sh

# 数据库备份
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/data/backups"

# PostgreSQL备份
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > "$BACKUP_DIR/postgres_backup_$DATE.sql.gz"

# Redis备份
redis-cli --rdb "$BACKUP_DIR/redis_backup_$DATE.rdb"

# 压缩旧备份（保留30天）
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +30 -delete

# 上传到云存储（可选）
aws s3 sync $BACKUP_DIR s3://your-backup-bucket/doge-data/
```

## 6. 部署配置

### Docker Compose配置
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: timescale/timescaledb:latest-pg14
    environment:
      POSTGRES_DB: doge_data
      POSTGRES_USER: doge_user
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
  
  app:
    build: .
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: doge_data
      DB_USER: doge_user
      DB_PASSWORD: your_password
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./datasets:/app/datasets
      - ./models:/app/models

volumes:
  postgres_data:
  redis_data:
```

## 7. 监控与告警

### 数据质量监控
```javascript
// monitor.js
class DataMonitor {
    async checkDataQuality() {
        // 检查数据完整性
        const missingData = await this.db.query(`
            SELECT date_trunc('minute', generate_series) as minute
            FROM generate_series(
                NOW() - INTERVAL '1 hour',
                NOW(),
                INTERVAL '1 minute'
            )
            LEFT JOIN price_data ON date_trunc('minute', timestamp) = date_trunc('minute', generate_series)
            WHERE price_data.id IS NULL
        `);
        
        if (missingData.rows.length > 0) {
            await this.sendAlert('数据缺失告警', `发现 ${missingData.rows.length} 分钟的数据缺失`);
        }
        
        // 检查异常价格
        const anomalies = await this.db.query(`
            SELECT * FROM price_data 
            WHERE timestamp > NOW() - INTERVAL '1 hour'
            AND (
                price > (SELECT AVG(price) * 1.1 FROM price_data WHERE timestamp > NOW() - INTERVAL '24 hours')
                OR price < (SELECT AVG(price) * 0.9 FROM price_data WHERE timestamp > NOW() - INTERVAL '24 hours')
            )
        `);
        
        if (anomalies.rows.length > 0) {
            await this.sendAlert('价格异常告警', `发现 ${anomalies.rows.length} 个异常价格数据点`);
        }
    }
}
```

这个架构提供了：
✅ **时序数据优化**：使用TimescaleDB处理大量时序数据
✅ **实时性能**：Redis缓存热数据
✅ **AI就绪**：数据格式优化，便于机器学习
✅ **扩展性**：支持多种数据源和设备
✅ **可靠性**：自动备份和监控
✅ **部署简便**：Docker容器化部署 