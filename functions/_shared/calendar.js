export const BUSINESS_TIME_ZONE = 'Europe/London';
export const OWNER_DEFAULT = 'michael@sherbornecmc.com';
export const SLOT_MINUTES = 30;
export const WEEKS_TO_SHOW = 4;

export const INTRO_WINDOWS = [
  { start: '08:00', end: '12:00' },
  { start: '16:30', end: '17:30' }
];

export const BLOCKING_SHOW_AS = new Set(['busy', 'oof', 'workingElsewhere', 'unknown']);

export const CLIENT_MODES = {
  new: {
    clientType: 'new',
    label: 'NEW CLIENTS',
    pageTitle: 'Introductory consultations',
    requestNoun: 'introductory consultation',
    requestButtonLabel: 'Request consultation',
    selectedPanelTitle: 'Booking request',
    alternativePanelTitle: 'Alternative times',
    subjectPrefix: 'Introductory consultation request',
    holdTitlePrefix: 'Awaiting confirmation — introductory consultation request',
    icsTitle: 'Awaiting confirmation - Sherborne introductory consultation',
    alternativeSubject: 'Request for alternative time slot - introductory consultation',
    durationMinutes: 30,
    requiredFreeCells: 1,
    applyIntroWindows: true,
    policyNote: ''
  },
  existing: {
    clientType: 'existing',
    label: 'EXISTING CLIENTS',
    pageTitle: 'Session selection',
    requestNoun: 'session',
    requestButtonLabel: 'Request session',
    selectedPanelTitle: 'Session request',
    alternativePanelTitle: 'Alternative times',
    subjectPrefix: 'Session request',
    holdTitlePrefix: 'Awaiting confirmation — session request',
    icsTitle: 'Awaiting confirmation - Sherborne session',
    alternativeSubject: 'Request for alternative time slot',
    durationMinutes: 60,
    requiredFreeCells: 2,
    applyIntroWindows: false,
    policyNote: 'Please note that sessions changed or cancelled within 48 hours of the scheduled time remain chargeable.'
  }
};

export function normaliseClientType(value){
  return String(value || '').toLowerCase() === 'existing' ? 'existing' : 'new';
}

export function modeConfig(value){
  return CLIENT_MODES[normaliseClientType(value)];
}

export function owner(env){ return env.OWNER_EMAIL || OWNER_DEFAULT; }
export function liveReady(env){ return Boolean(env.MS_TENANT_ID && env.MS_CLIENT_ID && env.MS_CLIENT_SECRET && owner(env)); }
export function json(body,status=200){ return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}}); }
export function escapeHtml(s){ return String(s || '').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])); }
export function validEmail(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'').trim()); }
export function connectionDiagnostics(env){ return { hasMsTenantId:Boolean(env.MS_TENANT_ID), hasMsClientId:Boolean(env.MS_CLIENT_ID), hasMsClientSecret:Boolean(env.MS_CLIENT_SECRET), hasOwnerEmail:Boolean(owner(env)), owner:owner(env), liveReady:liveReady(env) }; }

function pad(n){ return String(n).padStart(2,'0'); }

export function londonParts(date){
  const parts = new Intl.DateTimeFormat('en-GB',{timeZone: BUSINESS_TIME_ZONE, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false}).formatToParts(date).reduce((a,p)=>{ if(p.type!=='literal') a[p.type]=p.value; return a; },{});
  return { year:+parts.year, month:+parts.month, day:+parts.day, hour:+parts.hour, minute:+parts.minute, second:+parts.second };
}

function addDaysLocal(y,m,d,n){ const dt = new Date(Date.UTC(y,m-1,d+n,12,0,0)); return londonParts(dt); }

function startOfLondonWeek(date){
  const p = londonParts(date);
  const noon = new Date(Date.UTC(p.year,p.month-1,p.day,12,0,0));
  const dow = new Intl.DateTimeFormat('en-GB',{timeZone:BUSINESS_TIME_ZONE,weekday:'short'}).format(noon);
  const idx = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(dow);
  return addDaysLocal(p.year,p.month,p.day,-idx);
}

