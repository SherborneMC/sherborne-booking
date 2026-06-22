
import { graph } from '../_shared/calendar.js';

export async function onRequestPost({request,env}){
  try{
    const b = await request.json();

    await graph(env, `/users/${encodeURIComponent(env.OWNER_EMAIL)}/sendMail`, 'POST', {
      message:{
        subject:'Alt request',
        body:{contentType:'HTML',content:'alternative'},
        toRecipients:[{emailAddress:{address:env.OWNER_EMAIL}}]
      }
    });

    // client + assistant
    const recipients=[{emailAddress:{address:b.email}}];
    if(b.otherEmail) recipients.push({emailAddress:{address:b.otherEmail}});

    await graph(env, `/users/${encodeURIComponent(env.OWNER_EMAIL)}/sendMail`, 'POST', {
      message:{
        subject:'Received',
        body:{contentType:'HTML',content:'Thank you'},
        toRecipients:recipients
      }
    });

    return new Response(JSON.stringify({ok:true}));
  }catch(e){
    return new Response(JSON.stringify({error:e.message}),{status:500});
  }
}
