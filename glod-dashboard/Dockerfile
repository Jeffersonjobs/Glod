# Panel Glod en Fly.io (sin dependencias, Node puro)
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY public ./public
COPY server.js ./
EXPOSE 8080
CMD ["node", "server.js"]
