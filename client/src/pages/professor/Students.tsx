import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  MenuItem,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

const ProfessorStudents = () => {
  const [students, setStudents] = useState([
    { id: 1, name: 'محمد أحمد', studentId: '20231001', course: 'رياضيات هندسية 1', email: '20231001@student.rsu.edu', phone: '+249 123 456 789', downloads: 15, lastActive: '2024-01-15' },
    { id: 2, name: 'سارة محمد', studentId: '20231002', course: 'رياضيات هندسية 1', email: '20231002@student.rsu.edu', phone: '+249 123 456 788', downloads: 8, lastActive: '2024-01-14' },
    { id: 3, name: 'عمر خالد', studentId: '20231003', course: 'فيزياء عامة', email: '20231003@student.rsu.edu', phone: '+249 123 456 787', downloads: 12, lastActive: '2024-01-13' },
    { id: 4, name: 'فاطمة علي', studentId: '20231004', course: 'فيزياء عامة', email: '20231004@student.rsu.edu', phone: '+249 123 456 786', downloads: 6, lastActive: '2024-01-12' },
    { id: 5, name: 'خالد حسين', studentId: '20231005', course: 'برمجة 1', email: '20231005@student.rsu.edu', phone: '+249 123 456 785', downloads: 20, lastActive: '2024-01-11' }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const courses = Array.from(new Set(students.map(s => s.course)));

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.includes(searchTerm) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourse = courseFilter === 'all' || student.course === courseFilter;
    
    return matchesSearch && matchesCourse;
  });

  const handleViewStudent = (student: any) => {
    setSelectedStudent(student);
  };

  const sendEmailToAll = () => {
    alert(`سيتم إرسال بريد إلكتروني لـ ${filteredStudents.length} طالب`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        👥 إدارة الطلاب
      </Typography>

      {/* الإحصائيات */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{students.length}</Typography>
              <Typography variant="body2" color="textSecondary">طالب إجمالاً</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{courses.length}</Typography>
              <Typography variant="body2" color="textSecondary">مادة مختلفة</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{students.reduce((sum, s) => sum + s.downloads, 0)}</Typography>
              <Typography variant="body2" color="textSecondary">تنزيل إجمالي</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<EmailIcon />}
                onClick={sendEmailToAll}
              >
                مراسلة الكل
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* البحث والتصفية */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="ابحث عن طالب بالاسم أو الرقم الجامعي..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: '#666' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              select
              label="تصفية بالمادة"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              InputProps={{
                startAdornment: <FilterIcon sx={{ mr: 1, color: '#666' }} />
              }}
            >
              <MenuItem value="all">جميع المواد</MenuItem>
              {courses.map((course) => (
                <MenuItem key={course} value={course}>{course}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => alert('تصدير قائمة الطلاب')}
            >
              تصدير البيانات
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* جدول الطلاب */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell>اسم الطالب</TableCell>
              <TableCell>الرقم الجامعي</TableCell>
              <TableCell>المادة</TableCell>
              <TableCell>البريد الإلكتروني</TableCell>
              <TableCell align="center">التنزيلات</TableCell>
              <TableCell>آخر نشاط</TableCell>
              <TableCell align="center">الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SchoolIcon sx={{ mr: 1, color: '#666' }} />
                    {student.name}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={student.studentId} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={student.course} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EmailIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                    {student.email}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={student.downloads} 
                    size="small" 
                    color={student.downloads > 10 ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>{student.lastActive}</TableCell>
                <TableCell align="center">
                  <IconButton 
                    size="small" 
                    onClick={() => handleViewStudent(student)}
                    title="عرض التفاصيل"
                  >
                    <ViewIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => alert(`إرسال بريد لـ ${student.email}`)}
                    title="إرسال بريد"
                  >
                    <EmailIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => alert(`الاتصال بـ ${student.phone}`)}
                    title="الاتصال"
                  >
                    <PhoneIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* عرض تفاصيل الطالب */}
      {selectedStudent && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">تفاصيل الطالب: {selectedStudent.name}</Typography>
            <Button onClick={() => setSelectedStudent(null)}>إغلاق</Button>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">الرقم الجامعي</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{selectedStudent.studentId}</Typography>
              
              <Typography variant="subtitle2" color="textSecondary">البريد الإلكتروني</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{selectedStudent.email}</Typography>
              
              <Typography variant="subtitle2" color="textSecondary">رقم الهاتف</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{selectedStudent.phone}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">المادة</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{selectedStudent.course}</Typography>
              
              <Typography variant="subtitle2" color="textSecondary">عدد التنزيلات</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{selectedStudent.downloads}</Typography>
              
              <Typography variant="subtitle2" color="textSecondary">آخر نشاط</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{selectedStudent.lastActive}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" startIcon={<EmailIcon />} sx={{ mr: 2 }}>
                إرسال بريد
              </Button>
              <Button variant="outlined" startIcon={<PhoneIcon />} sx={{ mr: 2 }}>
                الاتصال
              </Button>
              <Button variant="outlined">
                عرض سجل النشاط
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Container>
  );
};

export default ProfessorStudents;
