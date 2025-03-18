# 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# 确保 next.config.js 存在
RUN if [ ! -f next.config.js ]; then \
    echo '/** @type {import("next").NextConfig} */\nconst nextConfig = {};\nmodule.exports = nextConfig;' > next.config.js; \
    else \
    echo "next.config.js already exists"; \
    fi
RUN npm run build

# 生产阶段
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

# 仅安装生产依赖
RUN npm ci --only=production

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["npm", "start"]