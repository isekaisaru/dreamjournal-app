// components/DreamCard.tsx
import React from 'react';

type DreamCardProps = {
  title: string;
  description: string;
};

const DreamCard: React.FC<DreamCardProps> = ({ title, description }) => {
  return (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
};

export default DreamCard;