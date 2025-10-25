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

    auth.onAuthStateChanged(async (user)=>{
      if(!user){ window.location.href='index.html'; return; }
      const uid = user.uid;
      const snap = await db.ref('users/' + uid).get();
      if(!snap.exists()){ window.location.href='index.html'; return; }
      const u = snap.val();
      document.getElementById('d_username_small').innerText = u.username;
      document.getElementById('displayUsername').innerText = u.username;
      document.getElementById('displayEmail').innerText = u.email || 'N/A';
      document.getElementById('referralCode').innerText = u.referralCode;
      document.getElementById('referralCount').innerText = (u.invited || 0);
      document.getElementById('referralEarnings').innerText = '$' + ((u.referralEarnings||0).toFixed(2));
      document.getElementById('d_balance').innerText = '$' + ((u.balance||0).toFixed(2));
      document.getElementById('referralLink').innerText = `${location.origin}${location.pathname.replace('referral.html','index.html')}?ref=${encodeURIComponent(u.referralCode)}`;

      // Rank system starts at 834,577 for top user
      const baseRank = 834577;
      const allSnap = await db.ref('users').get();
      if(allSnap.exists()){
        const arr = [];
        const all = allSnap.val();
        for(const k in all){
          arr.push({ uid:k, invited:all[k].invited || 0 });
        }
        arr.sort((a,b)=>b.invited - a.invited);
        const pos = arr.findIndex(x=>x.uid===uid);
        const rank = pos >= 0 ? baseRank + pos : baseRank + arr.length;
        document.getElementById('userPosition').innerText = `${rank.toLocaleString()}th`;
      }
    });

    document.getElementById('copyLinkBtn').onclick = ()=>navigator.clipboard.writeText(document.getElementById('referralLink').innerText).then(()=>alert('Referral link copied!'));
    document.getElementById('copyCodeBtn').onclick = ()=>navigator.clipboard.writeText(document.getElementById('referralCode').innerText).then(()=>alert('Referral code copied!'));

    document.getElementById('shareBtn').onclick = ()=>{
      const code = document.getElementById('referralCode').innerText;
      const link = document.getElementById('referralLink').innerText;
      const imageUrl = 'https://coachflux.github.io/Ref/img/usdt.webp';
      const text = `🚀 Join me on USDT Miner and earn free USDT!\nUse my referral code: ${code}\n${link}`;
      
      if(navigator.share){
        navigator.share({
          title: 'USDT Miner',
          text,
          url: link,
          files: [new File([], imageUrl, {type:'image/webp'})]
        }).catch(()=>{});
      } else {
        navigator.clipboard.writeText(`${text}\n${imageUrl}`).then(()=>alert('Share info copied!'));
      }
    };
