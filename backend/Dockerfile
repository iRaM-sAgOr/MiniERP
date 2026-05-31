FROM node:20-alpine

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci

# Copy project source
COPY . .

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=8080
ENV VITE_MIDDLEWARE=false

EXPOSE 8080

# Auto-apply migrations at container startup, then run backend API server
CMD ["sh", "-c", "npx prisma generate --schema prisma/schema.postgres.prisma && npx prisma db push --schema prisma/schema.postgres.prisma && npm run dev"]
