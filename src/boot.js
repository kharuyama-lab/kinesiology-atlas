// This entry point has no library dependencies: module-load errors must be visible.
const overlay=document.getElementById('loadOverlay'),status=document.getElementById('modelStatus'),diagnostics=document.getElementById('diagnostics');
function fail(reason){
 if(status.textContent==='Ready')return;
 status.textContent='Load failed';overlay.hidden=false;overlay.replaceChildren();
 const title=document.createElement('strong');title.textContent='Unable to load the atlas';
 const detail=document.createElement('small');detail.textContent=String(reason?.message||reason||'Loading timed out');
 const retry=document.createElement('button');retry.textContent='Retry';retry.addEventListener('click',()=>location.reload());
 overlay.append(title,detail,retry);diagnostics.textContent=detail.textContent;
}
window.addEventListener('error',event=>fail(event.error||event.message));
window.addEventListener('unhandledrejection',event=>fail(event.reason));
const started=performance.now();
const watch=setInterval(()=>{if(status.textContent==='Ready'||status.textContent.includes('failed'))clearInterval(watch);else if(performance.now()-started>90000){clearInterval(watch);fail('Loading timed out. See Diagnostics or retry.');}},1000);
import('./main.js?v=local-runtime-1').catch(fail);
