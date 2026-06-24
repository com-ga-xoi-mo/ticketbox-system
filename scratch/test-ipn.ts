async function testIpn() {
  const url = 'http://localhost:3000/payments/vnpay/ipn?vnp_Amount=120000000&vnp_BankCode=NCB&vnp_BankTranNo=VNP15597587&vnp_CardType=ATM&vnp_OrderInfo=TicketBox+payment+for+order+81cc252f-8bc0-4ded-8bf7-715cd4d5ca90&vnp_PayDate=20260624144956&vnp_ResponseCode=24&vnp_TmnCode=VVF3PT0J&vnp_TransactionNo=0&vnp_TransactionStatus=02&vnp_TxnRef=f92fbd9b-1b8f-49fe-a812-a87024f50ac8&vnp_SecureHash=ff8a076b8431a37a91897759c86c30fca9d1d3a144c71ad2b6221ee054173c3b5056305052902c6b9a5309b4bbf42b1a2ffcef3399ead14dd4de43ed227172a1';
  try {
    console.log("Sending GET request to:", url);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response: ${text}`);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testIpn();
