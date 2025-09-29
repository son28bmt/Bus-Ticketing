// VNPay Integration Test Script
// Run this in browser console to test VNPay flow

console.log('🚀 Starting VNPay Integration Test...');

// Test data
const testBookingData = {
  tripId: 1,
  passengerName: "Nguyen Van Test",
  passengerPhone: "0901234567", 
  passengerEmail: "test@example.com",
  seatNumbers: ["A1"],
  paymentMethod: "VNPAY",
  notes: "Test booking for VNPay"
};

// Get auth token from localStorage
const userStore = JSON.parse(localStorage.getItem('user-store') || '{}');
const token = userStore?.state?.token;

if (!token) {
  console.error('❌ No auth token found. Please login first.');
} else {
  console.log('✅ Auth token found:', token.substring(0, 20) + '...');
}

// Test 1: Create booking with VNPay
async function testCreateBooking() {
  console.log('\n📝 Test 1: Creating booking with VNPay...');
  
  try {
    const response = await fetch('http://localhost:5001/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testBookingData)
    });
    
    const result = await response.json();
    console.log('Booking API Response:', result);
    
    if (result.success) {
      console.log('✅ Booking created successfully:', result.data.booking.bookingCode);
      return result.data.booking.id;
    } else {
      console.error('❌ Booking failed:', result.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Booking API error:', error);
    return null;
  }
}

// Test 2: Create VNPay payment URL
async function testCreateVNPayUrl(bookingId) {
  console.log('\n💳 Test 2: Creating VNPay payment URL...');
  
  try {
    const response = await fetch('http://localhost:5001/api/payment/vnpay/create-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        bookingId: bookingId,
        bankCode: '' // Optional
      })
    });
    
    const result = await response.json();
    console.log('VNPay URL API Response:', result);
    
    if (result.success) {
      console.log('✅ VNPay URL created successfully:', result.data.paymentUrl);
      console.log('📋 Order ID:', result.data.orderId);
      console.log('💰 Amount:', new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(result.data.amount));
      
      // Ask user if they want to redirect
      const shouldRedirect = confirm('Do you want to redirect to VNPay sandbox for testing?');
      if (shouldRedirect) {
        window.open(result.data.paymentUrl, '_blank');
      }
      
      return result.data;
    } else {
      console.error('❌ VNPay URL creation failed:', result.message);
      return null;
    }
  } catch (error) {
    console.error('❌ VNPay URL API error:', error);
    return null;
  }
}

// Test 3: Test VNPay banks API
async function testVNPayBanks() {
  console.log('\n🏦 Test 3: Getting VNPay supported banks...');
  
  try {
    const response = await fetch('http://localhost:5001/api/payment/vnpay/banks');
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ VNPay banks loaded:', result.data.length, 'banks');
      console.log('First 5 banks:', result.data.slice(0, 5).map(bank => `${bank.code}: ${bank.name}`));
    } else {
      console.error('❌ VNPay banks failed:', result.message);
    }
  } catch (error) {
    console.error('❌ VNPay banks API error:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🎯 Running VNPay Integration Tests...\n');
  
  // Test banks API first (no auth needed)
  await testVNPayBanks();
  
  if (token) {
    // Test booking creation
    const bookingId = await testCreateBooking();
    
    if (bookingId) {
      // Test VNPay URL creation
      await testCreateVNPayUrl(bookingId);
    }
  }
  
  console.log('\n✅ VNPay Integration Tests Completed!');
  console.log('📝 Next steps:');
  console.log('1. If VNPay URL was created, test payment flow in sandbox');
  console.log('2. Check return URL handling at /payment/vnpay/return');
  console.log('3. Verify transaction status updates in database');
}

// Auto-run tests
runAllTests().catch(console.error);