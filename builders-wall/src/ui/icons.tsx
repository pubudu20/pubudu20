/** Hand-drawn tab and header icons (react-native-svg, no icon font needed). */
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type P = { color: string; size?: number };

export function TodayIcon({ color, size = 24 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={3.5} width={17} height={17} rx={3} stroke={color} strokeWidth={2} />
      <Path d="M7.5 12.5l3 3 6-7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function WallIcon({ color, size = 24 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2.5} y={15} width={9} height={5} rx={1} fill={color} />
      <Rect x={12.5} y={15} width={9} height={5} rx={1} fill={color} />
      <Rect x={7.5} y={9} width={9} height={5} rx={1} fill={color} />
      <Rect x={2.5} y={9} width={4} height={5} rx={1} fill={color} opacity={0.6} />
      <Rect x={17.5} y={9} width={4} height={5} rx={1} fill={color} opacity={0.6} />
      <Rect x={2.5} y={3} width={9} height={5} rx={1} stroke={color} strokeWidth={1.4} strokeDasharray="2 2" />
    </Svg>
  );
}

export function GoalsIcon({ color, size = 24 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} r={4.5} stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} r={1.5} fill={color} />
    </Svg>
  );
}

export function ShopIcon({ color, size = 24 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={2} />
      <Path d="M12 7v10M9.5 9.5c0-1 1-1.6 2.5-1.6s2.5.6 2.5 1.7c0 2.6-5 1.3-5 4 0 1.1 1 1.7 2.5 1.7s2.5-.6 2.5-1.6" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function StatsIcon({ color, size = 24 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={12} width={4} height={8} rx={1} fill={color} />
      <Rect x={10} y={7} width={4} height={13} rx={1} fill={color} />
      <Rect x={16} y={3.5} width={4} height={16.5} rx={1} fill={color} />
    </Svg>
  );
}

export function GearIcon({ color, size = 24 }: P) {
  // A cog: 8 teeth around a ring.
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <Rect key={a} x={10.5} y={1.8} width={3} height={5} rx={1} fill={color} transform={`rotate(${a} 12 12)`} />
      ))}
      <Circle cx={12} cy={12} r={6.2} stroke={color} strokeWidth={2.6} />
      <Circle cx={12} cy={12} r={2.2} fill={color} />
    </Svg>
  );
}
