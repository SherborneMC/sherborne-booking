import { buildGrid } from './shared.js'

export async function onRequestGet({env}){
  return new Response(
    JSON.stringify(await buildGrid(env,env.OWNER_EMAIL)),
    { headers:{'content-type':'application/json'} }
  )
} 
