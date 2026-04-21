import React from 'react';
import { GenderIcon } from '@/components/ui/GenderIcon';

export const GENDER_LABELS: Record<string, React.ReactNode> = {
  male: <span className="flex items-center gap-1.5"> <GenderIcon gender="male" className = "w-3.5 h-3.5" /> Male </span>, 
  female: <span className="flex items-center gap-1.5"> <GenderIcon gender="female" className = "w-3.5 h-3.5" /> Female </span>, 
  unknown: <span className="flex items-center gap-1.5"> <GenderIcon gender="unknown" className = "w-3.5 h-3.5" /> Unknown </span>
};

export const STATUS_COLORS: Record<string, string> = {
  alive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  breeding: "bg-pink-50 text-pink-700 border-pink-200",
  resting: "bg-amber-50 text-amber-700 border-amber-200",
  fledged: "bg-cyan-50 text-cyan-700 border-cyan-200",
  deceased: "bg-gray-50 text-gray-500 border-gray-200",
  sold: "bg-blue-50 text-blue-700 border-blue-200",
  unknown: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export const STATUS_LABELS: Record<string, string> = {
  alive: "Alive",
  breeding: "🥚 Breeding",
  resting: "💤 Resting",
  fledged: "🪶 Fledged",
  deceased: "Deceased",
  sold: "Sold",
  unknown: "Unknown",
};
