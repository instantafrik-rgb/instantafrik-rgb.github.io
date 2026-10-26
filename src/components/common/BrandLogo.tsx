import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', className = '' }) => {
  const baseUrl = import.meta.env.BASE_URL || '/';
  
  return (
    <img
      src={`${baseUrl}icon.svg`}
      alt="StockFacture Pro"
      // ✅ Ajout de style inline pour forcer les dimensions et éviter les conflits de flexbox
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      className={`${sizeMap[size]} ${className}`}
      loading="eager"
    />
  );
};