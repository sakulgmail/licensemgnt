import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Paper, 
  Typography, 
  TextField, 
  FormControlLabel, 
  Switch,
  Divider,
  Tabs,
  Tab,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  Save as SaveIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import api from '../services/api';

// Tab Panel Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

// Validation Schema for Notification Settings
const NotificationSchema = Yup.object().shape({
  daysBeforeExpiration: Yup.number()
    .min(1, 'Must be at least 1 day')
    .max(90, 'Cannot be more than 90 days')
    .required('Required'),
  notificationTime: Yup.string().required('Required'),
  sendToEmail: Yup.boolean(),
  emailAddress: Yup.string().when('sendToEmail', {
    is: true,
    then: Yup.string().email('Invalid email').required('Email is required')
  })
});

// Validation Schema for User Profile
const ProfileSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  currentPassword: Yup.string(),
  newPassword: Yup.string().when('currentPassword', {
    is: (val) => val && val.length > 0,
    then: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Must contain at least one uppercase letter, one lowercase letter, and one number'
      )
  }),
  confirmPassword: Yup.string().when('newPassword', {
    is: (val) => val && val.length > 0,
    then: Yup.string()
      .oneOf([Yup.ref('newPassword'), null], 'Passwords must match')
      .required('Please confirm your password')
  })
});

