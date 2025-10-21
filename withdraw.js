// Withdraw logic //
    function toggleWithdraw() {
      const withdrawal = document.getElementById('withdrawal');
      withdrawal.style.display = withdrawal.style.display === 'block' ? 'none' : 'block';
    }

    function submitWithdraw() {
      const wallet = document.getElementById('wallet');
      const amount = document.getElementById('amount');
      const popup = document.getElementById('processingPopup');
      const loader = document.getElementById('loader');
      const errorMsg = document.getElementById('errorMsg');

      if (!wallet.value || !amount.value) {
        alert('Fill in details');
        return;
      }

      const val = parseFloat(amount.value.replace('$',''));
      const bal = parseFloat(localStorage.getItem('balance') || '0');

      if (val > bal) {
        amount.classList.add('invalid');
        amount.value = 'Invalid Amount';
        setTimeout(() => {
          amount.value = '';
        }, 2000);
        return;
      }

      loader.style.display = 'block';
      setTimeout(() => {
        loader.style.display = 'none';
        popup.style.display = 'block';
        setTimeout(() => {
          errorMsg.textContent = "🚫 Your transaction cannot be processed now. You must reach Supreme rank.";
        }, 45000);
      }, 5000);
    }

    function closePopup() {
      document.getElementById('processingPopup').style.display = 'none';
      document.getElementById('errorMsg').textContent = '';
    }

    // Dark Mode Toggle
    document.getElementById('darkModeToggle').onclick = function() {
      document.body.classList.toggle('dark-mode');
    };
