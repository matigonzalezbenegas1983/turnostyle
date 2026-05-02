FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir -p /data

ENV DB_PATH=/data/barbershop.db
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/app.js"]
