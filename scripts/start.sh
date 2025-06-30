# Stop any running instance (if needed)
pkill -f receiver.js

# or Ctrl+C if you're in a live terminal

# Rebuild frontend (optional, if you've updated App.js)
cd frontend
npm run build
cd ..

# Start backend (receiver.js)
./scripts/start-dev.sh

curl http://localhost:4040/status  # if you’ve added a health route
