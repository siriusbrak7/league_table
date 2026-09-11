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
  if (!match) return '#000000';

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // If background is bright, use dark text; if dark, use white text
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
}

// Main function: get color for a percentage (0-100)
export function getPercentageColor(percentage: number): string {
  // Clamp percentage to 0-100
  const value = Math.max(0, Math.min(100, percentage));

  // Define color anchor points
  const RED: [number, number, number] = [255, 0, 0];       // 0-50%
  const YELLOW: [number, number, number] = [255, 255, 0];  // 70%
  const GREEN: [number, number, number] = [0, 200, 0];     // 85%
  const DEEP_GREEN: [number, number, number] = [0, 150, 0]; // 100%

  let color: string;

  if (value <= 50) {
    // 0-50: Pure Red
    color = `rgb(${RED[0]}, ${RED[1]}, ${RED[2]})`;
  } else if (value <= 70) {
    // 50-70: Red to Yellow
    const factor = (value - 50) / 20;
    color = interpolateColor(RED, YELLOW, factor);
  } else if (value <= 85) {
    // 70-85: Yellow to Green
    const factor = (value - 70) / 15;
    color = interpolateColor(YELLOW, GREEN, factor);
  } else {
    // 85-100: Green to Deep Green
    const factor = (value - 85) / 15;
    color = interpolateColor(GREEN, DEEP_GREEN, factor);
  }

  return color;
}

// Get background and text color for a percentage
// Pass hasData=false when the student has no scores yet — renders a neutral gray
// instead of bright red so that "not entered" is visually distinct from "scored 0%".
export function getPercentageColors(
  percentage: number,
  hasData = true
): { background: string; text: string } {
  if (!hasData) {
    return { background: 'rgb(229, 231, 235)', text: '#374151' };
  }
  const background = getPercentageColor(percentage);
  const text = getTextColor(background);
  return { background, text };
}