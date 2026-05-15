# Sports Tracker

## Project Description

Sports Tracker is a full-stack web application designed to centralize sports data in one platform. The application allows users to search for teams, players, and competitions, view sports statistics, access schedules, and interact with user-based features such as authentication and favorites.

The purpose of this project is to make sports information easier to access by combining data from external sports APIs into a single application. Instead of requiring users to visit multiple websites for player statistics, team information, schedules, or competition data, Sports Tracker provides a more organized and searchable interface.

This project was developed using an Agile/Scrum workflow across three sprints. The team used Jira to organize Epics, Tasks, and Subtasks, and GitHub was used for version control, branching, commits, and pull requests.

---

## Features

- Search for players, teams, and competitions
- View player and team statistics
- View team or competition schedules
- User registration and login
- Save favorite teams or players
- Admin-related functionality
- API error handling
- Empty result handling
- Soccer-focused filtering
- Authentication and search testing

---

## Technologies Used

### Frontend
- React
- JavaScript
- HTML
- CSS
- React Router

### Backend
- Node.js
- Express.js

### Database / Authentication
- Supabase

### APIs
- TheSportsDB API
- Football API / Football98 API

### Development Tools
- GitHub
- Jira
- Postman
- Visual Studio Code
- npm

---

## Project Structure

The repository may include frontend and backend folders depending on the final team organization.

Common structure:

```text
Sports-Tracker/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.example
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
└── README.md

## Useful Commands

```sh
npm run build
npm run test
```

## Important Note

This repository does not include real API keys or secret credentials. To run the project locally, create your own `.env` file using the provided `.env.example` format.
