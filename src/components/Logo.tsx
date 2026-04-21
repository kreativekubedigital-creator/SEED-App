import React from 'react';
import { cn } from '../lib/utils';
import logoBlack from '../assets/logos/seed-logo.webp';
import logoWhite from '../assets/logos/seed-logo-2.webp';
import logoNavbar from '../assets/logos/seed-logo-navbar.webp';

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
      alt="SEED Logo" 
      className={cn(`${sizeClasses[size]} w-auto object-contain`, className)}
    />
  );
};
