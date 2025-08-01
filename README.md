# MiniCRM - Microservices Architecture

A minimal Customer Relationship Management (CRM) system built with microservices architecture using NestJS, Kafka, PostgreSQL, and Docker.

## 🏗️ Architecture Overview

```
                 ┌────────────────────────────────────────┐
                 │              Client / UI               │
                 └────────────────────────────────────────┘
                               │      ▲
                         REST  │      │  
                               ▼      │
                 ┌─────────────────────────────┐
                 │         API Gateway         │
                 └─────────────────────────────┘
                   │      │             │       ▲
     HTTP (SDK)    ▼      ▼             ▼       │  Kafka Events
        ┌────────────┐ ┌────────────┐ ┌────────────┐
        │ UserSvc    │ │ LeadSvc    │ │ NotifySvc  │
        └────────────┘ └────────────┘ └────────────┘
```

## 📦 Services

### 1. API Gateway (Port: 3000)
- Single entry point for all external requests
- Routes requests to appropriate microservices
- Handles authentication and authorization
- Provides health checks for all services

### 2. User Service (Port: 3001)
- User management and authentication
- JWT-based authentication
- User roles and permissions
- Publishes user events to Kafka

### 3. Lead Service (Port: 3002)
- Lead management and tracking
- Lead assignment and status updates
- Communicates with User Service via SDK
- Publishes lead events to Kafka

### 4. Notification Service (Port: 3003)
- Handles all types of notifications (email, SMS, push, in-app)
- Subscribes to Kafka events
- Asynchronous notification processing

## 🛠️ Technology Stack

- **Framework**: NestJS
- **Database**: PostgreSQL (separate database per service)
- **Message Broker**: Apache Kafka
- **Authentication**: JWT
- **Containerization**: Docker & Docker Compose
- **Package Manager**: pnpm
- **Documentation**: Swagger/OpenAPI

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ and pnpm

### 1. Clone and Setup
```bash
cd backend
pnpm install
```

### 2. Start All Services
```bash
# Start all services with Docker Compose
pnpm run docker:up

# Or build and start
pnpm run docker:build
pnpm run docker:up
```

### 3. Access Services
- **API Gateway**: http://localhost:3000
- **User Service**: http://localhost:3001
- **Lead Service**: http://localhost:3002
- **Notification Service**: http://localhost:3003
- **Kafka UI**: http://localhost:8080
- **Swagger Docs**: http://localhost:3000/api

## 📋 API Endpoints

### Authentication
```bash
# Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Refresh Token
POST /auth/refresh
{
  "refreshToken": "your-refresh-token"
}
```

### Users
```bash
# Create User
POST /users
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "sales_rep"
}

# Get All Users
GET /users

# Get User by ID
GET /users/{id}

# Update User
PATCH /users/{id}
{
  "firstName": "Jane"
}
```

### Leads
```bash
# Create Lead
POST /leads
{
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice@company.com",
  "phone": "+1234567890",
  "company": "Tech Corp",
  "source": "website"
}

# Get All Leads
GET /leads

# Assign Lead
PATCH /leads/{id}/assign
{
  "assignedUserId": "user-id"
}

# Update Lead Status
PATCH /leads/{id}/status
{
  "status": "qualified"
}
```

### Notifications
```bash
# Create Notification
POST /notifications
{
  "type": "email",
  "title": "New Lead Assigned",
  "message": "You have been assigned a new lead",
  "recipientId": "user-id"
}

# Get Notifications by Recipient
GET /notifications/recipient/{recipientId}
```

## 🔧 Configuration

### Environment Variables
```bash
# Database URLs
DATABASE_URL=postgresql://crm_user:crm_password@postgres-users:5432/crm_users

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Kafka Configuration
KAFKA_BROKERS=kafka:29092

# Service URLs
USER_SERVICE_URL=http://user-service:3001
LEAD_SERVICE_URL=http://lead-service:3002

# Email Configuration
EMAIL_PROVIDER=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM_NAME=MiniCRM
```

## 🧪 Testing

### Health Checks
```bash
# Check all services health
GET /health

# Individual service health checks
GET /admin/test
```

### Manual Testing
1. Start the services
2. Create a user via the API Gateway
3. Login to get JWT token
4. Use the token to access protected endpoints
5. Create leads and assign them to users
6. Check notifications are sent via Kafka events

## 📊 Kafka Topics

Currently only user.created event has a consumer which triggers a welcome notification e-mail to the user

### User Events
- `user.created` - When a new user is created
- `user.updated` - When a user is updated
- `user.deleted` - When a user is deleted

### Lead Events
- `lead.created` - When a new lead is created
- `lead.updated` - When a lead is updated
- `lead.assigned` - When a lead is assigned to a user
- `lead.status_changed` - When lead status changes
- `lead.deleted` - When a lead is deleted

### Notification Events
- `notification.sent` - When a notification is successfully sent
- `notification.failed` - When a notification fails to send

## 🏗️ Project Structure

```
backend/
├── apps/
│   ├── api-gateway/          # API Gateway service
│   ├── user-service/         # User management service
│   ├── lead-service/         # Lead management service
│   └── notification-service/ # Notification service
├── libs/
│   ├── common/              # Shared DTOs and utilities
│   └── sdk/                 # Internal SDK for service communication
├── kafka/                   # Kafka configuration and event types
├── docker-compose.yml       # Docker Compose configuration
└── package.json            # Root package.json
```

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Input validation with class-validator
- CORS enabled for cross-origin requests
- Environment-based configuration

## 📈 Monitoring

- Health check endpoints for all services
- Kafka UI for monitoring message flow
- Swagger documentation for API exploration
- Structured logging throughout the application

## 🚀 Deployment

⚠️ **Note**: This project is not production-ready yet. The system hasn't reached maturity in security, monitoring, and other production requirements. This is currently a development/learning project.

### Local Deployment with Docker Compose

The easiest way to run MiniCRM locally is using Docker Compose:

```bash
# Clone the repository
git clone <repository-url>
cd miniCRM/backend

# Copy environment template and configure
cp env.example .env
# Edit .env with your email settings

# Start all services
docker-compose up -d

# Check if all services are running
docker-compose ps

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

**What gets deployed:**
- **API Gateway** (Port 3000) - Main entry point
- **User Service** (Port 3001) - User management
- **Lead Service** (Port 3002) - Lead management  
- **Notification Service** - Kafka consumer (no HTTP port)
- **PostgreSQL** databases (Ports 5432-5435) - Separate DB per service
- **Kafka** (Port 9092) - Message broker
- **Kafka UI** (Port 8080) - Web interface for monitoring Kafka

**Access points:**
- API Gateway: http://localhost:3000
- Swagger Docs: http://localhost:3000/api
- Kafka UI: http://localhost:8080

## 🤝 Contributing

Everyone is welcome to contribute! Feel free to open issues, submit pull requests, or start discussions about improvements. Just make sure to follow the existing code style and test your changes.

## 📝 License

This project is licensed under the MIT License.
