export type BankId = 'icici' | 'sbi' | 'axis';

export interface BankTheme {
  id: BankId;
  name: string;
  logo: string;
  colors: Record<string, string>;
}

export const themes: Record<BankId, BankTheme> = {
  icici: {
    id: 'icici',
    name: 'ICICI Bank',
    logo: '/assets/icici-bank-logo.png',
    colors: {
      '--primary': '#F37021',
      '--primary-light': '#FF8C42',
      '--secondary': '#1B3A5C',
      '--accent': '#FF8C42',
      '--bg-start': '#FFF4E6',
      '--bg-end': '#FFE0C2',
      '--card-bg': 'rgba(255, 255, 255, 0.45)',
      '--card-border': 'rgba(243, 112, 33, 0.15)',
      '--glow-teal': '#0D9488',
      '--glow-purple': '#7C3AED',
      '--text-primary': '#0F172A',
      '--text-secondary': '#334155',
      '--text-muted': '#64748B',
    },
  },
  sbi: {
    id: 'sbi',
    name: 'State Bank of India',
    logo: '/assets/sbi-bank-logo.png',
    colors: {
      '--primary': '#1A73E8',
      '--primary-light': '#4A90D9',
      '--secondary': '#FFD600',
      '--accent': '#283593',
      '--bg-start': '#EFF6FF',
      '--bg-end': '#DBEAFE',
      '--card-bg': 'rgba(255, 255, 255, 0.45)',
      '--card-border': 'rgba(26, 115, 232, 0.15)',
      '--glow-teal': '#0D9488',
      '--glow-purple': '#4F46E5',
      '--text-primary': '#0F172A',
      '--text-secondary': '#334155',
      '--text-muted': '#64748B',
    },
  },
  axis: {
    id: 'axis',
    name: 'Axis Bank',
    logo: '/assets/axis-bank-logo.png',
    colors: {
      '--primary': '#97144D',
      '--primary-light': '#B71C5D',
      '--secondary': '#FFFFFF',
      '--accent': '#B71C5D',
      '--bg-start': '#FDF2F8',
      '--bg-end': '#FCE7F3',
      '--card-bg': 'rgba(255, 255, 255, 0.45)',
      '--card-border': 'rgba(151, 20, 77, 0.15)',
      '--glow-teal': '#0D9488',
      '--glow-purple': '#BE185D',
      '--text-primary': '#0F172A',
      '--text-secondary': '#334155',
      '--text-muted': '#64748B',
    },
  },
};
