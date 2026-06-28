#!/bin/bash

echo "🛑 Stopping Jobocate Application"
echo "================================"
echo ""

# Stop all services
docker-compose down

echo ""
echo "✅ All services stopped"
echo ""
echo "To start again, run: ./start.sh"
echo "To remove data volumes, run: docker-compose down -v"
