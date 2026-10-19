import {randomUUID} from 'node:crypto';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient,GetCommand,PutCommand,QueryCommand,DeleteCommand,BatchGetCommand,TransactWriteCommand} from '@aws-sdk/lib-dynamodb';

const db=DynamoDBDocumentClient.from(new DynamoDBClient({}),{marshallOptions:{removeUndefinedValues:true}});
const TableName=process.env.ORBIT_TABLE;
const defaultCategories=[
 {id:'academics',name:'Academics',icon:'GraduationCap',color:'#7968EE'},
 {id:'routine',name:'Daily routine',icon:'Sun',color:'#FFA74D'},
 {id:'projects',name:'Projects',icon:'Layers3',color:'#4698F0'},
 {id:'research',name:'Research',icon:'FlaskConical',color:'#28BAAA'},
 {id:'hobbies',name:'Hobbies',icon:'Palette',color:'#B179DF'},
 {id:'fun',name:'Fun & leisure',icon:'Clapperboard',color:'#F375A7'},
 {id:'misc',name:'Miscellaneous',icon:'Sparkles',color:'#8596B8'}
];
const key=(pk,sk)=>({pk,sk});
const userPK=uid=>`USER#${uid}`;
const fail=(code,msg)=>{const e=new Error(msg);e.statusCode=code;throw e;};
const good=(data,code=200)=>({statusCode:code,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
const errInfo=e=>{if(e?.name==='ConditionalCheckFailedException'||e?.name==='TransactionCanceledException')return {statusCode:409,message:'This item changed or is already present. Refresh and try again.'};return {statusCode:e?.statusCode||500,message:e?.statusCode?e.message:'A server error occurred. Please try again.'};};
const text=(value,max=200)=>typeof value==='string'?value.trim().slice(0,max):'';
const validId=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(s);
const validDate=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const dt=new Date(`${s}T12:00:00Z`);return Number.isFinite(dt.getTime())&&dt.toISOString().slice(0,10)===s;};
const isoDate=s=>new Date(`${s}T12:00:00Z`);
const isOccurrence=(t,day)=>{
 if(!validDate(day)||day<t.date||(t.endDate&&day>t.endDate))return false;
 if(t.repeat==='none')return day===t.date;
 if(t.repeat==='daily')return true;
 if(t.repeat==='weekly')return (t.weekdays?.length?t.weekdays:[isoDate(t.date).getUTCDay()]).includes(isoDate(day).getUTCDay());
 if(t.repeat==='monthly')return day.slice(8)===t.date.slice(8);
 if(t.repeat==='yearly')return day.slice(5)===t.date.slice(5);
 return false;
};
const get=async(pk,sk)=> (await db.send(new GetCommand({TableName,Key:key(pk,sk),ConsistentRead:true}))).Item;
const put=async Item=>db.send(new PutCommand({TableName,Item}));
const del=async(pk,sk)=>db.send(new DeleteCommand({TableName,Key:key(pk,sk)}));
async function query(pk,prefix){
 let last,all=[],pages=0;
 do{const r=await db.send(new QueryCommand({TableName,KeyConditionExpression:prefix?'pk = :pk AND begins_with(sk, :sk)':'pk = :pk',ExpressionAttributeValues:prefix?{':pk':pk,':sk':prefix}:{':pk':pk},ExclusiveStartKey:last}));all.push(...(r.Items||[]));last=r.LastEvaluatedKey;pages++;if(all.length>1500)fail(413,'Workspace is too large for this starter.');}while(last&&pages<20);
 if(last)fail(413,'Workspace exceeds the starter limit.');
 return all;
}
async function batchGetTasks(ids){
 const uniq=[...new Set(ids)].filter(validId),out=[];
 for(let i=0;i<uniq.length;i+=100){let keys=uniq.slice(i,i+100).map(id=>key(`TASK#${id}`,'META'));
  for(let attempts=0;keys.length&&attempts<5;attempts++){
   const res=await db.send(new BatchGetCommand({RequestItems:{[TableName]:{Keys:keys}}}));out.push(...(res.Responses?.[TableName]||[]));keys=res.UnprocessedKeys?.[TableName]?.Keys||[];
   if(keys.length)await new Promise(r=>setTimeout(r,30*(attempts+1)));
  }
 }
 return out;
}
function validateTask(input){
 if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'Invalid task payload.');
 const title=text(input.title,161),description=text(input.description,3001),categoryId=input.categoryId, date=input.date;
 if(!title||title.length>160||description.length>3000)fail(400,'Title or description length is invalid.');
 if(!validId(categoryId)||!validDate(date))fail(400,'Select a valid category and date.');
 const repeat=['none','daily','weekly','monthly','yearly'].includes(input.repeat)?input.repeat:'none';
 const endDate=input.endDate||'';
 if(endDate&&(!validDate(endDate)||endDate<date))fail(400,'Invalid recurrence end date.');
 const weekdays=Array.isArray(input.weekdays)?[...new Set(input.weekdays)].filter(n=>Number.isInteger(n)&&n>=0&&n<=6):[];
 const priority=['low','medium','high'].includes(input.priority)?input.priority:'medium';
 const kind=['task','birthday'].includes(input.kind)?input.kind:'task';
 return {title,description,categoryId,date,repeat,endDate,weekdays,priority,kind};
}
async function ensureCategory(uid,id){if(!await get(userPK(uid),`CATEGORY#${id}`))fail(400,'Choose one of your own categories.');}
async function profile(uid){const p=await get(userPK(uid),'PROFILE');if(!p)fail(403,'Set up your profile first.');return p;}
async function bootstrap(uid,claims){
 const email=text(claims.email||'',250).toLowerCase();const name=text(claims.name||email.split('@')[0],60)||'Member';
 if(!email||claims.email_verified!==true&&claims.email_verified!=='true')fail(403,'Please verify your email first.');
 const prev=await get(userPK(uid),'PROFILE');if(prev)return {ok:true};
 const actions=[{Put:{TableName,Item:{...key(userPK(uid),'PROFILE'),userId:uid,email,name},ConditionExpression:'attribute_not_exists(pk)'}},{Put:{TableName,Item:{...key(`EMAIL#${email}`,'LOOKUP'),userId:uid},ConditionExpression:'attribute_not_exists(pk)'}}];
 for(const cat of defaultCategories)actions.push({Put:{TableName,Item:{...key(userPK(uid),`CATEGORY#${cat.id}`),...cat}}});
 try{await db.send(new TransactWriteCommand({TransactItems:actions}));}catch(e){if(await get(userPK(uid),'PROFILE'))return {ok:true};throw e;}
 return {ok:true};
}
async function sync(uid){await profile(uid);const items=await query(userPK(uid)),categories=[],friends=[],requests=[],ids=[];
 for(const x of items){if(x.sk.startsWith('CATEGORY#'))categories.push({id:x.id,name:x.name,color:x.color,icon:x.icon});else if(x.sk.startsWith('FRIEND#'))friends.push({userId:x.userId,name:x.name,email:x.email});else if(x.sk.startsWith('REQ#'))requests.push({userId:x.userId,name:x.name,email:x.email});else if(x.sk.startsWith('TASK#'))ids.push(x.taskId);}
 const tasks=(await batchGetTasks(ids)).filter(t=>Array.isArray(t.participantIds)&&t.participantIds.includes(uid));
 return {tasks:tasks.map(({pk,sk,...rest})=>rest).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),categories,friends,requests};
}
async function saveCategory(uid,body){
 const id=body?.id,name=text(body?.name,33),icon=text(body?.icon,40),color=text(body?.color,7);
 if(!validId(id)||!name||name.length>32||!/^#[0-9a-f]{6}$/i.test(color)||!/^[A-Za-z0-9]{1,40}$/.test(icon))fail(400,'Invalid category.');
 const catItems=await query(userPK(uid),'CATEGORY#');if(catItems.length>=25&&!catItems.some(c=>c.id===id))fail(400,'Maximum of 25 categories in this starter.');
 await put({...key(userPK(uid),`CATEGORY#${id}`),id,name,icon,color});return {ok:true};
}
async function deleteCategory(uid,id){
 if(!validId(id))fail(400,'Invalid category.');
 const items=await query(userPK(uid),'TASK#'),tasks=await batchGetTasks(items.map(i=>i.taskId));if(tasks.some(t=>t.categoryId===id))fail(400,'Move or remove tasks in this category first.');
 await del(userPK(uid),`CATEGORY#${id}`);return {ok:true};
}
async function friendsOnly(uid,ids){
 if(ids.length>7)fail(400,'A shared task supports up to eight people including you.');
 for(const other of ids)if(!validId(other)||!await get(userPK(uid),`FRIEND#${other}`))fail(403,'You can only add confirmed friends.');
}
async function createTask(uid,body){
 const props=validateTask(body);await ensureCategory(uid,props.categoryId);
 const extra=Array.isArray(body?.participantIds)?[...new Set(body.participantIds.filter(x=>x!==uid))]:[];
 await friendsOnly(uid,extra);
 const id=randomUUID(),now=new Date().toISOString(),participants=[uid,...extra];
 const task={...key(`TASK#${id}`,'META'),id,...props,ownerId:uid,participantIds:participants,completedDates:{},createdAt:now,updatedAt:now,version:1};
 const operations=[{Put:{TableName,Item:task,ConditionExpression:'attribute_not_exists(pk)'}},...participants.map(userId=>({Put:{TableName,Item:{...key(userPK(userId),`TASK#${id}`),taskId:id}}}))];
 await db.send(new TransactWriteCommand({TransactItems:operations}));return {task:{...props,id,ownerId:uid,participantIds:participants,completedDates:{},createdAt:now,updatedAt:now,version:1}};
}
async function authorizedTask(uid,id){if(!validId(id))fail(400,'Invalid task identifier.');const t=await get(`TASK#${id}`,'META');if(!t)fail(404,'Task not found.');if(!t.participantIds?.includes(uid))fail(403,'You cannot access this task.');return t;}
async function writeVersioned(task,changed){
 await db.send(new PutCommand({TableName,Item:{...task,...changed,version:task.version+1,updatedAt:new Date().toISOString()},ConditionExpression:'#v = :v',ExpressionAttributeNames:{'#v':'version'},ExpressionAttributeValues:{':v':task.version}}));
}
async function editTask(uid,id,body){const t=await authorizedTask(uid,id);if(t.ownerId!==uid)fail(403,'Only the task creator can edit task details.');
 const props=validateTask(body);await ensureCategory(uid,props.categoryId);await writeVersioned(t,props);return {ok:true};}
async function deleteTask(uid,id){const t=await authorizedTask(uid,id);if(t.ownerId!==uid)fail(403,'Only the task creator can delete this shared task.');
 const operations=[{Delete:{TableName,Key:key(`TASK#${id}`,'META'),ConditionExpression:'#v = :v',ExpressionAttributeNames:{'#v':'version'},ExpressionAttributeValues:{':v':t.version}}},...t.participantIds.map(p=>({Delete:{TableName,Key:key(userPK(p),`TASK#${id}`)}}))];
 await db.send(new TransactWriteCommand({TransactItems:operations}));return {ok:true};}
async function toggle(uid,id,body){
 const day=body?.date;if(!validDate(day))fail(400,'Invalid completion date.');
 for(let attempts=0;attempts<4;attempts++){
  const t=await authorizedTask(uid,id);if(!isOccurrence(t,day))fail(400,'This task is not scheduled for that day.');
  const completed={...(t.completedDates||{})};const people=new Set(completed[day]||[]);if(people.has(uid))people.delete(uid);else people.add(uid);
  if(people.size)completed[day]=[...people];else delete completed[day];
  // Prevent unlimited growth of a task record in this educational starter.
  if(Object.keys(completed).length>450)fail(400,'This recurring task has reached its history limit. Start a new task.');
  try{await writeVersioned(t,{completedDates:completed});return {ok:true};}catch(e){if(e.name!=='ConditionalCheckFailedException')throw e;}
 }
 fail(409,'This shared task was updated simultaneously. Please try again.');
}
async function invite(uid,body){const email=text(body?.email,250).toLowerCase(),sender=await profile(uid);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Enter a valid email address.');
 const lookup=await get(`EMAIL#${email}`,'LOOKUP');if(!lookup)fail(404,'This person has not created an Orbit account yet.');
 const target=lookup.userId;if(target===uid)fail(400,'You cannot invite yourself.');
 if(await get(userPK(uid),`FRIEND#${target}`))fail(409,'You are already friends.');
 if(await get(userPK(uid),`REQ#${target}`))fail(409,'This person has already sent you a request; accept it instead.');
 await db.send(new PutCommand({TableName,Item:{...key(userPK(target),`REQ#${uid}`),userId:uid,email:sender.email,name:sender.name,createdAt:new Date().toISOString()},ConditionExpression:'attribute_not_exists(pk)'}));
 return {ok:true};}
async function accept(uid,body){const senderId=body?.userId;if(!validId(senderId))fail(400,'Invalid request.');
 const request=await get(userPK(uid),`REQ#${senderId}`);if(!request)fail(404,'Friend request not found.');
 const self=await profile(uid),other=await profile(senderId);
 await db.send(new TransactWriteCommand({TransactItems:[
  {Put:{TableName,Item:{...key(userPK(uid),`FRIEND#${senderId}`),userId:senderId,name:other.name,email:other.email}}},
  {Put:{TableName,Item:{...key(userPK(senderId),`FRIEND#${uid}`),userId:uid,name:self.name,email:self.email}}},
  {Delete:{TableName,Key:key(userPK(uid),`REQ#${senderId}`),ConditionExpression:'attribute_exists(pk)'}}
 ]}));return {ok:true};}
async function decline(uid,body){if(!validId(body?.userId))fail(400,'Invalid request.');await del(userPK(uid),`REQ#${body.userId}`);return {ok:true};}
export async function handler(event){
 try{
  const claims=event.requestContext?.authorizer?.jwt?.claims;
  if(!claims?.sub)fail(401,'Authentication required.');
  const uid=claims.sub,method=event.requestContext?.http?.method||'GET',path=(event.rawPath||'/').replace(/\/$/,'')||'/';
  if(!TableName)fail(500,'Missing database configuration.');
  if((event.body||'').length>16000)fail(413,'Request body is too large.');
  let body={};try{body=event.body?JSON.parse(event.body):{};}catch{fail(400,'Invalid JSON.');}
  if(method==='POST'&&path==='/bootstrap')return good(await bootstrap(uid,claims));
  await profile(uid);
  if(method==='GET'&&path==='/sync')return good(await sync(uid));
  if(method==='PUT'&&path==='/categories')return good(await saveCategory(uid,body));
  if(method==='DELETE'&&path.startsWith('/categories/'))return good(await deleteCategory(uid,decodeURIComponent(path.split('/')[2])));
  if(method==='POST'&&path==='/tasks')return good(await createTask(uid,body),201);
  const togglePath=path.match(/^\/tasks\/([^/]+)\/toggle$/);
  if(method==='POST'&&togglePath)return good(await toggle(uid,decodeURIComponent(togglePath[1]),body));
  const taskPath=path.match(/^\/tasks\/([^/]+)$/);
  if(taskPath&&method==='PATCH')return good(await editTask(uid,decodeURIComponent(taskPath[1]),body));
  if(taskPath&&method==='DELETE')return good(await deleteTask(uid,decodeURIComponent(taskPath[1])));
  if(method==='POST'&&path==='/friends/requests')return good(await invite(uid,body),201);
  if(method==='POST'&&path==='/friends/accept')return good(await accept(uid,body));
  if(method==='POST'&&path==='/friends/decline')return good(await decline(uid,body));
  return good({error:'Unknown endpoint.'},404);
 }catch(e){const info=errInfo(e);if(info.statusCode>=500)console.error('Orbit API server error',e);return good({error:info.message},info.statusCode);}
}