const Settings = () => {
  const [tabValue, setTabValue] = useState(0);
  const [notificationSettings, setNotificationSettings] = useState({
    daysBeforeExpiration: 30,
    notificationTime: '09:00',
    sendToEmail: true,
    emailAddress: '',
    includeInactive: false
  });
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [users, setUsers] = useState([]);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch settings and users
  const fetchData = async () => {
    try {
      setLoading(true);
      // In a real app, you would fetch these from your API
      // const [settingsRes, usersRes] = await Promise.all([
      //   api.get('/settings/notifications'),
      //   api.get('/users')
      // ]);
      
      // Mock data for now
      setTimeout(() => {
        setNotificationSettings({
          daysBeforeExpiration: 30,
          notificationTime: '09:00',
          sendToEmail: true,
          emailAddress: 'admin@example.com',
          includeInactive: false
        });
        
        setProfile({
          name: 'Admin User',
          email: 'admin@example.com',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        setUsers([
          { id: 1, name: 'Admin User', email: 'admin@example.com', role: 'admin', active: true },
          { id: 2, name: 'John Doe', email: 'john@example.com', role: 'user', active: true },
          { id: 3, name: 'Jane Smith', email: 'jane@example.com', role: 'user', active: false }
        ]);
        
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load settings',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleNotificationSubmit = async (values, { setSubmitting }) => {
    try {
      // In a real app, you would save these to your API
      // await api.put('/settings/notifications', values);
      
      setNotificationSettings(values);
      setSnackbar({
        open: true,
        message: 'Notification settings saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save notification settings',
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      // In a real app, you would save these to your API
      // await api.put('/profile', values);
      
      setProfile(values);
      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success'
      });
      
      // Reset password fields
      if (values.newPassword) {
        resetForm({
          values: {
            ...values,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          }
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update profile',
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserDialogOpen = (user = null) => {
    setSelectedUser(user || { name: '', email: '', role: 'user', active: true });
    setOpenUserDialog(true);
  };

  const handleUserDialogClose = () => {
    setOpenUserDialog(false);
    setSelectedUser(null);
  };

  const handleUserSave = async (userData) => {
    try {
      if (userData.id) {
        // Update existing user
        // await api.put(`/users/${userData.id}`, userData);
        setUsers(users.map(u => u.id === userData.id ? userData : u));
      } else {
        // Create new user
        // const newUser = await api.post('/users', userData);
        const newUser = { ...userData, id: Date.now() }; // Mock ID
        setUsers([...users, newUser]);
      }
      
      setSnackbar({
        open: true,
        message: `User ${userData.id ? 'updated' : 'created'} successfully`,
        severity: 'success'
      });
      
      handleUserDialogClose();
    } catch (error) {
      console.error('Error saving user:', error);
      setSnackbar({
        open: true,
        message: `Failed to ${userData.id ? 'update' : 'create'} user`,
        severity: 'error'
      });
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      // In a real app, you would delete the user via API
      // await api.delete(`/users/${userToDelete.id}`);
      
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setSnackbar({
        open: true,
        message: 'User deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete user',
        severity: 'error'
      });
    } finally {
      setOpenDeleteDialog(false);
      setUserToDelete(null);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Generate time options for notification time select
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="settings tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Profile" icon={<PersonIcon />} iconPosition="start" {...a11yProps(0)} />
            <Tab label="Notifications" icon={<NotificationsIcon />} iconPosition="start" {...a11yProps(1)} />
            <Tab label="Users" icon={<PersonIcon />} iconPosition="start" {...a11yProps(2)} />
          </Tabs>
        </Box>
        
        {/* Profile Tab */}
        <TabPanel value={tabValue} index={0}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Profile Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Formik
              initialValues={profile}
              validationSchema={ProfileSchema}
              onSubmit={handleProfileSubmit}
              enableReinitialize
            >
              {({ errors, touched, isSubmitting, values, setFieldValue }) => (
                <Form>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Field
                        as={TextField}
                        name="name"
                        label="Full Name"
                        fullWidth
                        margin="normal"
                        error={touched.name && Boolean(errors.name)}
                        helperText={touched.name && errors.name}
                      />
                      
                      <Field
                        as={TextField}
                        name="email"
                        label="Email Address"
                        type="email"
                        fullWidth
                        margin="normal"
                        error={touched.email && Boolean(errors.email)}
                        helperText={touched.email && errors.email}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Change Password (leave blank to keep current password)
                      </Typography>
                      
                      <Field
                        as={TextField}
                        name="currentPassword"
                        label="Current Password"
                        type="password"
                        fullWidth
                        margin="normal"
                        error={touched.currentPassword && Boolean(errors.currentPassword)}
                        helperText={touched.currentPassword && errors.currentPassword}
                      />
                      
                      {values.currentPassword && (
                        <>
                          <Field
                            as={TextField}
                            name="newPassword"
                            label="New Password"
                            type="password"
                            fullWidth
                            margin="normal"
                            error={touched.newPassword && Boolean(errors.newPassword)}
                            helperText={touched.newPassword && errors.newPassword}
                          />
                          
                          <Field
                            as={TextField}
                            name="confirmPassword"
                            label="Confirm New Password"
                            type="password"
                            fullWidth
                            margin="normal"
                            error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                            helperText={touched.confirmPassword && errors.confirmPassword}
                          />
                        </>
                      )}
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        startIcon={<SaveIcon />}
                        disabled={isSubmitting || loading}
                      >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </Grid>
                  </Grid>
                </Form>
              )}
            </Formik>
          </Paper>
        </TabPanel>
        
        {/* Notifications Tab */}
        <TabPanel value={tabValue} index={1}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Notification Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Formik
              initialValues={notificationSettings}
              validationSchema={NotificationSchema}
              onSubmit={handleNotificationSubmit}
              enableReinitialize
            >
              {({ errors, touched, isSubmitting, values, setFieldValue }) => (
                <Form>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Field
                        as={TextField}
                        name="daysBeforeExpiration"
                        label="Days Before Expiration"
                        type="number"
                        fullWidth
                        margin="normal"
                        inputProps={{ min: 1, max: 90 }}
                        error={touched.daysBeforeExpiration && Boolean(errors.daysBeforeExpiration)}
                        helperText={touched.daysBeforeExpiration && errors.daysBeforeExpiration}
                      />
                      
                      <FormControl fullWidth margin="normal">
                        <InputLabel id="notification-time-label">Notification Time</InputLabel>
                        <Field
                          as={Select}
                          name="notificationTime"
                          labelId="notification-time-label"
                          label="Notification Time"
                          error={touched.notificationTime && Boolean(errors.notificationTime)}
                        >
                          {timeOptions.map((time) => (
                            <MenuItem key={time} value={time}>
                              {time}
                            </MenuItem>
                          ))}
                        </Field>
                        {touched.notificationTime && errors.notificationTime && (
                          <Typography variant="caption" color="error">
                            {errors.notificationTime}
                          </Typography>
                        )}
                      </FormControl>
                      
                      <Field
                        as={FormControlLabel}
                        name="includeInactive"
                        control={
                          <Switch 
                            checked={values.includeInactive}
                            onChange={(e) => setFieldValue('includeInactive', e.target.checked)}
                          />
                        }
                        label="Include Inactive Licenses in Notifications"
                        sx={{ mt: 2, display: 'block' }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom>
                        Email Notifications
                      </Typography>
                      
                      <Field
                        as={FormControlLabel}
                        name="sendToEmail"
                        control={
                          <Switch 
                            checked={values.sendToEmail}
                            onChange={(e) => setFieldValue('sendToEmail', e.target.checked)}
                          />
                        }
                        label="Send email notifications"
                        sx={{ display: 'block', mb: 2 }}
                      />
                      
                      {values.sendToEmail && (
                        <Field
                          as={TextField}
                          name="emailAddress"
                          label="Notification Email Address"
                          type="email"
                          fullWidth
                          margin="normal"
                          error={touched.emailAddress && Boolean(errors.emailAddress)}
                          helperText={touched.emailAddress && errors.emailAddress}
                        />
                      )}
                      
                      <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                          <strong>Note:</strong> Email notifications will be sent {values.daysBeforeExpiration} day(s) before license expiration at {values.notificationTime}.
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        startIcon={<SaveIcon />}
                        disabled={isSubmitting || loading}
                      >
                        {isSubmitting ? 'Saving...' : 'Save Notification Settings'}
                      </Button>
                    </Grid>
                  </Grid>
                </Form>
              )}
            </Formik>
          </Paper>
        </TabPanel>
        
        {/* Users Tab */}
        <TabPanel value={tabValue} index={2}>
          <Paper elevation={3}>
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">User Management</Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleUserDialogOpen()}
              >
                Add User
              </Button>
            </Box>
            
            <Divider />
            
            <List>
              {loading ? (
                <Box p={3} textAlign="center">
                  <Typography>Loading users...</Typography>
                </Box>
              ) : users.length === 0 ? (
                <Box p={3} textAlign="center">
                  <Typography>No users found</Typography>
                </Box>
              ) : (
                users.map((user) => (
                  <ListItem 
                    key={user.id}
                    sx={{ 
                      '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                      borderLeft: '4px solid',
                      borderColor: user.active ? 'success.main' : 'text.disabled'
                    }}
                  >
                    <ListItemText
                      primary={user.name}
                      secondary={
                        <>
                          {user.email}
                          <Box component="span" sx={{ ml: 2 }}>
                            <Chip 
                              label={user.role} 
                              size="small" 
                              color={user.role === 'admin' ? 'primary' : 'default'}
                            />
                            {!user.active && (
                              <Chip 
                                label="Inactive" 
                                size="small" 
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Box>
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="edit"
                        onClick={() => handleUserDialogOpen(user)}
                        disabled={loading}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        onClick={() => handleDeleteClick(user)}
                        disabled={loading || user.role === 'admin'}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </TabPanel>
      </Box>
      
      {/* User Dialog */}
      <UserDialog
        open={openUserDialog}
        onClose={handleUserDialogClose}
        onSave={handleUserSave}
        user={selectedUser}
        isEditing={!!selectedUser?.id}
      />
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// User Dialog Component
const UserDialog = ({ open, onClose, onSave, user, isEditing }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    active: true
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'user',
        active: user.active !== undefined ? user.active : true
      });
    }
  }, [user]);

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validate()) {
      setIsSubmitting(true);
      
      // In a real app, you would validate the email is not already in use
      // and handle password reset for new users
      
      setTimeout(() => {
        onSave({
          ...formData,
          id: user?.id
        });
        setIsSubmitting(false);
      }, 500);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditing ? 'Edit User' : 'Add New User'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Full Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            disabled={isSubmitting}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={formData.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email}
            disabled={isSubmitting || isEditing}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth margin="dense">
            <InputLabel id="role-label">Role</InputLabel>
            <Select
              labelId="role-label"
              name="role"
              value={formData.role}
              onChange={handleChange}
              label="Role"
              disabled={isSubmitting}
            >
              <MenuItem value="admin">Administrator</MenuItem>
              <MenuItem value="user">Standard User</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.active}
                onChange={handleChange}
                name="active"
                color="primary"
                disabled={isSubmitting}
              />
            }
            label="Active"
            sx={{ mt: 2, display: 'block' }}
          />
          
          {!isEditing && (
            <Alert severity="info" sx={{ mt: 2 }}>
              An email with setup instructions will be sent to the user's email address.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" color="primary" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default Settings;
