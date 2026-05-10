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
  customLogo?: string;
}

export const Logo: React.FC<LogoProps> = ({ variant = 'black', className = '', size = 'md', customLogo }) => {
  const [error, setError] = React.useState(false);
  
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-16',
    xl: 'h-20'
  };

  let logoSrc = customLogo || logoBlack;
  if (!customLogo) {
    if (variant === 'white') {
      logoSrc = logoWhite;
    } else if (variant === 'mark') {
      logoSrc = logoMark;
    }
  }

  // Fallback to black logo if white logo fails
  // On dark backgrounds (like login), we use a filter to keep the fallback visible if it's the black logo
  return (
    <img 
      src={error ? logoBlack : logoSrc} 
      alt="SEEDD Logo" 
      className={cn(
        `${sizeClasses[size]} w-auto object-contain`, 
        error && variant === 'white' && "brightness-0 invert", // If white logo fails, make black logo white via filter
        className
      )}
      onError={() => !error && setError(true)}
      referrerPolicy="no-referrer"
    />
  );
};
