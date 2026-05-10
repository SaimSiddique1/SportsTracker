<<<<<<< Updated upstream
# SportsTracker
Github Repository for CMSC 447 Group Project
Test edit for the SCRUM 21 branch, should only exist here!!!
# SportsTracker
Github Repository for CMSC 447 Group Project
Test edit for the SCRUM 21 branch, should only exist here!!!













NOTES: on .env, don't put .env folder in /src

.env variable set up for API keys 

this is for Football98 RapidAPI & SPORTSDB API keys

Your frontend .env should then be:

my-react-app/.env

VITE_SOCCER_API_KEY=your_rapidapi_key_here

VITE_SPORTSDB_API_KEY=XXX



.env variable for server folder 

server/.env

PORT=5000

DATABASE_URL=postgresql://HOST_USERNAME@localhost:5432/sportstracker

JWT_SECRET=my_super_long_random_secret_2026_sportstracker





=======
# SportsTracker
Github Repository for CMSC 447 Group Project
Test edit for the SCRUM 21 branch, should only exist here!!!













NOTES: do not commit real `.env` files.

Use the example files as templates:

- `my-react-app/.env.example` -> copy values into `my-react-app/.env`
- `server/.env.example` -> copy values into `server/.env`

Frontend variables:

VITE_API_BASE_URL=http://localhost:5001
VITE_SOCCER_API_KEY=your_rapidapi_key_here
VITE_SPORTSDB_API_KEY=your_sportsdb_api_key_here

Server variables:

PORT=5001
DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/sportstracker
JWT_SECRET=replace_with_a_long_random_secret




>>>>>>> Stashed changes
