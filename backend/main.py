import sys
import os

# Ensure the backend directory is in the path for modular imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app

if __name__ == '__main__':
    import uvicorn
    # Start the modular app
    uvicorn.run("app.main:app", host='0.0.0.0', port=8000, reload=True)
