import { buildAvailability, escapeHtml, graph, json, liveReady, owner, validEmail, BUSINESS_TIME_ZONE } from '../_shared/calendar.js';
const CONTACT_URL = 'https://www.sherbornecmc.com/#contact';
function formatInZone(iso, timeZone){ return new Date(iso).toLocaleString('en-GB',{timeZone,weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}); }
function timeSummary(iso, clientTimeZone){ const sherborneTime=formatInZone(iso,BUSINESS_TIME_ZONE); if(clientTimeZone&&clientTimeZone!==BUSINESS_TIME_ZONE) return `${formatInZone(iso,clientTimeZone)} (Sherborne diary time: ${sherborneTime})`; return sherborneTime; }
function contactError(message,status=500,extra={}){ return json({ error:message, contactUrl:CONTACT_URL, ...extra }, status); }
function eventBodyForRequester(details){ return `
Thank you for your request. We will confirm shortly and have provided a provisional hold for your diary.

Requested time: ${escapeHtml(timeSummary(details.startUtc,details.clientTimeZone))}
`; }
async function sendMichaelEmail(env,details){
  const email=owner(env);
  const assistantLine=details.assistantEmail?`
Assistant copied on confirmation email: ${escapeHtml(details.assistantEmail)}
`:'';
  const content=`
New introductory consultation request received.

Requested time: ${escapeHtml(timeSummary(details.startUtc,details.clientTimeZone))}
${details.clientTimeZone&&details.clientTimeZone!==BUSINESS_TIME_ZONE?`Visitor timezone: ${escapeHtml(details.clientTimeZone)}\nSherborne diary timezone: ${escapeHtml(BUSINESS_TIME_ZONE)}\n`:''}
Name: ${escapeHtml(details.name)}
Email: ${escapeHtml(details.email)}
Phone: ${escapeHtml(details.phone)}
${assistantLine}
What would be helpful to explore?
${escapeHtml(details.message)}

Suggested confirmation wording:
We are pleased to confirm your requested introductory consultation. Sherborne looks forward to speaking with you.

The tentative diary hold has been created. Confirm manually in Outlook if you wish to proceed.
`;
  await graph(env,`/users/${encodeURIComponent(email)}/sendMail`,'POST',{message:{subject:'Booking request — introductory consultation',body:{contentType:'HTML',content},toRecipients:[{emailAddress:{address:email}}]},saveToSentItems:true});
}
async function sendClientConfirmationEmail(env,details){
  const cc=details.assistantEmail?[{emailAddress:{address:details.assistantEmail}}]:[];
  await graph(env,`/users/${encodeURIComponent(owner(env))}/sendMail`,'POST',{message:{subject:'Your request has been received',body:{contentType:'HTML',content:`<p>Thank you for your request.</p><p>We will confirm shortly and have provided a provisional hold for your diary.</p><p>Requested time: ${escapeHtml(timeSummary(details.startUtc,details.clientTimeZone))}</p>`},toRecipients:[{emailAddress:{address:details.email}}],ccRecipients:cc},saveToSentItems:true});
}
export async function onRequestPost({request,env}){
  let step='start'; let createdEventId=null;
  try{
    const body=await request.json(); const {slotId,name,email,phone,message,otherEmail,clientTimeZone}=body; const assistantEmail=String(otherEmail||'').trim();
    if(!slotId||!validEmail(email)||String(phone||'').trim().length<7||!String(message||'').trim()||!String(name||'').trim()) return json({error:'Please complete the required details and try again.'},400);
    if(assistantEmail&&!validEmail(assistantEmail)) return json({error:'Please check the assistant email address.'},400);
    if(!liveReady(env)) return contactError('The live diary connection is not available just now, so online booking is unavailable. Please contact Sherborne directly.',503);
    step='checking availability'; const result=await buildAvailability(env); if(!result.live) return contactError('The live diary connection is not available just now, so online booking is unavailable. Please contact Sherborne directly.',503);
    const slot=result.cells.find(c=>c.id===slotId); if(!slot||!slot.bookable) return json({error:'This time is no longer available. Please choose another time.'},409);
    const start=new Date(slot.startUtc), end=new Date(slot.endUtc); const visitorText=eventBodyForRequester({startUtc:slot.startUtc,clientTimeZone}); const attendees=[{emailAddress:{address:email,name:name||email},type:'required'}];
    step='creating calendar hold'; const event=await graph(env,`/users/${encodeURIComponent(owner(env))}/events`,'POST',{subject:`Awaiting confirmation — introductory consultation request — ${name} — ${email}`,body:{contentType:'HTML',content:`${visitorText}

Requester details:
Name: ${escapeHtml(name)}
Email: ${escapeHtml(email)}
Phone: ${escapeHtml(phone)}
${assistantEmail?`Assistant email for confirmation: ${escapeHtml(assistantEmail)}\n`:''}
What would be helpful to explore?
${escapeHtml(message)}
`},start:{dateTime:start.toISOString().replace(/\.\d{3}Z$/,''),timeZone:'UTC'},end:{dateTime:end.toISOString().replace(/\.\d{3}Z$/,''),timeZone:'UTC'},attendees,showAs:'tentative',isReminderOn:true,reminderMinutesBeforeStart:60}); createdEventId=event.id||null;
    step='notifying Sherborne'; await sendMichaelEmail(env,{startUtc:slot.startUtc,name,email,phone,message,assistantEmail,clientTimeZone});
    step='sending client confirmation'; await sendClientConfirmationEmail(env,{startUtc:slot.startUtc,email,assistantEmail,clientTimeZone});
    return json({ok:true,slotId,eventId:createdEventId});
  }catch(e){ console.log('Booking error',{endpoint:'/api/book',step,message:e.message,eventId:createdEventId}); if(step==='notifying Sherborne'&&createdEventId) return contactError('Your diary hold was created, but Sherborne could not be notified automatically. Please contact Sherborne directly so we can confirm your time.',502,{eventId:createdEventId}); return contactError('Sorry, we could not complete your request just now. Please try again, or contact Sherborne directly.',500); }
}
