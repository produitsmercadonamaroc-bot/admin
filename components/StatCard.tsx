import React from 'react';
import { TrendingUpIcon, TrendingDownIcon } from './Icons';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  isPositive?: boolean;
  color: 'indigo' | 'emerald' | 'amber' | 'blue' | 'rose';
}

const colorStyles = {
  indigo: { gradient: 'from-indigo-500 to-indigo-600', text: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-100' },
  emerald: { gradient: 'from-emerald-400 to-emerald-600', text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
  amber: { gradient: 'from-amber-400 to-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100' },
  blue: { gradient: 'from-blue-400 to-blue-600', text: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100' },
  rose: { gradient: 'from-rose-400 to-rose-600', text: 'text-rose-600', bg: 'bg-rose-50', ring: 'ring-rose-100' },
};

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend, isPositive = true }) => {
  const styles = colorStyles[color] || colorStyles.indigo;
  
  return (
    <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{value}</h3>
          
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isPositive ? <TrendingUpIcon className="w-3 h-3" /> : <TrendingDownIcon className="w-3 h-3" />}
              <span>{trend}</span>
              <span className="text-slate-400 font-normal ml-1">vs mois dernier</span>
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-xl ${styles.bg} ${styles.text} ring-1 ${styles.ring}`}>
          {React.isValidElement(icon) 
            ? React.cloneElement(icon as React.ReactElement<any>, { className: "w-6 h-6" })
            : icon}
        </div>
      </div>
      
      {/* Decorative gradient blur */}
      <div className={`absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br ${styles.gradient} opacity-10 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-500`} />
    </div>
  );
};