FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/scene/package.json packages/scene/package.json
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 DATA_DIR=/data
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/scene/package.json packages/scene/package.json
RUN npm ci --omit=dev --workspace @city-home/server --workspace @city-home/shared
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/web/dist apps/web/dist
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/server/data apps/server/data
RUN mkdir -p /data/layouts
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "apps/server/dist/index.js"]
