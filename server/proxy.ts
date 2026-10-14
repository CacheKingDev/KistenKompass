import express from 'express';
export function configureProxy(app:express.Express,env:NodeJS.ProcessEnv=process.env){
 const configured=env.PUBLIC_URL?.trim();let publicUrl:string|null=null;
 if(configured){const url=new URL(configured);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('PUBLIC_URL muss eine vollständige Domain ohne Pfad sein');if(env.NODE_ENV==='production'&&url.protocol!=='https:')throw Error('PUBLIC_URL muss im Produktionsbetrieb HTTPS verwenden');publicUrl=url.origin;}
 if(env.NODE_ENV==='production'&&!publicUrl)throw Error('PUBLIC_URL ist im Produktionsbetrieb erforderlich');
 const proxies=env.TRUST_PROXY?.split(',').map(v=>v.trim()).filter(Boolean)||[];
 if(proxies.some(v=>['true','false','0','1'].includes(v)))throw Error('TRUST_PROXY muss konkrete Proxy-IP-Adressen oder CIDR-Netze enthalten');
 app.set('trust proxy',proxies.length?proxies:false);
 app.use('/api',(_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
 app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');next();});
 app.use('/api',(req,res,next)=>{const origin=req.headers.origin;const expected=publicUrl||`${req.protocol}://${req.headers.host}`;if(!['GET','HEAD'].includes(req.method)&&origin&&origin!==expected)return res.status(403).json({error:'Ungültiger Ursprung'});next();});
 return {publicUrl,secureCookies:publicUrl?.startsWith('https://')||false};
}
