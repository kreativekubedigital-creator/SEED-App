import React from 'react';
import { cn } from '../lib/utils';

// Logo paths point to the public folder
const logoBlack = '/seedd-logo-black.webp';
const logoWhite = '/seedd-logo-white.webp';
const logoMark = '/seedd-logo-black.webp'; // Using black logo as mark if logomark file is unavailable

interface LogoProps {
  variant?: 'black' | 'white' | 'mark';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ variant = 'black', className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-16',
    xl: 'h-20'
  };

  let logoSrc = logoBlack;
  if (variant === 'white') {
    logoSrc = logoWhite;
  } else if (variant === 'mark') {
    logoSrc = logoMark;
  }

  return (
    <img 
      src={logoSrc} 
      alt="SEEDD Logo" 
      className={cn(`${sizeClasses[size]} w-auto object-contain`, className)}
    />
  );
};
