import {makeSeed} from './seed';
import {cloudEnabled,request} from './cloud';
const KEY='orbit-local-demo-v1';
const readDemo=()=>{try {const raw=localStorage.getItem(KEY);if(raw) return JSON.parse(raw);}catch{}return makeSeed();};
const persist=d=>localStorage.setItem(KEY,JSON.stringify(d));
export const localStore={
 async load(){return readDemo();},
 async addTask(data){const d=readDemo();const task={...data,id:crypto.randomUUID(),ownerId:'demo-user',participantIds:['demo-user'],completedDates:{},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};d.tasks.unshift(task);persist(d);return task;},
 async editTask(id,patch){const d=readDemo();d.tasks=d.tasks.map(t=>t.id===id?{...t,...patch,updatedAt:new Date().toISOString()}:t);persist(d);},
 async deleteTask(id){const d=readDemo();d.tasks=d.tasks.filter(t=>t.id!==id);persist(d);},
 async toggleTask(id,date,uid){const d=readDemo(), t=d.tasks.find(t=>t.id===id);if(!t)return;const set=new Set(t.completedDates?.[date]||[]);if(set.has(uid))set.delete(uid);else set.add(uid);t.completedDates={...t.completedDates,[date]:[...set]};t.updatedAt=new Date().toISOString();persist(d);},
 async saveCategory(category){const d=readDemo();d.categories=d.categories.filter(c=>c.id!==category.id);d.categories.push(category);persist(d);},
 async deleteCategory(id){const d=readDemo();if(d.tasks.some(t=>t.categoryId===id))throw Error('Move or delete tasks in this category first.');d.categories=d.categories.filter(c=>c.id!==id);persist(d);},
};
export const cloudStore={
 async load(){await request('/bootstrap','POST');return request('/sync');},
 addTask:data=>request('/tasks','POST',data),editTask:(id,patch)=>request(`/tasks/${encodeURIComponent(id)}`,'PATCH',patch),deleteTask:id=>request(`/tasks/${encodeURIComponent(id)}`,'DELETE'),
 toggleTask:(id,date)=>request(`/tasks/${encodeURIComponent(id)}/toggle`,'POST',{date}),
 saveCategory:category=>request('/categories','PUT',category),deleteCategory:id=>request(`/categories/${encodeURIComponent(id)}`,'DELETE'),
 sendRequest:email=>request('/friends/requests','POST',{email}),acceptRequest:userId=>request('/friends/accept','POST',{userId}),declineRequest:userId=>request('/friends/decline','POST',{userId}),
};
export const getStore=mode=>mode==='cloud'&&cloudEnabled?cloudStore:localStore;
