"use client";

import React, { useEffect, useState } from 'react';
import DreamCard from '../components/DreamCard';
import { Dream }from '../types';

const HomePage: React.FC = () => {
  const [dreams, setDreams] = useState<Dream[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('/api/dreams');
      const fetchedDreams: Dream[] = await response.json();
      setDreams(fetchedDreams);
    };

    fetchData();
  }, []);

  return (
    <div>
      {dreams.map(dream => (
        <DreamCard key={dream.id} title={dream.title} description={dream.description} />
      ))}
    </div>
  );
};

export default HomePage;
