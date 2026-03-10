#!/bin/bash
# Lilypad API Initialisation script.
# V1.00
# Kit Cochrane

echo "Checking for bun install..."

#run bun version command and check for output
if ! command -v bun >/dev/null; then
    echo "Bun is not installed! Please install bun before running this script."
    exit 1
else
    echo "Bun is installed!"
    echo -e "\nProceeding with dependencies installation..."
    bun install
fi
