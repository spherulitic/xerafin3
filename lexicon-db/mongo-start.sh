#!/bin/bash
# Phase 1: Start mongod in read/write mode
mongod --config /etc/mongod.conf
# Small sleep to ensure it's fully up
#sleep 2

# Phase 2: Wait for the loader to signal completion
# This assumes your loader creates a specific file when done
while [ ! -f /tmp/lexicon_loaded ]; do
    echo "Waiting for lexicon data load..."
    sleep 1
done

# Phase 3: Shutdown and restart in read-only mode
mongod --shutdown
echo "Data load complete. Restarting in read-only mode."
exec mongod --config /etc/mongod.conf --readOnly
