import React from 'react';
import { Activity } from '../types';
import { cn } from '../lib/utils';

interface ActivityFeedProps {
  activities: Activity[];
  onActivityClick?: (activity: Activity) => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, onActivityClick }) => {
  return (
    <div className="glass-card rounded-2xl p-4 h-full flex flex-col">
      <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 px-2">Live Activity</h3>
      <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar pr-2">
        {activities.map((activity) => (
          <div 
            key={activity.id} 
            className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs transition-all hover:bg-white/10 hover:border-brand-primary/30 cursor-pointer group"
            onClick={() => onActivityClick?.(activity)}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-brand-secondary group-hover:text-brand-primary transition-colors">{activity.user}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                  activity.action.includes("YES") ? "bg-brand-primary/20 text-brand-primary" : "bg-red-500/20 text-red-500"
                )}>
                  {activity.action}
                </span>
                {activity.verified && (
                  <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded border border-blue-500/30 font-bold">VERIFIED</span>
                )}
              </div>
              <span className="text-gray-400 truncate max-w-[120px] group-hover:text-gray-300 transition-colors">{activity.market}</span>
            </div>
            <div className="text-right">
              <div className="font-bold group-hover:text-brand-primary transition-colors">${activity.amount}</div>
              <div className="text-[10px] text-gray-500">{activity.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