function londonWallTimeToUtc(dateKey,time){
  const [y,m,d] = dateKey.split('-').map(Number);
  const [hh,mm] = time.split(':').map(Number);
  let guess = new Date(Date.UTC(y,m-1,d,hh,mm,0,0));
  for(let i=0;i<3;i++){
    const p = londonParts(guess);
    const asIfUtc = Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second||0,0);
    const target = Date.UTC(y,m-1,d,hh,mm,0,0);
    const diff = asIfUtc - target;
    if(diff===0) break;
    guess = new Date(guess.getTime() - diff);
  }
  return guess;
}

function minutesOf(time){ const [h,m]=time.split(':').map(Number); return h*60+m; }
function addMinutesTime(time,mins){ const total=minutesOf(time)+mins; return `${pad(Math.floor(total/60))}:${pad(total%60)}`; }
function inIntroWindow(time){ const m=minutesOf(time); return INTRO_WINDOWS.some(w=>m>=minutesOf(w.start) && m<minutesOf(w.end)); }
function overlap(aStart,aEnd,bStart,bEnd){ return aStart < bEnd && aEnd > bStart; }
function makeSlotId(dateKey,time,durationMinutes){ return `${dateKey}T${time}-${durationMinutes}`; }

function parseGraphDateTime(value, timeZone){
  if(!value) return null;
  const s=String(value);
  if(/[zZ]$|[+-]\d\d:\d\d$/.test(s)) return new Date(s);
  if(!timeZone || String(timeZone).toUpperCase()==='UTC') return new Date(s+'Z');
  return new Date(s+'Z');
}

function eventTimes(ev){ return {start: parseGraphDateTime(ev.start?.dateTime, ev.start?.timeZone), end: parseGraphDateTime(ev.end?.dateTime, ev.end?.timeZone)}; }

export function buildBaseGrid(now=new Date()){
  const start = startOfLondonWeek(now);
  const min = new Date(now.getTime()+4*60*60*1000);
  const cells=[];
  for(let w=0; w<WEEKS_TO_SHOW; w++){
    for(let i=0; i<5; i++){
      const p = addDaysLocal(start.year,start.month,start.day,w*7+i);
      const dateKey = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
      for(let m=8*60; m<20*60; m+=SLOT_MINUTES){
        const time = `${pad(Math.floor(m/60))}:${pad(m%60)}`;
        const endTime = addMinutesTime(time,SLOT_MINUTES);
        const startUtc = londonWallTimeToUtc(dateKey,time);
        const endUtc = londonWallTimeToUtc(dateKey,endTime);
        const reasons=[];
        const withinIntro = inIntroWindow(time);
        const noticeOk = startUtc > min;
        if(!noticeOk) reasons.push('minimum_notice');
        cells.push({
          baseId: `${dateKey}T${time}`,
          id: makeSlotId(dateKey,time,SLOT_MINUTES),
          londonDate: dateKey,
          londonTime: time,
          startUtc:startUtc.toISOString(),
          endUtc:endUtc.toISOString(),
          durationMinutes:SLOT_MINUTES,
          withinIntro,
          noticeOk,
          blockers:[],
          reasons,
          calendarFree:false,
          bookable:false,
          showInGrid:true
        });
      }
    }
  }
  return cells;
}

