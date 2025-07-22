import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Container, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TablePagination, 
  TableRow, 
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Validation Schema
const CustomerSchema = Yup.object().shape({
  name: Yup.string().required('Company Name is required'),
  contact_person: Yup.string().required('Contact person is required'),
  email: Yup.string().email('Invalid email').nullable(),
  phone: Yup.string()
    .matches(
      /^[0-9\-+()\s]*$/, 
      'Phone number is not valid'
    ).nullable(),
  address: Yup.string().nullable(),
  tax_id: Yup.string().nullable(),
  notes: Yup.string().nullable()
});

const Customers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const navigate = useNavigate();

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/customers', {
        params: {
          search: searchTerm,
          page: page + 1,
          limit: rowsPerPage
        }
      });
      // Ensure we're setting an array to the customers state
      setCustomers(Array.isArray(response.data) ? response.data : response.data.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]); // Ensure customers is always an array even on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, rowsPerPage, searchTerm]);

  // Handle dialog open/close
  const handleOpenDialog = (customer = null) => {
    setSelectedCustomer(customer);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCustomer(null);
  };

  // Handle form submission
  const handleSubmit = async (values, { setSubmitting, setFieldError, resetForm, setStatus }) => {
    try {
      if (!user || !user.id) {
        throw new Error('User not authenticated. Please log in again.');
      }

      // Prepare the data to send - ensure all fields match backend expectations
      const customerData = {
        name: values.name.trim(),
        contact_person: values.contact_person.trim(),
        email: values.email ? values.email.trim() : undefined,
        phone: values.phone ? values.phone.trim() : undefined,
        address: values.address ? values.address.trim() : undefined,
        tax_id: values.tax_id ? values.tax_id.trim() : undefined,
        notes: values.notes ? values.notes.trim() : undefined,
      };

      console.log('Submitting customer data:', customerData); // Debug log

      let response;
      if (selectedCustomer) {
        // For updates, we don't need to send created_by
        response = await api.put(`/customers/${selectedCustomer.id}`, customerData);
      } else {
        // For new customers, the backend will add created_by from the auth token
        response = await api.post('/customers', customerData);
      }
      
      console.log('Server response:', response.data); // Debug log
      
      fetchCustomers();
      handleCloseDialog();
      resetForm();
    } catch (error) {
      console.error('Error saving customer:', error);
      
      // Handle validation errors from the server
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          setFieldError(err.param, err.msg);
        });
      } else {
        // Fallback error message
        setStatus({ 
          formError: error.response?.data?.message || 
                    error.message || 
                    'An error occurred while saving the customer. Please check the console for details.' 
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/customers/${customerToDelete.id}`);
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
    } finally {
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Initial values for the form
  const initialValues = selectedCustomer || {
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    notes: ''
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Customers
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Customer
        </Button>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
        <TextField
          variant="outlined"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
        />
      </Box>

      {/* Customers Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Contact Person</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.contact_person}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleOpenDialog(customer)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDeleteClick(customer)}>
                          <DeleteIcon color="error" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={customers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Add/Edit Customer Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
        </DialogTitle>
        <Formik
          initialValues={initialValues}
          validationSchema={CustomerSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ errors, touched, isSubmitting, handleSubmit, status }) => (
            <Form onSubmit={handleSubmit}>
              <DialogContent>
                {status && status.formError && (
                  <div style={{ color: 'red', marginBottom: '16px' }}>
                    {status.formError}
                  </div>
                )}
                <Field
                  as={TextField}
                  name="name"
                  label="Company Name"
                  fullWidth
                  margin="normal"
                  required
                  error={touched.name && Boolean(errors.name)}
                  helperText={touched.name && errors.name}
                />
                <Field
                  as={TextField}
                  name="contact_person"
                  label="Contact Person"
                  fullWidth
                  margin="normal"
                  required
                  error={touched.contact_person && Boolean(errors.contact_person)}
                  helperText={touched.contact_person && errors.contact_person}
                />
                <Field
                  as={TextField}
                  name="email"
                  label="Email"
                  type="email"
                  fullWidth
                  margin="normal"
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                />
                <Field
                  as={TextField}
                  name="phone"
                  label="Phone"
                  fullWidth
                  margin="normal"
                  error={touched.phone && Boolean(errors.phone)}
                  helperText={touched.phone && errors.phone}
                />
                <Field
                  as={TextField}
                  name="address"
                  label="Address"
                  fullWidth
                  multiline
                  rows={3}
                  margin="normal"
                />
                <Field
                  as={TextField}
                  name="tax_id"
                  label="Tax ID"
                  fullWidth
                  margin="normal"
                />
                <Field
                  as={TextField}
                  name="notes"
                  label="Notes"
                  fullWidth
                  multiline
                  rows={3}
                  margin="normal"
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseDialog}>Cancel</Button>
                <Button 
                  type="submit" 
                  color="primary" 
                  variant="contained" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Customer</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {customerToDelete?.name}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Customers;
