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
    totalCustomers: 0,
    totalVendors: 0
  });
  const [vendorDistribution, setVendorDistribution] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // First, fetch stats
      const statsRes = await api.get('/dashboard/stats');
      setStats(statsRes.data);
      
      // Fetch vendors for distribution
      const vendorsRes = await api.get('/dashboard/vendor-distribution');
      setVendorDistribution(vendorsRes.data || []);
      
      console.log('Dashboard data loaded:', {
        stats: statsRes.data,
        vendors: vendorsRes.data
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
        </Grid>
      </Container>
    </LocalizationProvider>
  );
};

export default Dashboard;
