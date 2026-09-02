#!/bin/bash

echo "🔍 Backend Health Check"
echo "========================"
echo ""

# Check if backend is running
if sudo supervisorctl status backend | grep -q "RUNNING"; then
    echo "✅ Backend process: RUNNING"
else
    echo "❌ Backend process: NOT RUNNING"
    exit 1
fi

# Check MongoDB connection
echo ""
echo "Checking MongoDB..."
if curl -s http://localhost:8000/health | grep -q '"mongodb":"connected"'; then
    echo "✅ MongoDB: Connected"
else
    echo "❌ MongoDB: Not connected"
fi

# Check API health
echo ""
echo "Checking API..."
HEALTH=$(curl -s http://localhost:8000/api/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "✅ API: Healthy"
    echo "$HEALTH" | jq '.'
else
    echo "❌ API: Unhealthy"
fi

# Check recent logs
echo ""
echo "Recent logs (last 10 lines):"
echo "----------------------------"
tail -10 /var/log/supervisor/backend.out.log

# Check for errors
echo ""
echo "Recent errors (if any):"
echo "----------------------"
tail -10 /var/log/supervisor/backend.err.log | grep -E "(Error|error)" || echo "No recent errors"

echo ""
echo "========================"
echo "✅ Health check complete"
