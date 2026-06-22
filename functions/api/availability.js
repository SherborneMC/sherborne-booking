import { buildAvailability, buildBaseGrid, json } from '../_shared/calendar.js';

export async function onRequestGet({env}){
  try{
    const result = await buildAvailability(env);
    return json({ live:result.live, pulledAt:result.pulledAt, slots:result.cells });
  }catch(e){
    console.log('Availability error', e.message);
    const cells=buildBaseGrid(new Date());
    return json({ live:false, pulledAt:new Date().toISOString(), slots:cells, error:'Calendar unavailable' },503);
  }
}
