export const pad = n => String(n).padStart(2, '0');
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDay = s => { const [y,m,d] = (s || dateKey()).split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const prettyDate = s => parseDay(s).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
export const fullDate = s => parseDay(s).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
export const isSameDay = (a,b) => dateKey(a) === dateKey(b);
export const inRange = (s,a,b) => s >= a && s <= b;

export function occursOn(task, date) {
  if (!task || !date || date < task.date) return false;
  const r = task.repeat || 'none';
  if (r === 'none') return task.date === date;
  if (task.endDate && date > task.endDate) return false;
  const start = parseDay(task.date), day = parseDay(date);
  if (r === 'daily') return true;
  if (r === 'weekly') return (task.weekdays?.length ? task.weekdays : [start.getDay()]).includes(day.getDay());
  if (r === 'monthly') return day.getDate() === start.getDate();
  if (r === 'yearly') return day.getDate() === start.getDate() && day.getMonth() === start.getMonth();
  return false;
}
export const isDone = (task, day, uid) => (task.completedDates?.[day] || []).includes(uid);
export const isFullyDone = (task, day) => (task.participantIds || [task.ownerId]).every(id => isDone(task, day, id));
export function datesBetween(start, end) {
  const out = [];
  for (let d = parseDay(start), n=0; dateKey(d) <= end && n<400; d=addDays(d,1),n++) out.push(dateKey(d));
  return out;
}
export function nextOccurrence(t, from=dateKey(), days=90) {
  for(let i=0;i<days;i++) { const d=dateKey(addDays(parseDay(from),i)); if(occursOn(t,d)) return d; }
  return null;
}
export function dueSummary(tasks, today=dateKey()) {
  const todayTasks=tasks.filter(t=>occursOn(t,today));
  return {today:todayTasks, done:todayTasks.filter(t=>isFullyDone(t,today)).length, overdue:tasks.filter(t=>t.repeat==='none'&&t.date<today&&!isFullyDone(t,t.date))};
}
