// Color interpolation function
function interpolateColor(
  color1: [number, number, number],
  color2: [number, number, number],
  factor: number
): string {
  const r = Math.round(color1[0] + (color2[0] - color1[0]) * factor);
  const g = Math.round(color1[1] + (color2[1] - color1[1]) * factor);
  const b = Math.round(color1[2] + (color2[2] - color1[2]) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

// Get text color based on background brightness
export function getTextColor(backgroundColor: string): string {
  // Parse the RGB values
  const match = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return '#ffffff';

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Threshold ensures high contrast (WCAG AA) on amber, yellow, and light green badges
  return luminance > 0.52 ? '#0f172a' : '#ffffff';
}

// Main function: get color for a percentage (0-100)
export function getPercentageColor(percentage: number): string {
  // Clamp percentage to 0-100
  const value = Math.max(0, Math.min(100, percentage));

  // Refined modern color anchor points (prevents eye strain, looks premium)
  const ROSE: [number, number, number] = [225, 45, 65];      // 0-50%: Rich Rose
  const AMBER: [number, number, number] = [245, 158, 11];    // 70%: Warm Amber/Gold
  const EMERALD: [number, number, number] = [16, 185, 129];  // 85%: Vibrant Emerald
  const TEAL_GREEN: [number, number, number] = [5, 150, 105];// 100%: Deep Emerald/Teal

  let color: string;

  if (value <= 50) {
    color = `rgb(${ROSE[0]}, ${ROSE[1]}, ${ROSE[2]})`;
  } else if (value <= 70) {
    const factor = (value - 50) / 20;
    color = interpolateColor(ROSE, AMBER, factor);
  } else if (value <= 85) {
    const factor = (value - 70) / 15;
    color = interpolateColor(AMBER, EMERALD, factor);
  } else {
    const factor = (value - 85) / 15;
    color = interpolateColor(EMERALD, TEAL_GREEN, factor);
  }

  return color;
}

// Get background and text color for a percentage
// Pass hasData=false when the student has no scores yet — renders a neutral tone
export function getPercentageColors(
  percentage: number,
  hasData = true
): { background: string; text: string } {
  if (!hasData) {
    return { background: 'rgba(51, 65, 85, 0.45)', text: '#94a3b8' };
  }
  const background = getPercentageColor(percentage);
  const text = getTextColor(background);
  return { background, text };
}
