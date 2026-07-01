import { buildAvailability, buildBaseGrid, applyDerivedRules, connectionDiagnostics, json } from '../_shared/calendar.js';

function publicCell(c){
  return {
    id:c.id,
    startUtc:c.startUtc,
    endUtc:c.endUtc,
    introBookable:Boolean(c.introBookable),
    client30Bookable:Boolean(c.client30Bookable),
    client60Bookable:Boolean(c.client60Bookable),
    nextEndUtc:c.nextEndUtc||null
  };
}

export async function onRequestGet({request,env}){
  const url=new URL(request.url), scope=url.searchParams.get('scope')==='currentWeek'?'currentWeek':'full';
  try{
    const result=await buildAvailability(env,scope), status=result.live?200:503;
    if(!result.live)console.log('Availability not live',{endpoint:'/api/availability',scope,diagnostics:connectionDiagnostics(env)});
    return json({live:result.live,scope,pulledAt:result.pulledAt,slots:result.cells.map(publicCell),error:result.live?undefined:'Diary connection unavailable'},status);
  }catch(e){
    console.log('Availability error',{message:e.message,endpoint:'/api/availability',scope,diagnostics:connectionDiagnostics(env)});
    const cells=applyDerivedRules(buildBaseGrid(new Date(),scope==='currentWeek'?1:4));
    return json({live:false,scope,pulledAt:new Date().toISOString(),slots:cells.map(publicCell),error:'Diary connection unavailable'},503);
  }
}
