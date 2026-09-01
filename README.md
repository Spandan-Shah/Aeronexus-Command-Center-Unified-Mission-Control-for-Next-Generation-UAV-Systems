# Aeronexus Command Center

## Unified Mission Control for Next-Generation UAV Systems

Aeronexus Command Center is a full-stack UAV mission-control dashboard designed for drone operations, mission planning, telemetry monitoring, aerial intelligence, secure command workflows, video analytics, and post-mission debriefing.

The project combines a modern React + TypeScript frontend with a Python FastAPI backend. It includes simulated UAV telemetry, OpenCV-based video analysis, YOLO-powered object detection, fire/smoke response workflows, logs analytics, mission planning, drone health monitoring, battery monitoring, maintenance tracking, inventory management, and a professional aerospace-style dashboard interface.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Project Vision](#project-vision)
- [Core Features](#core-features)
- [Main Modules](#main-modules)
- [Technology Stack](#technology-stack)
- [Project Folder Structure](#project-folder-structure)
- [Frontend Setup](#frontend-setup)
- [Backend Setup](#backend-setup)
- [Running the Project](#running-the-project)
- [Camera AI Video Setup](#camera-ai-video-setup)
- [Camera AI Workflow](#camera-ai-workflow)
- [Backend API Endpoints](#backend-api-endpoints)
- [Git Commit Workflow](#git-commit-workflow)
- [Troubleshooting](#troubleshooting)
- [Current Prototype Status](#current-prototype-status)
- [Disclaimer](#disclaimer)

---

## Project Overview

Aeronexus Command Center is built as a prototype-level UAV software platform for demonstrating how drone mission software can combine:

- Live operations monitoring
- Secure mission control
- Telemetry-based dashboarding
- AI-assisted camera analysis
- OpenCV and YOLO-powered detection
- Fire and smoke alert workflows
- Mission planning and route visualization
- Logs and debrief analytics
- Drone health and battery monitoring
- Maintenance and inventory management

The dashboard is currently focused on simulation, local video analysis, software workflows, and prototype demonstration.

---

## Project Vision

The long-term vision of Aeronexus is to build a unified drone software ecosystem where operators can manage drone missions from a single command interface.

The system is designed around the idea of a mission-control dashboard that helps operators:

- Plan drone missions
- Monitor UAV telemetry
- Review live camera feeds
- Detect objects and risk indicators
- Generate visual alerts
- Analyze mission logs
- Maintain drone readiness
- Improve operational safety
- Support secure command communication workflows

---

## Core Features

### Mission Control Dashboard

- Aerospace-style command UI
- Dark professional dashboard theme
- Modular mission pages
- Header and footer branding
- Full-width operational layouts
- Real-time style telemetry presentation

### Live Operations

- Live operation overview
- Telemetry grid
- Command deck
- Alerts panel
- Map-based operational view
- Mission status display

### Mission Planning

- Interactive mission planning map
- Waypoint route visualization
- Geofence and restricted-zone interface
- Mission distance and route planning UI
- Black dotted route line for professional display

### Camera AI Analytics

- Selectable video feeds
- Local MP4 video playback
- Live YOLO video stream
- OpenCV frame analysis
- Fire/flame detection workflow
- Smoke/haze detection workflow
- Person and vehicle detection
- AI confidence display
- Detection event ledger
- Disaster feature matrix
- AI risk matrix
- Emergency dashboard alert banner
- JavaScript-generated alert sound

### Logs & Debrief

- Python analytics backend
- Mission log review
- SVG graph generation
- Post-mission debrief layout
- Mission performance review interface

### Security

- Secure session UI prototype
- Command-authentication style interface
- Session trust indicators
- Role-based access design
- Secure command audit presentation

### Drone Systems

- Drone health dashboard
- Battery and power dashboard
- Maintenance dashboard
- Inventory dashboard
- Dashboard settings page

---

## Main Modules

### 1. Live Operations

The Live Operations page provides the operator with a real-time style mission-control interface.

It includes:

- Mission status cards
- Telemetry cards
- Alerts panel
- Command deck
- Operational map
- Live flight indicators

This page is used as the main command interface for monitoring a mission.

---

### 2. Mission Planner

The Mission Planner page is used to plan UAV routes and mission paths.

It includes:

- Map-based route planning
- Waypoint visualization
- Route distance overview
- Safety review interface
- Mission planning controls
- Restricted-zone style visualization

The route line uses a professional black dotted style for better presentation.

---

### 3. Camera AI Analytics

The Camera AI page is one of the most important parts of the project.

It includes:

- Video source selection
- Local drone video playback
- Live YOLO annotated stream
- OpenCV analysis panel
- Fire/flame analysis mode
- Smoke/haze analysis mode
- Detection confidence monitoring
- AI risk scoring
- Emergency alert banner
- Audio alert using browser Web Audio API

Current Camera AI sources:

```text
Drone City Surveillance
Disaster Response Flight
Forest Patrol Flight
Generated Fire EO/IR Simulation
Fire Response 1
Wildfire Perimeter Slot
Smoke Column Watch Slot
Thermal Hotspot Slot
```

The reserved slots are included for future videos, while `Fire Response 1` is designed for the user-added video:

```text
Fire_Response_1.MP4
```

---

### 4. Logs & Debrief

The Logs & Debrief module provides mission review and post-flight analysis.

It includes:

- Mission analytics
- Python-generated graph
- Timeline-style review
- Operational event summary
- Debrief-ready presentation

Backend support is provided using:

```text
backend/logs_python_analytics.py
```

---

### 5. Security

The Security page presents a secure command-session style interface.

It includes:

- Secure session status
- Identity verification indicators
- Command trust state
- Session audit interface
- UAV command-security concept UI

This is currently a prototype interface for presenting secure UAV communication workflows.

---

### 6. Drone Health

The Drone Health page provides UAV system condition monitoring.

It includes:

- Health score panel
- Motor health overview
- Sensor status
- System readiness indicators

---

### 7. Battery & Power

The Battery & Power page provides battery and electrical system monitoring.

It includes:

- Battery pack status
- Power channels
- Power trend chart
- Voltage and temperature indicators
- Power alert cards

---

### 8. Maintenance

The Maintenance page provides a dashboard for UAV servicing workflows.

It includes:

- Maintenance summary
- Part wear panel
- Service tickets
- Maintenance schedule

---

### 9. Inventory

The Inventory page provides part and supplier tracking.

It includes:

- Inventory summary
- Low-stock panel
- Parts inventory table
- Supplier orders panel

---

### 10. Dashboard Settings

The Dashboard Settings page provides configuration-style UI for the command dashboard.

It includes:

- Safety limits
- Telemetry settings
- Secure link settings
- Dashboard preferences

---

## Technology Stack

## Frontend

```text
React
TypeScript
Vite
Tailwind CSS
Lucide React Icons
Leaflet Maps
```

## Backend

```text
Python
FastAPI
Uvicorn
OpenCV
NumPy
Ultralytics YOLO
SQLite support
WebSocket-style telemetry support
```

## Computer Vision

```text
YOLO object detection
OpenCV frame processing
HSV fire/flame candidate detection
Smoke/haze candidate detection
MJPEG annotated video streaming
Frame sampling
Confidence scoring
Detection event generation
```

---

## Project Folder Structure

```text
Aeronexus Command Center — Unified Mission Control for Next-Generation UAV Systems
│
├── backend
│   ├── main.py
│   ├── camera_cv_analytics.py
│   ├── camera_video_annotator.py
│   ├── logs_python_analytics.py
│   ├── telemetry_hub.py
│   ├── simulator.py
│   ├── mavlink_adapter.py
│   ├── alert_system.py
│   ├── database.py
│   ├── requirements.txt
│   ├── aeronexus.db
│   ├── yolov8n.pt
│   ├── yolo26m.pt
│   └── training
│
├── public
│   └── videos
│       ├── drone-city-surveillance.mp4
│       ├── drone-disaster-response.mp4
│       ├── drone-forest-patrol.mp4
│       ├── fire-response-demo.mp4
│       └── Fire_Response_1.MP4
│
├── src
│   ├── assets
│   ├── components
│   │   ├── camera
│   │   ├── common
│   │   ├── layout
│   │   ├── live
│   │   ├── map
│   │   └── mission
│   │
│   ├── data
│   ├── hooks
│   ├── pages
│   │   ├── BatteryPower.tsx
│   │   ├── CameraAI.tsx
│   │   ├── DashboardSettings.tsx
│   │   ├── DroneHealth.tsx
│   │   ├── Inventory.tsx
│   │   ├── LiveOps.tsx
│   │   ├── LogsDebrief.tsx
│   │   ├── Maintenance.tsx
│   │   ├── MissionPlanner.tsx
│   │   └── Security.tsx
│   │
│   ├── utils
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts
│
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json
├── README.md
└── .gitignore
```

---

## Frontend Setup

Go to the project root:

```cmd
cd /d "M:\Project\Aeronexus Command Center — Unified Mission Control for Next-Generation UAV Systems"
```

Install frontend dependencies:

```cmd
npm install
```

Run the frontend development server:

```cmd
npm run dev
```

Frontend will run at:

```text
http://localhost:5173
```

Open this URL in your browser.

---

## Backend Setup

Go to the backend folder:

```cmd
cd /d "M:\Project\Aeronexus Command Center — Unified Mission Control for Next-Generation UAV Systems\backend"
```

Create a Python virtual environment:

```cmd
python -m venv venv
```

Activate the virtual environment:

```cmd
venv\Scripts\activate
```

Install backend dependencies:

```cmd
pip install -r requirements.txt
```

If some packages are missing, install these manually:

```cmd
pip install fastapi uvicorn opencv-python numpy ultralytics
```

Run the backend server:

```cmd
uvicorn main:app --reload
```

Backend will run at:

```text
http://127.0.0.1:8000
```

---

## Running the Project

You need to run both the frontend and backend.

### Terminal 1: Backend

```cmd
cd /d "M:\Project\Aeronexus Command Center — Unified Mission Control for Next-Generation UAV Systems\backend"
venv\Scripts\activate
uvicorn main:app --reload
```

### Terminal 2: Frontend

```cmd
cd /d "M:\Project\Aeronexus Command Center — Unified Mission Control for Next-Generation UAV Systems"
npm run dev
```

Then open:

```text
http://localhost:5173
```

---

## Camera AI Video Setup

Camera videos must be placed inside:

```text
public/videos
```

Required video files:

```text
public/videos/drone-city-surveillance.mp4
public/videos/drone-disaster-response.mp4
public/videos/drone-forest-patrol.mp4
public/videos/fire-response-demo.mp4
public/videos/Fire_Response_1.MP4
```

The latest added video source is:

```text
Fire_Response_1.MP4
```

Place it at:

```text
M:\Project\Aeronexus Command Center — Unified Mission Control for Next-Generation UAV Systems\public\videos\Fire_Response_1.MP4
```

Test the video directly in browser:

```text
http://localhost:5173/videos/Fire_Response_1.MP4
```

If the video opens in browser, the frontend path is correct.

---

## Camera AI Backend Sources

The backend camera source list is available at:

```text
http://127.0.0.1:8000/api/camera-ai/sources
```

Expected sources include:

```text
city-surveillance
disaster-response
forest-patrol
fire-response-demo
fire-response-1
```

The `fire-response-1` backend source points to:

```text
public/videos/Fire_Response_1.MP4
```

---

## Camera AI Workflow

To test the Camera AI module:

1. Start backend.
2. Start frontend.
3. Open the Camera AI page.
4. Select one video source.
5. Select `Fire Response 1` for the user-added fire video.
6. Click `Live YOLO Video`.
7. Click `Analyze with YOLO + Fire Mode`.
8. Check the following UI sections:
   - AI Video Panel
   - OpenCV Frame Analysis
   - Fire / Flame Detection
   - Smoke / Haze Detection
   - Feature Matrix
   - AI Risk Matrix
   - Detection Event Ledger
   - Emergency Alert Banner
   - Operator Checklist

When fire, smoke, high risk, or critical risk is detected, the dashboard should show:

```text
Emergency Visual Alert Generated
Audio Alert Triggered
Fire / flame signature detected
Smoke / haze signature detected
```

The alert sound is generated by JavaScript using the browser Web Audio API.

---

## Backend API Endpoints

### Root Backend Check

```text
http://127.0.0.1:8000/
```

Expected response:

```json
{
  "name": "AeroNexus Backend",
  "status": "running"
}
```

### Camera AI Sources

```text
http://127.0.0.1:8000/api/camera-ai/sources
```

This returns available video sources and checks whether video files exist.

### Camera AI Last Analysis

```text
http://127.0.0.1:8000/api/camera-ai/last
```

This returns the latest camera analysis result.

### Camera AI Analyze Endpoint

```text
POST http://127.0.0.1:8000/api/camera-ai/analyze
```

Example request body:

```json
{
  "source_id": "fire-response-1",
  "sample_every": 5,
  "max_frames": 160,
  "confidence_threshold": 0.25
}
```

### Camera AI Annotated Stream

```text
POST http://127.0.0.1:8000/api/camera-ai/annotate-video
```

Example request body:

```json
{
  "source_id": "fire-response-1",
  "confidence_threshold": 0.3,
  "max_frames": 900
}
```

### Logs Python Analytics

```text
http://127.0.0.1:8000/api/logs-debrief/python-analytics
```

### Logs Python Graph

```text
http://127.0.0.1:8000/api/logs-debrief/python-graph.svg
```

---

## Important Files

### Frontend Camera AI

```text
src/pages/CameraAI.tsx
src/components/camera/AiVideoPanel.tsx
src/components/camera/OpenCvAnalysisPanel.tsx
```

### Backend Camera AI

```text
backend/camera_cv_analytics.py
backend/camera_video_annotator.py
```

### Backend Main App

```text
backend/main.py
```

### Logs Analytics

```text
backend/logs_python_analytics.py
src/pages/LogsDebrief.tsx
```

### Layout

```text
src/components/layout/AppShell.tsx
```

### Mission Planner

```text
src/pages/MissionPlanner.tsx
src/components/mission/MissionPlanningMap.tsx
```

---

## Git Commit Workflow

Check current status:

```cmd
git status
```

Check short status:

```cmd
git status --short
```

Add specific files:

```cmd
git add src/pages/CameraAI.tsx
git add backend/camera_cv_analytics.py
```

Commit:

```cmd
git commit -m "feat: improve camera ai fire detection"
```

Push:

```cmd
git push origin main
```

---

## Recommended Clean Commit Structure

Use separate commits for clean Git history.

### Commit 1: Camera AI Frontend

```cmd
git add src/pages/CameraAI.tsx src/components/camera/AiVideoPanel.tsx src/components/camera/OpenCvAnalysisPanel.tsx
git commit -m "feat: improve camera ai dashboard"
```

### Commit 2: Camera AI Backend

```cmd
git add backend/camera_cv_analytics.py backend/camera_video_annotator.py
git commit -m "feat: add fire response video analysis backend"
```

### Commit 3: Logs Analytics

```cmd
git add backend/main.py backend/logs_python_analytics.py src/pages/LogsDebrief.tsx
git commit -m "feat: add logs python analytics debrief"
```

### Commit 4: Mission Planner

```cmd
git add src/pages/MissionPlanner.tsx src/components/mission/MissionPlanningMap.tsx
git commit -m "style: improve mission planner interface"
```

### Commit 5: Live Operations

```cmd
git add src/components/layout/AppShell.tsx src/components/common/MetricCard.tsx src/components/live/AlertsPanel.tsx src/components/live/TelemetryGrid.tsx src/pages/LiveOps.tsx
git commit -m "style: polish live operations layout"
```

### Commit 6: Systems Pages

```cmd
git add src/pages/BatteryPower.tsx src/pages/DashboardSettings.tsx src/pages/DroneHealth.tsx src/pages/Security.tsx
git commit -m "style: redesign systems dashboard pages"
```

### Commit 7: README Documentation

```cmd
git add README.md
git commit -m "docs: add project readme"
```

### Push All Commits

```cmd
git push origin main
```

---

## Git Notes

Do not use this unless you intentionally want to add every file:

```cmd
git add .
```

Better approach:

```cmd
git add specific-file-name
```

This keeps commits clean and avoids accidentally committing unwanted files.

---

## Useful Git Commands

See latest commits:

```cmd
git log --oneline -5
```

See changed files:

```cmd
git status --short
```

See branch:

```cmd
git branch
```

Push current branch:

```cmd
git push origin main
```

Restore accidental file changes:

```cmd
git restore path/to/file
```

Restore deleted assets if needed:

```cmd
git restore src/assets/aeronexus-logo.png src/assets/hero.png
```

Remove deleted files intentionally:

```cmd
git rm src/assets/aeronexus-logo.png src/assets/hero.png
```

---

## Troubleshooting

### Backend says `main.py` not found

You are probably running backend command from the wrong folder.

Correct folder:

```cmd
cd /d "M:\Project\Aeronexus Command Center — Unified Mission Control for Next-Generation UAV Systems\backend"
```

Then run:

```cmd
venv\Scripts\activate
uvicorn main:app --reload
```

---

### Video is not running

Check that the video exists here:

```text
public/videos/Fire_Response_1.MP4
```

Then test:

```text
http://localhost:5173/videos/Fire_Response_1.MP4
```

If it does not open, the file name or path is wrong.

Important: file names are case-sensitive in some environments.

Current expected name:

```text
Fire_Response_1.MP4
```

---

### Backend source says `exists: false`

Open:

```text
http://127.0.0.1:8000/api/camera-ai/sources
```

If `fire-response-1` shows:

```json
"exists": false
```

then the file is not in the correct path.

Correct path:

```text
public/videos/Fire_Response_1.MP4
```

---

### OpenCV error

Install OpenCV:

```cmd
pip install opencv-python numpy
```

---

### YOLO error

Install Ultralytics:

```cmd
pip install ultralytics
```

---

### Frontend dependency error

Run:

```cmd
npm install
```

Then:

```cmd
npm run dev
```

---

### Port already in use

For frontend, stop the previous Vite terminal and run again:

```cmd
npm run dev
```

For backend, stop the previous Uvicorn terminal and run again:

```cmd
uvicorn main:app --reload
```

---

### Git says nothing to commit

That means the selected files were already committed or there are no changes in those files.

Check:

```cmd
git status --short
```

---

## Development Commands Summary

### Start Backend

```cmd
cd /d "M:\Project\Aeronexus Command Center — Unified Mission Control for Next-Generation UAV Systems\backend"
venv\Scripts\activate
uvicorn main:app --reload
```

### Start Frontend

```cmd
cd /d "M:\Project\Aeronexus Command Center — Unified Mission Control for Next-Generation UAV Systems"
npm run dev
```

### Commit README

```cmd
git add README.md
git commit -m "docs: add project readme"
git push origin main
```

---

## Current Prototype Status

This project is currently a software prototype and demonstration dashboard.

Current working areas include:

- Camera AI page
- Fire Response 1 video source
- OpenCV frame analysis
- YOLO video stream
- Fire/smoke alert banner
- JavaScript alert sound
- Logs Python analytics
- Mission planner UI
- Live operations UI
- Security prototype UI
- Drone system pages

---

## Future Scope

Possible future improvements:

- Real UAV telemetry integration
- MAVLink hardware connection
- Better trained custom fire/smoke detection model
- Mission replay system
- Real-time WebSocket video analytics
- Cloud dashboard deployment
- User authentication
- Drone fleet management
- Alert history database
- Operator role management
- Report export system
- Real map-based geofence enforcement
- Multi-drone coordination

---

## Disclaimer

Aeronexus Command Center is currently a prototype-level UAV dashboard and simulation-focused software project.

The system is intended for:

- Student innovation
- UAV software research
- Prototype demonstrations
- Dashboard development
- Mission-system UI exploration
- Computer vision experimentation

It should not be treated as a certified aviation, emergency-response, or defense-grade operational system without proper testing, validation, approvals, and compliance.

---

## Maintainer

```text
Aeronexus
Unified Mission Control for Next-Generation UAV Systems
```

---

## License

This project is maintained for prototype, research, educational, and demonstration purposes.