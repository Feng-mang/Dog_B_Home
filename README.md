# DOGE实时价格监控系统

这是一个基于Node.js的实时DOGE（狗狗币）价格监控系统，可以实时展示DOGE的价格变动、交易量等关键信息。

## 功能特点

- 实时显示DOGE价格数据
- 支持多种数据展示选项
- 美观的数据可视化界面
- 实时价格变动提醒
- 交易量变化监控

## 系统要求

- Node.js v18.0.0 或更高版本
- 现代浏览器（支持WebSocket）
- 稳定的网络连接

## 项目依赖

项目主要依赖包括：

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.13.0",
    "node-fetch": "^2.6.7"
  }
}
```

## 安装步骤

1. 克隆项目到本地：
```bash
git clone https://github.com/[your-username]/doge-price-monitor.git
cd doge-price-monitor
```

2. 安装依赖：
```bash
npm install
```

## 部署说明

1. 本地开发环境部署：
```bash
# 启动服务器
node simple-server-debug.js
```
服务器将在 http://localhost:3000 启动

2. 生产环境部署：
   - 推荐使用PM2进行进程管理：
   ```bash
   # 全局安装PM2
   npm install -g pm2
   
   # 启动服务
   pm2 start simple-server.js --name doge-monitor
   
   # 查看运行状态
   pm2 status
   
   # 查看日志
   pm2 logs doge-monitor
   ```

3. 停止服务：
   - 开发环境：使用 Ctrl+C 停止服务
   - 生产环境：
   ```bash
   pm2 stop doge-monitor
   ```

## 常见问题

1. 如果遇到端口被占用，可以修改`simple-server.js`中的端口号
2. 确保系统防火墙允许对应端口的访问
3. 如果遇到WebSocket连接问题，检查浏览器是否支持WebSocket

## 注意事项

- 请确保有稳定的网络连接
- 建议使用Chrome、Firefox等现代浏览器
- 如遇到数据更新问题，可以刷新页面重新连接

## 许可证

MIT License

## 贡献指南

欢迎提交Issue和Pull Request来帮助改进项目。

## 联系方式

如有问题或建议，请通过GitHub Issues联系。 
