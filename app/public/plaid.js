
document.getElementById('link-button').addEventListener('click', async () => {
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
        // access token issues
        onSuccess: async (public_token) => {
          console.log('Public Token:', public_token);
          const accessResponse = await fetch('/api/plaid/exchange-public-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_token }),
          });
          const { access_token } = await accessResponse.json();
          console.log('Access Token:', access_token);
        },
        onExit: (err) => {
          console.log('Plaid exit:', err);
        },
      });
      handler.open();
    } catch (error) {
      console.error('Error:', error);
    }
  });