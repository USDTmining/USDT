/* referral.js
   - Real-time referral dashboard
   - applyReferral(refCode, newUid, newUserMeta) to call from signup code
*/

const REF_REWARD = 0.3;
const firebaseConfig = {
  apiKey: "AIzaSyDR_rkTfGLWWX4NRWOVer9wwGlUFiRMRO4",
  authDomain: "usdt-login.firebaseapp.com",
  databaseURL: "https://usdt-login-default-rtdb.firebaseio.com",
  projectId: "usdt-login",
  storageBucket: "usdt-login.firebasestorage.app",
  messagingSenderId: "807602854227",
  appId: "1:807602854227:web:309ae73f572e48dbc7a9a6"
};

// Initialize Firebase if not already initialized (compat)
try {
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
} catch (e) {
  console.warn('Firebase init skipped:', e);
}

const auth = firebase.auth();
const db = firebase.database();

/* ---------- DASHBOARD: real-time user load & UI updates ---------- */
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    // keep same behavior as before
    window.location.href = 'index.html';
    return;
  }
  const uid = user.uid;
  const userRef = db.ref('users/' + uid);

  // listen for changes to this user and update UI live
  userRef.on('value', snap => {
    if (!snap.exists()) {
      window.location.href = 'index.html';
      return;
    }
    const u = snap.val();
    document.getElementById('d_username_small').innerText = u.username || '';
    document.getElementById('displayUsername').innerText = u.username || '';
    document.getElementById('displayEmail').innerText = u.email || 'N/A';
    document.getElementById('referralCode').innerText = u.referralCode || '';
    document.getElementById('referralCount').innerText = (u.invited || 0);
    document.getElementById('referralEarnings').innerText = '$' + ((u.referralEarnings || 0).toFixed(2));
    document.getElementById('d_balance').innerText = '$' + ((u.balance || 0).toFixed(2));

    // build referral link robustly
    const code = u.referralCode || '';
    const base = (location.origin && location.pathname) ? `${location.origin}${location.pathname}` : `${location.origin}/index.html`;
    // try to produce a friendly link pointing to the app root (index.html)
    const indexPath = base.replace(/\/referral\.html$/i, '/index.html').replace(/\/+$/, '/index.html');
    document.getElementById('referralLink').innerText = `${indexPath}?ref=${encodeURIComponent(code)}`;
  });

  /* Rank calculation (once, and optionally refresh on users changes) */
  computeAndRenderRank(uid);
});

/* Compute rank by invited count — safe but can be expensive if you have many users.
   For large userbases, move ranking to a backend/cloud function. */
async function computeAndRenderRank(currentUid) {
  try {
    const allSnap = await db.ref('users').get();
    if (!allSnap.exists()) return;
    const all = allSnap.val();
    const arr = [];
    for (const k in all) {
      arr.push({ uid: k, invited: all[k].invited || 0 });
    }
    arr.sort((a,b) => b.invited - a.invited);
    const pos = arr.findIndex(x => x.uid === currentUid);
    const baseRank = 834577;
    const rank = pos >= 0 ? baseRank + pos : baseRank + arr.length;
    document.getElementById('userPosition').innerText = `${rank.toLocaleString()}th`;
  } catch (err) {
    console.warn('computeAndRenderRank error:', err);
  }
}

/* ---------- COPY & SHARE handlers (defensive) ---------- */
const copyLinkBtn = document.getElementById('copyLinkBtn');
if (copyLinkBtn) {
  copyLinkBtn.addEventListener('click', async () => {
    const link = document.getElementById('referralLink').innerText || '';
    if (!link) { alert('Referral link not ready.'); return; }
    try {
      await navigator.clipboard.writeText(link);
      alert('Referral link copied!');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = link; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
      alert('Referral link copied!');
    }
  });
}

