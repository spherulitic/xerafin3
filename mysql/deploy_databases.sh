#!/bin/bash
set -e

ENVIRONMENT=${1:-dev}

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
    echo "Usage: $0 [dev|prod]"
    exit 1
fi

# Load environment variables
set -a
source ../config/db_setup.env
set +a

# Process SQL files with envsubst
process_sql_file() {
    local file=$1
      echo "Processing $(basename $file)..."
      # Replace environment variables
      envsubst < "$file" | sudo mysql
}

# Apply database scripts in order
for sql_file in 0*.sql; do
    process_sql_file "$sql_file"
done

echo "✅ Database setup for $ENVIRONMENT complete!"
