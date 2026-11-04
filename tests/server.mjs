import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),prefix=(process.env.ATLAS_TEST_BASE||'').replace(/\/$/,'');
http.createServer(async(req,res)=>{try{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(prefix){if(pathname!==prefix&&!pathname.startsWith(prefix+'/')){res.writeHead(404).end();return;}pathname=pathname.slice(prefix.length)||'/';}const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const data=await readFile(file);res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.glb':'model/gltf-binary','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}}).listen(Number(process.env.ATLAS_TEST_PORT)||8080,'127.0.0.1');

