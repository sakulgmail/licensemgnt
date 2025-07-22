import { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  Card, 
  CardContent, 
  Paper,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, isBefore, isAfter, parseISO } from 'date-fns';
import api from '../services/api';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLicenses: 0,
    activeLicenses: 0,
    expiredLicenses: 0,
    expiringSoon: 0,
    totalCustomers: 0,
    totalVendors: 0
  });
  const [recentLicenses, setRecentLicenses] = useState([]);
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [vendorDistribution, setVendorDistribution] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // First, fetch stats
      const statsRes = await api.get('/dashboard/stats');
      setStats(statsRes.data);
      
      // Then fetch recent licenses
      const recentRes = await api.get('/licenses', { 
        params: { 
          limit: 5, 
          sortBy: 'purchase_date',
          sortOrder: 'desc',
          include: 'customer,vendor'
        } 
      });
      
      // Handle different response structures
      const recentData = Array.isArray(recentRes.data) ? 
        recentRes.data : 
        (recentRes.data?.data || []);
      setRecentLicenses(recentData);
      
      // Fetch expiring licenses
      const expiringRes = await api.get('/dashboard/expiring-soon');
      setExpiringLicenses(expiringRes.data || []);
      
      // Fetch vendors for distribution
      const vendorsRes = await api.get('/vendors');
      const vendorsData = Array.isArray(vendorsRes.data) ? 
        vendorsRes.data : 
        (vendorsRes.data?.data || []);
      
      // Prepare vendor distribution data
      const vendorData = vendorsData.map(vendor => ({
        name: vendor.name,
        licenses: 0 // We'll update this in the next step
      }));
      
      setVendorDistribution(vendorData);
      
      console.log('Dashboard data loaded:', {
        stats: statsRes.data,
        recentLicenses: recentData,
        expiringLicenses: expiringRes.data,
        vendors: vendorsData
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filter expiring licenses based on search term
  const filteredExpiringLicenses = expiringLicenses.filter(license => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (license.name || '').toLowerCase().includes(searchLower) ||
      (license.customer_name || license.customer?.name || '').toLowerCase().includes(searchLower) ||
      (license.vendor_name || license.vendor?.name || '').toLowerCase().includes(searchLower) ||
      (license.license_key || '').toLowerCase().includes(searchLower)
    );
  });

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  // Check if license is expired
  const isExpired = (expirationDate) => {
    if (!expirationDate) return false;
    try {
      return isBefore(parseISO(expirationDate), new Date());
    } catch (e) {
      console.error('Error checking expiration:', e);
      return false;
    }
  };

  // Check if license is expiring soon (within 30 days)
  const isExpiringSoon = (expirationDate) => {
    if (!expirationDate) return false;
    try {
      const thirtyDaysFromNow = addDays(new Date(), 30);
      return (
        isAfter(parseISO(expirationDate), new Date()) &&
        isBefore(parseISO(expirationDate), thirtyDaysFromNow)
      );
    } catch (e) {
      console.error('Error checking expiring soon:', e);
      return false;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Dashboard
          </Typography>
          <Box>
            <Tooltip title="Refresh Data">
              <IconButton onClick={fetchDashboardData} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card elevation={3}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <ArticleIcon color="primary" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="subtitle2">
                    Total Licenses
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {loading ? '...' : stats.totalLicenses || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card elevation={3}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="subtitle2">
                    Active Licenses
                  </Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  {loading ? '...' : stats.activeLicenses || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card elevation={3}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <WarningIcon color="warning" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="subtitle2">
                    Expiring Soon
                  </Typography>
                </Box>
                <Typography variant="h4" color="warning.main">
                  {loading ? '...' : stats.expiringSoon || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card elevation={3}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <WarningIcon color="error" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="subtitle2">
                    Expired Licenses
                  </Typography>
                </Box>
                <Typography variant="h4" color="error.main">
                  {loading ? '...' : stats.expiredLicenses || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card elevation={3}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <PeopleIcon color="primary" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="subtitle2">
                    Total Customers
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {loading ? '...' : stats.totalCustomers || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <Card elevation={3}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <BusinessIcon color="primary" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="subtitle2">
                    Total Vendors
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {loading ? '...' : stats.totalVendors || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Expiring Soon Licenses */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  Licenses Expiring Soon
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                  <TextField
                    variant="outlined"
                    placeholder="Search..."
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress />
                </Box>
              ) : filteredExpiringLicenses.length > 0 ? (
                <List dense>
                  {filteredExpiringLicenses.map((license) => {
                    const customerName = license.customer_name || license.customer?.name || 'No Customer';
                    const vendorName = license.vendor_name || license.vendor?.name || 'No Vendor';
                    const isExpiredFlag = isExpired(license.expiration_date);
                    const isExpiringSoonFlag = !isExpiredFlag && isExpiringSoon(license.expiration_date);

                    return (
                      <ListItem 
                        key={license.id}
                        sx={{ 
                          mb: 1,
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          '&:hover': {
                            bgcolor: 'action.hover'
                          }
                        }}
                      >
                        <ListItemIcon>
                          <ArticleIcon color={isExpiredFlag ? 'error' : (isExpiringSoonFlag ? 'warning' : 'primary')} />
                        </ListItemIcon>
                        <ListItemText
                          primary={license.name || 'Unnamed License'}
                          primaryTypographyProps={{
                            color: isExpiredFlag ? 'error.main' : (isExpiringSoonFlag ? 'warning.main' : 'text.primary'),
                            fontWeight: 'medium'
                          }}
                          secondary={
                            <>
                              <Box component="span" display="block">
                                {customerName} • {vendorName}
                              </Box>
                              <Box component="span" display="block" color="text.secondary">
                                Expires: {formatDate(license.expiration_date)}
                                {isExpiredFlag ? (
                                  <Chip 
                                    label="Expired" 
                                    size="small" 
                                    color="error" 
                                    sx={{ ml: 1 }} 
                                  />
                                ) : isExpiringSoonFlag ? (
                                  <Chip 
                                    label="Expiring Soon" 
                                    size="small" 
                                    color="warning" 
                                    sx={{ ml: 1 }} 
                                  />
                                ) : null}
                              </Box>
                            </>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Box display="flex" justifyContent="center" p={2}>
                  <Typography color="textSecondary">
                    {searchTerm 
                      ? 'No matching licenses found' 
                      : 'No licenses expiring soon'}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Recent Licenses */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  Recent Licenses
                </Typography>
                <Tooltip title="Refresh">
                  <IconButton onClick={fetchDashboardData} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress />
                </Box>
              ) : recentLicenses.length > 0 ? (
                <List dense>
                  {recentLicenses.map((license) => {
                    const customerName = license.customer_name || license.customer?.name || 'No Customer';
                    const vendorName = license.vendor_name || license.vendor?.name || 'No Vendor';
                    const isExpiredFlag = isExpired(license.expiration_date);
                    const isExpiringSoonFlag = !isExpiredFlag && isExpiringSoon(license.expiration_date);

                    return (
                      <ListItem 
                        key={license.id}
                        sx={{ 
                          mb: 1,
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          '&:hover': {
                            bgcolor: 'action.hover'
                          }
                        }}
                      >
                        <ListItemIcon>
                          <ArticleIcon color={isExpiredFlag ? 'error' : (isExpiringSoonFlag ? 'warning' : 'primary')} />
                        </ListItemIcon>
                        <ListItemText
                          primary={license.name || 'Unnamed License'}
                          primaryTypographyProps={{
                            color: isExpiredFlag ? 'error.main' : (isExpiringSoonFlag ? 'warning.main' : 'text.primary'),
                            fontWeight: 'medium'
                          }}
                          secondary={
                            <>
                              <Box component="span" display="block">
                                {customerName} • {vendorName}
                              </Box>
                              <Box component="span" display="block" color="text.secondary">
                                Purchased: {formatDate(license.purchase_date)}
                                {isExpiredFlag ? (
                                  <Chip 
                                    label="Expired" 
                                    size="small" 
                                    color="error" 
                                    sx={{ ml: 1 }} 
                                  />
                                ) : isExpiringSoonFlag ? (
                                  <Chip 
                                    label="Expiring Soon" 
                                    size="small" 
                                    color="warning" 
                                    sx={{ ml: 1 }} 
                                  />
                                ) : null}
                              </Box>
                            </>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Box display="flex" justifyContent="center" p={2}>
                  <Typography color="textSecondary">
                    No recent licenses found
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </LocalizationProvider>
  );
};

export default Dashboard;
