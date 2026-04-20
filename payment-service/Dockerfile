FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
EXPOSE 8005
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:8005/health || exit 1
CMD ["node","src/server.js"]
