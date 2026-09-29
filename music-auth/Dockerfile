FROM rust:1-bookworm AS builder
RUN cargo install ncm-api-rs --features server --bin ncm-server --locked
FROM node:22-bookworm-slim
COPY --from=builder /usr/local/cargo/bin/ncm-server /usr/local/bin/ncm-server
WORKDIR /app
COPY music-auth/package.json music-auth/package-lock.json ./
RUN npm ci --omit=dev
COPY music-auth/server.mjs ./server.mjs
COPY music-auth/start.sh ./start.sh
RUN chmod +x ./start.sh
ENV NCM_HOST=127.0.0.1 NCM_PORT=3000 NCM_API_URL=http://127.0.0.1:3000 PORT=8080
EXPOSE 8080
CMD ["./start.sh"]
