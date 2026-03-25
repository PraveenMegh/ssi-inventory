/* SSI Auth Module */
const SSIAuth = (() => {

  function renderLogin() {
    document.getElementById('app').innerHTML = `
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Inter',sans-serif; background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%); min-height:100vh; display:flex; align-items:center; justify-content:center; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
      </style>
      <div style="width:100%;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:#fff;border-radius:20px;box-shadow:0 25px 60px rgba(0,0,0,.4);padding:40px;width:100%;max-width:420px;animation:fadeUp .5s ease;">
          <!-- Logo -->
          <div style="text-align:center;margin-bottom:32px;">
            <div style="width:80px;height:80px;background:linear-gradient(135deg,#e11d2e,#c41525);border-radius:20px;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:24px;color:#fff;letter-spacing:-1px;box-shadow:0 8px 20px rgba(225,29,46,.3);margin-bottom:16px;">SSI</div>
            <h1 style="font-size:22px;font-weight:800;color:#111827;">Shree Sai Industries</h1>
            <p style="color:#64748b;font-size:13px;margin-top:4px;">Inventory Management System</p>
          </div>

          <!-- Form -->
          <div style="margin-bottom:16px;">
            <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Username</label>
            <input id="login-user" type="text" placeholder="Enter username" autocomplete="username"
              style="width:100%;padding:12px 16px;border:2px solid #e2e8f0;border-radius:10px;font-size:15px;outline:none;transition:border .2s;"
              onfocus="this.style.borderColor='#e11d2e'" onblur="this.style.borderColor='#e2e8f0'">
          </div>
          <div style="margin-bottom:24px;">
            <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Password</label>
            <input id="login-pass" type="password" placeholder="Enter password" autocomplete="current-password"
              style="width:100%;padding:12px 16px;border:2px solid #e2e8f0;border-radius:10px;font-size:15px;outline:none;transition:border .2s;"
              onfocus="this.style.borderColor='#e11d2e'" onblur="this.style.borderColor='#e2e8f0'">
          </div>
          <button id="login-btn"
            style="width:100%;padding:14px;background:linear-gradient(135deg,#e11d2e,#c41525);color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(225,29,46,.3);transition:transform .1s;"
            onmousedown="this.style.transform='scale(.98)'" onmouseup="this.style.transform='scale(1)'">
            Sign In →
          </button>
          <div id="login-err" style="display:none;margin-top:12px;padding:10px 14px;background:#fee2e2;color:#991b1b;border-radius:8px;font-size:13px;text-align:center;"></div>

          <!-- Default credentials hint -->
          <div style="margin-top:24px;padding:14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
            <p style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;">Default Credentials:</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;color:#94a3b8;">
              <span>Admin: admin / admin123</span>
              <span>Stock: stock1 / stock123</span>
              <span>Dispatch: dispatch1 / dispatch123</span>
              <span>Sales: sales1 / sales123</span>
            </div>
          </div>
        </div>
      </div>`;

    const doLogin = () => {
      const u = document.getElementById('login-user').value.trim();
      const p = document.getElementById('login-pass').value;
      const err = document.getElementById('login-err');
      if (!u || !p) { err.textContent = 'Please enter username and password.'; err.style.display='block'; return; }
      if (SSIApp.login(u, p)) {
        err.style.display = 'none';
        SSIApp.bootstrap();
      } else {
        err.textContent = 'Invalid username or password.';
        err.style.display = 'block';
      }
    };

    document.getElementById('login-btn').onclick = doLogin;
    document.getElementById('login-pass').onkeydown = e => { if (e.key==='Enter') doLogin(); };
  }

  function logout() {
    SSIApp.logout();
    renderLogin();
  }

  return { renderLogin, logout };
})();