export function applyEvents(cells,events=[]){
  for(const ev of events){
    const showAs = String(ev.showAs || 'busy').trim();
    if(!BLOCKING_SHOW_AS.has(showAs)) continue;
    const {start,end}=eventTimes(ev);
    if(!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    for(const cell of cells){
      const cs=new Date(cell.startUtc), ce=new Date(cell.endUtc);
      if(overlap(cs,ce,start,end)){
        cell.blockers.push({showAs, subject: ev.subject || ''});
        if(!cell.reasons.includes('outlook_blocker')) cell.reasons.push('outlook_blocker');
      }
    }
  }
  for(const cell of cells){
    cell.calendarFree = cell.noticeOk && cell.blockers.length===0;
  }
  return cells;
}

export function applyModeRules(baseCells,clientType='new'){
  const type = normaliseClientType(clientType);
  const config = modeConfig(type);
  const byBaseId = new Map(baseCells.map(c=>[c.baseId,c]));
  const output=[];

  for(const cell of baseCells){
    const out = {...cell, clientType:type, durationMinutes:config.durationMinutes, id:makeSlotId(cell.londonDate,cell.londonTime,config.durationMinutes)};
    out.showInGrid = config.applyIntroWindows ? cell.withinIntro : true;

    if(type === 'new'){
      out.bookable = cell.calendarFree && cell.withinIntro;
      if(cell.calendarFree && !cell.withinIntro && !out.reasons.includes('outside_intro_window')) out.reasons=[...out.reasons,'outside_intro_window'];
    }else{
      const nextTime = addMinutesTime(cell.londonTime,SLOT_MINUTES);
      const next = byBaseId.get(`${cell.londonDate}T${nextTime}`);
      out.endUtc = next ? next.endUtc : new Date(new Date(cell.startUtc).getTime()+config.durationMinutes*60*1000).toISOString();
      out.bookable = cell.calendarFree && Boolean(next) && next.londonDate===cell.londonDate && next.calendarFree;
      if(!next && !out.reasons.includes('outside_working_day')) out.reasons=[...out.reasons,'outside_working_day'];
      if(next && !next.calendarFree){
        const nextReasons = next.reasons || [];
        for(const r of nextReasons) if(!out.reasons.includes(`next_${r}`)) out.reasons=[...out.reasons,`next_${r}`];
        if(next.blockers?.length && !out.reasons.includes('next_outlook_blocker')) out.reasons=[...out.reasons,'next_outlook_blocker'];
      }
    }
    output.push(out);
  }
  return output;
}

async function token(env){
  const body=new URLSearchParams({client_id:env.MS_CLIENT_ID,client_secret:env.MS_CLIENT_SECRET,scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'});
  const r=await fetch(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`,{method:'POST',body});
  if(!r.ok) throw new Error('Calendar connection failed: token');
  return (await r.json()).access_token;
}

export async function graph(env,path,method='GET',body=null){
  const t=await token(env);
  const r=await fetch(`https://graph.microsoft.com/v1.0${path}`,{method,headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json',Prefer:'outlook.timezone="UTC"'},body:body?JSON.stringify(body):undefined});
  if(!r.ok) throw new Error(await r.text());
  const ct = r.headers.get('content-type') || '';
  if (r.status === 202 || r.status === 204 || !ct.includes('application/json')) return {};
  return r.json();
}

async function fetchEvents(env,rangeStartUtc,rangeEndUtc){
  const email = owner(env);
  let events=[];
  let path=`/users/${encodeURIComponent(email)}/calendarView?startDateTime=${encodeURIComponent(rangeStartUtc.toISOString())}&endDateTime=${encodeURIComponent(rangeEndUtc.toISOString())}&$select=subject,start,end,showAs,isCancelled&$top=1000`;
  while(path){
    const data=await graph(env,path);
    events.push(...(data.value||[]).filter(e=>!e.isCancelled));
    path = data['@odata.nextLink'] ? data['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0','') : null;
  }
  return events;
}

export async function buildAvailability(env,clientType='new'){
  const type = normaliseClientType(clientType);
  const now=new Date();
  const baseCells=buildBaseGrid(now);
  if(!liveReady(env)){
    return { live:false, clientType:type, pulledAt:now.toISOString(), cells:applyModeRules(baseCells,type) };
  }
  const rangeStart=new Date(baseCells[0].startUtc);
  const rangeEnd=new Date(baseCells[baseCells.length-1].endUtc);
  const events=await fetchEvents(env,rangeStart,rangeEnd);
  applyEvents(baseCells,events);
  return { live:true, clientType:type, pulledAt:now.toISOString(), cells:applyModeRules(baseCells,type) };
}
