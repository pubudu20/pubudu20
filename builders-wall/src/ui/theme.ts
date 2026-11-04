/** Colours, fonts and spacing: dark concrete + safety amber. */
export const colors = {
  bg: '#121416', // night concrete
  surface: '#1B1E21',
  surface2: '#24282C',
  surface3: '#2E3337',
  line: '#383E44',
  text: '#ECE9E2',
  muted: '#9BA1A7',
  faint: '#6B7177',
  amber: '#FFB000', // safety amber
  amberDim: '#8A6200',
  amberSoft: 'rgba(255,176,0,0.14)',
  onAmber: '#1A1300',
  red: '#FF5A4E',
  redSoft: 'rgba(255,90,78,0.14)',
  green: '#5BD38A',
  blue: '#6CB4FF',
  ice: '#9FE3FF',
};

/** Font family names — must match the keys loaded in App.tsx. */
export const fonts = {
  display: 'BigShoulders-ExtraBold',
  displaySemi: 'BigShoulders-SemiBold',
  body: 'Inter-Regular',
  bodyBold: 'Inter-SemiBold',
  mono: 'JetBrainsMono-Medium',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 6, md: 10, lg: 14 };

/** Minimum touch target (dp). */
export const TAP = 48;
