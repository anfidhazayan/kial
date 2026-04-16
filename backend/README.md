# KIAL AVSEC DATA - Backend

Backend API for KIAL Aviation Security Data Management System built with Node.js, Express, Prisma, and PostgreSQL.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control (CSO, Entity Head, Staff)
- **Entity Management**: Manage security agencies and their compliance data
- **Staff Management**: Track staff members and their security clearances
- **Certificate Tracking**: Monitor AVSEC training and PCC certificates with expiry alerts
- **Approval Workflow**: Certificate renewal request and approval system
- **Excel Import**: Bulk import entities and staff from Excel files
- **Email Notifications**: Automated expiry alerts via Nodemailer
- **Cron Jobs**: Daily checks for expiring certificates
- **Audit Logging**: Track all important actions

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken, bcryptjs)
- **File Upload**: Multer
- **Excel Processing**: xlsx
- **Email**: Nodemailer
- **Scheduling**: node-cron
- **Date Handling**: date-fns

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Migration history
│   └── prisma.config.js       # Prisma configuration
├── src/
│   ├── config/
│   │   ├── constants.js       # App constants & enums
│   │   └── mailer.js          # Email configuration
│   ├── controllers/           # Request handlers
│   │   ├── authController.js
│   │   ├── adminController.js
│   │   ├── entityController.js
│   │   ├── staffController.js
│   │   ├── approvalController.js
│   │   └── importController.js
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT verification
│   │   ├── roleMiddleware.js  # Role-based access
│   │   ├── uploadMiddleware.js # File upload config
│   │   └── errorMiddleware.js # Global error handler
│   ├── services/              # Business logic
│   │   ├── authService.js
│   │   ├── excelService.js
│   │   ├── emailService.js
│   │   └── cronService.js
│   ├── routes/                # API routes
│   │   ├── authRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── entityRoutes.js
│   │   ├── staffRoutes.js
│   │   └── approvalRoutes.js
│   ├── utils/
│   │   ├── AppError.js        # Custom error class
│   │   └── dateHelpers.js     # Date utilities
│   └── app.js                 # Express app setup
├── .env                       # Environment variables
├── .env.example               # Environment template
├── server.js                  # Entry point
└── package.json
```

## Installation

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- pnpm (or npm/yarn)

### Steps

1. **Clone the repository**

   ```bash
   cd backend
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Setup environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:

   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: Strong secret key for JWT
   - `SMTP_*`: Email server configuration

4. **Setup database**

   ```bash
   # Generate Prisma Client
   npx prisma generate

   # Run migrations
   npx prisma migrate dev

   # (Optional) Seed initial data
   npx prisma db seed
   ```

5. **Start the server**

   ```bash
   # Development
   pnpm dev

   # Production
   pnpm start
   ```

## Database Setup

### Create PostgreSQL Database

```sql
CREATE DATABASE kial_avsec;
```

### Run Migrations

```bash
npx prisma migrate dev --name init
```

### Generate Prisma Client

```bash
npx prisma generate
```

### View Database (Prisma Studio)

```bash
npx prisma studio
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Admin (CSO Only)

- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/entities` - Get all entities
- `POST /api/admin/entities` - Create entity
- `PUT /api/admin/entities/:id` - Update entity
- `DELETE /api/admin/entities/:id` - Delete entity
- `GET /api/admin/staff` - Get all staff
- `GET /api/admin/approvals/pending` - Get pending approvals
- `GET /api/admin/approvals/history` - Get approval history
- `PUT /api/admin/approvals/:id` - Approve/reject certificate
- `POST /api/admin/import/entities` - Import entities from Excel

### Entity (Entity Head)

- `GET /api/entities/dashboard` - Get entity dashboard
- `GET /api/entities/staff` - Get entity staff
- `POST /api/entities/staff` - Add staff member
- `PUT /api/entities/staff/:id` - Update staff member
- `POST /api/entities/certificates/renew` - Request certificate renewal

### Staff

- `GET /api/staff/profile` - Get my profile
- `PUT /api/staff/profile` - Update my profile
- `GET /api/staff/certificates` - Get my certificates

### Approvals

- `GET /api/approvals/pending` - Get pending approvals
- `GET /api/approvals/history` - Get approval history
- `PUT /api/approvals/:id` - Approve/reject certificate

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/kial_avsec"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV="development"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@kial.avsec.com"

# Cron
ENABLE_CRON="true"

# Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"
```

## User Roles

### CSO (Chief Security Officer)

- Full system access
- Manage all entities and staff
- Approve certificate renewals
- View all reports and analytics
- Import bulk data

### ENTITY_HEAD (ASCO - Aviation Security Compliance Officer)

- Manage own entity's staff
- Submit certificate renewal requests
- View entity compliance status
- Receive expiry alerts

### STAFF

- View own profile
- View own certificates
- Update personal information

## Development

### Run in development mode with auto-reload

```bash
pnpm dev
```

### Run tests (if configured)

```bash
pnpm test
```

### Lint code

```bash
pnpm lint
```

### Format code

```bash
pnpm format
```

## Cron Jobs

The system runs a daily cron job at 9 AM to check for expiring certificates and send email alerts to entity heads.

To disable cron jobs, set in `.env`:

```env
ENABLE_CRON="false"
```

## Excel Import Format

The system expects Excel files with the following columns:

- Entity Name
- ASCO Name
- ASCO Email
- ASCO Contact
- Contract Valid From
- Contract Valid To
- Security Clearance Valid To
- Security Program Valid To
- QCP Status

## Email Configuration

For Gmail, you need to:

1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in `SMTP_PASS`

## Security

- Passwords are hashed using bcrypt (12 rounds)
- JWT tokens expire after 7 days (configurable)
- All protected routes require valid JWT token
- Role-based access control on all endpoints
- Helmet.js for security headers
- CORS enabled for frontend communication

## Error Handling

The application uses a centralized error handling middleware that:

- Catches all errors
- Formats error responses consistently
- Logs errors for debugging
- Hides sensitive information in production

## Logging

- HTTP requests logged via Morgan
- Audit logs stored in database
- Console logs for important events
- Email send/fail logs

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure production database
- [ ] Set up email service
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Configure backup strategy
- [ ] Set up logging service

### Deploy to Railway/Render

1. Create new project
2. Connect GitHub repository
3. Set environment variables
4. Deploy

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Ensure database exists

### Email Not Sending

- Verify SMTP credentials
- Check firewall settings
- Enable "Less secure app access" (Gmail)

### Prisma Client Issues

- Run `npx prisma generate`
- Delete `node_modules/.prisma` and regenerate

## License

Proprietary - KIAL AVSEC Data Management System

## Support

For support, contact the development team or create an issue in the repository.
