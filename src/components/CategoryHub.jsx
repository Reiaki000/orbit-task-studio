import React, {useMemo, useState} from 'react';
import {ArrowUpRight, Plus, Sparkles} from 'lucide-react';
import {CategoryIcon} from './Icons';

// A true SVG pie: every slice represents that category's share of saved tasks.
// Empty categories remain available in the legend without distorting the data.
const polar = (cx, cy, r, angle) => {
  const radians = (angle - 90) * Math.PI / 180;
  return [cx + r * Math.cos(radians), cy + r * Math.sin(radians)];
};
function slicePath(start, end, radius = 115) {
  const [sx, sy] = polar(150, 150, radius, start);
  const [ex, ey] = polar(150, 150, radius, end);
  return `M 150 150 L ${sx} ${sy} A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1 ${ex} ${ey} Z`;
}

export default function CategoryHub({categories, tasks, onOpen, onAdd}) {
  const [hovered, setHovered] = useState(null);
  const counts = useMemo(() => categories.map(c => tasks.filter(t => t.categoryId === c.id).length), [categories, tasks]);
  const total = counts.reduce((a, b) => a + b, 0);
  const slices = useMemo(() => {
    // On an empty workspace, display equal slices as a navigation preview.
    const weights = total ? counts : categories.map(() => 1);
    const sum = weights.reduce((a, b) => a + b, 0);
    let angle = 0;
    return categories.map((category, i) => {
      const start = angle;
      const sweep = sum ? weights[i] / sum * 360 : 0;
      angle += sweep;
      return {...category, count:counts[i], start, end:angle, sweep};
    });
  }, [categories, counts, total]);
  const active = slices.find(c => c.id === hovered);
  const selectedColor = active?.color || '#8475f5';

  return <section className="card orbit-panel pie-panel" style={{'--pie-focus': selectedColor}}>
    <header className="section-head">
      <div>
        <div className="eyebrow">THE COLORS OF YOUR LIFE</div>
        <h2>All your worlds, in one place.</h2>
        <p>Hover to explore. Tap a color to enter its space.</p>
      </div>
      <button className="icon-button" title="Add category" aria-label="Add category" onClick={onAdd}><Plus size={19}/></button>
    </header>
    {categories.length > 0 ? <>
      <div className="pie-stage">
        <div className="ambient-ring ambient-ring-one" aria-hidden="true"/>
        <div className="ambient-ring ambient-ring-two" aria-hidden="true"/>
        <svg className="category-pie" viewBox="0 0 300 300" role="group" aria-label="Task distribution by category; select a slice to open its category">
          <defs>
            {slices.map((s,i) => <linearGradient id={`pie-color-${i}`} key={s.id} x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor={s.color} stopOpacity=".99"/>
              <stop offset="100%" stopColor={s.color} stopOpacity=".82"/>
            </linearGradient>)}
          </defs>
          <circle cx="150" cy="150" r="125" className="pie-backdrop"/>
          {slices.filter(s => s.sweep > 0).map(s => {
            const focused = hovered === s.id;
            // SVG cannot render a 360-degree arc in one A segment.
            const d = s.sweep > 359.999
              ? `${slicePath(0, 180)} ${slicePath(180, 360)}`
              : slicePath(s.start, s.end);
            const index = slices.findIndex(c => c.id === s.id);
            return <path
              key={s.id} d={d} fill={`url(#pie-color-${index})`}
              className={`pie-slice ${focused ? 'pie-slice-active' : ''}`}
              style={{'--slice-color':s.color}}
              stroke="var(--pie-divider)" strokeWidth="2"
              onMouseEnter={() => setHovered(s.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(s.id)}
              onBlur={() => setHovered(null)}
              onClick={() => onOpen(s.id)}
              onKeyDown={e => {if(e.key === 'Enter' || e.key === ' '){e.preventDefault();onOpen(s.id);}}}
              tabIndex={0} role="button"
              aria-label={`Open ${s.name}: ${s.count} ${s.count === 1 ? 'task' : 'tasks'}`}
            ><title>{`${s.name}: ${s.count} tasks (${total ? Math.round(s.count/total*100) : 0}%)`}</title></path>;
          })}
        </svg>
        <div className="pie-caption" aria-live="polite">
          <span className="pie-caption-dot" style={{backgroundColor:selectedColor}}/>
          {active ? <><strong>{active.name}</strong><span>{active.count} {active.count === 1 ? 'task' : 'tasks'} · {total ? Math.round(active.count / total * 100) : 0}%</span></> : <><strong>{total} tasks in your orbit</strong><span>{categories.length} colorful spaces</span></>}
        </div>
      </div>
      <div className="pie-legend">
        {slices.map(s => <button key={s.id} className={`pie-legend-item ${hovered === s.id ? 'is-active' : ''}`} onMouseEnter={() => setHovered(s.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(s.id)} onBlur={() => setHovered(null)} onClick={() => onOpen(s.id)} style={{'--category-color':s.color}} title={`Open ${s.name}`}>
          <span className="pie-legend-icon"><CategoryIcon name={s.icon} size={15}/></span>
          <span className="pie-legend-name">{s.name}</span>
          <span className="pie-legend-count">{s.count}</span>
          <ArrowUpRight size={13} className="pie-legend-arrow"/>
        </button>)}
      </div>
      <p className="pie-footnote"><Sparkles size={13}/> Each slice reflects how many tasks belong to that space. Choose any space to see its tasks.</p>
    </> : <div className="pie-empty">Your first category is one click away. <button className="inline-link" onClick={onAdd}>Create a space <ArrowUpRight size={14}/></button></div>}
  </section>;
}
