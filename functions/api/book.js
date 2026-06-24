import { buildAvailability, escapeHtml, graph, json, liveReady, owner, validEmail, BUSINESS_TIME_ZONE, normaliseClientType, modeConfig } from '../_shared/calendar.js';

const CONTACT_URL='https://www.sherbornecmc.com/#contact';
const ICS_DESCRIPTION='Awaiting confirmation. Sherborne will respond to your request shortly.';

function clean(s,max=500){ return String(s||'').trim().slice(0,max); }
function contactError(message,status=500,extra={}){return json({error:message,contactUrl:CONTACT_URL,...extra},status);}
function formatInZone(iso,timeZone){return new Date(iso).toLocaleString('en-GB',{timeZone,weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});}
function timeSummary(iso,clientTimeZone){const sherborneTime=formatInZone(iso,BUSINESS_TIME_ZONE);return clientTimeZone&&clientTimeZone!==BUSINESS_TIME_ZONE?`${formatInZone(iso,clientTimeZone)} (Sherborne diary time: ${sherborneTime})`:sherborneTime;}
function subjectDate(iso,clientTimeZone){return timeSummary(iso,clientTimeZone);}
function emailSubject(config,iso,clientTimeZone){return `${config.subjectPrefix} - ${subjectDate(iso,clientTimeZone)}`;}
function htmlBlock(label,value){return `<p><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value||'').replaceAll('\n','<br>')}</p>`;}
function textToHtml(s){return escapeHtml(s).replaceAll('\n','<br>');}
function icsDate(iso){return new Date(iso).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');}
function icsEscape(s){return String(s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');}
function base64Utf8(s){const bytes=new TextEncoder().encode(s);let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin);}
function makeIcs(slot,config){
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sherborne//Booking Request//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${icsEscape(slot.id)}@sherbornecmc.com`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(slot.startUtc)}`,
    `DTEND:${icsDate(slot.endUtc)}`,
    `SUMMARY:${icsEscape(config.icsTitle)}`,
    `DESCRIPTION:${icsEscape(ICS_DESCRIPTION)}`,
    'STATUS:TENTATIVE',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}
function clientBody(config){
  const policy = config.policyNote ? `\n\n${config.policyNote}` : '';
  return `Thank you for your request, we will respond shortly.${policy}\n\nBest wishes,\nYour Sherborne Team\n\nIf you need to cancel, please contact us.`;
}
function internalHtml({config,slot,name,email,phone,message,assistantEmail,clientTimeZone}){
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.45;color:#17201c">
      <h2 style="font-family:Georgia,serif;font-weight:400;color:#36463b">${escapeHtml(config.subjectPrefix)}</h2>
      ${htmlBlock('Client type', config.clientType === 'existing' ? 'Existing client' : 'New client')}
      ${htmlBlock('Requested time', timeSummary(slot.startUtc,clientTimeZone))}
      ${htmlBlock('Name', name)}
      ${htmlBlock('Email', email)}
      ${htmlBlock('Phone', phone)}
      ${assistantEmail ? htmlBlock('Assistant copied on confirmation email', assistantEmail) : ''}
      ${htmlBlock('What would be helpful to explore', message)}
      ${config.policyNote ? htmlBlock('Policy note', config.policyNote) : ''}
      <p>The internal Sherborne diary hold has been created as tentative. Confirm manually in Outlook if you wish to proceed.</p>
    </div>`;
}
async function sendMichaelEmail(env,d){
  const michael=owner(env);
  await graph(env,`/users/${encodeURIComponent(michael)}/sendMail`,'POST',{
    message:{
      subject:d.subject,
      body:{contentType:'HTML',content:internalHtml(d)},
      toRecipients:[{emailAddress:{address:michael}}]
    },
    saveToSentItems:true
  });
}
async function sendClientConfirmationEmail(env,d){
  const cc=d.assistantEmail?[{emailAddress:{address:d.assistantEmail}}]:[];
  const ics=makeIcs(d.slot,d.config);
  await graph(env,`/users/${encodeURIComponent(owner(env))}/sendMail`,'POST',{
    message:{
      subject:d.subject,
      body:{contentType:'HTML',content:textToHtml(clientBody(d.config))},
      toRecipients:[{emailAddress:{address:d.email}}],
      ccRecipients:cc,
      attachments:[{
        '@odata.type':'#microsoft.graph.fileAttachment',
        name:'sherborne-request.ics',
        contentType:'text/calendar',
        contentBytes:base64Utf8(ics)
      }]
    },
    saveToSentItems:true
  });
}

export async function onRequestPost({request,env}){
  let step='start',createdEventId=null;
  try{
    const body=await request.json();
    const clientType=normaliseClientType(body.clientType);
    const config=modeConfig(clientType);
    const slotId=clean(body.slotId,80);
    const name=clean(body.name,120);
    const email=clean(body.email,254);
    const phone=clean(body.phone,60);
    const message=clean(body.message,250);
    const assistantEmail=clean(body.otherEmail,254);
    const clientTimeZone=clean(body.clientTimeZone,80);

    if(!slotId||!validEmail(email)||phone.length<7||!message||!name)return json({error:'Please complete the required details and try again.'},400);
    if(assistantEmail&&!validEmail(assistantEmail))return json({error:'Please check the assistant email address.'},400);
    if(!liveReady(env))return contactError('The live diary connection is not available just now, so online booking is unavailable. Please contact Sherborne directly.',503);

    step='checking availability';
    const result=await buildAvailability(env,clientType);
    if(!result.live)return contactError('The live diary connection is not available just now, so online booking is unavailable. Please contact Sherborne directly.',503);
    const slot=result.cells.find(c=>c.id===slotId && c.clientType===clientType);
    if(!slot||!slot.bookable)return json({error:'This time is no longer available. Please choose another time.'},409);

    const start=new Date(slot.startUtc),end=new Date(slot.endUtc);
    const subject=emailSubject(config,slot.startUtc,clientTimeZone);

    step='creating internal Sherborne diary hold';
    const event=await graph(env,`/users/${encodeURIComponent(owner(env))}/events`,'POST',{
      subject:`${config.holdTitlePrefix} — ${name} — ${email}`,
      body:{contentType:'HTML',content:internalHtml({config,slot,name,email,phone,message,assistantEmail,clientTimeZone,subject})},
      start:{dateTime:start.toISOString().replace(/\.\d{3}Z$/,''),timeZone:'UTC'},
      end:{dateTime:end.toISOString().replace(/\.\d{3}Z$/,''),timeZone:'UTC'},
      showAs:'tentative',
      isReminderOn:true,
      reminderMinutesBeforeStart:60
    });
    createdEventId=event.id||null;

    step='notifying Sherborne';
    await sendMichaelEmail(env,{config,slot,name,email,phone,message,assistantEmail,clientTimeZone,subject});

    step='sending client confirmation';
    await sendClientConfirmationEmail(env,{config,slot,email,assistantEmail,subject});

    return json({ok:true,clientType,slotId,eventId:createdEventId});
  }catch(e){
    console.log('Booking error',{endpoint:'/api/book',step,message:e.message,eventId:createdEventId});
    if(createdEventId)return contactError('Your request was received and an internal Sherborne diary hold was created, but an automatic email could not be sent. Please contact Sherborne directly if you do not hear from us shortly.',502,{eventId:createdEventId});
    return contactError('Sorry, we could not complete your request just now. Please try again, or contact Sherborne directly.',500);
  }
}
