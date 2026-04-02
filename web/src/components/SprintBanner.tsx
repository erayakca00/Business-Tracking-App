import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Clock, ChevronRight } from 'lucide-react';
import api from '../services/api';

interface SprintBannerProps {
    groupId: string;
}

export default function SprintBanner({ groupId }: SprintBannerProps) {
    const [activeSprint, setActiveSprint] = useState<any>(null);

    useEffect(() => {
        api.get(`/groups/${groupId}/sprints`).then(res => {
            const active = res.data.find((s: any) => s.status === 'active');
            setActiveSprint(active || null);
        }).catch(() => {});
    }, [groupId]);

    if (!activeSprint) return null;

    const totalTasks = activeSprint.tasks?.length || 0;
    const doneTasks = activeSprint.tasks?.filter((t: any) => t.status === 'done').length || 0;
    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const daysRemaining = activeSprint.endDate
        ? Math.ceil((new Date(activeSprint.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <Link
            to={`/groups/${groupId}/sprints`}
            className="flex items-center gap-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2.5 hover:from-indigo-700 hover:to-violet-700 transition-all group"
        >
            <Zap size={15} className="shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">Active Sprint</span>
                    <span className="font-semibold text-sm">{activeSprint.name}</span>
                    {activeSprint.goal && (
                        <span className="text-xs opacity-75 truncate hidden sm:block">— {activeSprint.goal}</span>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <div className="w-32 bg-white/20 rounded-full h-1.5">
                        <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs opacity-90">{doneTasks}/{totalTasks} done</span>
                    {daysRemaining !== null && (
                        <span className={`flex items-center gap-1 text-xs font-medium ${daysRemaining < 0 ? 'text-red-300' : daysRemaining <= 3 ? 'text-yellow-300' : 'text-white/80'}`}>
                            <Clock size={11} />
                            {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`}
                        </span>
                    )}
                </div>
            </div>
            <ChevronRight size={16} className="opacity-60 group-hover:opacity-100 shrink-0" />
        </Link>
    );
}
