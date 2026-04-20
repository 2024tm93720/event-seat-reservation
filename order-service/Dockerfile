FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
EXPOSE 8004
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:8004/health || exit 1
CMD ["node","src/server.js"]
