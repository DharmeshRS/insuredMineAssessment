# Insurance Management System

A comprehensive Node.js application built with Express.js and MongoDB for managing insurance policies, users, agents, carriers, and related data.

## Features

### Core Features
- **File Upload Processing**: Upload XLSX/CSV files using worker threads for performance
- **Search API**: Find policy information by username with flexible search capabilities
- **Aggregated Analytics**: Get aggregated policy data grouped by users
- **CPU Monitoring**: Real-time CPU utilization monitoring with automatic server restart at 70% usage
- **Scheduled Messages**: Create and manage scheduled messages with cron jobs
- **Performance Optimizations**: Clustering, rate limiting, compression, and logging

### Data Models
- **Agent**: Agent information and contact details
- **User**: User profiles with demographics and contact information
- **Account**: User accounts linked to users
- **LOB (Line of Business)**: Policy categories with risk levels and rates
- **Carrier**: Insurance carriers/companies
- **Policy**: Insurance policies with comprehensive details
- **Scheduled Message**: Time-based message scheduling system

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **File Processing**: Worker Threads, XLSX, CSV Parser
- **Performance**: Clustering, CPU monitoring, Rate limiting
- **Logging**: Winston with file rotation
- **Security**: Helmet, CORS, Input validation
- **Scheduling**: Node-cron for scheduled tasks

## Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd insurance-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Copy `env.example` to `.env` and configure your environment variables:
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/insurance_management
   JWT_SECRET=your_super_secret_jwt_key_here
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system or update the connection string for your cloud instance.

5. **Run the application**
   
   For development:
   ```bash
   npm run dev
   ```
   
   For production:
   ```bash
   npm start
   ```

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Health Check
```http
GET /health
```

### File Upload API

#### Upload Data File
```http
POST /api/upload
Content-Type: multipart/form-data

Body:
- file: XLSX/CSV file
- sheetType: "agent" | "user" | "account" | "lob" | "carrier" | "policy"
```

**Response:**
```json
{
  "success": true,
  "message": "File processed successfully",
  "data": {
    "totalRows": 100,
    "processed": 95,
    "created": 90,
    "updated": 5,
    "errors": []
  }
}
```

### Policy API

#### Search Policies by Username
```http
GET /api/policies/search/by-username?username=john&firstName=John&lastName=Doe
```

#### Get Aggregated Policy Data
```http
GET /api/policies/aggregated/by-user?userId=64a1b2c3d4e5f6789abcdef0
```

#### Get All Policies
```http
GET /api/policies?page=1&limit=10&status=active
```

#### Get Policy Statistics
```http
GET /api/policies/stats
```

### User API

#### Get All Users
```http
GET /api/users?page=1&limit=10&search=john&userType=individual
```

#### Get User by ID
```http
GET /api/users/:id
```

#### Create User
```http
POST /api/users
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "dob": "1990-01-01",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  },
  "phoneNumber": "+1-555-0123",
  "gender": "male",
  "userType": "individual"
}
```

### Scheduled Messages API

#### Create Scheduled Message
```http
POST /api/scheduled-messages
Content-Type: application/json

{
  "message": "Policy renewal reminder",
  "day": "2024-12-31",
  "time": "09:00",
  "recipient": "user@example.com",
  "recipientType": "email",
  "priority": "medium"
}
```

#### Get Pending Messages
```http
GET /api/scheduled-messages/pending
```

### Other APIs

Similar CRUD operations are available for:
- `/api/agents` - Agent management
- `/api/accounts` - Account management  
- `/api/lob` - Line of Business management
- `/api/carriers` - Carrier management

## Performance Features

### CPU Monitoring
The application automatically monitors CPU usage and restarts when it exceeds the configured threshold (default 70%).

### Clustering
In production mode, the application uses all available CPU cores for maximum performance.

### Rate Limiting
API endpoints are rate-limited to prevent abuse (default: 100 requests per 15 minutes).

### File Processing
Large file uploads are processed using worker threads to prevent blocking the main thread.

## File Upload Format

### Supported File Types
- XLSX (Excel)
- XLS (Legacy Excel)
- CSV (Comma Separated Values)

### Expected Column Headers

**User Data:**
- First Name, Last Name, DOB, Address, City, State, Zip Code, Phone Number, Email, Gender, User Type

**Agent Data:**
- Agent Name, Email, Phone, Department, Status

**Policy Data:**
- Policy Number, Policy Start Date, Policy End Date, Premium Amount, Coverage Amount, Deductible

**Carrier Data:**
- Company Name, Company Code, License Number, Address, Phone, Email

**LOB Data:**
- Category Name, Category Code, Description, Base Premium Rate, Risk Level

## Error Handling

The application includes comprehensive error handling:
- Input validation with detailed error messages
- Database connection error handling
- File processing error reporting
- Graceful server shutdown procedures

## Logging

Comprehensive logging system with:
- Different log levels (error, warn, info, debug)
- File rotation to prevent disk space issues
- Console logging in development
- Structured logging for better monitoring

## Security Features

- Helmet.js for security headers
- CORS configuration
- Input validation and sanitization
- Rate limiting
- MongoDB injection prevention

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| MONGODB_URI | MongoDB connection string | Required |
| JWT_SECRET | JWT signing secret | Required |
| CPU_THRESHOLD | CPU restart threshold (%) | 70 |
| MAX_FILE_SIZE | Max upload size (bytes) | 10485760 |
| LOG_LEVEL | Logging level | info |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository. 