export const formatStat = (val: any) => {
  if (val === undefined || val === null || val === 'undefined' || val === 'undecided') return 'Unset';
  const s = String(val);
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const isDefined = (val: any) => {
  return val !== undefined && val !== null && val !== 'undefined' && val !== 'undecided' && val !== '';
};

export const getStatColor = (value: string) => {
  const colors: Record<string, string> = {
    // Joy
    'low': '#f87171',      // Light Red
    'medium': '#fbbf24',   // Amber
    'high': '#34d399',     // Emerald
    
    // Usage
    'daily': '#34d399',    // Emerald
    'weekly': '#60a5fa',   // Blue
    'monthly': '#a78bfa',  // Violet
    'yearly': '#f472b6',   // Pink
    'seasonal': '#fbbf24', // Amber
    'unused': '#94a3b8',   // Slate
    
    // Intention
    'keep': '#34d399',     // Emerald
    'sell': '#60a5fa',     // Blue
    'donate': '#a78bfa',   // Violet
    'maintain': '#fbbf24', // Amber
    'upgrade': '#22d3ee',  // Cyan
    'dispose': '#f87171',  // Light Red
    
    // Attachment
    'replacable': '#94a3b8', // Slate
    'some': '#60a5fa',       // Blue
    'strong': '#a78bfa',     // Violet
    'sentimental': '#f472b6', // Pink
    'undecided': '#94a3b8',
    'undefined': '#94a3b8'
  };
  return colors[value] || 'var(--accent-purple)';
};
