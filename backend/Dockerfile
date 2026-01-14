# Stage 1: Build Environment
FROM node:18-slim AS build
WORKDIR /app

# OpenSSL + outils de build
RUN apt-get update -y && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

# Stage 2: Final Image
FROM node:18-slim
WORKDIR /app

# OpenSSL pour le runtime Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/prisma ./prisma

ENV NODE_ENV=development
ENV PORT=3000
EXPOSE ${PORT}

CMD ["sh", "-c", "if [ \"$SKIP_DB\" = \"true\" ]; then echo 'Skipping DB migrations for smoke test'; node src/index.js; else npx prisma migrate deploy && node src/index.js; fi"]