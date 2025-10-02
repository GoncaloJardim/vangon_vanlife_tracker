#!/bin/bash
# Railway start script for VAN'GON backend

echo "Starting VAN'GON Backend..."
echo "Installing dependencies..."

# Install Python dependencies
pip install -r requirements.txt

echo "Starting Flask application with Gunicorn..."
exec gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
