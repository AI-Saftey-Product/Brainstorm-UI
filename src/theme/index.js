import { createTheme } from '@mui/material/styles';

// Define consistent spacing and layout constants
const LAYOUT_CONSTANTS = {
  PAGE_PADDING: 4, // 32px
  SECTION_SPACING: 4, // 32px
  CARD_PADDING: 3, // 24px
  ELEMENT_SPACING: 2, // 16px
  CONTENT_WIDTH: 'lg', // Material-UI's lg breakpoint
  GRID_SPACING: 3, // 24px
  BORDER_RADIUS: 1, // 8px
};

const theme = createTheme({
  palette: {
    primary: {
      main: '#2E75CC',
      light: '#4B83D4',
      dark: '#1E5AA3',
      contrastText: '#fff',
    },
    secondary: {
      main: '#37352F',
      light: '#4A4843',
      dark: '#2B2A25',
      contrastText: '#fff',
    },
    error: {
      lighter: '#FFE9E9',
      light: '#FF8A8A',
      main: '#E03E3E',
      dark: '#BA1B1B',
    },
    warning: {
      lighter: '#FFF3E6',
      light: '#FFB266',
      main: '#F7931E',
      dark: '#CC6A00',
    },
    success: {
      lighter: '#E8F5E9',
      light: '#81C784',
      main: '#37B24D',
      dark: '#2E7D32',
    },
    grey: {
      100: '#F7F6F3',
      200: '#EBECED',
      300: '#DFE1E2',
      400: '#C3C7CA',
      500: '#9BA1A6',
      600: '#737D83',
      700: '#434B53',
      800: '#2C353D',
      900: '#1B242C',
    },
    background: {
      default: '#F8F9FA',
      paper: '#FFFFFF',
      neutral: '#F7F6F3',
    },
    text: {
      primary: '#37352F',
      secondary: '#6B6B6B',
      disabled: '#9BA1A6',
    },
    divider: 'rgba(55, 53, 47, 0.09)',
    action: {
      hover: 'rgba(55, 53, 47, 0.03)',
      selected: 'rgba(55, 53, 47, 0.05)',
    },
  },
  typography: {
    fontFamily: [
      'Poppins',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Oxygen',
      'Ubuntu',
      'Cantarell',
      'Fira Sans',
      'Droid Sans',
      'Helvetica Neue',
      'sans-serif',
    ].join(','),
    h1: {
      fontFamily: 'Poppins',
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
      color: '#37352F',
    },
    h2: {
      fontFamily: 'Poppins',
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
      color: '#37352F',
    },
    h3: {
      fontFamily: 'Poppins',
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
      color: '#37352F',
    },
    h4: {
      fontFamily: 'Poppins',
      fontWeight: 500,
      fontSize: '1.25rem',
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
      color: '#37352F',
    },
    h5: {
      fontFamily: 'Poppins',
      fontWeight: 500,
      fontSize: '1.125rem',
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
      color: '#37352F',
    },
    h6: {
      fontFamily: 'Poppins',
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
      color: '#37352F',
    },
    subtitle1: {
      fontFamily: 'Poppins',
      fontWeight: 500,
      fontSize: '0.938rem',
      lineHeight: 1.5,
      letterSpacing: '0',
      color: '#37352F',
    },
    subtitle2: {
      fontFamily: 'Poppins',
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0',
      color: '#6B6B6B',
    },
    body1: {
      fontFamily: 'Poppins',
      fontSize: '0.938rem',
      lineHeight: 1.5,
      letterSpacing: '0',
      color: '#37352F',
    },
    body2: {
      fontFamily: 'Poppins',
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0',
      color: '#6B6B6B',
    },
    button: {
      fontFamily: 'Poppins',
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0',
      textTransform: 'none',
    },
    caption: {
      fontFamily: 'Poppins',
      fontSize: '0.813rem',
      lineHeight: 1.5,
      letterSpacing: '0',
      color: '#6B6B6B',
    },
    overline: {
      fontFamily: 'Poppins',
      fontSize: '0.75rem',
      lineHeight: 1.5,
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      color: '#6B6B6B',
    },
  },
  shape: {
    borderRadius: 6,
  },
  shadows: [
    'none',
    '0px 1px 2px rgba(0, 0, 0, 0.06)',
    '0px 1px 3px rgba(0, 0, 0, 0.1)',
    '0px 2px 4px rgba(0, 0, 0, 0.06)',
    '0px 3px 5px rgba(0, 0, 0, 0.06)',
    '0px 3px 8px rgba(0, 0, 0, 0.08)',
    '0px 4px 10px rgba(0, 0, 0, 0.08)',
    '0px 5px 12px rgba(0, 0, 0, 0.08)',
    '0px 6px 14px rgba(0, 0, 0, 0.08)',
    '0px 7px 16px rgba(0, 0, 0, 0.08)',
    '0px 8px 18px rgba(0, 0, 0, 0.08)',
    '0px 9px 20px rgba(0, 0, 0, 0.09)',
    '0px 10px 22px rgba(0, 0, 0, 0.09)',
    '0px 11px 24px rgba(0, 0, 0, 0.09)',
    '0px 12px 26px rgba(0, 0, 0, 0.09)',
    '0px 13px 28px rgba(0, 0, 0, 0.09)',
    '0px 14px 30px rgba(0, 0, 0, 0.09)',
    '0px 15px 32px rgba(0, 0, 0, 0.09)',
    '0px 16px 34px rgba(0, 0, 0, 0.09)',
    '0px 17px 36px rgba(0, 0, 0, 0.09)',
    '0px 18px 38px rgba(0, 0, 0, 0.09)',
    '0px 19px 40px rgba(0, 0, 0, 0.09)',
    '0px 20px 42px rgba(0, 0, 0, 0.09)',
    '0px 21px 44px rgba(0, 0, 0, 0.09)',
    '0px 22px 46px rgba(0, 0, 0, 0.09)',
  ],
  spacing: 8, // Base spacing unit (8px)
  layout: LAYOUT_CONSTANTS,
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          marginBottom: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.ELEMENT_SPACING),
          '&:last-child': {
            marginBottom: 0,
          },
          '&.MuiTypography-gutterBottom': {
            marginBottom: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.ELEMENT_SPACING),
          },
        },
        h1: {
          marginBottom: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.SECTION_SPACING),
        },
        h2: {
          marginBottom: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.ELEMENT_SPACING * 1.5),
        },
        h3: {
          marginBottom: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.ELEMENT_SPACING * 1.5),
        },
        h4: {
          marginBottom: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.ELEMENT_SPACING),
        },
        h5: {
          marginBottom: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.ELEMENT_SPACING),
        },
        h6: {
          marginBottom: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.ELEMENT_SPACING),
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.BORDER_RADIUS / 2),
          fontSize: '0.875rem',
          lineHeight: 1.5,
          letterSpacing: 0,
          minHeight: 40,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: 'rgba(55, 53, 47, 0.16)',
        },
        text: {
          '&:hover': {
            backgroundColor: 'rgba(55, 53, 47, 0.04)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: '0.813rem',
          fontWeight: 500,
          lineHeight: 1.5,
          letterSpacing: 0,
        },
        label: {
          padding: '0 12px',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: ({ theme }) => theme.spacing(1.5, 2),
          fontSize: '0.875rem',
          lineHeight: 1.5,
          letterSpacing: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
        },
        head: {
          fontWeight: 600,
          color: '#37352F',
          backgroundColor: ({ theme }) => theme.palette.background.neutral,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          lineHeight: 1.5,
          letterSpacing: 0,
          marginBottom: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.ELEMENT_SPACING),
        },
        message: {
          padding: '8px 0',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          marginBottom: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.ELEMENT_SPACING),
          '&:last-child': {
            marginBottom: 0,
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          padding: ({ theme }) => theme.spacing(0, LAYOUT_CONSTANTS.CARD_PADDING),
          minHeight: 56,
          '& .MuiTypography-root': {
            fontSize: '0.938rem',
            fontWeight: 500,
            lineHeight: 1.5,
            letterSpacing: 0,
          },
        },
        content: {
          margin: ({ theme }) => theme.spacing(1.5, 0),
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          padding: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.CARD_PADDING),
          '& .MuiTypography-root': {
            fontSize: '0.875rem',
            lineHeight: 1.5,
            letterSpacing: 0,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          padding: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.CARD_PADDING),
          backgroundImage: 'none',
          marginBottom: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.ELEMENT_SPACING),
          '&:last-child': {
            marginBottom: 0,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'divider',
          height: '100%', // Ensure consistent card heights in grid layouts
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.CARD_PADDING),
          '&:last-child': {
            paddingBottom: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.CARD_PADDING),
          },
        },
      },
    },
    MuiGrid: {
      styleOverrides: {
        root: {
          '& > .MuiGrid-item': {
            paddingTop: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.GRID_SPACING / 2),
            paddingBottom: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.GRID_SPACING / 2),
          },
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingTop: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.PAGE_PADDING),
          paddingBottom: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.PAGE_PADDING),
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.CARD_PADDING),
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.CARD_PADDING),
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: ({ theme }) => theme.spacing(2, LAYOUT_CONSTANTS.CARD_PADDING),
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          marginBottom: ({ theme }) => theme.spacing(LAYOUT_CONSTANTS.ELEMENT_SPACING),
          '&:last-child': {
            marginBottom: 0,
          },
        },
      },
    },
  },
});

export default theme; 