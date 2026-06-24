# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4101
COPY --from=build /app/.output ./.output

EXPOSE 4101
CMD ["node", ".output/server/index.mjs"]
