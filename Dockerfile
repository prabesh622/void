FROM node:20-slim

# Install build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better caching
COPY package.json ./

# Install dependencies and rebuild native modules
RUN npm install --production
RUN npm rebuild better-sqlite3 --build-from-source

# Copy all source files
COPY . .

# Create data directory for SQLite
RUN mkdir -p data

# Expose dashboard port
EXPOSE 3000

# Start the bot
CMD ["node", "src/index.js"]
