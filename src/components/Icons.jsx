import {GraduationCap,Sun,Layers3,FlaskConical,Palette,Clapperboard,Sparkles,BookOpen,Heart,Briefcase,Music,Plane,Star,Target,Dumbbell,Coffee,Gift,CalendarDays,Brain,FolderKanban} from 'lucide-react';
export const ICONS={GraduationCap,Sun,Layers3,FlaskConical,Palette,Clapperboard,Sparkles,BookOpen,Heart,Briefcase,Music,Plane,Star,Target,Dumbbell,Coffee,Gift,CalendarDays,Brain,FolderKanban};
export function CategoryIcon({name='Sparkles',size=18,...props}) {const Icon=ICONS[name]||Sparkles;return <Icon size={size} strokeWidth={1.85} {...props}/>;}
