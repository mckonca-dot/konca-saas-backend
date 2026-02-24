# 1. Aşama: Uygulamayı inşa edelim
FROM node:18-slim AS builder

# Puppeteer için gerekli temel kütüphaneleri kuruyoruz
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libnss3 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Bağımlılıkları yükle
COPY package*.json ./
RUN npm install

# Prisma şemasını kopyala ve client'ı oluştur
COPY prisma ./prisma/
RUN npx prisma generate

# Tüm kaynak kodları kopyala ve build et
COPY . .
RUN npm run build

# 2. Aşama: Çalışma ortamı
FROM node:18-slim

# Çalışma anında gereken kütüphaneleri tekrar ekleyelim
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Puppeteer'ın Docker içinde çalışması için gereken ortam değişkenleri
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 3001

CMD ["npm", "run", "start:prod"]