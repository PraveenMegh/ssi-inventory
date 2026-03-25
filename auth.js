/* global SSIApp */

const SSIAuth = (() => {
  const currentUser = () => {
    const st = SSIApp.getState();
    const uid = st?.session?.user_id;
    if (!uid) return null;
    return st.users.find(u => u.id === uid && u.active);
  };

  const login = (username, password) => {
    const st = SSIApp.getState();
    const u = st.users.find(x => x.username === username && x.password === password && x.active);
    if (!u) return false;
    st.session.user_id = u.id;
    SSIApp.setState(st);
    return true;
  };

  const logout = () => {
    const st = SSIApp.getState();
    st.session.user_id = null;
    SSIApp.setState(st);
  };

  const renderLogin = () => {
    SSIApp.render(`
      <div class="min-h-screen flex items-center justify-center px-4" style="background: linear-gradient(135deg, #fff5f5 0%, #ffffff 50%, #fff0f0 100%)">
        <div class="w-full max-w-sm">

          <!-- Logo Block -->
          <div class="flex flex-col items-center mb-6">
            <img src="assets/ssi-logo-red-white.png" alt="SSI Logo"
              class="w-28 h-28 object-contain rounded-2xl"
              onerror="this.style.display='none'; document.getElementById('logoFallback').style.display='flex'" />
            <div id="logoFallback" style="display:none"
              class="w-28 h-28 rounded-2xl bg-rose-600 items-center justify-center">
              <span class="text-white font-extrabold text-3xl">SSI</span>
            </div>
            <div class="mt-3 text-center">
              <div class="text-xl font-extrabold text-slate-800">Shree Sai Industries</div>
              <div class="text-sm text-slate-500 mt-0.5">Inventory • Orders • Dispatch</div>
            </div>
          </div>

          <!-- Login Card -->
          <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-md">
            <div class="text-base font-extrabold text-slate-700 mb-4 text-center">Sign in to your account</div>

            <div class="space-y-3">
              <div>
                <label class="text-sm font-semibold text-slate-700">Username</label>
                <input id="lgUser" class="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 ring-brand text-sm" placeholder="Enter username" />
              </div>
              <div>
                <label class="text-sm font-semibold text-slate-700">Password</label>
                <input id="lgPass" type="password" class="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 ring-brand text-sm" placeholder="Enter password" />
              </div>
              <button id="btnLogin" class="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-sm tracking-wide transition-colors">🔐 Sign In</button>
            </div>

            <div class="mt-4 pt-4 border-t border-slate-100 text-center">
              <div class="text-xs text-slate-400">Default credentials</div>
              <div class="text-xs text-slate-500 font-mono mt-1">admin / admin123</div>
            </div>
          </div>

          <div class="mt-4 text-center text-xs text-slate-400">
            Unit 1 Modinagar • Unit 2 Patla
          </div>
        </div>
      </div>
    `);

    document.getElementById('btnLogin').addEventListener('click', () => {
      const u = document.getElementById('lgUser').value.trim();
      const p = document.getElementById('lgPass').value;
      if (!login(u,p)) return SSIApp.toast('Invalid username/password', 'err');
      SSIApp.toast('Login successful', 'ok');
      SSIDashboard.render();
    });
  };

  return { currentUser, login, logout, renderLogin };
})();
