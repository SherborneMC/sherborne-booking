<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta http-equiv="Content-Style-Type" content="text/css">
  <title></title>
  <meta name="Generator" content="Cocoa HTML Writer">
  <meta name="CocoaVersion" content="2685.4">
  <style type="text/css">
    p.p1 {margin: 0.0px 0.0px 12.0px 0.0px; font: 12.0px 'Helvetica Neue'; -webkit-text-stroke: #000000}
    p.p2 {margin: 0.0px 0.0px 12.0px 0.0px; font: 12.0px 'Helvetica Neue'; -webkit-text-stroke: #000000; min-height: 15.0px}
    span.s1 {font-kerning: none}
  </style>
</head>
<body>
<p class="p1"><span class="s1">const BLOCKING = new Set(['busy','oof','workingElsewhere','unknown'])</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">async function getToken(env){</span></p>
<p class="p1"><span class="s1">  const body=new URLSearchParams({</span></p>
<p class="p1"><span class="s1">    client_id:env.CLIENT_ID,</span></p>
<p class="p1"><span class="s1">    client_secret:env.CLIENT_SECRET,</span></p>
<p class="p1"><span class="s1">    scope:'https://graph.microsoft.com/.default',</span></p>
<p class="p1"><span class="s1">    grant_type:'client_credentials'</span></p>
<p class="p1"><span class="s1">  })</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">  const r=await fetch(</span></p>
<p class="p1"><span class="s1">    `https://login.microsoftonline.com/${env.TENANT_ID}/oauth2/v2.0/token`,</span></p>
<p class="p1"><span class="s1">    { method:'POST', body }</span></p>
<p class="p1"><span class="s1">  )</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">  return (await r.json()).access_token</span></p>
<p class="p1"><span class="s1">}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">async function graph(env,path){</span></p>
<p class="p1"><span class="s1">  const token=await getToken(env)</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">  const r=await fetch('https://graph.microsoft.com/v1.0'+path,{</span></p>
<p class="p1"><span class="s1">    headers:{ Authorization:'Bearer '+token }</span></p>
<p class="p1"><span class="s1">  })</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">  return r.json()</span></p>
<p class="p1"><span class="s1">}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">function overlap(a,b){</span></p>
<p class="p1"><span class="s1">  return a.start &lt; b.end &amp;&amp; a.end &gt; b.start</span></p>
<p class="p1"><span class="s1">}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">export async function buildGrid(env,owner){</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">  const now=new Date()</span></p>
<p class="p1"><span class="s1">  const start=new Date()</span></p>
<p class="p1"><span class="s1">  const end=new Date(now.getTime()+28*86400000)</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">  const data=await graph(</span></p>
<p class="p1"><span class="s1">    env,</span></p>
<p class="p1"><span class="s1">    `/users/${owner}/calendarView?startDateTime=${start.toISOString()}&amp;endDateTime=${end.toISOString()}`</span></p>
<p class="p1"><span class="s1">  )</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">  const events=(data.value||[]).map(e=&gt;({</span></p>
<p class="p1"><span class="s1">    start:new Date(e.start.dateTime),</span></p>
<p class="p1"><span class="s1">    end:new Date(e.end.dateTime),</span></p>
<p class="p1"><span class="s1">    showAs:e.showAs</span></p>
<p class="p1"><span class="s1">  }))</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">  const cells=[]</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">  for(let d=0;d&lt;28;d++){</span></p>
<p class="p1"><span class="s1">    const day=new Date(now.getTime()+d*86400000)</span></p>
<p class="p1"><span class="s1">    const dow=day.getDay()</span></p>
<p class="p1"><span class="s1">    if(dow===0||dow===6) continue</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">    for(let h=8;h&lt;=20;h++){</span></p>
<p class="p1"><span class="s1">      for(let m of [0,30]){</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">        if(h===20 &amp;&amp; m===30) continue</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">        const s=new Date(day)</span></p>
<p class="p1"><span class="s1">        s.setHours(h,m,0,0)</span></p>
<p class="p1"><span class="s1">        const e=new Date(s.getTime()+30*60000)</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">        const blocked = events.some(ev =&gt;</span></p>
<p class="p1"><span class="s1">          overlap(ev,{start:s,end:e}) &amp;&amp; BLOCKING.has(ev.showAs)</span></p>
<p class="p1"><span class="s1">        )</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">        const mins=h*60+m</span></p>
<p class="p1"><span class="s1">        const intro = (mins&gt;=480 &amp;&amp; mins&lt;720) || (mins&gt;=990 &amp;&amp; mins&lt;1050)</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">        const notice = s &gt; new Date(now.getTime()+4*3600000)</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">        cells.push({</span></p>
<p class="p1"><span class="s1">          id:s.toISOString(),</span></p>
<p class="p1"><span class="s1">          startUtc:s.toISOString(),</span></p>
<p class="p1"><span class="s1">          bookable:intro &amp;&amp; notice &amp;&amp; !blocked</span></p>
<p class="p1"><span class="s1">        })</span></p>
<p class="p1"><span class="s1">      }</span></p>
<p class="p1"><span class="s1">    }</span></p>
<p class="p1"><span class="s1">  }</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">  return { cells }</span></p>
<p class="p1"><span class="s1">}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">export async function createEvent(env,owner,slot,internal){</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">  const s=new Date(slot)</span></p>
<p class="p1"><span class="s1">  const e=new Date(s.getTime()+(internal?2:30)*60000)</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">  const token=await getToken(env)</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">  await fetch(`https://graph.microsoft.com/v1.0/users/${owner}/events`,{</span></p>
<p class="p1"><span class="s1">    method:'POST',</span></p>
<p class="p1"><span class="s1">    headers:{</span></p>
<p class="p1"><span class="s1">      Authorization:'Bearer '+token,</span></p>
<p class="p1"><span class="s1">      'Content-Type':'application/json'</span></p>
<p class="p1"><span class="s1">    },</span></p>
<p class="p1"><span class="s1">    body:JSON.stringify({</span></p>
<p class="p1"><span class="s1">      subject: internal ? 'Reminder' : 'Introductory consultation',</span></p>
<p class="p1"><span class="s1">      start:{ dateTime:s.toISOString(), timeZone:'UTC' },</span></p>
<p class="p1"><span class="s1">      end:{ dateTime:e.toISOString(), timeZone:'UTC' },</span></p>
<p class="p1"><span class="s1">      showAs: internal ? 'free' : 'tentative'</span></p>
<p class="p1"><span class="s1">    })</span></p>
<p class="p1"><span class="s1">  })</span></p>
<p class="p1"><span class="s1">}</span></p>
</body>
</html>
