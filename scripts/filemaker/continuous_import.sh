#!/bin/bash
# Continuous FileMaker Document Import
# Runs imports repeatedly until no more documents are found
# For medical applications - we can't miss anything!

BACKEND_DIR="/Users/craig/Documents/nexus-core-clinic/backend"
LOGS_DIR="/Users/craig/Documents/nexus-core-clinic/logs"
MAX_RUNS=20  # Safety limit

echo "=================================="
echo "Continuous FileMaker Import"
echo "=================================="
echo "Started: $(date)"
echo ""

run_number=5  # Starting from Run 5

while [ $run_number -le $MAX_RUNS ]; do
    echo "----------------------------------------"
    echo "Starting Run $run_number..."
    echo "Time: $(date '+%H:%M:%S')"
    echo "----------------------------------------"
    
    # Run import
    cd "$BACKEND_DIR"
    ./venv/bin/python -u manage.py import_filemaker_documents > "$LOGS_DIR/filemaker_bulk_export_run${run_number}.log" 2>&1
    
    # Check results
    found=$(grep "Total found:" "$LOGS_DIR/filemaker_bulk_export_run${run_number}.log" | tail -1 | awk '{print $3}')
    successful=$(grep "✅ Successful:" "$LOGS_DIR/filemaker_bulk_export_run${run_number}.log" | tail -1 | awk '{print $3}')
    
    echo ""
    echo "Run $run_number Complete:"
    echo "  Found: $found"
    echo "  Successful: $successful"
    echo "  Time: $(date '+%H:%M:%S')"
    
    # If found is 0 or empty, we're done
    if [ -z "$found" ] || [ "$found" -eq 0 ]; then
        echo ""
        echo "✅ No more documents found!"
        echo "Import complete at: $(date)"
        break
    fi
    
    # If found is very small (< 50), might be the last run
    if [ "$found" -lt 50 ]; then
        echo ""
        echo "⚠️  Only $found documents found - likely final run"
    fi
    
    run_number=$((run_number + 1))
    
    # Brief pause between runs
    sleep 5
done

echo ""
echo "=================================="
echo "All imports complete!"
echo "Total runs: $((run_number - 5))"
echo "Finished: $(date)"
echo "=================================="

# Generate summary
echo ""
echo "📊 FINAL SUMMARY:"
for log in "$LOGS_DIR"/filemaker_bulk_export_run*.log; do
    run=$(basename "$log" | sed 's/filemaker_bulk_export_run//;s/.log//')
    found=$(grep "Total found:" "$log" | tail -1 | awk '{print $3}')
    successful=$(grep "✅ Successful:" "$log" | tail -1 | awk '{print $3}')
    if [ ! -z "$found" ]; then
        echo "  Run $run: Found $found, Successful $successful"
    fi
done

