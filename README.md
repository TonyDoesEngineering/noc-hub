<div align="center">
  <img src="assets/demo.webp" alt="NOC Team Hub Demo" width="800">

  <h1>⚡ NOC Team Hub</h1>
  <p><strong>A centralized workspace for Network Operations Centers to manage shifts, incidents, vendors, and knowledge.</strong></p>
</div>

<hr>

## 🚀 Overview

The **NOC Team Hub** is a lightweight, dark-themed web application designed specifically for NOC teams. It solves the chaos of lost shift context, disjointed vendor tracking, and repeated mistakes by bringing the team's core workflows into one shared pane of glass.

Built with **Node.js, Express, and pure pure JS SQLite (sql.js)**, it's designed to be simple to run, easy to host, and lightning fast.

## ✨ Features

### 👥 1. Team Activity Board
Know exactly what everyone is working on in real-time. No more overlapping work or interrupting colleagues who are focused on P1 incidents.
- Set statuses: `Working`, `Investigating`, `Blocked`, `On Break`.
<p align="center"><img src="assets/team-board.png" alt="Team Board" width="600"></p>

### 📖 2. Runbook / Playbook
A shared knowledge base for procedures and known fixes. Searchable by tags and categories, so the team never relies on a single person's memory.
<p align="center"><img src="assets/runbook.png" alt="Runbook" width="600"></p>

### 🚨 3. Incident Log
Track outages, log root causes, and document the fix. By logging both the *issue* and the *prevention steps*, the team learns from every incident.
- Tag severity: `P1 Critical` to `P4 Low`.

### 📡 4. Vendor Monitor
A glanceable dashboard for your upstream connections and B2B partners. Track IP addresses, ports, latency, and instantly flag a vendor as degraded or offline.
<p align="center"><img src="assets/vendors.png" alt="Vendors" width="600"></p>

### 🔄 5. Shift Handoff
Never lose context between shift changes. A structured form for declaring active issues, resolved incidents, open alarms, and specific notes for the next shift.
<p align="center"><img src="assets/handoff.png" alt="Shift Handoff" width="600"></p>

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (No build tools required!)
- **Backend:** Node.js, Express
- **Database:** sql.js (Pure JavaScript SQLite — file-backed)
- **Design:** Modern dark mode, custom UI/UX for operations centers.

## 💻 How to Run Locally

You can run this project locally on your machine in under a minute.

1. **Clone the repo:**
   ```bash
   git clone https://github.com/TonyDoesEngineering/noc-hub.git
   cd noc-hub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open in browser:**
   Open [http://localhost:3000](http://localhost:3000)

> *The database file (`noc-hub.db`) will be automatically created in the root directory.*

## 📈 Future Roadmap

As an ongoing project, planned features include:
- **Authentication:** Individual user logins.
- **WebSockets:** Real-time synchronized updates across all connected clients without refreshing.
- **Alerting Integration:** Email or webhook alerts for P1 Incidents.
- **Metrics Dashboard:** Visual charts for incident frequency and DLR rates.
