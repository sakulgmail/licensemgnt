import { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  Card, 
  CardContent,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  CircularProgress,
  Chip
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorIcon from '@mui/icons-material/Error';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../services/api';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLicenses, setShowLicenses] = useState(false);
  const [licenses, setLicenses] = useState([]);
  const [licensesLoading, setLicensesLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalLicenses, setTotalLicenses] = useState(0);
  const [stats, setStats] = useState({
    totalLicenses: 0,
    expiringLicenses: 0,
    expiredLicenses: 0,
    totalCustomers: 0,
    totalVendors: 0
  });
  const [vendorDistribution, setVendorDistribution] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' or 'expiring' or 'expired'

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    fetchAllLicenses(newPage, rowsPerPage, activeFilter);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    fetchAllLicenses(0, newRowsPerPage, activeFilter);
  };

  const fetchAllLicenses = async (page = 0, limit = 10, filter = 'all') => {
    setLicensesLoading(true);
    try {
      let response;
      
      if (filter === 'expiring') {
        // Use the dedicated expiring-soon endpoint
        response = await api.get('/dashboard/expiring-soon');
        // The expiring-soon endpoint doesn't support pagination, so we'll handle it client-side
        const allLicenses = response.data || [];
        const start = page * limit;
        const paginatedLicenses = allLicenses.slice(start, start + limit);
        
        setLicenses(paginatedLicenses);
        setTotalLicenses(allLicenses.length);
      } else if (filter === 'expired') {
        // Use the dedicated expired endpoint
        response = await api.get('/dashboard/expired');
        console.log('Expired licenses:', response.data);
        
        // The expired endpoint doesn't support pagination, so we'll handle it client-side
        const allLicenses = response.data || [];
        const start = page * limit;
        const paginatedLicenses = allLicenses.slice(start, start + limit);
        
        setLicenses(paginatedLicenses);
        setTotalLicenses(allLicenses.length);
      } else {
        // Use the regular licenses endpoint with pagination
        response = await api.get('/licenses', {
          params: {
            page: page + 1, // API is 1-based
            limit
          }
        });
        
        const licensesData = response.data?.data || [];
        const total = response.data?.pagination?.total || 0;
        
        setLicenses(licensesData);
        setTotalLicenses(total);
      }
    } catch (error) {
      console.error('Error fetching licenses:', error);
      setError('Failed to load licenses');
    } finally {
      setLicensesLoading(false);
    }
  };

  const handleLicenseCardClick = () => {
    setShowLicenses(true);
    setActiveFilter('all');
    if (licenses.length === 0 || activeFilter !== 'all') {
      fetchAllLicenses(page, rowsPerPage, 'all');
    }
  };

  const handleExpiringLicensesClick = () => {
    setShowLicenses(true);
    setActiveFilter('expiring');
    fetchAllLicenses(page, rowsPerPage, 'expiring');
  };

  const handleExpiredLicensesClick = () => {
    setShowLicenses(true);
    setActiveFilter('expired');
    fetchAllLicenses(page, rowsPerPage, 'expired');
  };

  const fetchDashboardData = useCallback(async () => {
    let isMounted = true;
    
    try {
      setLoading(true);
      setError(null);
      
      // First, fetch the stats which we know exists
      const statsRes = await api.get('/dashboard/stats')
        .catch(err => { 
          throw new Error('Failed to load dashboard statistics'); 
        });
      
      if (isMounted) {
        setStats(statsRes.data);
      }
      
      // Then try to fetch vendor distribution if available
      try {
        const vendorsRes = await api.get('/dashboard/vendor-distribution')
          .catch(() => ({})); // Prevent uncaught promise rejection
          
        if (isMounted && vendorsRes?.data) {
          setVendorDistribution(Array.isArray(vendorsRes.data) ? vendorsRes.data : []);
        }
      } catch (vendorError) {
        console.warn('Vendor distribution not available:', vendorError.message);
        if (isMounted) {
          setVendorDistribution([]);
        }
      }
      
    } catch (error) {
      console.error('Error in fetchDashboardData:', error);
      if (isMounted) {
        setError(error.message || 'Failed to load dashboard data');
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography color="error" variant="h6" gutterBottom>
          {error}
        </Typography>
        <IconButton onClick={fetchDashboardData} color="primary">
          <RefreshIcon /> Retry
        </IconButton>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Dashboard
          </Typography>
          <Tooltip title="Refresh Data">
            <IconButton 
              onClick={fetchDashboardData} 
              color="primary"
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { 
              title: 'Total Licenses', 
              value: stats.totalLicenses, 
              icon: <ArticleIcon color="primary" />,
              color: 'primary',
              onClick: handleLicenseCardClick,
              clickable: true
            },
            { 
              title: 'Expiring Licenses', 
              value: stats.expiringLicenses, 
              icon: <WarningIcon color="warning" />,
              color: 'warning.main',
              onClick: handleExpiringLicensesClick,
              clickable: true
            },
            { 
              title: 'Expired Licenses', 
              value: stats.expiredLicenses, 
              icon: <ErrorIcon color="error" />,
              color: 'error.main',
              onClick: handleExpiredLicensesClick,
              clickable: true
            },
            { 
              title: 'Total Customers', 
              value: stats.totalCustomers, 
              icon: <PeopleIcon color="primary" />,
              color: 'primary'
            },
            { 
              title: 'Total Vendors', 
              value: stats.totalVendors, 
              icon: <BusinessIcon color="primary" />,
              color: 'primary'
            }
          ].map((item, index) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
              <Card 
                elevation={3} 
                onClick={item.onClick}
                sx={{ 
                  cursor: item.clickable ? 'pointer' : 'default',
                  '&:hover': item.clickable ? { 
                    boxShadow: 6,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.3s ease-in-out'
                  } : {}
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    {item.icon}
                    <Typography color="textSecondary" variant="subtitle2" sx={{ ml: 1 }}>
                      {item.title}
                    </Typography>
                  </Box>
                  <Typography variant="h4" color={item.color}>
                    {loading ? '...' : item.value || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* License List Section */}
        {showLicenses && (
          <Grid item xs={12} sx={{ mt: 4 }}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {activeFilter === 'expiring' 
                    ? 'Expiring Soon Licenses' 
                    : activeFilter === 'expired'
                      ? 'Expired Licenses'
                      : 'All Licenses'}
                </Typography>
                {licensesLoading ? (
                  <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>License Name</TableCell>
                            <TableCell>Customer</TableCell>
                            <TableCell>Vendor</TableCell>
                            <TableCell>Expiration Date</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {licenses.length > 0 ? (
                            licenses.map((license) => {
                              const expirationDate = license.expiration_date ? new Date(license.expiration_date) : null;
                              const today = new Date();
                              const thirtyDaysFromNow = new Date();
                              thirtyDaysFromNow.setDate(today.getDate() + 30);
                              
                              let status = 'Active';
                              let statusColor = 'success';
                              
                              if (expirationDate) {
                                if (expirationDate < today) {
                                  status = 'Expired';
                                  statusColor = 'error';
                                } else if (expirationDate <= thirtyDaysFromNow) {
                                  status = 'Expiring';
                                  statusColor = 'warning';
                                }
                              }
                              
                              return (
                                <TableRow key={license.id}>
                                  <TableCell>{license.name || 'N/A'}</TableCell>
                                  <TableCell>
                                    {license.customer?.name || license.customer_name || 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    {license.vendor?.name || license.vendor_name || 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    {expirationDate ? expirationDate.toLocaleDateString() : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={status}
                                      color={statusColor}
                                      size="small"
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} align="center">
                                {licensesLoading ? 'Loading...' : 'No licenses found'}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      rowsPerPageOptions={[5, 10, 25]}
                      component="div"
                      count={totalLicenses}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={handleChangePage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default Dashboard;
