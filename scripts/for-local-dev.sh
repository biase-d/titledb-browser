#!/bin/bash
set -e

TMP_DIR="./tmp"

DATA_REPO_URL="https://github.com/masagrator/titledb_filtered.git"
PERF_REPO_URL="https://github.com/biase-d/nx-performance.git"

DATA_TARGET_DIR="$TMP_DIR/titledb_data"
PERF_TARGET_DIR="$TMP_DIR/performance_data"

echo "--- Setting up local data for development ---"

echo "Cleaning up old data directory: $TMP_DIR"
rm -rf $TMP_DIR

mkdir -p $TMP_DIR
echo "Created temporary directory: $TMP_DIR"

echo "Cloning masagrator/titledb_filtered into $DATA_TARGET_DIR..."
git clone --depth 1 $DATA_REPO_URL $DATA_TARGET_DIR

echo "Cloning your performance data repo into $PERF_TARGET_DIR..."
git clone --depth 1 $PERF_REPO_URL $PERF_TARGET_DIR

echo ""
echo "Local development setup complete"
echo "You can now run 'npm run build:index' to seed your local database."