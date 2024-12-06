// document.addEventListener('DOMContentLoaded', function(){}
document.addEventListener('DOMContentLoaded', function(){
  // menu items funcitonality
  const menuItems = document.querySelectorAll('.menu-item');        
  menuItems.forEach(item => {
      item.addEventListener('click', () => {
          menuItems.forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
  
          const pageTitle = document.querySelector('.page-title');
          const pageName = item.querySelector('span:last-child').textContent;
          pageTitle.textContent = pageName;
      });
  });

  const linkButton = document.getElementById('plaid-link-button');
  linkButton.addEventListener('click', async () => {
    try {
     // Fetch the linkk token from the backend
      const response = await fetch('/api/plaid/link-token');
      const data = await response.json();
      
      // Ensure that we received a link token
      if (!data.link_token) {
        console.error('Failed to retrieve link token');
        return;
      }
      // Initialize Plaid with the link token
      const handler = Plaid.create({
        token: data.link_token,
        // get public_token
        onSuccess: async (public_token) => {
          console.log('Public Token:', public_token);
          const accessResponse = await fetch('/api/plaid/exchange-public-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_token }),
          });
          const { access_token } = await accessResponse.json();
         
          loadAccounts(access_token);

        },
        onExit: (err) => {
          console.log('Plaid exit:', err);
        },
      });
      handler.open();
    } 
    catch (error) {
      console.error('Error:', error);
    }
  });
});

// Function to load and display linked accounts
async function loadAccounts(access_token) {

  try {
      const accountsContainer = document.getElementById('linked-accounts-container');
      const response = await fetch('/api/plaid/account-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token })
      });
      
      const accounts = await response.json();
      
      if (!accounts.length) {
          accountsContainer.innerHTML = '<p>No linked accounts found</p>';
          return;
      }

      accountsContainer.innerHTML = accounts.map(account => `
          <div class="account-item">
              <div class="account-info">
                  <h3>${account.name}</h3>
                  <p>${account.official_name || ''}</p>
                  <p>Balance: $${account.balances.current.toFixed(2)}</p>
              </div>
              <button 
                  onclick="unlinkAccount('${access_token}')" 
                  class="unlink-button">
                  Unlink
              </button>
          </div>
      `).join('');
  } catch (error) {
      console.error('Error loading accounts:', error);
      accountsContainer.innerHTML = '<p>Error loading accounts. Please try again.</p>';
  }
}

// Function to unlink account
async function unlinkAccount(access_token) {
  console.log("unlink access",access_token);
  try {
      const response = await fetch('/api/plaid/unlink-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken:access_token })
      });

      if (!response.ok) {
          throw new Error('Failed to unlink account');
      }

      // Refresh the accounts display
      loadAccounts(access_token);
  } catch (error) {
      console.error('Error unlinking account:', error);
      alert('Failed to unlink account. Please try again.');
  }
}