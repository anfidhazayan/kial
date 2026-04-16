# KIAL Aviation Security Management - Frontend

A modern, clean, and minimalistic frontend for the KIAL Aviation Security Data Management System. Built with React and Vite, featuring a professional red, white, and black color scheme.

## Features

- **Role-Based Access Control**: Separate interfaces for CSO, Entity Heads, and Staff
- **Authentication**: Secure login and registration system
- **Dashboard**: Comprehensive overview of compliance status
- **Entity Management**: Track security agencies and contractors
- **Staff Management**: Manage staff members and their details
- **Certificate Tracking**: Monitor AVSEC training and clearance certificates
- **Approval Workflow**: Review and approve certificate renewal requests
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Clean UI**: Minimalistic design with red, white, and black color scheme

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Update the API base URL in `.env`:
   ```
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

### Development

Start the development server:

```bash
npm run dev
# or
pnpm dev
```

The application will be available at `http://localhost:3000`

### Build

Build for production:

```bash
npm run build
# or
pnpm build
```

Preview the production build:

```bash
npm run preview
# or
pnpm preview
```

## Project Structure

```
src/
├── components/           # Reusable components
│   ├── Layout.jsx       # Main layout with navigation
│   ├── ProtectedRoute.jsx
│   ├── Modal.jsx
│   ├── Alert.jsx
│   ├── LoadingSpinner.jsx
│   ├── StatusBadge.jsx
│   └── CertificatesPage.jsx
├── context/
│   └── AuthContext.jsx  # Authentication context
├── pages/
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── cso/            # CSO-specific pages
│   │   ├── CSODashboard.jsx
│   │   ├── EntitiesPage.jsx
│   │   └── ApprovalsPage.jsx
│   ├── entity/         # Entity Head pages
│   │   └── EntityDashboard.jsx
│   └── staff/          # Staff pages
│       ├── StaffProfile.jsx
│       └── StaffCertificates.jsx
├── services/
│   └── api.js          # API service layer
├── utils/
│   └── helpers.js      # Utility functions
├── App.jsx             # Main app component
├── main.jsx           # Entry point
└── index.css          # Global styles

```

## User Roles

### CSO (Chief Security Officer)
- View comprehensive dashboard with all statistics
- Manage entities (create, update, delete)
- View all staff members
- Manage certificates
- Approve/reject certificate renewal requests
- Import data from Excel files

### Entity Head
- View entity-specific dashboard
- Manage entity staff members
- Create and manage certificates for staff
- Request certificate renewals

### Staff
- View and update personal profile
- Manage own certificates
- Request certificate renewals

## Color Scheme

The application uses a professional red, white, and black color scheme:

- **Primary Red**: #DC2626 (Red 600)
- **Dark Red**: #991B1B (Red 800)
- **Light Red**: #FEE2E2 (Red 50)
- **Secondary Dark**: #1F2937 (Gray 800)
- **White Background**: #FFFFFF
- **Surface Gray**: #F9FAFB

## Key Features

### Responsive Design
- Mobile-friendly navigation with hamburger menu
- Responsive tables and cards
- Adaptive layouts for different screen sizes

### Status Indicators
- Color-coded badges for certificate status (Valid, Expiring, Expired)
- Approval status indicators (Pending, Approved, Rejected)
- Visual alerts for important notifications

### Data Management
- Search and filter functionality
- Sortable tables
- Modal forms for create/update operations
- Confirmation dialogs for deletions

## API Integration

The frontend integrates with the backend API using Axios. All API calls are centralized in the `services/api.js` file:

- Automatic JWT token attachment
- Global error handling
- Request/response interceptors
- Organized by feature (auth, admin, entity, staff)

## Development Notes

- Uses React hooks for state management
- Context API for authentication state
- Functional components throughout
- Modern ES6+ JavaScript
- Clean code with consistent formatting

## License

Proprietary - KIAL Development Team

## Support

For issues or questions, please contact the KIAL Development Team.
