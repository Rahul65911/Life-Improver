# Life Improver - Backend

This is the backend for the Life Improver application, a daily task tracker and challenge app. It's built with Node.js, Express, and Supabase.

## Features

*   **User Authentication:** Sign up, sign in, sign out, and password reset.
*   **Task Management:** Create, read, update, and delete daily tasks.
*   **Task Completion Tracking:** Log daily progress on tasks.
*   **Challenges:** Challenge other users to see who can maintain a better task completion score over a period of time.
*   **Scoring:**
    *   Daily scores are calculated based on task completion.
    *   Users have win/loss records for challenges.
*   **Leaderboards:** View top users based on their challenge wins.
*   **User Search:** Find other users to challenge.
*   **Dashboard:** View your daily stats, including today's score, win/loss record, active challenges, and weekly average score.
*   **Calendar View:** See your daily scores and challenge results for a given month.

## Tech Stack

*   **Framework:** Express.js
*   **Database:** Supabase (PostgreSQL)
*   **Authentication:** Supabase Auth
*   **Middleware:**
    *   `cors`: For handling Cross-Origin Resource Sharing.
    *   `helmet`: For securing HTTP headers.
    *   `morgan`: For logging HTTP requests.
    *   `express-rate-limit`: For limiting requests to the API.
*   **Environment Variables:** `dotenv`

## Getting Started

### Prerequisites

*   Node.js and npm
*   A Supabase project

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd Life-Improver/backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a `.env` file in the `backend` directory and add the following:

    ```
    PORT=3001
    FRONTEND_URL=http://localhost:5173

    # Supabase
    SUPABASE_URL=your_supabase_project_url
    SUPABASE_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_KEY=your_supabase_service_role_key

    # Email redirect URL for password resets
    EMAIL_REDIRECT_URL=http://localhost:5173/reset-password
    ```

4.  **Run the database migrations:**

    The SQL script in `supabase/migrations` sets up the database schema, including tables, policies, and functions. You can run this script in the Supabase SQL editor.

5.  **Start the development server:**
    ```bash
    npm run dev
    ```

    The server will be running on `http://localhost:3001`.

## API Endpoints

All endpoints are prefixed with `/api`.

### Authentication (`/auth`)

*   `POST /signup`: Create a new user.
*   `POST /signin`: Log in a user.
*   `POST /signout`: Log out a user.
*   `POST /forgot-password`: Send a password reset email.
*   `GET /me`: Get the currently authenticated user's profile.

### Tasks (`/tasks`)

*   `GET /`: Get all of the user's active tasks.
*   `POST /`: Create a new task.
*   `PUT /:id`: Update a task.
*   `DELETE /:id`: Delete a task.
*   `GET /completions/today`: Get the user's task completions for the current day.
*   `POST /completions`: Log a task completion for the current day.

### Challenges (`/challenges`)

*   `GET /`: Get all of the user's challenges.
*   `POST /`: Create a new challenge.
*   `PUT /:id/respond`: Accept or decline a challenge.
*   `PUT /:id/cancel`: Cancel a challenge.
*   `POST /complete`: Update the status of completed challenges (this is intended to be run periodically).

### Scores (`/scores`)

*   `GET /dashboard`: Get the user's dashboard stats.
*   `GET /calendar`: Get the user's calendar data for a given month.

### Users (`/users`)

*   `GET /top`: Get the top users.
*   `GET /search`: Search for users.

## Database Schema

The database schema is defined in `supabase/migrations/20250713144051_misty_cottage.sql`. It includes the following tables:

*   `profiles`: Stores user profile information, including stats.
*   `tasks`: Stores user tasks.
*   `task_completions`: Stores daily task completion records.
*   `challenges`: Stores challenges between users.
*   `daily_scores`: Stores daily aggregated scores for users.

The schema also includes database functions for calculating daily scores and determining challenge winners, as well as row-level security policies to protect user data.
