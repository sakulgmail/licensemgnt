# License Management System

A comprehensive license management application built with React, Material-UI, and Vite. This frontend application connects to a Node.js backend to manage software licenses, customers, and vendors with an intuitive user interface.

## Features

- **Dashboard**: Overview of licenses, expiring soon, and recent activity
- **Customer Management**: Add, edit, and manage customer information
- **Vendor Management**: Track software vendors and their contact details
- **License Management**: Manage software licenses with expiration tracking
- **User Management**: Control user access and permissions
- **Email Notifications**: Get alerts for expiring licenses
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js 16+ and npm 8+
- Backend API server (see backend repository for setup)
- Modern web browser (Chrome, Firefox, Safari, or Edge)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory with the following variables:
   ```
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_APP_NAME="License Manager"
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project Structure

```
src/
├── components/     # Reusable UI components
├── context/       # React context providers
├── layout/        # Layout components
├── pages/         # Page components
│   ├── Dashboard/
│   ├── Customers/
│   ├── Vendors/
│   ├── Licenses/
│   └── Settings/
├── services/      # API services
├── theme/         # MUI theme configuration
└── utils/         # Utility functions
```

## Dependencies

- React 18
- React Router 6
- Material-UI (MUI) 5
- Formik & Yup for forms and validation
- Axios for HTTP requests
- date-fns for date manipulation
- recharts for data visualization

## Backend Integration

This frontend is designed to work with a Node.js/Express backend. The backend should provide the following API endpoints:

- Authentication (JWT)
- CRUD operations for customers, vendors, and licenses
- User management
- Notification settings

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the repository or contact the development team.
