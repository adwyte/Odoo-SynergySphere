# SynergySphere - Project Management System

SynergySphere is a modern, full-stack project management system built with FastAPI and Next.js. It provides a robust platform for team collaboration, task management, and project tracking.

## 🚀 Features

- **User Authentication**: Secure JWT-based authentication system
- **Project Management**: Create, update, and track projects
- **Task Management**: Organize tasks with deadlines and assignments
- **Team Collaboration**: Add team members to projects and assign tasks
- **Real-time Analytics**: Track project progress and team performance
- **Responsive UI**: Modern interface built with Next.js and Tailwind CSS

## 🛠️ Technology Stack

### Backend
- FastAPI (Python)
- PostgreSQL
- SQLAlchemy ORM
- Alembic for migrations
- JWT Authentication
- Pydantic for data validation

### Frontend
- Next.js 14
- TypeScript
- Tailwind CSS
- Shadcn UI Components
- React Query for state management

## 📝 Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- PostgreSQL 12 or higher
- pnpm package manager

## 🚦 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/adwyte/Odoo-SynergySphere.git
   cd Odoo-SynergySphere
   ```

2. **Set up the backend**
   ```bash
   cd src/backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
   pip install -e .
   ```

3. **Configure the database**
   ```bash
   # Create a .env file in the root directory with:
   DATABASE_URL=postgresql://postgres:sanskar@localhost:5432/synergy_db
   ENV=dev
   SECRET_KEY=your-secret-key
   ACCESS_TOKEN_EXPIRE_MINUTES=60
   ```

4. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

5. **Start the backend server**
   ```bash
   uvicorn app.main:app --reload
   ```

6. **Set up the frontend**
   ```bash
   cd src/frontend
   pnpm install
   pnpm dev
   ```

## 🌐 API Documentation

Once the backend server is running, you can access the API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🔧 Project Structure

```
src/
├── backend/
│   ├── alembic/          # Database migrations
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Core configurations
│   │   ├── db/          # Database models
│   │   └── models/      # Pydantic models
│   └── tests/           # Backend tests
└── frontend/
    ├── app/             # Next.js pages
    ├── components/      # React components
    ├── lib/            # Utility functions
    └── styles/         # CSS styles
```

## 👥 Team

- **Adwyte Karandikar** - Full Stack Development
- **Sanskar Kulkarni** - Backend Development
- **Jay Gadre** - Frontend Development
- **Swarada Joshi** - UI/UX Design & Frontend Development

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check our issues page.

---
Built with ❤️ by Team SynergySphere