#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动DOGE实时数据应用...\n');

// 启动后端服务器
const serverProcess = spawn('node', ['server.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// 等待1秒，然后启动前端
setTimeout(() => {
  console.log('\n📱 启动React前端...\n');
  
  const frontendProcess = spawn('npm', ['start'], {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env, PORT: '3001' }
  });

  // 处理退出信号
  process.on('SIGINT', () => {
    console.log('\n⏹️  正在停止应用...');
    serverProcess.kill();
    frontendProcess.kill();
    process.exit(0);
  });

  frontendProcess.on('exit', () => {
    serverProcess.kill();
    process.exit(0);
  });

  serverProcess.on('exit', () => {
    frontendProcess.kill();
    process.exit(0);
  });

}, 1000);

console.log('📊 应用将在以下地址启动:');
console.log('   统一访问地址: http://localhost:3000');
console.log('   (包含前端界面和API服务)\n');
console.log('💡 使用 Ctrl+C 停止应用\n'); 