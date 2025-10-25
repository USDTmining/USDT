
  const firebaseConfig = {
    apiKey: "AIzaSyDR_rkTfGLWWX4NRWOVer9wwGlUFiRMRO4",
    authDomain: "usdt-login.firebaseapp.com",
    databaseURL: "https://usdt-login-default-rtdb.firebaseio.com",
    projectId: "usdt-login",
    storageBucket: "usdt-login.firebasestorage.app",
    messagingSenderId: "807602854227",
    appId: "1:807602854227:web:309ae73f572e48dbc7a9a6"
  };

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.database();
  const REF_REWARD = 0.3;

  // Load user info
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    const uid = user.uid;
    const snap = await db.ref('users/' + uid).get();
    if (!snap.exists()) {
      window.location.href = 'index.html';
      return;
    }

    const u = snap.val();
    document.getElementById('d_username_small').innerText = u.username;
    document.getElementById('displayUsername').innerText = u.username;
    document.getElementById('displayEmail').innerText = u.email || 'N/A';
    document.getElementById('referralCode').innerText = u.referralCode;
    document.getElementById('referralCount').innerText = (u.invited || 0);
    document.getElementById('referralEarnings').innerText = '$' + ((u.referralEarnings || 0).toFixed(2));
    document.getElementById('d_balance').innerText = '$' + ((u.balance || 0).toFixed(2));

    // generate link dynamically
    const refLink = `${location.origin}/USDT/index.html?ref=${encodeURIComponent(u.referralCode)}`;
    document.getElementById('referralLink').innerText = refLink;

    // rank calculation
    const baseRank = 834577;
    const allSnap = await db.ref('users').get();
    if (allSnap.exists()) {
      const arr = [];
      const all = allSnap.val();
      for (const k in all) {
        arr.push({ uid: k, invited: all[k].invited || 0 });
      }
      arr.sort((a, b) => b.invited - a.invited);
      const pos = arr.findIndex(x => x.uid === uid);
      const rank = pos >= 0 ? baseRank + pos : baseRank + arr.length;
      document.getElementById('userPosition').innerText = `${rank.toLocaleString()}th`;
    }
  });

  // Copy referral link
  document.getElementById('copyLinkBtn').onclick = async () => {
    const text = document.getElementById('referralLink').innerText;
    if (!text) return alert('Referral link not ready yet!');
    try {
      await navigator.clipboard.writeText(text);
      alert('Referral link copied successfully!');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      alert('Referral link copied successfully!');
    }
  };

  // SHARE BUTTON — Referring others
  document.getElementById('shareBtn').onclick = async () => {
    const code = document.getElementById('referralCode').innerText || '';
    const link = document.getElementById('referralLink').innerText || '';
    const imageUrl = 'https://usdtmining.github.io/USDT/img/usdt.webp';
    const shareText = `🚀 Join me on USDT Miner and earn free USDT daily!\nUse my referral code: ${code}\n${link}`;

    try {
      if (navigator.share) {
        // Basic share (supported on most mobile browsers)
        await navigator.share({
          title: 'USDT Miner — Earn Free USDT!',
          text: shareText,
          url: link
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(`${shareText}\n${imageUrl}`);
        alert('Your referral link and code have been copied! Share it with your friends to earn.');
      }
    } catch (err) {
      console.warn('Share failed or cancelled:', err);
      await navigator.clipboard.writeText(`${shareText}\n${imageUrl}`);
      alert('Your referral info was copied. Paste it to share!');
    }
  };

  // Navigation handler (bottom nav animations)
  function handleNavClick(el, href) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (el.classList.contains('nav-item')) el.classList.add('active');
    setTimeout(() => window.location.href = href, 300);
  }



