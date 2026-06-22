
import { buildAvailability, escapeHtml, graph, json, liveReady, owner, validEmail, BUSINESS_TIME_ZONE } from '../_shared/calendar.js';

function plainDateForMichael(iso){
  return new Date(iso).toLocaleString('en-GB',{timeZone:BUSINESS_TIME_ZONE,weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
async function sendMichaelEmail(env,details){
  const email=owner(env);
  const subject='Booking request — introductory consultation';
  const content=`
    <p>New introductory consultation request received.</p>
    <p><strong>Requested time:</strong> ${escapeHtml(plainDateForMichael(details.startUtc))}</p>
    <p><strong>Name:</strong> ${escapeHtml(details.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(details.email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(details.phone)}</p>
    ${details.otherEmail ? `<p><strong>Also copied/requested:</strong> ${escapeHtml(details.otherName)} ${escapeHtml(details.otherEmail)}</p>` : ''}
    <p><strong>What would be most helpful to explore?</strong></p>
    <p>${escapeHtml(details.message)}</p>
    <hr>
    <p>Suggested confirmation wording:</p>
    <p>We are pleased to confirm your requested introductory consultation. Michael looks forward to speaking with you.</p>
    <p>The tentative diary hold has been created. Confirm manually in Outlook if you wish to proceed.</p>
  `;
  await graph(env,`/users/${encodeURIComponent(email)}/sendMail`,'POST',{message:{subject,body:{contentType:'HTML',content},toRecipients:[{emailAddress:{address:email}}]},saveToSentItems:true});
}
export async function onRequestPost({request,env}){
  let step='start';
  try{
    const body = await request.json();
    const {slotId,name,email,phone,message,otherName,otherEmail}=body;
    if(!slotId || !validEmail(email) || String(phone||'').trim().length<7 || !String(message||'').trim() || !String(name||'').trim()) return json({error:'Missing details'},400);
    if(otherEmail && !validEmail(otherEmail)) return json({error:'Other email invalid'},400);
    if(!liveReady(env)) return json({ok:true,sample:true,slotId});
    step='checking availability';
    const result=await buildAvailability(env);
    const slot=result.cells.find(c=>c.id===slotId);
    if(!slot || !slot.bookable) return json({error:'Slot unavailable'},409);
    const start=new Date(slot.startUtc), end=new Date(slot.endUtc);
    const attendees=[{emailAddress:{address:email,name:name||email},type:'required'}];
    if(otherEmail) attendees.push({emailAddress:{address:otherEmail,name:otherName||otherEmail},type:'optional'});
    const visitorText='Thank you for your request. We will confirm shortly and have provided a provisional hold for your diary.';
    step='creating calendar hold';
    await graph(env,`/users/${encodeURIComponent(owner(env))}/events`,'POST',{
      subject:`Introductory consultation request — ${name} — ${email}`,
      body:{contentType:'HTML',content:`<p>${visitorText}</p>`},
      start:{dateTime:start.toISOString().replace(/\.\d{3}Z$/,''),timeZone:'UTC'},
      end:{dateTime:end.toISOString().replace(/\.\d{3}Z$/,''),timeZone:'UTC'},
      attendees,showAs:'tentative',isReminderOn:true,reminderMinutesBeforeStart:60
    });
    step='emailing Michael';
    try{ await sendMichaelEmail(env,{startUtc:slot.startUtc,name,email,phone,message,otherName,otherEmail}); }catch(mailErr){ console.log('Michael email failed', mailErr.message); }
    return json({ok:true,slotId});
  }catch(e){
    console.log('Booking error at '+step, e.message);
    return json({error:'Booking unavailable at '+step},500);
  }
}
