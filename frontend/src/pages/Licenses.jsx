import { useState, useEffect, useCallback, useRef } from 'react';
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
  Chip,
  Autocomplete,
  CircularProgress
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { Formik, Form, Field, useField } from 'formik';
import * as Yup from 'yup';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../services/api';

// Custom Autocomplete field with Formik integration and async search
const FormikAutocomplete = ({ 
  name, 
  label, 
  fetchOptions,  // Function to fetch options based on search term
  ...props 
}) => {
  const [field, meta, helpers] = useField(name);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const errorText = meta.error && meta.touched ? meta.error : '';

  // Debounce search
  const debounce = (func, delay) => {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  };

  // Fetch options when input changes
  const fetchOptionsDelayed = useCallback(
    debounce(async (searchValue) => {
      if (!searchValue) {
        setOptions([]);
        return;
      }
      try {
        setLoading(true);
        const results = await fetchOptions(searchValue);
        setOptions(results);
      } catch (error) {
        console.error('Error fetching options:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    [fetchOptions]
  );

  // Handle input change
  const handleInputChange = (event, value, reason) => {
    setInputValue(value);
    if (reason === 'input') {
      fetchOptionsDelayed(value);
    }
  };

  // Handle open/close
  const handleOpen = () => {
    setOpen(true);
    if (inputValue) {
      fetchOptionsDelayed(inputValue);
    }
  };

  return (
    <FormControl fullWidth margin="normal" error={!!errorText}>
      <Autocomplete
        options={options}
        loading={loading}
        open={open}
        onOpen={handleOpen}
        onClose={() => setOpen(false)}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        getOptionLabel={(option) => option.label || ''}
        isOptionEqualToValue={(option, value) => option.value === value.value}
        value={options.find(option => option.value === field.value) || null}
        onChange={(_, value) => {
          helpers.setValue(value ? value.value : '');
          helpers.setTouched(true);
        }}
        onBlur={() => helpers.setTouched(true)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={!!errorText}
            helperText={errorText}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        ListboxProps={{
          style: {
            maxHeight: 300,
          },
        }}
        noOptionsText={inputValue ? 'No results found' : 'Type to search...'}
        {...props}
      />
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
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [licenseToDelete, setLicenseToDelete] = useState(null);
  const [formError, setFormError] = useState(null);
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('asc');
  const [viewMode, setViewMode] = useState(false);
  const [searchType, setSearchType] = useState('license'); // 'license', 'customer', or 'vendor'

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

  // Use refs to track the latest search value and controller
  const searchRef = useRef('');
  const controllerRef = useRef(null);
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  
  // Memoize the search function
  const performSearch = useCallback(debounce((value) => {
    if (searchTerm !== value) {
      setSearchTerm(value);
      setPage(0);
    }
  }, 300), [searchTerm, searchType]);

  // Handle search input change
  const handleSearchChange = (event) => {
    const { value } = event.target;
    // Update local state immediately for responsive typing
    setLocalSearchTerm(value);
    // Update the ref
    searchRef.current = value;
    // Trigger debounced search
    performSearch(value);
  };
  
  // Sync local search term with the actual search term when it changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

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

  // Function to fetch customers with search
  const fetchCustomers = async (searchTerm = '') => {
    try {
      const response = await api.get('/customers', { 
        params: { 
          search: searchTerm,
          limit: 20, // Fetch a reasonable number of results
          page: 1
        } 
      });
      
      // Handle different response formats
      const customersData = Array.isArray(response.data) ? 
        response.data : 
        (response.data?.data || []);
      
      return customersData.map(customer => ({
        value: customer.id,
        label: customer.name || 'Unnamed Customer'
      }));
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  };

  // Function to fetch vendors with search
  const fetchVendors = async (searchTerm = '') => {
    try {
      const response = await api.get('/vendors', { 
        params: { 
          search: searchTerm,
          limit: 20, // Fetch a reasonable number of results
          page: 1
        } 
      });
      
      // Handle different response formats
      const vendorsData = Array.isArray(response.data) ? 
        response.data : 
        (response.data?.data || []);
      
      return vendorsData.map(vendor => ({
        value: vendor.id,
        label: vendor.name || 'Unnamed Vendor'
      }));
    } catch (error) {
      console.error('Error fetching vendors:', error);
      return [];
    }
  };



  // Fetch data with optimized re-renders
  const fetchData = useCallback(async () => {
    const currentSearchTerm = searchRef.current;
    
    // Cancel any pending request
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    
    const controller = new AbortController();
    controllerRef.current = controller;
    
    try {
      // Only show loading if we don't have any data yet or if we're doing a new search
      if (licenses.length === 0 || currentSearchTerm !== searchTerm) {
        setLoading(true);
      }
      setFormError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const params = { 
        limit: rowsPerPage,
        page: page + 1
      };
      
      // Add search parameters based on search type
      if (currentSearchTerm) {
        if (searchType === 'customer') {
          params.customer_search = currentSearchTerm;
        } else if (searchType === 'vendor') {
          params.vendor_search = currentSearchTerm;
        } else {
          params.search = currentSearchTerm; // Default license search
        }
      }
      
      const licensesRes = await api.get('/licenses', { 
        params,
        signal: controller.signal
      });
      
      if (!controller.signal.aborted) {
        let licensesData = [];
        let total = 0;
        
        // Handle different response formats
        if (Array.isArray(licensesRes.data)) {
          licensesData = licensesRes.data;
          total = licensesRes.headers['x-total-count'] || licensesData.length;
        } else if (licensesRes.data && Array.isArray(licensesRes.data.data)) {
          licensesData = licensesRes.data.data;
          total = licensesRes.data.pagination?.total || licensesRes.data.total || licensesData.length;
        }
        
        // Only update if the search term hasn't changed since we started the request
        if (!controller.signal.aborted && searchRef.current === currentSearchTerm) {
          setLicenses(licensesData);
          setTotalCount(Number(total) || 0);
        }
      }
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        console.error('Error:', error);
        setFormError(error.response?.data?.message || 'Failed to load data');
        setLicenses([]);
        
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [page, rowsPerPage, searchTerm]);
  
  // Initial data load and when dependencies change
  useEffect(() => {
    fetchData();
    
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Handle view click
  const handleViewClick = (license) => {
    // Set the selected license with all its data
    setSelectedLicense({
      ...license,
      // Make sure we have the correct field names that match the form
      customer_id: license.customer_id,
      vendor_id: license.vendor_id,
      customer_name: license.customer_name || 'N/A',
      vendor_name: license.vendor_name || 'N/A',
      purchase_date: license.purchase_date ? new Date(license.purchase_date) : null,
      expiration_date: license.expiration_date ? new Date(license.expiration_date) : null,
    });
    setOpenDialog(true);
    setViewMode(true);
  };

  // Handle dialog open/close
  const handleOpenDialog = (license = null) => {
    setSelectedLicense(license);
    setOpenDialog(true);
    setViewMode(false);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedLicense(null);
  };

  // Handle form submission
  const handleSubmit = async (values, { setSubmitting, resetForm, setFieldError }) => {
    try {
      // Format values before sending to API
      const formattedValues = {
        ...values,
        seats: Number(values.seats) || 1, // Ensure seats is a number
        purchase_date: values.purchase_date ? new Date(values.purchase_date).toISOString() : null,
        expiration_date: values.expiration_date ? new Date(values.expiration_date).toISOString() : null,
      };

      if (selectedLicense) {
        await api.put(`/licenses/${selectedLicense.id}`, formattedValues);
      } else {
        await api.post('/licenses', formattedValues);
      }
      
      // Refresh the data and close the dialog
      await fetchData();
      resetForm();
      setOpenDialog(false);
      setSelectedLicense(null);
    } catch (error) {
      console.error('Error saving license:', error);
      setFormError(error.response?.data?.message || 'Failed to save license');
      // Optionally set field-specific errors
      if (error.response?.data?.errors) {
        Object.entries(error.response.data.errors).forEach(([field, message]) => {
          setFieldError(field, message);
        });
      }
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

  // Initial form values
  const initialValues = selectedLicense ? {
    name: selectedLicense.name || '',
    license_key: selectedLicense.license_key || '',
    customer_id: selectedLicense.customer_id || '',
    vendor_id: selectedLicense.vendor_id || '',
    purchase_date: selectedLicense.purchase_date ? new Date(selectedLicense.purchase_date) : null,
    expiration_date: selectedLicense.expiration_date ? new Date(selectedLicense.expiration_date) : null,
    seats: selectedLicense.seats || 1,
    cost: selectedLicense.cost || 0,
    notes: selectedLicense.notes || ''
  } : {
    name: '',
    license_key: '',
    customer_id: '',
    vendor_id: '',
    purchase_date: null,
    expiration_date: null,
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
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Search By</InputLabel>
            <Select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              label="Search By"
            >
              <MenuItem value="license">License</MenuItem>
              <MenuItem value="customer">Customer</MenuItem>
              <MenuItem value="vendor">Vendor</MenuItem>
            </Select>
          </FormControl>
          <TextField
            variant="outlined"
            placeholder={`Search by ${searchType}...`}
            value={localSearchTerm}
            onChange={handleSearchChange}
            fullWidth
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
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
                          <Tooltip title="View">
                            <IconButton onClick={() => handleViewClick(license)} color="primary">
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
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
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
            }
          />
        </Paper>

        {/* Add/Edit License Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {viewMode ? 'View License' : selectedLicense ? 'Edit License' : 'Add New License'}
          </DialogTitle>
          <Formik
            initialValues={initialValues}
            validationSchema={viewMode ? null : LicenseSchema}
            onSubmit={viewMode ? (e) => { e.preventDefault(); } : handleSubmit}
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
                      error={!viewMode && touched.name && Boolean(errors.name)}
                      helperText={!viewMode && touched.name && errors.name}
                      InputProps={{
                        readOnly: viewMode,
                        style: viewMode ? { color: 'rgba(0, 0, 0, 0.87)' } : {}
                      }}
                      variant={viewMode ? 'standard' : 'outlined'}
                    />

                    <Field
                      as={TextField}
                      name="license_key"
                      label="License Key"
                      fullWidth
                      margin="normal"
                      error={!viewMode && touched.license_key && Boolean(errors.license_key)}
                      helperText={!viewMode && touched.license_key && errors.license_key}
                      InputProps={{
                        readOnly: viewMode,
                        style: viewMode ? { color: 'rgba(0, 0, 0, 0.87)' } : {}
                      }}
                      variant={viewMode ? 'standard' : 'outlined'}
                    />

                    {viewMode ? (
                      <Field
                        as={TextField}
                        name="customer_display"
                        label="Customer"
                        fullWidth
                        margin="normal"
                        InputProps={{
                          readOnly: true,
                          style: { color: 'rgba(0, 0, 0, 0.87)' }
                        }}
                        variant="standard"
                        value={selectedLicense?.customer_name || 'N/A'}
                      />
                    ) : (
                      <FormikAutocomplete
                        name="customer_id"
                        label="Customer"
                        fetchOptions={fetchCustomers}
                      />
                    )}

                    {viewMode ? (
                      <Field
                        as={TextField}
                        name="vendor_display"
                        label="Vendor"
                        fullWidth
                        margin="normal"
                        InputProps={{
                          readOnly: true,
                          style: { color: 'rgba(0, 0, 0, 0.87)' }
                        }}
                        variant="standard"
                        value={selectedLicense?.vendor_name || 'N/A'}
                      />
                    ) : (
                      <FormikAutocomplete
                        name="vendor_id"
                        label="Vendor"
                        fetchOptions={fetchVendors}
                      />
                    )}

                    <DatePicker
                      label="Purchase Date"
                      value={values.purchase_date}
                      onChange={(date) => setFieldValue('purchase_date', date)}
                      readOnly={viewMode}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          margin="normal"
                          error={!viewMode && touched.purchase_date && Boolean(errors.purchase_date)}
                          helperText={!viewMode && (touched.purchase_date && errors.purchase_date) || ' '}
                          InputProps={{
                            readOnly: viewMode,
                            style: viewMode ? { color: 'rgba(0, 0, 0, 0.87)' } : {}
                          }}
                          variant={viewMode ? 'standard' : 'outlined'}
                        />
                      )}
                    />

                    <DatePicker
                      label="Expiration Date"
                      value={values.expiration_date}
                      minDate={values.purchase_date}
                      onChange={(date) => setFieldValue('expiration_date', date)}
                      readOnly={viewMode}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          margin="normal"
                          error={!viewMode && touched.expiration_date && Boolean(errors.expiration_date)}
                          helperText={!viewMode && (touched.expiration_date && errors.expiration_date) || ' '}
                          InputProps={{
                            readOnly: viewMode,
                            style: viewMode ? { color: 'rgba(0, 0, 0, 0.87)' } : {}
                          }}
                          variant={viewMode ? 'standard' : 'outlined'}
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
                      inputProps={{ 
                        min: 1,
                        readOnly: viewMode
                      }}
                      error={!viewMode && touched.seats && Boolean(errors.seats)}
                      helperText={!viewMode && touched.seats && errors.seats}
                      InputProps={{
                        readOnly: viewMode,
                        style: viewMode ? { color: 'rgba(0, 0, 0, 0.87)' } : {}
                      }}
                      variant={viewMode ? 'standard' : 'outlined'}
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
                        readOnly: viewMode,
                        style: viewMode ? { color: 'rgba(0, 0, 0, 0.87)' } : {}
                      }}
                      inputProps={{ 
                        min: 0, 
                        step: 0.01,
                        readOnly: viewMode
                      }}
                      error={!viewMode && touched.cost && Boolean(errors.cost)}
                      helperText={!viewMode && touched.cost && errors.cost}
                      variant={viewMode ? 'standard' : 'outlined'}
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
                    InputProps={{
                      readOnly: viewMode,
                      style: viewMode ? { color: 'rgba(0, 0, 0, 0.87)' } : {}
                    }}
                    variant={viewMode ? 'standard' : 'outlined'}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseDialog}>{viewMode ? 'Close' : 'Cancel'}</Button>
                  {!viewMode && (
                    <Button type="submit" color="primary" variant="contained" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </Button>
                  )}
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
