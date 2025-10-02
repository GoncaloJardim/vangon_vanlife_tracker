# Van Journey Backend

Flask backend that processes Google Timeline data and provides APIs for the van journey application.

## Setup

1. Create a Python 3.10 virtual environment:
```bash
/opt/homebrew/bin/python3.10 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the Flask app:
```bash
python app.py
```

The API will be available at `http://localhost:5001`

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/map/data` - Map visualization data
- `GET /api/recent-stops` - Recent stops/visits

## Data Processing

The backend processes Google Timeline JSON data using the same logic as the Jupyter notebook:
- Filters semantic segments for activities and visits
- Extracts coordinates from activity data
- Calculates journey statistics and metrics
- Provides filtered data for map visualization
