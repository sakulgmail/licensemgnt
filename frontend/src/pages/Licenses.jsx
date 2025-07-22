import { useState, useEffect, useCallback } from 'react';
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
  TableSortLabel,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { Formik, Form, Field, useField } from 'formik';
import * as Yup from 'yup';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../services/api';

// Custom form field for Material-UI Select
const FormikSelect = ({ name, label, options, ...props }) => {
  const [field, meta] = useField(name);
  const errorText = meta.error && meta.touched ? meta.error : '';
  
  return (
    <FormControl 
      fullWidth 
      margin="normal" 
      error={!!errorText}
    >
      <InputLabel>{label}</InputLabel>
      <Select
        {...field}
        label={label}
        {...props}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {errorText && (
        <Typography color="error" variant="caption">
          {errorText}
        </Typography>
      )}
    </FormControl>
  );
};

// Validation Schema
const LicenseSchema = Yup.object().shape({
  name: Yup.string().required('License name is required'),
  customer_id: Yup.string().required('Customer is required'),
  vendor_id: Yup.string().required('Vendor is required'),
  license_key: Yup.string().required('License key is required'),
  purchase_date: Yup.date().required('Purchase date is required'),
  expiration_date: Yup.date()
    .min(Yup.ref('purchase_date'), 'Expiration date must be after purchase date')
    .required('Expiration date is required'),
  seats: Yup.number()
    .min(1, 'Must have at least 1 seat')
    .required('Number of seats is required'),
  cost: Yup.number()
    .min(0, 'Cost cannot be negative')
    .required('Cost is required'),
  notes: Yup.string().nullable()
});

