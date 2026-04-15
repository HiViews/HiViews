// ── DarkOps Commander — Website Chat Widget ──────────────────
// Self-contained. Drop on any page with:
//   <script src="/chat-widget.js" defer></script>
// Zero dependencies. Calls provision.darkops.team/api/chat.

(function() {
  'use strict';

  // Pages where the widget should NOT appear
  var excludePaths = ['/login', '/sign-in', '/set-password', '/reset-password',
    '/checkout', '/cancel', '/terms', '/privacy', '/onboarding'];
  if (excludePaths.some(function(p) { return window.location.pathname.startsWith(p); })) return;

  // ── Config ──
  var API = 'https://provision.darkops.team/api/chat';

  // ── Inject HTML ──
  var wrapper = document.createElement('div');
  wrapper.innerHTML = [
    '<div id="do-chat-toggle" style="position:fixed;bottom:24px;right:24px;z-index:9999;cursor:pointer;">',
    '  <div style="width:64px;height:64px;border-radius:50%;background:transparent;border:2px solid #00ff88;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(0,255,136,0.15);transition:all 0.2s;">',
    '    <svg width="26" height="26" fill="none" stroke="#00ff88" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    '  </div>',
    '</div>',
    '<div id="do-chat-panel" style="display:none;position:fixed;bottom:24px;right:24px;width:380px;max-height:520px;z-index:10000;border-radius:16px;overflow:hidden;background:#0a0a0a;border:1px solid #1a1a1a;box-shadow:0 8px 40px rgba(0,0,0,0.6);font-family:Inter,-apple-system,sans-serif;flex-direction:column;">',
    '  <div style="background:#111;color:#fff;padding:14px 16px;font-weight:600;display:flex;justify-content:space-between;align-items:center;font-size:14px;border-bottom:1px solid #1a1a1a;">',
    '    <span><span style="color:#00ff88;">\u25CF</span> Talk to DarkOps Commander</span>',
    '    <span id="do-chat-close" style="cursor:pointer;font-size:14px;line-height:1;padding:4px 8px;background:#1a1a1a;border-radius:6px;color:#888;">\u00D7</span>',
    '  </div>',
    '  <div id="do-chat-msgs" style="padding:16px;height:340px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;background:#0a0a0a;">',
    '    <div style="background:#111;border:1px solid #1a1a1a;color:#bbb;padding:14px 18px;border-radius:14px;font-size:14px;line-height:1.6;max-width:85%;">',
    '      Hey \u2014 I\'m <strong style="color:#00ff88">DarkOps</strong>. I find viral trends, create avatar videos, and publish while you sleep. Ask me anything.',
    '    </div>',
    '  </div>',
    '  <div style="padding:12px;border-top:1px solid #1a1a1a;display:flex;gap:8px;background:#0a0a0a;">',
    '    <input id="do-chat-input" type="text" placeholder="Type a message..."',
    '      style="flex:1;background:#0a0a0a;border:1px solid #00ff88;border-radius:10px;padding:12px 16px;color:#fff;font-size:14px;outline:none;font-family:Inter,-apple-system,sans-serif;" />',
    '    <button id="do-chat-send" style="width:46px;height:46px;border-radius:10px;background:#00ff88;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">',
    '      <svg width="18" height="18" fill="none" stroke="#000" stroke-width="2.5" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>',
    '    </button>',
    '  </div>',
    '</div>'
  ].join('\n');
  document.body.appendChild(wrapper);

  // ── Inject CSS ──
  var style = document.createElement('style');
  style.textContent = [
    '@keyframes doBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}',
    '#do-chat-toggle:hover > div{transform:scale(1.08);box-shadow:0 0 30px rgba(0,255,136,0.25);}',
    '#do-chat-input::placeholder{color:#555;}',
    '#do-chat-input:focus{border-color:#00ff88;box-shadow:0 0 8px rgba(0,255,136,0.15);}',
    '#do-chat-send:hover{background:#00e67a;}',
    '#do-chat-send:active{transform:scale(0.95);}',
    '#do-chat-close:hover{color:#fff;background:#222;}',
    '#do-chat-msgs::-webkit-scrollbar{width:4px;}',
    '#do-chat-msgs::-webkit-scrollbar-track{background:transparent;}',
    '#do-chat-msgs::-webkit-scrollbar-thumb{background:#222;border-radius:4px;}',
    '@media(max-width:480px){',
    '  #do-chat-panel{width:100vw!important;right:0!important;left:0!important;bottom:0!important;max-height:80vh!important;border-radius:16px 16px 0 0!important;border-left:none!important;border-right:none!important;border-bottom:none!important;}',
    '  #do-chat-toggle{bottom:16px;right:16px;}',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  // ── Elements ──
  var toggle = document.getElementById('do-chat-toggle');
  var panel = document.getElementById('do-chat-panel');
  var closeBtn = document.getElementById('do-chat-close');
  var input = document.getElementById('do-chat-input');
  var sendBtn = document.getElementById('do-chat-send');
  var msgs = document.getElementById('do-chat-msgs');
  var history = [];

  // ── Toggle ──
  toggle.addEventListener('click', function() {
    panel.style.display = 'flex';
    toggle.style.display = 'none';
    input.focus();
  });

  closeBtn.addEventListener('click', function() {
    panel.style.display = 'none';
    toggle.style.display = 'block';
  });

  // ── Message rendering ──
  function sanitizeHtml(html) {
    // Allow only safe tags: a, strong, em, br. Strip everything else.
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('script,iframe,object,embed,form,input,style').forEach(function(el) { el.remove(); });
    // Ensure all links open in new tab
    tmp.querySelectorAll('a').forEach(function(a) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
      a.style.color = '#00ff88';
      a.style.textDecoration = 'underline';
    });
    return tmp.innerHTML;
  }

  function appendMsg(role, text) {
    var div = document.createElement('div');
    if (role === 'user') {
      div.style.cssText = 'background:#00ff88;color:#000;padding:12px 16px;border-radius:14px;font-size:14px;line-height:1.6;max-width:80%;align-self:flex-end;word-wrap:break-word;font-weight:500;';
      div.textContent = text; // User messages: plain text (safe)
    } else {
      div.style.cssText = 'background:#111;border:1px solid #1a1a1a;color:#bbb;padding:14px 18px;border-radius:14px;font-size:14px;line-height:1.6;max-width:85%;word-wrap:break-word;';
      div.innerHTML = sanitizeHtml(text); // Agent messages: render HTML links
    }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    var div = document.createElement('div');
    div.id = 'do-typing';
    div.style.cssText = 'background:#111;border:1px solid #1a1a1a;padding:14px 18px;border-radius:14px;max-width:70px;display:flex;gap:5px;';
    div.innerHTML = '<span style="width:7px;height:7px;background:#00ff88;border-radius:50%;animation:doBounce 1.2s infinite;"></span>'
      + '<span style="width:7px;height:7px;background:#00ff88;border-radius:50%;animation:doBounce 1.2s 0.2s infinite;"></span>'
      + '<span style="width:7px;height:7px;background:#00ff88;border-radius:50%;animation:doBounce 1.2s 0.4s infinite;"></span>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('do-typing');
    if (el) el.remove();
  }

  // ── Send ──
  async function send() {
    var msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    appendMsg('user', msg);
    showTyping();
    sendBtn.disabled = true;

    try {
      var res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: history,
          page_url: window.location.pathname
        })
      });
      hideTyping();

      if (res.status === 429) {
        appendMsg('assistant', "You're moving fast! Give me a sec and try again.");
        sendBtn.disabled = false;
        return;
      }

      var data = await res.json();
      var reply = data.reply || 'Give me a moment and try that again.';
      appendMsg('assistant', reply);
      history.push({ role: 'user', content: msg });
      history.push({ role: 'assistant', content: reply });
      if (history.length > 20) history = history.slice(-20);

    } catch (err) {
      hideTyping();
      appendMsg('assistant', "Something went sideways \u2014 try again in a sec. Or drop your handle in the free analysis for instant scripts.");
      console.error('[DarkOps Chat]', err);
    }

    sendBtn.disabled = false;
    input.focus();
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

})();
