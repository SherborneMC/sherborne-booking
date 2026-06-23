import { buildAvailability, buildBaseGrid, connectionDiagnostics, json } from '../_shared/calendar.js';
export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  const clientType=url.searchParams.get('client')==='existing'?'existing':'new';
  try{
    const result = await buildAvailability(env,clientType);
    const status = result.live ? 200 : 503;
    if(!result.live) console.log('Availability not live', { endpoint:'/api/availability', clientType, diagnostics:connectionDiagnostics(env) });
    return json({ live:result.live, pulledAt:result.pulledAt, slots:result.cells, clientType, error:result.live ? undefined : 'Diary connection unavailable' }, status);
  }catch(e){
    console.log('Availability error', { message:e.message, endpoint:'/api/availability', clientType, diagnostics:connectionDiagnostics(env) });
    const cells=buildBaseGrid(new Date(),clientType);
    return json({ live:false, pulledAt:new Date().toISOString(), slots:cells, clientType, error:'Diary connection unavailable' },503);
  }
}
