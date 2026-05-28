# 训练日记应用 Dockerfile
# 使用 Node.js 20 作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制所有源代码
COPY . .

# 构建前端应用
RUN npm run build

# 暴露端口
EXPOSE 10000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=10000

# 启动服务器
CMD ["node", "server.js"]
