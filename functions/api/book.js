import { buildAvailability, escapeHtml, graph, json, liveReady, owner, validEmail, BUSINESS_TIME_ZONE } from '../_shared/calendar.js';
const CONTACT_URL='https://www.sherbornecmc.com/#contact';
function isExisting(t){ return t === 'existing'; }
function labels(clientType){
  return isExisting(clientType)
    ? { kind:'session', subjectPrefix:'Session request', hold:'Awaiting confirmation — session request', ics:'Awaiting confirmation - Sherborne session', charge:'Please note that sessions changed or cancelled within 48 hours of the scheduled time remain chargeable.' }
    : { kind:'introductory consultation', subjectPrefix:'Introductory consultation request', hold:'Awaiting confirmation — introductory consultation request', ics:'Awaiting confirmation - Sherborne introductory consultation', charge:'' };
}
function confirmationText(clientType){
  const l=labels(clientType);
  return `Thank you for your request, we will respond shortly.${l.charge?`\n\n${l.charge}`:''}\n\nBest wishes,\nYour Sherborne Team\n\nIf you need to cancel, please contact us.`;
}
function htmlLines(s){ return escapeHtml(s).replaceAll('\n','<br>'); }
function formatInZone(iso,timeZone){return new Date(iso).toLocaleString('en-GB',{timeZone,weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});}
function timeSummary(iso,clientTimeZone){const sherborneTime=formatInZone(iso,BUSINESS_TIME_ZONE);return clientTimeZone&&clientTimeZone!==BUSINESS_TIME_ZONE?`${formatInZone(iso,clientTimeZone)} (Sherborne diary time: ${sherborneTime})`:sherborneTime;}
function subjectFor(clientType,startUtc,clientTimeZone){return `${labels(clientType).subjectPrefix} - ${timeSummary(startUtc,clientTimeZone)}`;}
function contactError(message,status=500,extra={}){return json({error:message,contactUrl:CONTACT_URL,...extra},status);}
function detailParagraph(label,value){return `<p><strong>${escapeHtml(label)}:</strong><br>${escapeHtml(value || '').replaceAll('\n','<br>')}</p>`;}
function icsDate(date){return new Date(date).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');}
function foldIcsLine(line){let out='';while(line.length>73){out+=line.slice(0,73)+'\r\n ';line=line.slice(73)}return out+line;}
function icsEscape(value){return String(value||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');}
function buildIcs(slot,clientType){
  const l=labels(clientType);
  const description='Awaiting confirmation. Sherborne will respond to your request shortly.';
  const uid=`sherborne-${slot.id.replace(/[^a-zA-Z0-9]/g,'-')}@sherbornecmc.com`;
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sherborne//Request//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',`UID:${uid}`,`DTSTAMP:${icsDate(new Date())}`,`DTSTART:${icsDate(slot.startUtc)}`,`DTEND:${icsDate(slot.endUtc)}`,`SUMMARY:${icsEscape(l.ics)}`,`DESCRIPTION:${icsEscape(description)}`,'STATUS:TENTATIVE','TRANSP:OPAQUE','END:VEVENT','END:VCALENDAR'];
  return lines.map(foldIcsLine).join('\r\n');
}
function base64(value){return btoa(unescape(encodeURIComponent(value)));}
async function sendMichaelEmail(env,d){
  const email=owner(env), l=labels(d.clientType);
  const timezoneLines=d.clientTimeZone&&d.clientTimeZone!==BUSINESS_TIME_ZONE?detailParagraph('Visitor timezone',d.clientTimeZone)+detailParagraph('Sherborne diary timezone',BUSINESS_TIME_ZONE):'';
  const assistantLine=d.assistantEmail?detailParagraph('Assistant copied on confirmation email',d.assistantEmail):'';
  const content=`<p>New ${escapeHtml(l.kind)} request received.</p>${detailParagraph('Requested time',timeSummary(d.startUtc,d.clientTimeZone))}${timezoneLines}${detailParagraph('Name',d.name)}${detailParagraph('Email',d.email)}${detailParagraph('Phone',d.phone)}${assistantLine}${detailParagraph('What would be helpful to explore',d.message)}<p>The internal tentative diary hold has been created. Confirm manually in Outlook if you wish to proceed.</p>`;
  await graph(env,`/users/${encodeURIComponent(email)}/sendMail`,'POST',{message:{subject:subjectFor(d.clientType,d.startUtc,d.clientTimeZone),body:{contentType:'HTML',content},toRecipients:[{emailAddress:{address:email}}]},saveToSentItems:true});
}
async function sendClientConfirmationEmail(env,d){
  const cc=d.assistantEmail?[{emailAddress:{address:d.assistantEmail}}]:[];
  const ics=buildIcs(d.slot,d.clientType);
  await graph(env,`/users/${encodeURIComponent(owner(env))}/sendMail`,'POST',{message:{subject:subjectFor(d.clientType,d.startUtc,d.clientTimeZone),body:{contentType:'HTML',content:`<p>${htmlLines(confirmationText(d.clientType))}</p>`},toRecipients:[{emailAddress:{address:d.email}}],ccRecipients:cc,attachments:[{'@odata.type':'#microsoft.graph.fileAttachment',name:'sherborne-request.ics',contentType:'text/calendar; charset=utf-8; method=PUBLISH',contentBytes:base64(ics)}]},saveToSentItems:true});
}
export async function onRequestPost({request,env}){let step='start',createdEventId=null;try{const body=await request.json();const{slotId,name,email,phone,message,otherEmail,clientTimeZone}=body;const clientType=isExisting(body.clientType)?'existing':'new';const assistantEmail=String(otherEmail||'').trim();const l=labels(clientType);if(!slotId||!validEmail(email)||String(phone||'').trim().length<7||!String(message||'').trim()||!String(name||'').trim())return json({error:'Please complete the required details and try again.'},400);if(assistantEmail&&!validEmail(assistantEmail))return json({error:'Please check the assistant email address.'},400);if(!liveReady(env))return contactError('The live diary connection is not available just now, so online booking is unavailable. Please contact Sherborne directly.',503);step='checking availability';const result=await buildAvailability(env,clientType);if(!result.live)return contactError('The live diary connection is not available just now, so online booking is unavailable. Please contact Sherborne directly.',503);const slot=result.cells.find(c=>c.id===slotId);if(!slot||!slot.bookable)return json({error:'This time is no longer available. Please choose another time.'},409);const start=new Date(slot.startUtc),end=new Date(slot.endUtc);step='creating internal calendar hold';const event=await graph(env,`/users/${encodeURIComponent(owner(env))}/events`,'POST',{subject:`${l.hold} — ${name} — ${email}`,body:{contentType:'HTML',content:`<p>Internal tentative hold. Client has received a separate email and .ics calendar attachment.</p>${detailParagraph('Requested time',timeSummary(slot.startUtc,clientTimeZone))}${clientType==='existing'?detailParagraph('Change / cancellation note',l.charge):''}${detailParagraph('Name',name)}${detailParagraph('Email',email)}${detailParagraph('Phone',phone)}${assistantEmail?detailParagraph('Assistant copied on confirmation email',assistantEmail):''}${detailParagraph('What would be helpful to explore',message)}`},start:{dateTime:start.toISOString().replace(/\.\d{3}Z$/,''),timeZone:'UTC'},end:{dateTime:end.toISOString().replace(/\.\d{3}Z$/,''),timeZone:'UTC'},showAs:'tentative',isReminderOn:true,reminderMinutesBeforeStart:60});createdEventId=event.id||null;step='notifying Sherborne';await sendMichaelEmail(env,{startUtc:slot.startUtc,name,email,phone,message,assistantEmail,clientTimeZone,clientType});step='sending client confirmation';await sendClientConfirmationEmail(env,{slot,startUtc:slot.startUtc,email,assistantEmail,clientTimeZone,clientType});return json({ok:true,slotId,eventId:createdEventId,clientType});}catch(e){console.log('Booking error',{endpoint:'/api/book',step,message:e.message,eventId:createdEventId});if(step==='notifying Sherborne'&&createdEventId)return contactError('Your diary hold was created, but Sherborne could not be notified automatically. Please contact Sherborne directly so we can confirm your time.',502,{eventId:createdEventId});return contactError('Sorry, we could not complete your request just now. Please try again, or contact Sherborne directly.',500);}}
