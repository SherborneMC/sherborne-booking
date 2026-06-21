const BLOCKING=new Set(['busy','oof','workingElsewhere','unknown'])

async function token(env){
 const body=new URLSearchParams({
  client_id:env.CLIENT_ID,
  client_secret:env.CLIENT_SECRET,
  scope:'https://graph.microsoft.com/.default',
  grant_type:'client_credentials'
 })

 const r=await fetch(`https://login.microsoftonline.com/${env.TENANT_ID}/oauth2/v2.0/token`,{method:'POST',body})
 return (await r.json()).access_token
}

async function graph(env,path,method='GET',body=null){
 const t=await token(env)
 const r=await fetch('https://graph.microsoft.com/v1.0'+path,{
  method,
  headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},
  body:body?JSON.stringify(body):null
 })
 return r.json()
}

function overlap(a,b){ return a.start<b.end && a.end>b.start }

export async function buildGrid(env,owner){
 const now=new Date()
 const end=new Date(now.getTime()+28*86400000)

 const data=await graph(env,
  `/users/${owner}/calendarView?startDateTime=${now.toISOString()}&endDateTime=${end.toISOString()}`
 )

 const events=data.value||[]
 const cells=[]

 for(let d=0;d<28;d++){
  const day=new Date(now.getTime()+d*86400000)
  if([0,6].includes(day.getDay())) continue

  for(let h=8;h<=20;h++){
   for(let m of [0,30]){

    const s=new Date(day); s.setHours(h,m,0,0)
    const e=new Date(s.getTime()+1800000)

    const blocked=events.some(ev=>{
     const es=new Date(ev.start.dateTime)
     const ee=new Date(ev.end.dateTime)
     return overlap({start:es,end:ee},{start:s,end:e}) && BLOCKING.has(ev.showAs)
    })

    const mins=h*60+m
    const intro=(mins<720)||(mins>=990&&mins<1050)
    const notice=s>new Date(now.getTime()+4*3600000)

    cells.push({
     id:s.toISOString(),
     startUtc:s.toISOString(),
     bookable:intro && notice && !blocked
    })
   }
  }
 }

 return {cells}
}

export async function createEvent(env,owner,slot,internal,name){
 const start=new Date(slot)
 const end=new Date(start.getTime()+(internal?2:30)*60000)

 await graph(env,`/users/${owner}/events`,'POST',{
  subject:internal?'Reminder':'Consultation request',
  start:{dateTime:start.toISOString(),timeZone:'UTC'},
  end:{dateTime:end.toISOString(),timeZone:'UTC'},
  showAs:internal?'free':'tentative'
 })
}

export async function sendEmails(env,owner,data){
 await graph(env,`/users/${owner}/sendMail`,'POST',{
  message:{
   subject:'New booking request',
   body:{contentType:'Text',content:JSON.stringify(data)}
   ,toRecipients:[{emailAddress:{address:owner}}]
  }
 })

 if(data.email){
  await graph(env,`/users/${owner}/sendMail`,'POST',{
   message:{
    subject:'Your request',
    body:{
     contentType:'Text',
     content:`Your request is received. Please hold time: ${data.slotId}`
    },
    toRecipients:[{emailAddress:{address:data.email}}]
   }
  })
 }
}
