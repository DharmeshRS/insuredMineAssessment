# Insurance Management System

A Node.js application built with Express.js and MongoDB for managing insurance policies, users, agents, carriers, and related data.

## Features

### Task 1: Data Management & APIs
- **File Upload with Worker Threads**: Upload consolidated Excel/CSV data
- **Search API**: Find policy info by username
- **Aggregated Policy Data**: Get comprehensive policy statistics by user
- **Multi-Collection Architecture**: Separate collections for Agent, User, Account, LOB, Carrier, Policy

### Task 2: System Monitoring & Messaging
- **Real-time CPU Monitoring**: Auto-restart server when CPU usage > 70%
- **Scheduled Message Service**: Post messages to be sent at specific date/time
- **Enhanced Health Endpoint**: Comprehensive system metrics and monitoring


### Data Models
- **Agent**: Agent information and contact details
- **User**: User profiles with demographics and contact information
- **Account**: User accounts linked to users
- **LOB (Line of Business)**: Policy categories with risk levels and rates
- **Carrier**: Insurance carriers/companies
- **Policy**: Insurance policies with comprehensive details
- **Scheduled Message**: Time-based message scheduling system

## Technology Stack

## 📋 API Documentation

### Health Check
```bash
curl -X GET "http://localhost:3000/health"
```

### File Upload (Consolidated Data)
```bash
curl -X POST "http://localhost:3000/api/upload" \
  -F "file=@your-data-file.xlsx" \
  -F "sheetType=consolidated"
```

### Policy Search by Username
```bash
curl -X GET "http://localhost:3000/api/policies/search/by-username?username=Alex"
```

### Aggregated Policy Data
```bash
curl -X GET "http://localhost:3000/api/policies/aggregated/by-user"
```

### Scheduled Messages
```bash
# Create scheduled message
curl -X POST "http://localhost:3000/api/scheduled-messages" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Policy renewal reminder",
    "day": "2025-07-31",
    "time": "10:30",
    "recipient": "dsonar333@gmail.com",
    "priority": "high"
  }'

# Get all scheduled messages
curl -X GET "http://localhost:3000/api/scheduled-messages"
```

## 🛠️ Installation

### Prerequisites
- Node.js (v18 [currently using] or higher)
- MongoDB (local or Atlas [currently using])
- Git

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/DharmeshRS/insuredMineAssessment.git
cd insuredMineAssessment
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment file**
```bash
# Create .env file with the following content:
MONGODB_URI=mongodb://localhost:27017/insurance_management
PORT=3000
NODE_ENV=development
CPU_THRESHOLD=70
RESTART_DELAY=5000
```

4. **Start the server**
```bash
npm start
```

## 📊 System Architecture

### Collections
- **Agent**: Insurance agents information
- **User**: Client/user information with address and contact details
- **Account**: User account management
- **LOB**: Lines of Business (Policy categories)
- **Carrier**: Insurance companies
- **Policy**: Insurance policies with relationships
- **ScheduledMessage**: Message scheduling system
