export const formatStat = (val: any) => {
  if (val === undefined || val === null || val === 'undefined' || val === 'undecided') return '-';
  const s = String(val);
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const isDefined = (val: any) => {
  return val !== undefined && val !== null && val !== 'undefined' && val !== 'undecided' && val !== '';
};
