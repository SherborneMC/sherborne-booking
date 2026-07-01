export const BUSINESS_TIME_ZONE = 'Europe/London';
export const OWNER_DEFAULT = 'michael@sherbornecmc.com';
export const SLOT_MINUTES = 30;
export const WEEKS_TO_SHOW = 4;
export const INTRO_WINDOWS = [{start:'08:00',end:'12:00'},{start:'16:30',end:'17:30'}];
export const BLOCKING_SHOW_AS = new Set(['busy','oof','workingElsewhere','unknown']);
export const REQUEST_KINDS = {
  intro:{requestKind:'intro',label:'Introductory session',durationMinutes:30,subjectPrefix:'Introductory session request',holdTitlePrefix:'Awaiting confirmation — introductory session request',icsTitle:'Awaiting confirmation - Sherborne introductory session'},
  client30:{requestKind:'client30',label:'Client session',durationMinutes:30,subjectPrefix:'Client session request',holdTitlePrefix:'Awaiting confirmation — client session request',icsTitle:'Awaiting confirmation - Sherborne client session'},
  client60:{requestKind:'client60',label:'Client session',durationMinutes:60,subjectPrefix:'Client session request',holdTitlePrefix:'Awaiting confirmation — client session request',icsTitle:'Awaiting confirmation - Sherborne client session'}
};
export function normaliseRequestKind(v){v=String(v||'');return REQUEST_KINDS[v]?v:''}
export function requestKindConfig(v){return REQUEST_KINDS[normaliseRequestKind(v)]||null}
export function owner(env){return env.OWNER_EMAIL||OWNER_DEFAULT}
export function liveReady(env){return Boolean(env.MS_TENANT_ID&&env.MS_CLIENT_ID&&env.MS_CLIENT_SECRET&&owner(env))}
export function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
export function escapeHtml(s){return String(s||'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]))}
export function validEmail(s){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'').trim())}

