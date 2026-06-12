FROM node:20-slim

# Install build tools for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --production

# Copy all source code
COPY . .

# Create data directory for SQLite
RUN mkdir -p data

# Expose dashboard port
EXPOSE 3000

# Start the bot
CMD ["node", "src/index.js"]
