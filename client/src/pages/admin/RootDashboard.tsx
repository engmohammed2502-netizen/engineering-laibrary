import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton
} from '@mui/material';
import {
  People as PeopleIcon,
  School as StudentIcon,
  Person as ProfessorIcon,
  Visibility as VisitorIcon,
  TrendingUp as TrendingIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon
} from '@mui/icons-material';

const RootDashboard = () => {
  const [stats, setStats] = useState({
    activeUsers: 0,
    totalStudents: 0,
    totalProfessors: 0,
    activeVisitors: 0,
    totalCourses: 0,
    totalFiles: 0,
    recentLogins: []
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      // API calls هنا سيكون 
      const mockStats = {
        activeUsers: 12,
        totalStudents: 150,
        totalProfessors: 20,
        activeVisitors: 5,
        totalCourses: 45,
        totalFiles: 320,
        recentLogins: [
          { username: '20231001', role: 'student', time: '10:30', ip: '192.168.1.101' },
          { username: 'د.أحمد', role: 'professor', time: '10:15', ip: '192.168.1.102' },
          { username: 'zero', role: 'root', time: '09:45', ip: '192.168.1.100' }
        ]
      };
      
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const StatCard = ({ title, value, icon, color }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            width: 50, 
            height: 50, 
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${color}20`,
            color: color,
            mr: 2
          }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {title}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* العنوان */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">
          👑 لوحة تحكم النظام (الروت)
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />}
          onClick={loadStats}
          disabled={loading}
        >
          تحديث البيانات
        </Button>
      </Box>

      {/* الإحصائيات */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="مستخدمين نشطين"
            value={stats.activeUsers}
            icon={<PeopleIcon />}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="عدد الطلاب"
            value={stats.totalStudents}
            icon={<StudentIcon />}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="عدد الأساتذة"
            value={stats.totalProfessors}
            icon={<ProfessorIcon />}
            color="#ff9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="زوار نشطين"
            value={stats.activeVisitors}
            icon={<VisitorIcon />}
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      {/* الإجراءات السريعة */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          🚀 الإجراءات السريعة
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Button variant="contained" startIcon={<PeopleIcon />}>
              إضافة مستخدم
            </Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" startIcon={<EditIcon />}>
              تعديل مستخدم
            </Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />}>
              حذف مستخدم
            </Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" startIcon={<LockIcon />}>
              تجميد حساب
            </Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" color="success" startIcon={<UnlockIcon />}>
              فك التجميد
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* آخر عمليات الدخول */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          📝 آخر عمليات الدخول
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>اسم المستخدم</TableCell>
                <TableCell>الدور</TableCell>
                <TableCell>الوقت</TableCell>
                <TableCell>عنوان IP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.recentLogins.map((login, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {login.username}
                      {login.role === 'root' && ' 👑'}
                      {login.role === 'professor' && ' 👨‍🏫'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={login.role === 'student' ? 'طالب' : 
                             login.role === 'professor' ? 'أستاذ' : 'مدير'}
                      size="small"
                      color={login.role === 'root' ? 'warning' : 'primary'}
                    />
                  </TableCell>
                  <TableCell>{login.time}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {login.ip}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default RootDashboard;
