import React, { ReactNode } from 'react';
import { Box, Container } from '@mui/material';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const showNavbar = !!user.token;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {showNavbar && <Navbar />}
      <Container 
        component="main" 
        maxWidth="xl" 
        sx={{ 
          flexGrow: 1,
          py: showNavbar ? 4 : 0,
          mt: showNavbar ? 8 : 0
        }}
      >
        {children}
      </Container>
      {showNavbar && <Footer />}
    </Box>
  );
};

export default Layout;
