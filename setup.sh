#!/bin/bash

# Setup script for game-tracker-benchmarks
# This script clones the game-tracker repo and copies the .env.local file

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$SCRIPT_DIR/game-tracker"
ENV_SOURCE="$HOME/game-tracker/.env.local"

echo "=== Game Tracker Benchmarks Setup ==="
echo ""

# Check if game-tracker already exists
if [ -d "$REPO_DIR" ]; then
  echo "game-tracker directory already exists."
  read -p "Do you want to remove it and re-clone? (y/N) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing existing game-tracker directory..."
    rm -rf "$REPO_DIR"
  else
    echo "Keeping existing directory. Skipping clone."
  fi
fi

# Clone the repo if it doesn't exist
if [ ! -d "$REPO_DIR" ]; then
  echo "Cloning game-tracker repository..."
  git clone git@github.com:SawyerHood/game-tracker.git "$REPO_DIR"
  echo "Clone complete!"
fi

# Copy .env.local if it exists
if [ -f "$ENV_SOURCE" ]; then
  echo ""
  echo "Copying .env.local from $ENV_SOURCE..."
  cp "$ENV_SOURCE" "$REPO_DIR/.env.local"
  echo ".env.local copied successfully!"
else
  echo ""
  echo "Warning: $ENV_SOURCE not found."
  echo "You'll need to manually create $REPO_DIR/.env.local"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
cd "$REPO_DIR"
bun install

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To run benchmarks:"
echo "  cd $SCRIPT_DIR"
echo "  ./scripts/benchmark.sh"
echo ""
echo "To generate comparison report:"
echo "  bun run scripts/generate-benchmark.ts"