const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
  shareBtn.addEventListener('click', async () => {
    const code = document.getElementById('referralCode').innerText || '';
    const link = document.getElementById('referralLink').innerText || `${location.origin}/index.html?ref=${encodeURIComponent(code)}`;
    const imageUrl = 'https://usdtmining.github.io/USDT/img/usdt.webp';
    const text = `🚀 Join me on USDT Miner and earn free USDT!\nUse my referral code: ${code}\n${link}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'USDT Miner — Earn Free USDT', text, url: link });
      } else {
        await navigator.clipboard.writeText(`${text}\n${imageUrl}`);
        alert('Referral text copied to clipboard. Paste it to share!');
      }
    } catch (err) {
      console.warn('share error:', err);
      try {
        await navigator.clipboard.writeText(`${text}\n${imageUrl}`);
        alert('Referral text copied to clipboard. Paste it to share!');
      } catch (e) {
        prompt('Copy and share the text below:', `${text}\n${imageUrl}`);
      }
    }
  });
}

/* ---------- Referral application function (call this from signup) ----------
   Usage (example): call after user is created and their `users/{newUid}` node is written:
     await applyReferral(refCodeFromURL, newUid, { username: 'alice', email: 'a@b.c' });
   This function will:
     - find inviter by referralCode
     - ensure:
         * inviter exists
         * inviter.uid !== newUid (no self-referral)
         * new user hasn't been marked as referredBefore
     - run transactions to increment invited, referralEarnings, balance
     - add a referrals log at referrals/{inviterUid}/{newUid}
     - write users/{newUid}/referredBy = inviterUid
*/
async function applyReferral(refCode, newUid, newUserMeta = {}) {
  if (!refCode || !newUid) return { ok: false, msg: 'missing args' };
  try {
    // find inviter with matching referralCode (use index if you have one; here we scan)
    const usersSnap = await db.ref('users').orderByChild('referralCode').equalTo(refCode).limitToFirst(1).get();
    if (!usersSnap.exists()) return { ok: false, msg: 'inviter not found' };

    let inviterUid = null;
    usersSnap.forEach(s => inviterUid = s.key); // get the matching uid
    if (!inviterUid) return { ok: false, msg: 'inviter not found (2)' };
    if (inviterUid === newUid) return { ok: false, msg: 'self-referral blocked' };

    // Check if referredBy already set for new user (prevents double-credit)
    const newUserRef = db.ref('users/' + newUid + '/referredBy');
    const refBySnap = await newUserRef.get();
    if (refBySnap.exists()) return { ok: false, msg: 'already referred' };

    // Use a transaction on inviter to increment invited and balances atomically
    const inviterRef = db.ref('users/' + inviterUid);
    const txResult = await inviterRef.transaction(inviterData => {
      if (inviterData === null) return; // abort
      inviterData.invited = (inviterData.invited || 0) + 1;
      inviterData.referralEarnings = (inviterData.referralEarnings || 0) + REF_REWARD;
      inviterData.balance = (inviterData.balance || 0) + REF_REWARD;
      // optional: keep a lightweight lastReferral timestamp
      inviterData.lastReferralAt = Date.now();
      return inviterData;
    }, (error, committed, snapshot) => {
      // callback left empty — we'll check after
    }, false);

    // After transaction, set referredBy for new user and write a referral log
    await db.ref('users/' + newUid + '/referredBy').set(inviterUid);
    await db.ref(`referrals/${inviterUid}/${newUid}`).set({
      at: firebase.database.ServerValue.TIMESTAMP,
      newUserMeta: {
        username: newUserMeta.username || null,
        email: newUserMeta.email || null
      }
    });

    return { ok: true, msg: 'applied', inviterUid };
  } catch (err) {
    console.error('applyReferral error:', err);
    return { ok: false, msg: 'error', error: err };
  }
}

/* Export applyReferral for other scripts to call (window global) */
window.applyReferral = applyReferral;

/* Optional helper: call this from signup code when you have a ref param:
   Example (on signup finish):
     const ref = getUrlParam('ref');
     if (ref) await applyReferral(ref, newUid, {username, email});
*/
function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}
window.getUrlParam = getUrlParam;