export function safeTimeZone(tz){
  const fallback = BUSINESS_TIME_ZONE;
  const value = String(tz||'').trim();
  if(!value)return fallback;
  try{
    new Intl.DateTimeFormat('en-GB',{timeZone:value}).format(new Date());
    return value;
  }catch{
    return fallback;
  }
}
export function connectionDiagnostics(env){return {hasMsTenantId:Boolean(env.MS_TENANT_ID),hasMsClientId:Boolean(env.MS_CLIENT_ID),hasMsClientSecret:Boolean(env.MS_CLIENT_SECRET),hasOwnerEmail:Boolean(owner(env)),owner:owner(env),liveReady:liveReady(env)}}
function pad(n){return String(n).padStart(2,'0')}
export function londonParts(date){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:BUSINESS_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(date).reduce((a,p)=>{if(p.type!=='literal')a[p.type]=p.value;return a},{});return {year:+parts.year,month:+parts.month,day:+parts.day,hour:+parts.hour,minute:+parts.minute,second:+parts.second}}
function addDaysLocal(y,m,d,n){return londonParts(new Date(Date.UTC(y,m-1,d+n,12,0,0)))}
function startOfLondonWeek(date){const p=londonParts(date), noon=new Date(Date.UTC(p.year,p.month-1,p.day,12,0,0)), dow=new Intl.DateTimeFormat('en-GB',{timeZone:BUSINESS_TIME_ZONE,weekday:'short'}).format(noon), idx=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(dow);return addDaysLocal(p.year,p.month,p.day,-idx)}
function londonWallTimeToUtc(dateKey,time){const [y,m,d]=dateKey.split('-').map(Number),[hh,mm]=time.split(':').map(Number);let guess=new Date(Date.UTC(y,m-1,d,hh,mm,0,0));for(let i=0;i<3;i++){const p=londonParts(guess), asIfUtc=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second||0,0), target=Date.UTC(y,m-1,d,hh,mm,0,0), diff=asIfUtc-target;if(diff===0)break;guess=new Date(guess.getTime()-diff)}return guess}
function minutesOf(t){const [h,m]=t.split(':').map(Number);return h*60+m}
function addMinutesTime(t,mins){const total=minutesOf(t)+mins;return `${pad(Math.floor(total/60))}:${pad(total%60)}`}
function inIntroWindow(t){const m=minutesOf(t);return INTRO_WINDOWS.some(w=>m>=minutesOf(w.start)&&m<minutesOf(w.end))}
function overlap(aStart,aEnd,bStart,bEnd){return aStart<bEnd&&aEnd>bStart}
function parseGraphDateTime(v,tz){if(!v)return null;const s=String(v);if(/[zZ]$|[+-]\d\d:\d\d$/.test(s))return new Date(s);if(!tz||String(tz).toUpperCase()==='UTC')return new Date(s+'Z');return new Date(s+'Z')}
function eventTimes(ev){return {start:parseGraphDateTime(ev.start?.dateTime,ev.start?.timeZone),end:parseGraphDateTime(ev.end?.dateTime,ev.end?.timeZone)}}
export function buildBaseGrid(now=new Date(),weeksToShow=WEEKS_TO_SHOW){const start=startOfLondonWeek(now), min=new Date(now.getTime()+4*60*60*1000), cells=[];for(let w=0;w<weeksToShow;w++){for(let i=0;i<5;i++){const p=addDaysLocal(start.year,start.month,start.day,w*7+i), dateKey=`${p.year}-${pad(p.month)}-${pad(p.day)}`;for(let m=8*60;m<20*60;m+=SLOT_MINUTES){const time=`${pad(Math.floor(m/60))}:${pad(m%60)}`, endTime=addMinutesTime(time,SLOT_MINUTES), startUtc=londonWallTimeToUtc(dateKey,time), endUtc=londonWallTimeToUtc(dateKey,endTime), noticeOk=startUtc>min, reasons=[];if(!noticeOk)reasons.push('minimum_notice');cells.push({id:`${dateKey}T${time}`,londonDate:dateKey,londonTime:time,startUtc:startUtc.toISOString(),endUtc:endUtc.toISOString(),withinIntro:inIntroWindow(time),noticeOk,blockers:[],reasons,calendarFree:false,introBookable:false,client30Bookable:false,client60Bookable:false,nextEndUtc:null})}}}return cells}
export function applyDerivedRules(cells){const byId=new Map(cells.map(c=>[c.id,c]));for(const cell of cells){cell.calendarFree=cell.noticeOk&&cell.blockers.length===0}for(const cell of cells){const next=byId.get(`${cell.londonDate}T${addMinutesTime(cell.londonTime,SLOT_MINUTES)}`);cell.introBookable=cell.calendarFree&&cell.withinIntro;cell.client30Bookable=cell.calendarFree;cell.client60Bookable=cell.calendarFree&&Boolean(next)&&next.londonDate===cell.londonDate&&next.calendarFree;cell.nextEndUtc=next?next.endUtc:null}return cells}
export function applyEvents(cells,events=[]){for(const ev of events){const showAs=String(ev.showAs||'busy').trim();if(!BLOCKING_SHOW_AS.has(showAs))continue;const {start,end}=eventTimes(ev);if(!start||!end||Number.isNaN(start.getTime())||Number.isNaN(end.getTime()))continue;for(const cell of cells){const cs=new Date(cell.startUtc),ce=new Date(cell.endUtc);if(overlap(cs,ce,start,end)){cell.blockers.push({showAs,subject:ev.subject||''});if(!cell.reasons.includes('outlook_blocker'))cell.reasons.push('outlook_blocker')}}}return applyDerivedRules(cells)}
export function slotForRequest(cells,slotId,requestKind){const kind=normaliseRequestKind(requestKind), cell=cells.find(c=>c.id===slotId);if(!cell)return null;if(kind==='intro'&&cell.introBookable)return {...cell,requestKind:kind,durationMinutes:30,effectiveEndUtc:cell.endUtc};if(kind==='client30'&&cell.client30Bookable)return {...cell,requestKind:kind,durationMinutes:30,effectiveEndUtc:cell.endUtc};if(kind==='client60'&&cell.client60Bookable)return {...cell,requestKind:kind,durationMinutes:60,effectiveEndUtc:cell.nextEndUtc};return null}
async function token(env){const body=new URLSearchParams({client_id:env.MS_CLIENT_ID,client_secret:env.MS_CLIENT_SECRET,scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'}), r=await fetch(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`,{method:'POST',body});if(!r.ok)throw new Error('Calendar connection failed: token');return (await r.json()).access_token}
export async function graph(env,path,method='GET',body=null){const t=await token(env), r=await fetch(`https://graph.microsoft.com/v1.0${path}`,{method,headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json',Prefer:'outlook.timezone="UTC"'},body:body?JSON.stringify(body):undefined});if(!r.ok)throw new Error(await r.text());const ct=r.headers.get('content-type')||'';if(r.status===202||r.status===204||!ct.includes('application/json'))return {};return r.json()}
async function fetchEvents(env,rangeStartUtc,rangeEndUtc){const email=owner(env);let events=[], path=`/users/${encodeURIComponent(email)}/calendarView?startDateTime=${encodeURIComponent(rangeStartUtc.toISOString())}&endDateTime=${encodeURIComponent(rangeEndUtc.toISOString())}&$select=subject,start,end,showAs,isCancelled&$top=1000`;while(path){const data=await graph(env,path);events.push(...(data.value||[]).filter(e=>!e.isCancelled));path=data['@odata.nextLink']?data['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0',''):null}return events}
export async function buildAvailability(env,scope='full'){const now=new Date(), weeksToShow=scope==='currentWeek'?1:WEEKS_TO_SHOW, cells=buildBaseGrid(now,weeksToShow);if(!liveReady(env))return {live:false,scope,pulledAt:now.toISOString(),cells:applyDerivedRules(cells)};const events=await fetchEvents(env,new Date(cells[0].startUtc),new Date(cells[cells.length-1].endUtc));applyEvents(cells,events);return {live:true,scope,pulledAt:now.toISOString(),cells}}
