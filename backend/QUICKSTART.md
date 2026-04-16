# KIAL AVSEC Backend - Quick Start Guide

## ✅ Your Complete Backend is Ready!

All components have been successfully created according to your Action Plan.

## 🎯 What's Been Built

### ✅ Complete File Structure

```
backend/
├── prisma/
│   ├── schema.prisma          ✅ Database schema with all models
│   ├── prisma.config.js       ✅ Prisma 7 configuration
│   ├── migrations/            ✅ Migration files
│   └── seed.js                ✅ Initial data seeder
├── src/
│   ├── config/
│   │   ├── constants.js       ✅ Role enums & constants
│   │   └── mailer.js          ✅ Email configuration
│   ├── controllers/
│   │   ├── authController.js       ✅ Login, register, getMe
│   │   ├── adminController.js      ✅ Dashboard, entities, staff, approvals
│   │   ├── entityController.js     ✅ Entity head functions
│   │   ├── staffController.js      ✅ Staff profile management
│   │   ├── approvalController.js   ✅ Certificate approvals
│   │   └── importController.js     ✅ Excel import
│   ├── middleware/
│   │   ├── authMiddleware.js       ✅ JWT verification
│   │   ├── roleMiddleware.js       ✅ Role-based access
│   │   ├── uploadMiddleware.js     ✅ File upload
│   │   └── errorMiddleware.js      ✅ Global error handler
│   ├── services/
│   │   ├── authService.js          ✅ Password hashing, JWT
│   │   ├── excelService.js         ✅ Excel parsing logic
│   │   ├── emailService.js         ✅ Email alerts
│   │   └── cronService.js          ✅ Expiry checks
│   ├── routes/
│   │   ├── authRoutes.js           ✅ /api/auth/*
│   │   ├── adminRoutes.js          ✅ /api/admin/*
│   │   ├── entityRoutes.js         ✅ /api/entities/*
│   │   ├── staffRoutes.js          ✅ /api/staff/*
│   │   └── approvalRoutes.js       ✅ /api/approvals/*
│   ├── utils/
│   │   ├── AppError.js             ✅ Custom error class
│   │   └── dateHelpers.js          ✅ Date utilities
│   └── app.js                      ✅ Express configuration
├── .env                            ✅ Your environment variables
├── .env.example                    ✅ Template for deployment
├── server.js                       ✅ Entry point
├── package.json                    ✅ Dependencies & scripts
└── README.md                       ✅ Full documentation
```

## 🚀 Server Status

✅ **Server is RUNNING on port 5000**

- API Base: http://localhost:5000/api
- Health Check: http://localhost:5000/health
- Cron jobs: Active

## 📝 Next Steps

### 1. Seed the Database (Recommended)

Create initial test users:

```bash
pnpm db:seed
```

This will create:

- **CSO Admin**: admin@kial.com / admin123
- **Entity Head**: asco@sample-agency.com / entity123
- **Staff Member**: john.doe@sample-agency.com / staff123

### 2. Test the API

Use the Postman collection or test manually:

#### Register a new user:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "role": "CSO"
  }'
```

#### Login:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@kial.com",
    "password": "admin123"
  }'
```

### 3. Configure Email (Optional)

Edit `.env` file:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

For Gmail:

1. Enable 2-factor authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use App Password in SMTP_PASS

### 4. View Database

Open Prisma Studio:

```bash
pnpm prisma:studio
```

## 📚 API Endpoints Reference

### Authentication (`/api/auth`)

- `POST /register` - Register new user
- `POST /login` - Login user
- `GET /me` - Get current user (protected)

### Admin - CSO Only (`/api/admin`)

- `GET /dashboard` - Dashboard stats
- `GET /entities` - List all entities
- `POST /entities` - Create entity
- `PUT /entities/:id` - Update entity
- `DELETE /entities/:id` - Delete entity
- `GET /staff` - List all staff
- `GET /approvals/pending` - Pending approvals
- `GET /approvals/history` - Approval history
- `PUT /approvals/:id` - Approve/reject
- `POST /import/entities` - Import Excel

### Entity Head (`/api/entities`)

- `GET /dashboard` - Entity dashboard
- `GET /staff` - My staff members
- `POST /staff` - Add staff
- `PUT /staff/:id` - Update staff
- `POST /certificates/renew` - Request renewal

### Staff (`/api/staff`)

- `GET /profile` - My profile
- `PUT /profile` - Update profile
- `GET /certificates` - My certificates

### Approvals (`/api/approvals`)

- `GET /pending` - Pending approvals
- `GET /history` - Approval history
- `PUT /:id` - Approve/reject

## 🔑 Authentication

All protected endpoints require JWT token in header:

```
Authorization: Bearer <your-jwt-token>
```

## 📊 Database Models

- **User**: Login credentials (CSO, ENTITY_HEAD, STAFF)
- **Entity**: Security agencies
- **Staff**: Staff members (KIAL & Entity)
- **Certificate**: Training & PCC certificates
- **AuditLog**: Action history

## ⚙️ Available Scripts

```bash
pnpm start              # Start production server
pnpm dev                # Start with nodemon (auto-reload)
pnpm prisma:generate    # Generate Prisma Client
pnpm prisma:migrate     # Run migrations
pnpm prisma:studio      # Open database GUI
pnpm prisma:reset       # Reset database
pnpm db:push            # Push schema changes
pnpm db:seed            # Seed initial data
```

## 🐛 Troubleshooting

### Server won't start?

1. Check DATABASE_URL in .env
2. Run `npx prisma generate`
3. Run `npx prisma migrate dev`

### Database connection error?

1. Verify PostgreSQL is running
2. Check connection string format
3. Ensure database exists

### Import errors?

1. Delete node_modules/.prisma
2. Run `npx prisma generate`
3. Restart server

## 📖 Full Documentation

See `README.md` for complete documentation.

## 🎉 You're All Set!

Your backend is fully functional and ready for:

1. Frontend integration
2. Excel data import
3. User management
4. Certificate tracking
5. Approval workflows
6. Email notifications

**Happy coding! 🚀**
