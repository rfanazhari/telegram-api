# 🚀 Telegram REST API
A modern, robust REST API for seamless Telegram integration, built with **Node.js**, **TypeScript**, **Express**, and **TypeORM**.

## 🌟 Overview

**Telegram REST API** empowers your apps to interact with Telegram effortlessly. It offers secure authentication, rich channel access, efficient message retrieval, persistent SQLite storage, and scalable deployment—from local development to production with Docker.

## ✨ Core Features

- **User Authentication**
    - Email/phone login
    - QR code (upcoming)
    - Secure JWT-based sessions

- **Channel & Message Management**
    - List Telegram channels
    - Fetch channel messages with pagination

- **Data Storage**
    - Reliable SQLite database integration

- **Developer Experience**
    - Built-in Docker support for easy containerization
    - TypeScript for type safety & maintainability

## 🔧 Prerequisites

- **Node.js** v20.10.x or newer
- **npm** or **yarn**
- **SQLite**

## ⚡️ Quick Start

### 1. Clone & Setup
```bash
git clone 
cd telegram-api
```
### 2. Install Dependencies
```bash
npm install
```
### 3. Configure Environment
Create a `.env` file in your project root with:
```env
PORT=3000
NODE_ENV=development
DB_PATH=./data/database.sqlite
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRES_IN=1d
TELEGRAM_API_ID=your_telegram_api_id
TELEGRAM_API_HASH=your_telegram_api_hash
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
LOG_LEVEL=info
```
### 4. Seed Initial User Data
```bash
npm run seed:users
```

## 🖥️ Running the App

- **Development Mode**
  ```bash
  npm run dev
  ```
- **Production Mode**
  ```bash
  npm run build
  npm start
  ```

## 📘 API Endpoints at a Glance

### Authentication

| Action                              | URL                       | Method | Body/Headers                 |
|--------------------------------------|---------------------------|--------|------------------------------|
| Login                               | `/api/auth/login`         | POST   | JSON: email/password         |
| Login (Phone)                       | `/api/auth/login-phone`   | POST   | JSON: phone                  |
| Verify Phone                        | `/api/auth/verify-phone`  | POST   | JSON: session & code         |
| Session Info                        | `/api/auth/session`       | GET    | Header: Authorization        |
| Login with QR Code (upcoming)        | `/api/auth/login-qr`      | POST   |                              |
| Logout                              | `/api/auth/logout`        | POST   | Header: Authorization        |

### Channels & Messages

| Action         | URL                       | Method | Notes                     |
|----------------|---------------------------|--------|---------------------------|
| List Channels  | `/api/channels`           | GET    | Auth required             |
| Get Messages   | `/api/messages/:channelId`| GET    | Auth + Pagination         |

Full request/response examples available in the detailed docs below.

## 🐳 Dockerized Deployment

Build and run using Docker for hassle-free production:

```bash
# Build Docker image
docker build -t telegram-api .

# Run container
docker run -p 3000:3000 -d --name telegram-api telegram-api
```

Access your API at: `http://localhost:3000`

## 🤝 Contributing
Feel free to fork, open issues, or submit PRs. All contributions are welcome! Let’s build a better Telegram integration experience together.

## 📚 License

ISC

> _Built for engineers and teams who need secure, scalable Telegram integrations—fast. Contribute, fork, or star if you find this project useful!_

Optimized for open source on GitHub and shareable on LinkedIn.  
Ready to power your next messaging automation, monitoring dashboard, or data pipeline!