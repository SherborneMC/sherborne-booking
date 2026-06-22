import { escapeHtml, graph, json, owner, validEmail, BUSINESS_TIME_ZONE } from '../_shared/calendar.js';

function formatNowInZone(timeZone){
  return new Date().toLocaleString('en-GB',{timeZone,weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});
}

function zoneSummary(clientTimeZone){
  if(clientTimeZone && clientTimeZone !== BUSINESS_TIME_ZONE){
    return `Client timezone: ${escapeHtml(clientTimeZone)}<br>Michael timezone: ${escapeHtml(BUSINESS_TIME_ZONE)}<br>Reference now: ${escapeHtml(formatNowInZone(clientTimeZone))} (${escapeHtml(BUSINESS_TIME_ZONE)}: ${escapeHtml(formatNowInZone(BUSINESS_TIME_ZONE))})`;
  }
  return `Timezone: ${escapeHtml(BUSINESS_TIME_ZONE)}`;
}

export async function onRequestPost({ request, env }){
  try {
    const body = await request.json();

    const {
      name,
      email,
      phone,
      message,
      preferredTimes,
      location,
      otherEmail,
      clientTimeZone
    } = body;

    const assistantEmail=String(otherEmail||'').trim();

    if (!name || !validEmail(email) || !phone || phone.length < 7 || !message || !preferredTimes) {
      return json({ error: 'Missing details' }, 400);
    }

    if (assistantEmail && !validEmail(assistantEmail)) {
      return json({ error: 'Assistant email invalid' }, 400);
    }

    const michael = owner(env);

    await graph(env, `/users/${encodeURIComponent(michael)}/sendMail`, 'POST', {
      message: {
        subject: 'Alternative request — introductory consultation',
        body: {
          contentType: 'HTML',
          content: `
            <p>New alternative consultation request received.</p>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
            ${location ? `<p><strong>Location:</strong> ${escapeHtml(location)}</p>` : ''}
            <p><strong>Time zone:</strong><br>${zoneSummary(clientTimeZone)}</p>
            <p><strong>Suggested contact times:</strong><br>${escapeHtml(preferredTimes).replaceAll('\n','<br>')}</p>
            <p><strong>What would be most helpful to explore:</strong><br>${escapeHtml(message).replaceAll('\n','<br>')}</p>
            ${assistantEmail ? `<p><strong>Assistant copied:</strong> ${escapeHtml(assistantEmail)}</p>` : ''}
          `
        },
        toRecipients: [{ emailAddress: { address: michael } }]
      },
      saveToSentItems: true
    });

    const cc = assistantEmail
      ? [{ emailAddress: { address: assistantEmail } }]
      : [];

    await graph(env, `/users/${encodeURIComponent(michael)}/sendMail`, 'POST', {
      message: {
        subject: 'Your request has been received',
        body: {
          contentType: 'HTML',
          content: `
            <p>Thank you for your request.</p>
            <p>We will confirm shortly.</p>
          `
        },
        toRecipients: [{ emailAddress: { address: email } }],
        ccRecipients: cc
      },
      saveToSentItems: true
    });

    return json({ ok: true });

  } catch (e) {
    console.log('Alternative request error', e.message);
    return json({ error: e.message }, 500);
  }
}
