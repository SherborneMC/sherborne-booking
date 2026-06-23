import { buildAvailability, buildBaseGrid, connectionDiagnostics, json } from '../_shared/calendar.js';
export async function onRequestGet({env}){
  try{
    const result = await buildAvailability(env);
    const status = result.live ? 200 : 503;
    if(!result.live) console.log('Availability not live', { endpoint:'/api/availability', diagnostics:connectionDiagnostics(env) });
    return json({ live:result.live, pulledAt:result.pulledAt, slots:result.cells, error:result.live ? undefined : 'Diary connection unavailable' }, status);
  }catch(e){
    console.log('Availability error', { message:e.message, endpoint:'/api/availability', diagnostics:connectionDiagnostics(env) });
    const cells=buildBaseGrid(new Date());
    return json({ live:false, pulledAt:new Date().toISOString(), slots:cells, error:'Diary connection unavailable' },503);
  }
}
