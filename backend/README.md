# License Management System - Backend

This is the backend for the License Management System, built with Node.js, Express, and PostgreSQL.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup

1. **Clone the repository**

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Update the database credentials and other settings in `.env`

4. **Set up PostgreSQL**
   - Make sure PostgreSQL is running
   - Create a database user with appropriate permissions (or use the default postgres user)

5. **Initialize the database**
   ```bash
   npm run db:init
   ```
   This will:
   - Create the database if it doesn't exist
   - Run all migrations
   - Create an admin user (username: admin, password: admin123)

6. **Start the development server**
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:5000`

## API Documentation

The API follows RESTful conventions. Here are the available endpoints:

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/user` - Get current user data

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)
- `PUT /api/users/:id/password` - Change password

### Customers
- `GET /api/customers` - Get all customers with pagination
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create a new customer
- `PUT /api/customers/:id` - Update a customer
- `DELETE /api/customers/:id` - Delete a customer

### Vendors
- `GET /api/vendors` - Get all vendors with pagination
- `GET /api/vendors/:id` - Get vendor by ID
- `POST /api/vendors` - Create a new vendor
- `PUT /api/vendors/:id` - Update a vendor
- `DELETE /api/vendors/:id` - Delete a vendor

### Licenses
- `GET /api/licenses` - Get all licenses with filters and pagination
- `GET /api/licenses/stats` - Get license statistics
- `GET /api/licenses/expiring-soon` - Get licenses expiring soon
- `GET /api/licenses/:id` - Get license by ID
- `POST /api/licenses` - Create a new license
- `PUT /api/licenses/:id` - Update a license
- `DELETE /api/licenses/:id` - Delete a license

## Development

- `npm run dev` - Start the development server with nodemon
- `npm test` - Run tests (to be implemented)
- `npm run lint` - Run ESLint

## Production

- `npm start` - Start the production server
- `npm run build` - Build the application (if using TypeScript)

## License

This project is licensed under the MIT License.
