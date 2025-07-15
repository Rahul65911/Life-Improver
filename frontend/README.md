# Life Improver - Frontend

This is the frontend for the Life Improver application, a daily task tracker and challenge app. It is built with React, Vite, TypeScript, and styled with Tailwind CSS.

## Features

*   **Modern UI:** Clean and responsive design built with Tailwind CSS and shadcn/ui components.
*   **User Authentication:** Secure sign-up, sign-in, and password reset flows.
*   **Dashboard:** An overview of the user's daily score, win/loss record, active challenges, and weekly average performance.
*   **Task Management:** A dedicated page to create, update, and delete daily tasks.
*   **Daily Progress Tracking:** Users can log the time spent on each task for the current day, with progress bars for visual feedback.
*   **User Challenges:** Find other users, send them challenges, and accept or decline incoming challenges.
*   **Calendar View:** A monthly calendar that visualizes daily scores and the results of completed challenges.
*   **User Discovery:** A page to find other users, view their stats, and initiate challenges.

## Tech Stack

*   **Framework:** [React](https://react.dev/) with [Vite](https://vitejs.dev/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) for components.
*   **Routing:** [React Router](https://reactrouter.com/)
*   **State Management:** React Hooks (useState, useEffect, useContext).
*   **Forms:** [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) for schema validation.
*   **API Communication:** [Axios](https://axios-http.com/) (wrapped in a custom API client).
*   **Icons:** [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

*   Node.js and npm
*   A running instance of the [backend server](../backend/README.md).

### Installation

1.  **Navigate to the frontend directory:**
    ```bash
    cd Life-Improver/frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a `.env` file in the `frontend` directory and add the following variables. These are required to connect to the backend API and Supabase for authentication.

    ```
    # The base URL of your backend API
    VITE_API_URL=http://localhost:3001/api

    # Your Supabase project URL and anon key
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Start the development server:**
    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

## Available Scripts

*   `npm run dev`: Starts the Vite development server.
*   `npm run build`: Compiles the TypeScript and React code for production.
*   `npm run lint`: Lints the codebase using ESLint.
*   `npm run preview`: Serves the production build locally.

## Project Structure

The `src` directory is organized as follows:

```
/src
|-- components/  # Reusable UI components (Layout, AuthForm, etc.)
|-- hooks/       # Custom React hooks (e.g., useAuth)
|-- lib/         # Core logic, API client, and utilities
|-- pages/       # Top-level page components for each route
|-- App.tsx      # Main application component with routing logic
|-- main.tsx     # Application entry point
```
