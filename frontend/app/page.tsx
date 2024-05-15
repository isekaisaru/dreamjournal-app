"use client";

import { useEffect, useState } from "react";
import DreamList from "@/components/DreamList";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { Dream } from "@/app/types";

export default function Home() {
  const [dreams, setDreams] = useState<Dream[]>([]);

  useEffect(() => {
    const fetchDreams = async () => {
      try {
        const response = await axios.get('http://localhost:3001/dreams'); // RailsのAPIエンドポイントにアクセス
        setDreams(response.data);
      } catch (error) {
        console.error('Error fetching dreams:', error);
      }
    };

    fetchDreams();
  }, []);

  return (
    <div className="md:flex">
      <section className="w-full md:w-1/3 flex flex-col items-center px-3 md:pl-6">
        <DreamList dreams={dreams} />
      </section>

      <aside className="w-full md:w-1/3 flex flex-col items-center px-3 md:pl-6">
        <div className="bg-white shadow-md rounded p-4 mb-6 mt-4">
          <h3 className="font-bold text-gray-600 md:-m-2">前に見た夢</h3>
          <p className="text-gray-600">
            前に見た夢を振り返ってみましょう！
          </p>
        </div>
        <ul>
          <li>
            <Link href="/dream/1">
              2024年1月の夢
            </Link>
          </li>
          <li>
            <Link href="/dream/2">
              2024年2月の夢
            </Link>
          </li>
          <li>
            <Link href="/dream/3">
              2024年3月の夢
            </Link>
          </li>
        </ul>
      </aside>
    </div>
  );
}