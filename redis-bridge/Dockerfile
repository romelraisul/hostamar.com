FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.ts ./
COPY logger.ts ./
ENV BRIDGE_PORT=6380
ENV REDIS_HOST=hostamar-redis
ENV REDIS_PORT=6379
EXPOSE 6380
CMD ["npx", "-y", "tsx", "server.ts"]
