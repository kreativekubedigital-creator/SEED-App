import React from 'react';
import { cn } from '../lib/utils';

// Logo paths point to the public folder
const logoBlack = '/seed-logo.webp';
const logoWhite = '/seed-logo-2.webp';
const logoNavbar = '/seed-logo-navbar.webp';

interface LogoProps {
  variant?: 'black' | 'white' | 'navbar';
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
  } else if (variant === 'navbar') {
    logoSrc = logoNavbar;
  }

  return (
    <img 
      src={logoSrc} 
      alt="SEEDD Logo" 
      className={cn(`${sizeClasses[size]} w-auto object-contain`, className)}
    />
  );
};
