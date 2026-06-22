import { buildAvailability, escapeHtml, graph, json, liveReady, owner, validEmail, BUSINESS_TIME_ZONE } from '../_shared/calendar.js';

function formatInZone(iso, timeZone){
  return new Date(iso).toLocaleString('en-GB',{timeZone,weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});
}

function timeSummary(iso, clientTimeZone){
  const michaelTime = formatInZone(iso, BUSINESS_TIME_ZONE);
  if(clientTimeZone && clientTimeZone !== BUSINESS_TIME_ZONE){
    return `${formatInZone(iso, clientTimeZone)} (${BUSINESS_TIME_ZONE}: ${michaelTime})`;
  }
  return michaelTime;
}

function requesterLabel(details){
  return details.name ? `${details.name} (${details.email})` : details.email;
}

function eventBodyForRequester(details){
  return `
Thank you for your request. We will confirm shortly and have provided a provisional hold for your diary.

Requested time: ${escapeHtml(timeSummary(details.startUtc, details.clientTimeZone))}
`;
}

async function sendMichaelEmail(env,details){
  const email=owner(env);
  const subject='Booking request — introductory consultation';
  const assistantLine = details.assistantEmail ? `
Assistant copied on confirmation email: ${escapeHtml(details.assistantEmail)}
` : '';
  const content=`
New introductory consultation request received.

Requested time: ${escapeHtml(timeSummary(details.startUtc, details.clientTimeZone))}
${details.clientTimeZone && details.clientTimeZone !== BUSINESS_TIME_ZONE ? `Client timezone: ${escapeHtml(details.clientTimeZone)}\nMichael timezone: ${escapeHtml(BUSINESS_TIME_ZONE)}\n` : ''}
Name: ${escapeHtml(details.name)}
Email: ${escapeHtml(details.email)}
Phone: ${escapeHtml(details.phone)}
${assistantLine}
What would be most helpful to explore?
${escapeHtml(details.message)}

Suggested confirmation wording:
We are pleased to confirm your requested introductory consultation. Michael looks forward to speaking with you.

The tentative diary hold has been created. Confirm manually in Outlook if you wish to proceed.
`;

  await graph(env,`/users/${encodeURIComponent(email)}/sendMail`,'POST',{
    message:{
      subject,
      body:{contentType:'HTML',content},
      toRecipients:[{emailAddress:{address:email}}]
    },
    saveToSentItems:true
  });
}

export async function onRequestPost({request,env}){
  let step='start';
  let createdEventId=null;
  try{
    const body = await request.json();
    const {slotId,name,email,phone,message,otherEmail,clientTimeZone}=body;
    const assistantEmail=String(otherEmail||'').trim();

    if(!slotId || !validEmail(email) || String(phone||'').trim().length<7 || !String(message||'').trim() || !String(name||'').trim()) return json({error:'Missing details'},400);
    if(assistantEmail && !validEmail(assistantEmail)) return json({error:'Assistant email invalid'},400);
    if(!liveReady(env)) return json({ok:true,sample:true,slotId});

    step='checking availability';
    const result=await buildAvailability(env);
    const slot=result.cells.find(c=>c.id===slotId);
    if(!slot || !slot.bookable) return json({error:'Slot unavailable'},409);

    const start=new Date(slot.startUtc), end=new Date(slot.endUtc);
    const visitorText = eventBodyForRequester({startUtc:slot.startUtc, clientTimeZone, name, email});
    const attendees=[{emailAddress:{address:email,name:name||email},type:'required'}];

    step='creating calendar hold';
    const event=await graph(env,`/users/${encodeURIComponent(owner(env))}/events`,'POST',{
      subject:`ACTION REQUIRED — introductory consultation request — ${name} — ${email}`,
      body:{contentType:'HTML',content:`${visitorText}

Requester details:
Name: ${escapeHtml(name)}
Email: ${escapeHtml(email)}
Phone: ${escapeHtml(phone)}
${assistantEmail ? `Assistant email for confirmation: ${escapeHtml(assistantEmail)}\n` : ''}
What would be most helpful to explore?
${escapeHtml(message)}
`},
      start:{dateTime:start.toISOString().replace(/\.\d{3}Z$/,''),timeZone:'UTC'},
      end:{dateTime:end.toISOString().replace(/\.\d{3}Z$/,''),timeZone:'UTC'},
      attendees,
      showAs:'tentative',
      isReminderOn:true,
      reminderMinutesBeforeStart:60
    });
    createdEventId=event.id || null;

    step='emailing Michael';
    await sendMichaelEmail(env,{startUtc:slot.startUtc,name,email,phone,message,assistantEmail,clientTimeZone});

    if(assistantEmail){
      step='copying assistant';
      await graph(env,`/users/${encodeURIComponent(owner(env))}/sendMail`,'POST',{
        message:{
          subject:'Introductory consultation request shared with you',
          body:{contentType:'HTML',content:`
This introductory consultation request has been shared with you at the request of ${escapeHtml(requesterLabel({name,email}))}.

Requested time: ${escapeHtml(timeSummary(slot.startUtc, clientTimeZone))}

Sherborne will confirm the arrangement shortly.
`},
          toRecipients:[{emailAddress:{address:assistantEmail}}]
        },
        saveToSentItems:true
      });
    }

    return json({ok:true,slotId,eventId:createdEventId});
  }catch(e){
    console.log('Booking error at '+step, e.message);
    if(step==='emailing Michael' && createdEventId){
      return json({error:'Booking hold created but Michael notification failed',eventId:createdEventId},502);
    }
    return json({error:'Booking unavailable at '+step},500);
  }
}
