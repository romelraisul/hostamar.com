const puppeteer = require("puppeteer");
const hostamarCookies = [
  {"name":"auth_token","value":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtc2x4bzd3cjAwMDkxNDN4MTA1Z2pjc2giLCJlbWFpbCI6InJvbWVscmFpc3VsQGdtYWlsLmNvbSIsIm5hbWUiOiJSb21lbCBSYWlzdWwiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODcyMDY4ODgsImV4cCI6MTc4NzgxMTY4OH0.9Zvtiw1ifJd1yz11uXZTcLGa-0g-MUiy6K3YNRiFkj0","domain":"hostamar.com","path":"/","secure":true,"httpOnly":true,"sameSite":"Lax"},
  {"name":"NEXT_LOCALE","value":"bn","domain":"hostamar.com","path":"/"},
  {"name":"locale","value":"en","domain":"hostamar.com","path":"/"},
];
const googleCookies = [
  {"name":"SID","value":"g.a000Awl6SczPOjhW7KwJk0Srwmr-wo0xCfkuBYdK5TctFeNvu-L57i7wsFJIR7KnHRIFV9W_sgACgYKAc8SARYSFQHGX2MiMouagGtQ0B0LPDclHpik0BoVAUF8yKriOrCWtYWtpQ5BWDwtNGEB0076","domain":".google.com","path":"/"},
  {"name":"__Secure-1PSID","value":"g.a000Awl6SczPOjhW7KwJk0Srwmr-wo0xCfkuBYdK5TctFeNvu-L5oGJblMnywQVKxbCmRRPtjAACgYKAbwSARYSFQHGX2Miaj_RxlZTPupsRfyqP5MbYhoVAUF8yKplmaj83JDjNmn2ifxgGZ7O0076","domain":".google.com","path":"/","secure":true,"httpOnly":true},
  {"name":"__Secure-3PSID","value":"g.a000Awl6SczPOjhW7KwJk0Srwmr-wo0xCfkuBYdK5TctFeNvu-L5j4Ez1FtSibEQPhz2cfqQugACgYKAcESARYSFQHGX2MiN8Ah7GWOpuugscABLShs3RoVAUF8yKroVq_BHK2ISE8h0PKEahXa0076","domain":".google.com","path":"/","secure":true,"httpOnly":true},
  {"name":"HSID","value":"AP-IgjKEYuYaJVeyX","domain":".google.com","path":"/","httpOnly":true},
  {"name":"SSID","value":"AWhD8RdxmDfob03ew","domain":".google.com","path":"/","secure":true,"httpOnly":true},
  {"name":"APISID","value":"8ZG5Fz7LDtBaJ52g/ACMWmr0jl4h-eCcG4","domain":".google.com","path":"/"},
  {"name":"SAPISID","value":"kqccTIZS6_FcmEJB/Apo6rs5zW7UBN1FkO","domain":".google.com","path":"/","secure":true},
  {"name":"__Secure-1PAPISID","value":"kqccTIZS6_FcmEJB/Apo6rs5zW7UBN1FkO","domain":".google.com","path":"/","secure":true},
  {"name":"__Secure-3PAPISID","value":"kqccTIZS6_FcmEJB/Apo6rs5zW7UBN1FkO","domain":".google.com","path":"/","secure":true},
  {"name":"AEC","value":"AdJVEasL7S9_V3d8PFrUAHGXHMnnxRHGyCUAwW30PdhTlDmcE79CKVcelUQ","domain":".google.com","path":"/","secure":true,"httpOnly":true},
  {"name":"NID","value":"534=UZ4sToPOxkHWQc3FpqnvCp_Z43N5qKhxLhyXIPPgrH7lpzR3tug6qsVCSu91FxQuzVHxpXbx2nsED6KHt5HBv-wNo5KyPgBlC-4doUp1359Vb7ihZhucOQU8vx0bEeX1aeMSY0CLE6AIs32VPe5RNuEcPrP91bWk36t42NylVCfbDcyOpu8zqPGgy2FO0uvs0Ii_QbNjqJBHu0AHqe-AV6tBNhNwQj4BWJVkAiKYbCSzilPqv8m5Oy0dKYOdJqG1PT5FbYVZ_yu9LwwFw9FEsV7vQO6gZyjJvQyGE8nhmXitFSlApc0DfdAVzk9R8d3WIZ435fwwN6BDtOR1eDz2TepCVb1R4X5_IiXvmAGARXrgwjLaI6E0zzhBqbiiCZ5vjXlmuW89H9NqNHkOrLqPUbcAEmZM2C6RXz1gYH9BiSpvAXDctHQ0YJEpQ8WsWYuVgyLSpJzlOFkVCJaYyKjsWjx4hfZKuN_npRszrSyGSmwS32oPC-Y7vwOALH7TcCTFjQa764i6MwIAfZsMy2XkkoEXJfwpfHaxOWAIeHdHV7dx02nSRGISg_GKTvhlXEySKcXKRgMBNB_F0MIgE21qcRl-0rCoLBgY3ZthYXrBtjaRFpqsQ4i95Gu5CQ5ljb3IaHE53jfQpBERPmRRVOatox1LmlFwZXmmnU7cvWjCnOerVBXYPDn1vFjXemQYoDSKpn9wRtTCiMfo06JeUoQtcr3u9gmQI_x-21XMLSKALo9AkDjb5S0W033QW0rO8IHsqAnqreUfdQa3UrWia6dG_Ld_IX1HXW6FH3QjY6R7B3wI4x6ysxrfPgf3Sy0aupGKG5tRJUSHt2mYGLOjtUya9T4beI_eDfah-DBeyTr8RjcYvnlmiFadhc5egTpYNw3CvCLwBtum8ji9ckJbYG7N0N1wiyRoVSLSHmTDGWDmg9QyR1Tn8xMwjSMdZr2XW_L8pDj7LwYi7yhxHy-J1SBueZ9vvMpjd1bv3-yOuYx1dahq4mL0bFg-AavYzyzK2nkdQfQk-2SDgwNyKAH04hx3mgc1rLfVLOgbiZWv2JYD-zIlhcGjHPT-rQtLX-16YtdlTz2oy8CvirH23mmLfJRUcHoEQEf6ORnTj20vmaL7xt4jgtbGYG7UDXBapuRx_Juel8ApCIr4-VrXVFAZGQc7nj18ApPT9t1d5coZDkJXoPhvdDmrLgzMwY5Jx-8167qaRvk9jNK-RBgqN89H_Hu9reKIEB6QvF4Yh0tstxOkSRmconQCtPvFRGhwMjvKvebOkjVRr8WVxJgIPu3PNUK-mtLJ7yHgP8apUEzfeNv5gkbcvb07bTCv","domain":".google.com","path":"/","secure":true,"httpOnly":true},
  {"name":"__Secure-1PSIDTS","value":"sidts-CjYBXMw41SoUg-AtdqwicnB6lus1dZmcd4FW3tcFI1OZV22tjyc16JhSUsGXqzuv13_yW7QVC4QQAA","domain":".google.com","path":"/","secure":true,"httpOnly":true},
  {"name":"__Secure-3PSIDTS","value":"sidts-CjYBXMw41SoUg-AtdqwicnB6lus1dZmcd4FW3tcFI1OZV22tjyc16JhSUsGXqzuv13_yW7QVC4QQAA","domain":".google.com","path":"/","secure":true,"httpOnly":true},
  {"name":"SIDCC","value":"AKEyXzURj9sOINm_n4OaH6UuRwZOmmRDU7JXqnNrPa9et9q1i4fl5dMi7NnCOSzFPzY8BEf8eak","domain":".google.com","path":"/"},
];
(async()=>{
  const browser = await puppeteer.launch({headless:true, args:["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu","--no-first-run","--no-zygote"]});
  const page = await browser.newPage();
  // set cookies before any navigation
  await page.setCookie(...hostamarCookies, ...googleCookies);
  console.log("Cookies set:", hostamarCookies.length+googleCookies.length);
  const c = await page.cookies("https://hostamar.com");
  console.log("hostamar cookies in jar:", c.map(x=>x.name+":"+x.value.slice(0,20)+"...").join(", "));

  console.log("\n=== 1. /admin with YOUR admin cookie ===");
  let resp = await page.goto("https://hostamar.com/admin", {waitUntil:"domcontentloaded", timeout:20000});
  console.log("status:", resp.status(), "final url:", page.url());
  let body = await page.content();
  console.log("has Admin panel:", body.includes("Admin")||body.includes("admin"));
  console.log("body snippet:", body.slice(body.indexOf("<body"), body.indexOf("<body")+2000).replace(/\n/g," ").slice(0,800));

  console.log("\n=== 2. /api/auth/me ===");
  resp = await page.goto("https://hostamar.com/api/auth/me", {waitUntil:"domcontentloaded", timeout:15000});
  console.log("status:", resp.status());
  let txt = await page.evaluate(()=>document.body.innerText);
  console.log(txt.slice(0,500));

  console.log("\n=== 3. Click SSO button (via /api/auth/sso/start) ===");
  // We simulate clicking SSO by going to the start endpoint - puppeteer follows redirects
  resp = await page.goto("https://hostamar.com/api/auth/sso/start?mode=login", {waitUntil:"domcontentloaded", timeout:20000});
  // Puppeteer follows 302 automatically, so we land on accounts.google.com
  console.log("final url:", page.url().slice(0,800));
  console.log("status:", resp.status());
  console.log("title:", await page.title());
  let inner = await page.evaluate(()=>document.body.innerText.slice(0,800));
  console.log("body preview:", inner.slice(0,800));

  await browser.close();
})().catch(e=>{ console.error(e); process.exit(1); });
