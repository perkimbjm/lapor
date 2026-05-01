
import React from 'react';
import { ComplaintStatus, PriorityLevel } from '../types';

interface StatusBadgeProps {
  status?: ComplaintStatus;
  priority?: PriorityLevel;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, priority, className = '' }) => {
  if (status) {
    let colorClass = 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-300';
    if (status === ComplaintStatus.RECEIVED) colorClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    if (status === ComplaintStatus.REJECTED) colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    if (status === ComplaintStatus.SURVEY) colorClass = 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
    if (status === ComplaintStatus.COMPLETED) colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent dark:border-white/5 ${colorClass} ${className}`}>
        {status}
      </span>
    );
  }

  return null;
};

export default StatusBadge;
