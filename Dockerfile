FROM node:18

# WhatsApp motoru (Chrome) için gereken tüm kütüphaneler
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Paketleri kur
COPY package*.json ./
RUN npm install

# Kodları kopyala ve inşa et
COPY . .
RUN npx prisma generate
RUN npm run build

# Puppeteer ayarları
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 3001

# Çalıştırma komutu (Eğer dist/main değilse burayı güncelleyeceğiz)
CMD ["node", "dist/main"]