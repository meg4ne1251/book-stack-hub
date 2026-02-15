#!/bin/sh
set -e

# Run migrations only for the backend (uvicorn) service
if [ "$1" = "uvicorn" ]; then
    echo "Running database migrations..."
    # Wait a moment for database to be fully ready
    sleep 2
    alembic upgrade head
    echo "Migrations completed successfully"
fi

# Execute the main command
exec "$@"
