import { buildAvailability, buildBaseGrid, applyModeRules, connectionDiagnostics, json, normaliseClientType } from '../_shared/calendar.js';

export async function onRequestGet({request,env}){
  const url = new URL(request.url);
  const clientType = normaliseClientType(url.searchParams.get('client'));
  try{
    const result = await buildAvailability(env,clientType);
    const status = result.live ? 200 : 503;
    if(!result.live) console.log('Availability not live', { endpoint:'/api/availability', clientType, diagnostics:connectionDiagnostics(env) });
    return json({ live:result.live, clientType, pulledAt:result.pulledAt, slots:result.cells, error:result.live ? undefined : 'Diary connection unavailable' }, status);
  }catch(e){
    console.log('Availability error', { message:e.message, endpoint:'/api/availability', clientType, diagnostics:connectionDiagnostics(env) });
    const cells=applyModeRules(buildBaseGrid(new Date()),clientType);
    return json({ live:false, clientType, pulledAt:new Date().toISOString(), slots:cells, error:'Diary connection unavailable' },503);
  }
}
