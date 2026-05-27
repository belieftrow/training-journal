#!/bin/bash

# 训练日记 - 启动脚本
# 支持 macOS 和 Linux

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏃 训练日记 - 启动脚本${NC}"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 Node.js${NC}"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ 错误: Node.js 版本过低 (需要 v18+)${NC}"
    echo "当前版本: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠️  未找到 pnpm，正在安装...${NC}"
    npm install -g pnpm
fi

echo -e "${GREEN}✓ pnpm 版本: $(pnpm -v)${NC}"

# 安装依赖
echo ""
echo -e "${BLUE}📦 安装依赖...${NC}"
pnpm install

# 构建前端
echo ""
echo -e "${BLUE}🔨 构建前端...${NC}"
pnpm run build

# 启动服务器
echo ""
echo -e "${GREEN}🚀 启动服务器...${NC}"
echo -e "${YELLOW}服务器将在 http://localhost:3000 启动${NC}"
echo -e "${YELLOW}按 Ctrl+C 停止服务器${NC}"
echo ""

# 检查是否存在 .env 文件
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  提示: 未找到 .env 文件，使用默认配置${NC}"
    echo -e "${YELLOW}   建议复制 .env.example 为 .env 并修改 JWT_SECRET${NC}"
fi

node server.js
