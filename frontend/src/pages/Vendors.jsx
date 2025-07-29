import { useState, useEffect } from 'react';
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
  DialogContentText,
  Link
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Search as SearchIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Validation Schema
const VendorSchema = Yup.object().shape({
  name: Yup.string()
    .required('Vendor Name is required')
    .trim()
    .min(2, 'Vendor Name must be at least 2 characters'),
  contact_person: Yup.string()
    .required('Contact Person is required')
    .trim()
    .min(2, 'Contact Person name must be at least 2 characters'),
  email: Yup.string()
    .email('Invalid email')
    .nullable()
    .transform(value => value === '' ? undefined : value),
  phone: Yup.string()
    .matches(
      /^[0-9\-+()\s]*$/, 
      'Phone number is not valid'
    )
    .nullable()
    .transform(value => value === '' ? undefined : value),
  website: Yup.string()
    .url('Must be a valid URL')
    .nullable()
    .transform(value => value === '' ? undefined : value),
  address: Yup.string()
    .nullable()
    .transform(value => value === '' ? undefined : value),
  notes: Yup.string()
    .nullable()
    .transform(value => value === '' ? undefined : value)
});

const Vendors = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [formError, setFormError] = useState('');

  // Fetch vendors
  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/vendors', {
        params: {
          search: searchTerm,
          page: page + 1,
          limit: rowsPerPage
        }
      });
      
      // Handle paginated response
      const vendorsData = response.data.data || [];
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);
      
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendors([]);
      setFormError('Failed to load vendors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [page, rowsPerPage, searchTerm]);

  // Handle dialog open/close
  const handleOpenDialog = (vendor = null) => {
    setSelectedVendor(vendor);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedVendor(null);
  };

  // Handle form submission
  const handleSubmit = async (values, { setSubmitting, setFieldError, resetForm, setStatus }) => {
    console.log('Form submitted with values:', values);
    try {
      if (!user || !user.id) {
        console.error('User not authenticated');
        throw new Error('User not authenticated. Please log in again.');
      }

      // Prepare the data to send
      const vendorData = {
        name: values.name.trim(),
        contact_person: values.contact_person.trim(),
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        website: values.website?.trim() || undefined,
        address: values.address?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      };

      console.log('Prepared vendor data:', vendorData);

      let response;
      if (selectedVendor) {
        console.log('Updating vendor:', selectedVendor.id);
        response = await api.put(`/vendors/${selectedVendor.id}`, vendorData);
      } else {
        console.log('Creating new vendor');
        response = await api.post('/vendors', vendorData);
      }
      
      console.log('API Response:', response);
      
      await fetchVendors();
      handleCloseDialog();
      resetForm();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      console.error('Error response:', error.response);
      
      // Handle validation errors from the server
      if (error.response?.data?.errors) {
        console.log('Validation errors:', error.response.data.errors);
        error.response.data.errors.forEach(err => {
          setFieldError(err.param, err.msg);
        });
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'An error occurred while saving the vendor.';
        console.error('Error message:', errorMessage);
        setFormError(errorMessage);
        setStatus({ formError: errorMessage });
      }
    } finally {
      console.log('Form submission complete');
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDeleteClick = (vendor) => {
    setVendorToDelete(vendor);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/vendors/${vendorToDelete.id}`);
      fetchVendors();
    } catch (error) {
      console.error('Error deleting vendor:', error);
    } finally {
      setDeleteDialogOpen(false);
      setVendorToDelete(null);
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

  // Format website URL
  const formatWebsite = (url) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `https://${url}`;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Vendors
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Vendor
        </Button>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
        <TextField
          variant="outlined"
          placeholder="Search vendors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
        />
      </Box>

      {/* Vendors Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Contact Person</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Website</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No vendors found
                  </TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>{vendor.name}</TableCell>
                    <TableCell>{vendor.contact_person}</TableCell>
                    <TableCell>{vendor.email}</TableCell>
                    <TableCell>{vendor.phone}</TableCell>
                    <TableCell>
                      {vendor.website && (
                        <Link 
                          href={formatWebsite(vendor.website)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Box display="flex" alignItems="center">
                            <LinkIcon fontSize="small" sx={{ mr: 0.5 }} />
                            {vendor.website.replace(/^https?:\/\//, '')}
                          </Box>
                        </Link>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleOpenDialog(vendor)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDeleteClick(vendor)}>
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
          rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
          component="div"
          count={vendors.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Add/Edit Vendor Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedVendor ? 'Edit Vendor' : 'Add New Vendor'}
        </DialogTitle>
        <Formik
          initialValues={{
            name: selectedVendor?.name || '',
            contact_person: selectedVendor?.contact_person || '',
            email: selectedVendor?.email || '',
            phone: selectedVendor?.phone || '',
            website: selectedVendor?.website || '',
            address: selectedVendor?.address || '',
            notes: selectedVendor?.notes || ''
          }}
          validationSchema={VendorSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ errors, touched, isSubmitting, handleSubmit }) => (
            <form onSubmit={handleSubmit}>
              <DialogContent>
                {formError && (
                  <div style={{ color: 'red', marginBottom: '16px' }}>
                    {formError}
                  </div>
                )}
                <Field
                  as={TextField}
                  name="name"
                  label="Vendor Name *"
                  fullWidth
                  margin="normal"
                  error={touched.name && Boolean(errors.name)}
                  helperText={touched.name && errors.name}
                />
                <Field
                  as={TextField}
                  name="contact_person"
                  label="Contact Person *"
                  fullWidth
                  margin="normal"
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
                  name="website"
                  label="Website"
                  fullWidth
                  margin="normal"
                  error={touched.website && Boolean(errors.website)}
                  helperText={touched.website && errors.website}
                />
                <Field
                  as={TextField}
                  name="address"
                  label="Address"
                  fullWidth
                  multiline
                  rows={2}
                  margin="normal"
                  error={touched.address && Boolean(errors.address)}
                  helperText={touched.address && errors.address}
                />
                <Field
                  as={TextField}
                  name="notes"
                  label="Notes"
                  fullWidth
                  multiline
                  rows={3}
                  margin="normal"
                  error={touched.notes && Boolean(errors.notes)}
                  helperText={touched.notes && errors.notes}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseDialog} color="inherit">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </DialogActions>
            </form>
          )}
        </Formik>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Vendor</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {vendorToDelete?.name}? This action cannot be undone.
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

export default Vendors;
