# Stage 1: build
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Vite nhúng biến VITE_* vào bundle lúc build, đổi giá trị thì phải build lại image.
ARG VITE_API_URL=http://localhost:3000/api
ARG VITE_APP_NAME=InterviewIQ
# Không có mặc định: bỏ trống thì app dùng CDN của MediaPipe.
ARG VITE_MEDIAPIPE_WASM_URL
ARG VITE_FACE_MODEL_URL
RUN npm run build

# Stage 2: serve bằng nginx
FROM nginx:1.30-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -q --spider http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
