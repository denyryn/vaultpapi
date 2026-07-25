import{b as d}from"./assets/browser-polyfill-D6ovI04A.js";(function(){if(window.__vaultpapi__)return;window.__vaultpapi__=!0;let l="",p="",k=window.location.href;function m(){return Array.from(document.querySelectorAll('input[type="password"]')).filter(y)}function f(n){const t=n.closest("form")||document,i=Array.from(t.querySelectorAll('input[type="email"], input[type="text"], input[autocomplete="username"], input[name*="email" i], input[name*="user" i], input[id*="email" i], input[id*="user" i]')).filter(y);return i[i.length-1]??null}function y(n){const e=n.getBoundingClientRect(),t=window.getComputedStyle(n);return e.width>0&&e.height>0&&t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function T(n,e){const t=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value");t!=null&&t.set?t.set.call(n,e):n.value=e,n.dispatchEvent(new Event("input",{bubbles:!0})),n.dispatchEvent(new Event("change",{bubbles:!0}))}function c(n){return n.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function _(){const n=m();for(const e of n){if(e.__vp_tracked__)continue;e.__vp_tracked__=!0,e.addEventListener("input",()=>{p=e.value;const i=f(e);i&&(l=i.value)});const t=f(e);t&&t.addEventListener("input",()=>{l=t.value})}}let v=!1;function h(){if(!l||!p||v)return;const n=new URL(k).hostname.replace("www.","");d.runtime.sendMessage({type:"SET_PENDING_SAVE",data:{username:l,password:p,url:k,domain:n}})}function U(n,e,t,i){var A,C,z,G;if(v)return;v=!0,(A=document.getElementById("vaultpapi-save-overlay"))==null||A.remove();const o=document.createElement("style");o.textContent=`
      @keyframes vpSlideDown {
        from { opacity: 0; transform: translateY(-8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `,document.head.appendChild(o);const a=document.createElement("div");a.id="vaultpapi-save-overlay",a.style.cssText=`
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      font-family: 'Geist', system-ui, sans-serif;
    `,a.innerHTML=`
              <div style="
                background:#111;
                border:1px solid #1e1e1e;
                border-radius:12px;
                width:320px;
                box-shadow:0 8px 32px rgba(0,0,0,0.6),0 1px 0 rgba(255,255,255,0.06) inset;
                animation:vpSlideDown 0.2s cubic-bezier(0.16,1,0.3,1);
                overflow:hidden;
                font-family:'Geist','GeistVariable',system-ui,-apple-system,sans-serif;
                -webkit-font-smoothing:antialiased;
              ">

                <!-- Top bar -->
                <div style="
                  display:flex;align-items:center;justify-content:space-between;
                  padding:13px 14px 12px;
                  border-bottom:1px solid #1a1a1a;
                ">
                  <div style="display:flex;align-items:center;gap:9px;">
                    <div style="
                      width:30px;height:30px;
                      background:#fff;
                      border-radius:7px;
                      display:flex;align-items:center;justify-content:center;
                      flex-shrink:0;
                    ">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                    <div>
                      <div style="font-size:13px;font-weight:700;color:#fff;letter-spacing:-0.02em;line-height:1.2;">Save password?</div>
                      <div style="font-size:11px;color:#444;margin-top:1px;">${c(i)}</div>
                    </div>
                  </div>
                  <button id="vp-save-close" style="
                    background:none;border:none;
                    color:#333;cursor:pointer;padding:4px;
                    display:flex;align-items:center;justify-content:center;
                    border-radius:4px;
                  ">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                <!-- Fields -->
                <div style="padding:12px 14px 0;">

                  <!-- Username field -->
                  <div style="margin-bottom:8px;">
                    <div style="font-size:10px;font-weight:600;color:#3a3a3a;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:5px;">Username</div>
                    <div style="
                      background:#0d0d0d;
                      border:1px solid #1e1e1e;
                      border-radius:7px;
                      padding:9px 11px;
                      font-size:13px;
                      color:#e0e0e0;
                      font-family:'Geist',system-ui,sans-serif;
                      letter-spacing:-0.01em;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                    ">${c(n)}</div>
                  </div>

                  <!-- Password field -->
                  <div style="margin-bottom:14px;">
                    <div style="font-size:10px;font-weight:600;color:#3a3a3a;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:5px;">Password</div>
                    <div style="
                      background:#0d0d0d;
                      border:1px solid #1e1e1e;
                      border-radius:7px;
                      padding:9px 11px;
                      display:flex;align-items:center;justify-content:space-between;
                    ">
                      <div id="vp-pw-display" style="
                        font-size:14px;
                        color:#e0e0e0;
                        letter-spacing:0.12em;
                        font-family:'Geist Mono','GeistMono',monospace;
                        user-select:none;
                      ">••••••••••••••••</div>
                      <button id="vp-pw-toggle" style="
                        background:none;border:none;
                        color:#3a3a3a;cursor:pointer;
                        padding:2px;display:flex;align-items:center;
                        flex-shrink:0;margin-left:8px;
                      ">
                        <svg id="vp-eye-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                </div>

                <!-- Actions -->
                <div style="
                  display:flex;gap:7px;
                  padding:0 14px 13px;
                ">
                  <button id="vp-save-btn" style="
                    flex:1;
                    background:#fff;color:#000;
                    border:none;border-radius:7px;
                    padding:9px 10px;
                    font-size:12px;font-weight:700;
                    cursor:pointer;
                    font-family:'Geist',system-ui,sans-serif;
                    letter-spacing:-0.01em;
                    display:flex;align-items:center;justify-content:center;gap:6px;
                  ">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Save
                  </button>
                  <button id="vp-notsave-btn" style="
                    flex:1;
                    background:transparent;color:#444;
                    border:1px solid #1e1e1e;border-radius:7px;
                    padding:9px 10px;
                    font-size:12px;font-weight:500;
                    cursor:pointer;
                    font-family:'Geist',system-ui,sans-serif;
                    letter-spacing:-0.01em;
                  ">Never</button>
                </div>

              </div>
            `,document.body.appendChild(a);const r=document.getElementById("vp-pw-display"),s=document.getElementById("vp-pw-toggle"),x=document.getElementById("vp-eye-icon");let u=!1;const N="•".repeat(Math.min(e.length,18)),R=e.length>22?e.slice(0,22)+"…":e;s==null||s.addEventListener("click",()=>{u=!u,r&&(r.textContent=u?R:N,r.style.letterSpacing=u?"0.02em":"0.12em",r.style.fontSize=u?"12px":"14px"),x&&(x.innerHTML=u?'<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>':'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>')});const E=()=>{a.remove(),v=!1,d.runtime.sendMessage({type:"CLEAR_PENDING_SAVE"})};(C=document.getElementById("vp-save-close"))==null||C.addEventListener("click",E),(z=document.getElementById("vp-notsave-btn"))==null||z.addEventListener("click",E),(G=document.getElementById("vp-save-btn"))==null||G.addEventListener("click",()=>{d.runtime.sendMessage({type:"SAVE_NEW_ENTRY",entry:{title:i,url:t,username:n,password:e}}),E();const g=document.createElement("div");g.style.cssText=`
        position:fixed;bottom:16px;right:16px;z-index:2147483647;
        background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;
        padding:9px 14px;font-family:'Geist',system-ui,sans-serif;
        font-size:12px;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.4);
        display:flex;align-items:center;gap:7px;
      `,g.innerHTML=`
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Saved to VaultPAPI
      `,document.body.appendChild(g),setTimeout(()=>g.remove(),2500)})}document.addEventListener("submit",()=>{const n=m();for(const e of n)if(e.value){p=e.value;const t=f(e);t!=null&&t.value&&(l=t.value)}h()},!0),window.addEventListener("beforeunload",()=>{h()});let S=window.location.href;const P=setInterval(()=>{window.location.href!==S&&(S=window.location.href,l&&p&&(h(),l="",p=""))},500);setTimeout(()=>clearInterval(P),300*1e3);function B(){d.runtime.sendMessage({type:"GET_PENDING_SAVE"},n=>{const e=n==null?void 0:n.pendingSave;e&&d.runtime.sendMessage({type:"GET_AUTH_STATUS"},t=>{if(!(t!=null&&t.authenticated)){d.runtime.sendMessage({type:"CLEAR_PENDING_SAVE"});return}d.runtime.sendMessage({type:"GET_VAULT_ENTRIES_FOR_URL",url:e.url},i=>{const o=((i==null?void 0:i.entries)??[]).some(a=>a.username===e.username);d.runtime.sendMessage({type:"CLEAR_PENDING_SAVE"}),o||setTimeout(()=>U(e.username,e.password,e.url,e.domain),600)})})})}function L(n,e,t){T(n,t);const i=f(n);i&&T(i,e)}function I(n,e){if(document.querySelectorAll(".vaultpapi-dropdown").forEach(r=>r.remove()),e.length===0)return;const t=n.getBoundingClientRect(),i=document.createElement("div");i.className="vaultpapi-dropdown",i.style.cssText=`
      position: fixed;
      top: ${t.bottom+4}px;
      left: ${t.left}px;
      min-width: ${Math.max(t.width,280)}px;
      max-width: 360px;
      background: #0a0a0a;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      z-index: 2147483647;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      font-family: 'Geist', system-ui, sans-serif;
      overflow: hidden;
      animation: vpSlideIn 0.12s ease;
    `;const o=document.createElement("style");o.textContent=`
      @keyframes vpSlideIn {
        from { opacity: 0; transform: translateY(-4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `,document.head.appendChild(o);const a=document.createElement("div");a.style.cssText=`
      padding: 7px 11px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #444;
      border-bottom: 1px solid #1a1a1a;
      display: flex;
      align-items: center;
      gap: 6px;
    `,a.innerHTML=`
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      VaultPAPI
    `,i.appendChild(a);for(const r of e.slice(0,6)){const s=document.createElement("div");s.style.cssText=`
        padding: 9px 11px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 9px;
        border-bottom: 1px solid #111;
        transition: background 0.1s;
      `,s.innerHTML=`
        <div style="width:26px;height:26px;background:#161616;border:1px solid #222;border-radius:6px;
                    display:flex;align-items:center;justify-content:center;flex-shrink:0;
                    font-size:11px;color:#555;font-weight:700;">
          ${c(r.title.charAt(0).toUpperCase())}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:500;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${c(r.title)}
          </div>
          <div style="font-size:11px;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${c(r.username)}
          </div>
        </div>
        <div style="font-size:10px;color:#333;flex-shrink:0;">Fill ↵</div>
      `,s.addEventListener("mouseenter",()=>{s.style.background="#111"}),s.addEventListener("mouseleave",()=>{s.style.background="transparent"}),s.addEventListener("mousedown",x=>{x.preventDefault(),L(n,r.username,r.password),i.remove()}),i.appendChild(s)}document.body.appendChild(i),setTimeout(()=>{document.addEventListener("mousedown",r=>{i.contains(r.target)||i.remove()},{once:!0}),window.addEventListener("scroll",()=>i.remove(),{once:!0,passive:!0})},50)}function w(){d.runtime.sendMessage({type:"GET_AUTH_STATUS"},n=>{if(!(n!=null&&n.authenticated))return;const e=m();e.length!==0&&d.runtime.sendMessage({type:"GET_VAULT_ENTRIES_FOR_URL",url:window.location.href},t=>{const i=(t==null?void 0:t.entries)??[];if(i.length===0)return;const o=e[0];i.length===1?(L(o,i[0].username,i[0].password),V(i[0].username)):I(o,i)})})}function V(n){var i,o;(i=document.getElementById("vaultpapi-autofill-badge"))==null||i.remove();const e=document.createElement("style");e.textContent=`
      @keyframes vpSlideUp {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `,document.head.appendChild(e);const t=document.createElement("div");t.id="vaultpapi-autofill-badge",t.style.cssText=`
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 2147483647;
      background: #0a0a0a;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 8px 12px;
      font-family: 'Geist', system-ui, sans-serif;
      font-size: 12px;
      color: #888;
      display: flex;
      align-items: center;
      gap: 7px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      animation: vpSlideUp 0.15s ease;
    `,t.innerHTML=`
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <span>Filled <strong style="color:#ccc;">${c(n)}</strong></span>
      <button id="vp-badge-close" style="background:none;border:none;color:#333;cursor:pointer;padding:0;margin-left:4px;font-size:13px;line-height:1;">✕</button>
    `,document.body.appendChild(t),(o=document.getElementById("vp-badge-close"))==null||o.addEventListener("click",()=>t.remove()),setTimeout(()=>t.remove(),3e3)}document.addEventListener("focusin",n=>{const e=n.target;e.type!=="password"||!y(e)||e.value||d.runtime.sendMessage({type:"GET_AUTH_STATUS"},t=>{t!=null&&t.authenticated&&d.runtime.sendMessage({type:"GET_VAULT_ENTRIES_FOR_URL",url:window.location.href},i=>{const o=(i==null?void 0:i.entries)??[];o.length>0&&I(e,o)})})},!0),B(),_(),document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>setTimeout(w,300)):setTimeout(w,300);let b=null;const M=new MutationObserver(()=>{b&&clearTimeout(b),b=setTimeout(()=>{_();const n=m();n.length>0&&!n[0].value&&w()},400)});M.observe(document.body,{childList:!0,subtree:!0}),setTimeout(()=>M.disconnect(),1e4)})();
