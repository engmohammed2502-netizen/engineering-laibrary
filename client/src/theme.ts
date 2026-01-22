import { createTheme } from '@mui/material/styles';

// تخصيص التصميم الهندسي
const engineeringTheme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#4A90E2', // أزرق سماوي
      light: '#7BB4F0',
      dark: '#2C6BB7',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#00BCD4', // فيروزي
      light: '#5DDFF3',
      dark: '#008BA3',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F5F8FF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A237E',
      secondary: '#5C6BC0',
    },
  },
  typography: {
    fontFamily: [
      '"Noto Sans Arabic"',
      '"Tajawal"',
      '"Segoe UI"',
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 500,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none' as const,
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

export default engineeringTheme;
