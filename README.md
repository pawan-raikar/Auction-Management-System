# AuctionEdge

A complete full-stack online auction platform.

## Quick Start

### Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Seed the database with initial data (users, listings, bids):
   ```bash
   python seed.py
   ```

4. Run the Flask server:
   ```bash
   python app.py
   ```
   The backend will be available at `http://localhost:5000`

### Frontend

1. Navigate to the frontend directory (in a new terminal):
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173` (or port specified by Vite).

### Demo Accounts

- **Admin Account**: 
  - Email: `admin@auctionedge.com`
  - Password: `Admin@123`

- **Regular User (Bidder)**:
  - Email: `alice@demo.com`
  - Password: `Demo@123`
