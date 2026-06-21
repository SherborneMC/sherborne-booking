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
<p class="p1"><span class="s1">import { buildGrid } from './shared.js'</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">export async function onRequestGet({env}){</span></p>
<p class="p1"><span class="s1">  return new Response(</span></p>
<p class="p1"><span class="s1">    JSON.stringify(await buildGrid(env,env.OWNER_EMAIL)),</span></p>
<p class="p1"><span class="s1">    { headers:{'content-type':'application/json'} }</span></p>
<p class="p1"><span class="s1">  )</span></p>
<p class="p1"><span class="s1">}</span></p>
</body>
</html>
