# Build frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Build backend
FROM node:20-alpine AS build-backend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Transpile server TypeScript (app code)
RUN npx tsc -p server/tsconfig.json
# Transpile migrations to JS
RUN npx tsc -p server/tsconfig.migrations.json

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build-frontend /app/dist ./public
COPY --from=build-backend /app/server/dist ./server/dist
# Place compiled JS migrations where the app expects them (../migrations from dist)
COPY --from=build-backend /app/server/dist/migrations ./server/migrations

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/dist/index.js"]
