#!/bin/bash

echo "🚀 Starting Jobocate Application with Docker Compose"
echo "=================================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if .env file exists, if not create from example
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "📝 Creating .env file from .env.example..."
        cp .env.example .env
        echo "✅ .env file created. You can edit it to add LinkedIn credentials if needed."
    fi
fi

echo ""
echo "🔨 Building and starting all services..."
echo "   - MongoDB (Database)"
echo "   - Backend API (Node.js/Express)"
echo "   - Frontend (React/Next.js)"
echo ""

# Build and start services
docker-compose up --build

echo ""
echo "=================================================="
echo "🎉 Application is running!"
echo ""
echo "📱 Frontend:  http://localhost:3000"
echo "🔧 Backend:   http://localhost:8000/api/health"
echo "💾 MongoDB:   localhost:27017"
echo ""
echo "Press Ctrl+C to stop all services"
echo "=================================================="
