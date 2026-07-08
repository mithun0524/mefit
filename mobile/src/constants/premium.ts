// Shared "material" surface — an elevated card that sits above the #09090b
// canvas: slightly lighter fill, a hairline light border, and a soft drop
// shadow. Used app-wide so every surface reads consistently premium.
export const PREMIUM_CARD = {
  backgroundColor: '#17171c',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.07)',
  boxShadow: '0px 12px 30px -12px rgba(0,0,0,0.7)',
} as const;
