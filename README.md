# Personnel Task Management System

A modern, cloud-integrated task management system for legal firms or personnel tracking.
Built with Vanilla JS, CSS, and HTML. Backed by Google Sheets (via Apps Script).

## Features
- **Task Management**: Create, assign, and track tasks.
- **Role-Based Access**: Admin, Manager, Employee roles.
- **Real-Time Sync**: Data is stored in Google Sheets for shared access.
- **Reporting**: Performance metrics and reports.
- **Premium UI**: Glassmorphism design with responsive layout.

## Setup & Deployment

1.  **Deploying to GitHub Pages**:
    - Push this repository to GitHub.
    - Go to **Settings > Pages**.
    - Under **Build and deployment**, select **Source: Deploy from a branch**.
    - Select **Branch: main** (or master) and folder **/(root)**.
    - Save. Your site will be live in a few minutes.

2.  **Configuration**:
    - The `script.js` file contains the `API_URL` pointing to the Google Apps Script.
    - Ensure your Google Apps Script is deployed as a **Web App** with access set to **"Anyone"**.

## Usage
- **Login**:
    - Admin: `admin` / `123`
    - Manager: `mudur` / `123`
    - Staff: `personel` / `123`
- **Offline Mode**: The app will show a red indicator if it cannot reach the cloud. It works best with an internet connection.

## License
MIT
