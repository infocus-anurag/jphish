#!/bin/bash

# Create .env files from examples if they don't exist
if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.example frontend/.env.local
  echo "Created frontend/.env.local"
fi

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "Created backend/.env"
fi

echo "Setup complete! Please update the .env files with your configuration."
