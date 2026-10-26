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
  // ✅ Utilise BASE_URL de Vite qui s'adapte automatiquement au sous-dossier (GitHub Pages) et à l'APK
  const baseUrl = import.meta.env.BASE_URL || '/';
  
  return (
    <img
      src={`${baseUrl}icon.svg`}
      alt="StockFacture Pro"
      className={`${sizeMap[size]} object-contain ${className}`}
      loading="eager"
    />
  );
};