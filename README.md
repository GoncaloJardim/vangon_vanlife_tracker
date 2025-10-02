# VAN'GON - Van Life Journey Tracker 🚐

A beautiful web application for tracking your van life journey with Google Timeline integration, interactive maps, and comprehensive journey analytics.

## ✨ Features

- **🗺️ Interactive Journey Map**: Visualize your travels with Leaflet.js
- **📊 Real-time Analytics**: Track kilometers, countries visited, and days on the road
- **📧 Waitlist System**: Join the waitlist for early access to the full app
- **📱 Responsive Design**: Works perfectly on desktop and mobile
- **🎨 Adventurous UI**: Inspired by travel and adventure themes

## 🏗️ Tech Stack

### Frontend
- **Angular 17** - Modern web framework
- **TypeScript** - Type-safe development
- **Leaflet.js** - Interactive maps
- **Tailwind CSS** - Utility-first styling

### Backend
- **Python Flask** - Lightweight web framework
- **Pandas** - Data processing
- **Geopy** - Geographic calculations
- **CORS** - Cross-origin resource sharing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Git

### Frontend Setup
```bash
cd van-journey-angular
npm install
npm start
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

## 📁 Project Structure

```
vangon_vanlife_tracker/
├── van-journey-angular/     # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/  # Reusable components
│   │   │   ├── pages/      # Page components
│   │   │   └── services/   # API services
│   │   └── environments/    # Environment configs
│   └── public/             # Static assets
├── backend/                # Flask backend
│   ├── src/
│   │   └── data/          # JSON data files
│   ├── app.py             # Main Flask application
│   └── requirements.txt   # Python dependencies
└── README.md
```

## 🌐 Deployment

The app is designed for easy deployment on:
- **Frontend**: Vercel or Netlify
- **Backend**: Railway or Render

## 📊 Data Sources

- **Google Timeline**: Automatic location tracking
- **Manual Input**: Additional journey data
- **Real-time Processing**: Live analytics and insights

## 🤝 Contributing

This is a personal project, but feel free to fork and create your own van life tracker!

## 📄 License

MIT License - feel free to use this code for your own projects.

## 🚐 About VAN'GON

VAN'GON is designed for van life enthusiasts who want to:
- Track their journey automatically
- Visualize their travels on interactive maps
- Share their adventure with friends and family
- Keep detailed records of their van life experience

Built with ❤️ for the van life community.

---

**Ready to start your journey?** Visit the live app and join the waitlist! 🚐✨