const Licenses = () => {
  const [licenses, setLicenses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [licenseToDelete, setLicenseToDelete] = useState(null);
  const [formError, setFormError] = useState(null);
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('asc');

  // Debounce function
  const debounce = (func, delay) => {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      setSearchTerm(searchValue);
      setPage(0); // Reset to first page when searching
    }, 300),
    [] // This effect runs once on mount
  );

  // Handle search input change
  const handleSearchChange = (event) => {
    const { value } = event.target;
    debouncedSearch(value);
  };

  // Handle sorting
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Sort licenses
  const getSortedLicenses = (items) => {
    return [...items].sort((a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];
      
      // Handle potential null or undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
      
      // Convert to string for case-insensitive comparison
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
      
      if (aValue < bValue) {
        return order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Fetch data with simplified requests
  const fetchData = async () => {
    try {
      setLoading(true);
      setFormError(null);
      
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      console.log('Fetching data with token:', token);
      
      // Set default headers for all requests
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // 1. First, try to fetch customers with minimal parameters
      console.log('Trying to fetch customers with minimal parameters...');
      let customersRes;
      try {
        customersRes = await api.get('/customers', { params: { limit: 10 } });
        console.log('Customers response (minimal params):', customersRes);
      } catch (error) {
        console.error('Error fetching customers (minimal params):', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config
        });
        throw error;
      }
      
      // 2. Try to fetch vendors with minimal parameters
      console.log('Trying to fetch vendors with minimal parameters...');
      let vendorsRes;
      try {
        vendorsRes = await api.get('/vendors', { params: { limit: 10 } });
        console.log('Vendors response (minimal params):', vendorsRes);
      } catch (error) {
        console.error('Error fetching vendors (minimal params):', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config
        });
        throw error;
      }
      
      // 3. Try to fetch licenses with minimal parameters
      console.log('Trying to fetch licenses with minimal parameters...');
      let licensesRes;
      try {
        licensesRes = await api.get('/licenses', { 
          params: { 
            limit: rowsPerPage,
            page: page + 1
          } 
        });
        console.log('Licenses response (minimal params):', licensesRes);
      } catch (error) {
        console.error('Error fetching licenses (minimal params):', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config
        });
        // Don't throw here, as we might still want to show the form even if licenses fail
      }
      
      // Process and set data
      if (licensesRes && licensesRes.data) {
        // Handle different possible response structures
        const licensesData = Array.isArray(licensesRes.data) ? 
          licensesRes.data : 
          (licensesRes.data.data || []);
        setLicenses(licensesData);
      } else {
        setLicenses([]); // Ensure licenses is always an array
      }
      
      // Map customers to the expected format
      let formattedCustomers = [];
      if (customersRes && customersRes.data) {
        // Handle different possible response structures
        const customersData = Array.isArray(customersRes.data) ? 
          customersRes.data : 
          (customersRes.data.data || []);
          
        formattedCustomers = customersData.map(customer => ({
          id: customer.id,
          name: customer.name || 'Unnamed Customer'
        }));
      }
      console.log('Formatted Customers:', formattedCustomers);
      setCustomers(formattedCustomers);
      
      // Map vendors to the expected format
      let formattedVendors = [];
      if (vendorsRes && vendorsRes.data) {
        // Handle different possible response structures
        const vendorsData = Array.isArray(vendorsRes.data) ? 
          vendorsRes.data : 
          (vendorsRes.data.data || []);
          
        formattedVendors = vendorsData.map(vendor => ({
          id: vendor.id,
          name: vendor.name || 'Unnamed Vendor'
        }));
      }
      console.log('Formatted Vendors:', formattedVendors);
      setVendors(formattedVendors);
      
    } catch (error) {
      console.error('Error in fetchData:', error);
      // Show error to user
      const errorMessage = error.response?.data?.error || 
                         error.response?.data?.message || 
                         error.message || 
                         'Failed to load data. Please try again.';
      setFormError(errorMessage);
      
      // If unauthorized, redirect to login
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage, searchTerm]);

  // Handle dialog open/close
  const handleOpenDialog = (license = null) => {
    setSelectedLicense(license);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedLicense(null);
  };

  // Handle form submission
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      // Format dates to ISO string
      const formattedValues = {
        ...values,
        purchase_date: new Date(values.purchase_date).toISOString(),
        expiration_date: new Date(values.expiration_date).toISOString(),
      };

      if (selectedLicense) {
        await api.put(`/licenses/${selectedLicense.id}`, formattedValues);
      } else {
        await api.post('/licenses', formattedValues);
      }
      
      await fetchData();
      handleCloseDialog();
      resetForm();
    } catch (error) {
      console.error('Error saving license:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDeleteClick = (license) => {
    setLicenseToDelete(license);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/licenses/${licenseToDelete.id}`);
      await fetchData();
    } catch (error) {
      console.error('Error deleting license:', error);
    } finally {
      setDeleteDialogOpen(false);
      setLicenseToDelete(null);
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

  // Check if license is expired
  const isExpired = (expirationDate) => {
    return new Date(expirationDate) < new Date();
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Initial values for the form
  const initialValues = selectedLicense || {
    name: '',
    customer_id: '',
    vendor_id: '',
    license_key: '',
    purchase_date: new Date(),
    expiration_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    seats: 1,
    cost: 0,
    notes: ''
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Licenses
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add License
          </Button>
        </Box>

        {/* Search Bar */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
          <TextField
            variant="outlined"
            placeholder="Search licenses..."
            defaultValue={searchTerm}
            onChange={handleSearchChange}
            fullWidth
            InputProps={{
              // This prevents the input from losing focus
              onBlur: (e) => e.preventDefault(),
            }}
          />
        </Box>

        {/* Licenses Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'name'}
                      direction={orderBy === 'name' ? order : 'asc'}
                      onClick={() => handleRequestSort('name')}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'customer_name'}
                      direction={orderBy === 'customer_name' ? order : 'asc'}
                      onClick={() => handleRequestSort('customer_name')}
                    >
                      Customer
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'vendor_name'}
                      direction={orderBy === 'vendor_name' ? order : 'asc'}
                      onClick={() => handleRequestSort('vendor_name')}
                    >
                      Vendor
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>License Key</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'purchase_date'}
                      direction={orderBy === 'purchase_date' ? order : 'asc'}
                      onClick={() => handleRequestSort('purchase_date')}
                    >
                      Purchase Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'expiration_date'}
                      direction={orderBy === 'expiration_date' ? order : 'asc'}
                      onClick={() => handleRequestSort('expiration_date')}
                    >
                      Expiration
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'seats'}
                      direction={orderBy === 'seats' ? order : 'asc'}
                      onClick={() => handleRequestSort('seats')}
                    >
                      Seats
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'expiration_date'}
                      direction={orderBy === 'expiration_date' ? order : 'asc'}
                      onClick={() => handleRequestSort('expiration_date')}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : licenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No licenses found
                    </TableCell>
                  </TableRow>
                ) : (
                  getSortedLicenses(licenses).map((license) => {
                    const expired = isExpired(license.expiration_date);
                    return (
                      <TableRow 
                        key={license.id}
                        sx={{ 
                          backgroundColor: expired ? 'rgba(255, 0, 0, 0.05)' : 'inherit',
                          '&:hover': {
                            backgroundColor: expired ? 'rgba(255, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                          }
                        }}
                      >
                        <TableCell>{license.name}</TableCell>
                        <TableCell>{license.customer_name || 'N/A'}</TableCell>
                        <TableCell>{license.vendor_name || 'N/A'}</TableCell>
                        <TableCell>
                          <Box component="span" sx={{ fontFamily: 'monospace' }}>
                            {license.license_key}
                          </Box>
                        </TableCell>
                        <TableCell>{formatDate(license.purchase_date)}</TableCell>
                        <TableCell>{formatDate(license.expiration_date)}</TableCell>
                        <TableCell>{license.seats}</TableCell>
                        <TableCell>
                          {expired ? (
                            <Chip 
                              icon={<CancelIcon />} 
                              label="Expired" 
                              color="error" 
                              size="small" 
                            />
                          ) : (
                            <Chip 
                              icon={<CheckCircleIcon />} 
                              label="Active" 
                              color="success" 
                              size="small" 
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton onClick={() => handleOpenDialog(license)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton onClick={() => handleDeleteClick(license)}>
                              <DeleteIcon color="error" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={licenses.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>

        {/* Add/Edit License Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedLicense ? 'Edit License' : 'Add New License'}
          </DialogTitle>
          <Formik
            initialValues={initialValues}
            validationSchema={LicenseSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ 
              errors, 
              touched, 
              isSubmitting, 
              values, 
              setFieldValue,
              handleChange,
              handleBlur
            }) => (
              <Form>
                <DialogContent>
                  <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={3}>
                    <Field
                      as={TextField}
                      name="name"
                      label="License Name"
                      fullWidth
                      margin="normal"
                      error={touched.name && Boolean(errors.name)}
                      helperText={touched.name && errors.name}
                    />

                    <Field
                      as={TextField}
                      name="license_key"
                      label="License Key"
                      fullWidth
                      margin="normal"
                      error={touched.license_key && Boolean(errors.license_key)}
                      helperText={touched.license_key && errors.license_key}
                    />

                    <FormikSelect
                      name="customer_id"
                      label="Customer"
                      options={customers.map(customer => ({
                        value: customer.id,
                        label: customer.name
                      }))}
                      error={touched.customer_id && Boolean(errors.customer_id)}
                      helperText={touched.customer_id && errors.customer_id}
                    />

                    <FormikSelect
                      name="vendor_id"
                      label="Vendor"
                      options={vendors.map(vendor => ({
                        value: vendor.id,
                        label: vendor.name
                      }))}
                      error={touched.vendor_id && Boolean(errors.vendor_id)}
                      helperText={touched.vendor_id && errors.vendor_id}
                    />

                    <DatePicker
                      label="Purchase Date"
                      value={values.purchase_date}
                      onChange={(date) => setFieldValue('purchase_date', date)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          margin="normal"
                          error={touched.purchase_date && Boolean(errors.purchase_date)}
                          helperText={(touched.purchase_date && errors.purchase_date) || ' '}
                        />
                      )}
                    />

                    <DatePicker
                      label="Expiration Date"
                      value={values.expiration_date}
                      minDate={values.purchase_date}
                      onChange={(date) => setFieldValue('expiration_date', date)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          margin="normal"
                          error={touched.expiration_date && Boolean(errors.expiration_date)}
                          helperText={(touched.expiration_date && errors.expiration_date) || ' '}
                        />
                      )}
                    />

                    <Field
                      as={TextField}
                      name="seats"
                      label="Number of Seats"
                      type="number"
                      fullWidth
                      margin="normal"
                      inputProps={{ min: 1 }}
                      error={touched.seats && Boolean(errors.seats)}
                      helperText={touched.seats && errors.seats}
                    />

                    <Field
                      as={TextField}
                      name="cost"
                      label="Cost"
                      type="number"
                      fullWidth
                      margin="normal"
                      InputProps={{
                        startAdornment: (
                          <Typography sx={{ mr: 1 }} color="text.secondary">
                            $
                          </Typography>
                        ),
                      }}
                      inputProps={{ min: 0, step: 0.01 }}
                      error={touched.cost && Boolean(errors.cost)}
                      helperText={touched.cost && errors.cost}
                    />
                  </Box>

                  <Field
                    as={TextField}
                    name="notes"
                    label="Notes"
                    fullWidth
                    multiline
                    rows={4}
                    margin="normal"
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseDialog}>Cancel</Button>
                  <Button type="submit" color="primary" variant="contained" disabled={isSubmitting}>
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
          <DialogTitle>Delete License</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete {licenseToDelete?.name}? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {formError && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography color="error" variant="body1">
              {formError}
            </Typography>
          </Box>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default Licenses;
