# Node 20 sürümünü kullanıyoruz (Hız ve uyumluluk için)
FROM node:20

# WhatsApp motoru (Chrome) için gereken kütüphaneler
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Bağımlılıkları kur
COPY package*.json ./
RUN npm install

# Kodları kopyala ve inşa et
COPY . .
RUN npx prisma generate
RUN npm run build

# Puppeteer için ortam değişkenleri
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 3001

# DOSYA YOLUNU DÜZELTTİK: Artık doğrudan dist/src/main.js'e bakıyor
CMD ["node", "dist/src/main.js"]