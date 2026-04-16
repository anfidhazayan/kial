# KIAL AVSEC Frontend - Quick Start

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Update `VITE_API_BASE_URL` if backend is not on `http://localhost:5000`

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   - Navigate to `http://localhost:3000`

## Default Login Credentials

After running the backend seed script, you can login with:

### CSO Account
- Email: `cso@kial.com`
- Password: (check backend seed file)

### Entity Head Account
- Email: `entityhead@example.com`
- Password: (check backend seed file)

### Staff Account
- Email: `staff@example.com`
- Password: (check backend seed file)

## Features by Role

### CSO Dashboard
- View all entities, staff, and certificates
- Approve certificate renewals
- Import data from Excel
- Comprehensive system overview

### Entity Head Dashboard
- Manage entity staff
- Track staff certificates
- Request certificate renewals
- Entity-specific compliance view

### Staff Portal
- View and update profile
- Manage personal certificates
- Request renewals

## Common Tasks

### Adding a new entity (CSO):
1. Navigate to "Entities"
2. Click "Add Entity"
3. Fill in entity details
4. Click "Create"

### Adding a certificate:
1. Navigate to "Certificates"
2. Click "Add Certificate"
3. Select staff member (if Entity Head/CSO)
4. Enter certificate details
5. Click "Create"

### Approving certificates (CSO):
1. Navigate to "Approvals"
2. Review pending certificates
3. Click "View Details"
4. Click "Approve" or "Reject"

## Troubleshooting

### API Connection Issues
- Ensure backend is running on the correct port
- Check `.env` file for correct API URL
- Verify CORS is enabled on backend

### Login Issues
- Clear browser cache and local storage
- Check browser console for errors
- Verify credentials with backend seed data

### Build Issues
- Delete `node_modules` and reinstall
- Clear Vite cache: `rm -rf node_modules/.vite`
- Ensure Node.js version is 18 or higher

## Development Tips

- Hot reload is enabled - changes appear instantly
- Check browser console for errors
- Use React DevTools for debugging
- Network tab shows all API requests

## Production Build

```bash
npm run build
npm run preview
```

The build output will be in the `dist` folder.
