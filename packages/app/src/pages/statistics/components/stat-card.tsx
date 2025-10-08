import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard = ({ title, value, icon, description }: StatCardProps) => {
  return (
    <div className="rounded-xl bg-muted p-4 shadow-around">
      <div className="flex items-center justify-between pb-2">
        <h3 className="font-medium text-neutral-600 text-sm dark:text-neutral-400">{title}</h3>
        <div className="text-neutral-600 dark:text-neutral-400">{icon}</div>
      </div>
      <div className="space-y-1">
        <div className="font-bold text-2xl text-neutral-900 dark:text-neutral-100">{value}</div>
        {description && <p className="text-neutral-500 text-sm dark:text-neutral-500">{description}</p>}
      </div>
    </div>
  );
};

export default StatCard;
