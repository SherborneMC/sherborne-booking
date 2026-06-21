import { createEvent, sendEmails } from './shared.js'

export async function onRequestPost({request,env}){

 const body=await request.json()

 await createEvent(env,env.OWNER_EMAIL,body.slotId,body.internal,body.name)

 if(!body.internal){
  await sendEmails(env,env.OWNER_EMAIL,body)
 }

 return new Response(JSON.stringify({ok:true}))
}
