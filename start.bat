@echo off
chcp 65001 >nul

:: 训练日记 - Windows 启动脚本

echo 🏃 训练日记 - 启动脚本
echo.

:: 检查 Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -v') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:~1%

if %NODE_MAJOR% LSS 18 (
    echo ❌ 错误: Node.js 版本过低 (需要 v18+)
    echo 当前版本:
    node -v
    pause
    exit /b 1
)

echo ✓ Node.js 版本:
node -v

:: 检查 pnpm
pnpm -v >nul 2>&1
if errorlevel 1 (
    echo ⚠️ 未找到 pnpm，正在安装...
    npm install -g pnpm
)

echo ✓ pnpm 版本:
pnpm -v

:: 安装依赖
echo.
echo 📦 安装依赖...
pnpm install

:: 构建前端
echo.
echo 🔨 构建前端...
pnpm run build

:: 启动服务器
echo.
echo 🚀 启动服务器...
echo 服务器将在 http://localhost:3000 启动
echo 按 Ctrl+C 停止服务器
echo.

:: 检查是否存在 .env 文件
if not exist ".env" (
    echo ⚠️ 提示: 未找到 .env 文件，使用默认配置
    echo    建议复制 .env.example 为 .env 并修改 JWT_SECRET
)

node server.js

pause
