# Multi-stage Docker build for InterviewIQ
FROM node:20-alpine AS builder

WORKDIR /app

# Build Frontend
COPY AI_Interview_Coach_Frontend/package*.json ./AI_Interview_Coach_Frontend/
RUN cd AI_Interview_Coach_Frontend && npm ci

COPY AI_Interview_Coach_Frontend/ ./AI_Interview_Coach_Frontend/
RUN cd AI_Interview_Coach_Frontend && npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV CLIENT_DIST_PATH=/app/AI_Interview_Coach_Frontend/dist

# Install backend production dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy backend source code
COPY backend/ ./backend/

# Copy compiled frontend assets from builder stage
COPY --from=builder /app/AI_Interview_Coach_Frontend/dist ./AI_Interview_Coach_Frontend/dist

# Expose backend port
EXPOSE 4000

# Start server
CMD ["node", "backend/src/server.js"]
