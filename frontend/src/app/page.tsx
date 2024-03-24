"use client";

import React, { useEffect, useState } from 'react';
import DreamCard from '../components/DreamCard';
import { Dream }from '../../types';

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
    <div className="container mx-auto p-4">
    <h1 className="text-2xl font-bold mb-4 text-purple-500">夢の一覧</h1>
    <p>夢を記録する</p>

      {dreams.map(dream => (
        <DreamCard key={dream.id} title={dream.title} description={dream.description} />
      ))}
    </div>
  );
};

export default HomePage;
