import {addDays,dateKey} from './dates';
export const CATEGORY_PALETTE = ['#7C6CF4','#3D9DEB','#FFAC51','#23B8A7','#F26D9A','#AE78E8','#80BC51','#F4C152','#48B5D3','#F17C65','#687FD6','#CC77AF'];
export const DEFAULT_CATEGORIES = [
 {id:'academics',name:'Academics',icon:'GraduationCap',color:'#7968EE'},
 {id:'routine',name:'Daily routine',icon:'Sun',color:'#FFA74D'},
 {id:'projects',name:'Projects',icon:'Layers3',color:'#4698F0'},
 {id:'research',name:'Research',icon:'FlaskConical',color:'#28BAAA'},
 {id:'hobbies',name:'Hobbies',icon:'Palette',color:'#B179DF'},
 {id:'fun',name:'Fun & leisure',icon:'Clapperboard',color:'#F375A7'},
 {id:'misc',name:'Miscellaneous',icon:'Sparkles',color:'#8596B8'},
];
export function makeSeed(uid='demo-user') {
 const today = dateKey(), tomorrow=dateKey(addDays(new Date(),1));
 const t = (id,title,categoryId,date,extra={})=>({id,title,categoryId,date,description:'',priority:'medium',repeat:'none',endDate:'',weekdays:[],participantIds:[uid],ownerId:uid,completedDates:{},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),...extra});
 return {categories:DEFAULT_CATEGORIES.map(x=>({...x})),tasks:[
  t('sample-1','Review DSP lab concepts','academics',today,{priority:'high',description:'Revise signals, convolution and filter design.'}),
  t('sample-2','Work on SDR research simulation','research',today,{priority:'high',description:'Check notch filter and compare RX symbols.'}),
  t('sample-3','Plan next project milestone','projects',tomorrow),
  t('sample-4','Morning movement & stretching','routine',today,{repeat:'daily'}),
  t('sample-5','Read for 20 minutes','hobbies',today,{repeat:'daily',priority:'low'}),
  t('sample-6','Watch a film this weekend','fun',dateKey(addDays(new Date(),4)),{priority:'low'}),
  t('sample-7','Submit lab observation sheet','academics',dateKey(addDays(new Date(),3)),{priority:'high'}),
  t('sample-8','Check in with family','misc',today,{repeat:'weekly',weekdays:[0,2,5]}),
  t('sample-9','Sample birthday reminder','misc',dateKey(addDays(new Date(),12)),{repeat:'yearly',kind:'birthday',priority:'low'}),
  t('sample-10','Organize semester goals','academics',dateKey(addDays(new Date(),20)),{description:'Break down the goals into smaller milestones.',priority:'medium'}),
 ],friends:[],requests:[],profile:{userId:uid,name:'Your workspace',email:''}};
}
