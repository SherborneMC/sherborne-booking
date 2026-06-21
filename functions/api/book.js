import { buildGrid, createEvent } from './shared.js'

export async function onRequestPost({request,env}){

  const body=await request.json()

  const grid=await buildGrid(env,env.OWNER_EMAIL)
  const slot=grid.cells.find(c=>c.id===body.slotId)

  if(!slot) return new Response('bad',{status:400})

  if(!body.internal && !slot.bookable)
    return new Response('conflict',{status:409})

  await createEvent(env,env.OWNER_EMAIL,body.slotId,body.internal)

  return new Response(JSON.stringify({ok:true}))
}
