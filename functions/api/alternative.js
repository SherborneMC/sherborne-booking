import { graph, json, owner, validEmail } from '../_shared/calendar.js';
export async function onRequestPost({request,env}){
  try{
    const b=await request.json();
    if(!validEmail(b.email)) return json({error:'Invalid'},400);
    await graph(env,`/users/${encodeURIComponent(owner(env))}/sendMail`,'POST',{
      message:{subject:'Alternative request',body:{contentType:'HTML',content:b.message},toRecipients:[{emailAddress:{address:owner(env)}}]}},);
    await graph(env,`/users/${encodeURIComponent(owner(env))}/sendMail`,'POST',{
      message:{subject:'Request received',body:{contentType:'HTML',content:'Thank you. We will respond shortly.'},toRecipients:[{emailAddress:{address:b.email}}],ccRecipients:b.otherEmail?[{emailAddress:{address:b.otherEmail}}]:[]}},);
    return json({ok:true});
  }catch(e){return json({error:e.message},500)}
}