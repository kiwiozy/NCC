#!/bin/bash
# Wrapper script to run master_reimport.py with proper environment

# Navigate to project root
cd "$(dirname "$0")/../.."

# Check Django virtual environment in backend/
if [ -d "backend/venv" ]; then
    echo "Activating Django virtual environment..."
    source backend/venv/bin/activate
elif [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
elif [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
elif [ -d "env" ]; then
    echo "Activating virtual environment..."
    source env/bin/activate
else
    echo "Warning: No virtual environment found. Scripts may fail."
fi

# Run the master script
cd scripts/reimport
python master_reimport.py "$@"


