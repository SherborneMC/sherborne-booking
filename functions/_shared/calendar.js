
export async function graph(env,path,method='GET',body=null){
  const bodyParams = new URLSearchParams({
    client_id: env.MS_CLIENT_ID,
    client_secret: env.MS_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const tokenRes = await fetch(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`, {
    method:'POST', body: bodyParams
  });

  const access = (await tokenRes.json()).access_token;

  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`,{
    method,
    headers:{
      Authorization:`Bearer ${access}`,
      'Content-Type':'application/json'
    },
    body: body?JSON.stringify(body):undefined
  });

  if(!res.ok) throw new Error(await res.text());

  // ✅ CRITICAL FIX: do NOT parse JSON if no body (e.g. sendMail 202)
  const ct = res.headers.get('content-type') || '';
  if(res.status === 202 || !ct.includes('application/json')) return {};

  return await res.json();
}
