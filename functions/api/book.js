
import { graph } from '../_shared/calendar.js';

export async function onRequestPost({request,env}){
  try{
    const b = await request.json();

    await graph(env, `/users/${encodeURIComponent(env.OWNER_EMAIL)}/events`, 'POST', {
      subject: 'Test booking',
      start:{dateTime:new Date().toISOString(),timeZone:'UTC'},
      end:{dateTime:new Date(Date.now()+1800000).toISOString(),timeZone:'UTC'}
    });

    await graph(env, `/users/${encodeURIComponent(env.OWNER_EMAIL)}/sendMail`, 'POST', {
      message:{subject:'Booking request', body:{contentType:'HTML',content:'ok'}, toRecipients:[{emailAddress:{address:env.OWNER_EMAIL}}]}
    });

    return new Response(JSON.stringify({ok:true}));
  }catch(e){
    return new Response(JSON.stringify({error:e.message}),{status:500});
  }
}
