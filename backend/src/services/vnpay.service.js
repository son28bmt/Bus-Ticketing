const crypto = require('crypto');
const querystring = require('qs');
const moment = require('moment');

class VNPayService {
  constructor() {
    // VNPay sandbox configuration
    this.vnp_TmnCode = process.env.VNP_TMN_CODE || 'CGKBF9L2'; // Sandbox TMN code
    this.vnp_HashSecret = process.env.VNP_HASH_SECRET || 'VWDAGSDYWTQVYBOXGLCNLXZPJSRHJY'; // Sandbox hash secret
    this.vnp_Url = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.vnp_ReturnUrl = process.env.VNP_RETURN_URL || 'http://localhost:5173/payment/vnpay/return';
    this.vnp_Api = process.env.VNP_API || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';
  }

  /**
   * Tạo URL thanh toán VNPay
   * @param {Object} params - Thông tin thanh toán
   * @param {string} params.orderId - Mã đơn hàng
   * @param {number} params.amount - Số tiền (VND)
   * @param {string} params.orderDescription - Mô tả đơn hàng
   * @param {string} params.ipAddr - IP address của khách hàng
   * @param {string} params.locale - Ngôn ngữ (vn/en)
   * @returns {string} URL thanh toán
   */
  createPaymentUrl(params) {
    try {
      const {
        orderId,
        amount,
        orderDescription,
        ipAddr,
        locale = 'vn',
        bankCode = null,
        orderType = 'other'
      } = params;

      const createDate = moment().format('YYYYMMDDHHmmss');
      const expireDate = moment().add(15, 'minutes').format('YYYYMMDDHHmmss');

      let vnp_Params = {
        'vnp_Version': '2.1.0',
        'vnp_Command': 'pay',
        'vnp_TmnCode': this.vnp_TmnCode,
        'vnp_Locale': locale,
        'vnp_CurrCode': 'VND',
        'vnp_TxnRef': orderId,
        'vnp_OrderInfo': orderDescription,
        'vnp_OrderType': orderType,
        'vnp_Amount': amount * 100, // VNPay yêu cầu amount * 100
        'vnp_ReturnUrl': this.vnp_ReturnUrl,
        'vnp_IpAddr': ipAddr,
        'vnp_CreateDate': createDate,
        'vnp_ExpireDate': expireDate
      };

      if (bankCode) {
        vnp_Params['vnp_BankCode'] = bankCode;
      }

      // Sắp xếp parameters theo alphabetical order
      vnp_Params = this.sortObject(vnp_Params);

      // Tạo query string
      const signData = querystring.stringify(vnp_Params, { encode: false });
      
      // Tạo secure hash
      const hmac = crypto.createHmac("sha512", this.vnp_HashSecret);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
      vnp_Params['vnp_SecureHash'] = signed;

      // Tạo payment URL
      const paymentUrl = this.vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: false });

      console.log('✅ VNPay payment URL created:', { orderId, amount, paymentUrl: paymentUrl.substring(0, 100) + '...' });

      return paymentUrl;
    } catch (error) {
      console.error('❌ Error creating VNPay payment URL:', error);
      throw new Error('Không thể tạo URL thanh toán VNPay');
    }
  }

  /**
   * Xác thực chữ ký trả về từ VNPay
   * @param {Object} vnpParams - Parameters từ VNPay return/IPN
   * @returns {boolean} - True nếu chữ ký hợp lệ
   */
  verifyReturnUrl(vnpParams) {
    try {
      const secureHash = vnpParams['vnp_SecureHash'];
      delete vnpParams['vnp_SecureHash'];
      delete vnpParams['vnp_SecureHashType'];

      // Sắp xếp parameters
      const sortedParams = this.sortObject(vnpParams);
      const signData = querystring.stringify(sortedParams, { encode: false });

      // Tạo secure hash để so sánh
      const hmac = crypto.createHmac("sha512", this.vnp_HashSecret);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

      const isValid = signed === secureHash;
      
      console.log('🔍 VNPay signature verification:', { isValid, orderId: vnpParams.vnp_TxnRef });
      
      return isValid;
    } catch (error) {
      console.error('❌ Error verifying VNPay signature:', error);
      return false;
    }
  }

  /**
   * Xử lý kết quả trả về từ VNPay
   * @param {Object} vnpParams - Parameters từ VNPay
   * @returns {Object} - Kết quả xử lý
   */
  processReturn(vnpParams) {
    try {
      // Xác thực chữ ký
      const isValidSignature = this.verifyReturnUrl({ ...vnpParams });
      
      if (!isValidSignature) {
        return {
          success: false,
          code: 'INVALID_SIGNATURE',
          message: 'Chữ ký không hợp lệ'
        };
      }

      const {
        vnp_TxnRef: orderId,
        vnp_Amount: amount,
        vnp_OrderInfo: orderInfo,
        vnp_ResponseCode: responseCode,
        vnp_TransactionNo: transactionNo,
        vnp_BankCode: bankCode,
        vnp_PayDate: payDate,
        vnp_TransactionStatus: transactionStatus
      } = vnpParams;

      // Kiểm tra response code
      const isSuccess = responseCode === '00';
      
      const result = {
        success: isSuccess,
        code: responseCode,
        message: this.getResponseMessage(responseCode),
        data: {
          orderId,
          amount: parseInt(amount) / 100, // Convert back từ VND * 100
          orderInfo,
          transactionNo,
          bankCode,
          payDate,
          transactionStatus,
          rawParams: vnpParams
        }
      };

      console.log('🔄 VNPay return processed:', { 
        orderId, 
        success: isSuccess, 
        responseCode, 
        transactionNo 
      });

      return result;
    } catch (error) {
      console.error('❌ Error processing VNPay return:', error);
      return {
        success: false,
        code: 'PROCESSING_ERROR',
        message: 'Lỗi xử lý kết quả thanh toán'
      };
    }
  }

  /**
   * Tra cứu giao dịch VNPay
   * @param {Object} params - Thông tin tra cứu
   * @param {string} params.orderId - Mã đơn hàng
   * @param {string} params.transDate - Ngày giao dịch (yyyyMMdd)
   * @returns {Object} - Kết quả tra cứu
   */
  async queryTransaction(params) {
    try {
      const { orderId, transDate } = params;
      
      const requestId = moment().format('YYYYMMDDHHmmss');
      const createDate = moment().format('YYYYMMDDHHmmss');

      let vnp_Params = {
        'vnp_Version': '2.1.0',
        'vnp_Command': 'querydr',
        'vnp_TmnCode': this.vnp_TmnCode,
        'vnp_TxnRef': orderId,
        'vnp_OrderInfo': `Tra cuu don hang ${orderId}`,
        'vnp_TransactionDate': transDate,
        'vnp_CreateDate': createDate,
        'vnp_IpAddr': '127.0.0.1',
        'vnp_RequestId': requestId
      };

      // Sắp xếp parameters
      vnp_Params = this.sortObject(vnp_Params);

      // Tạo secure hash
      const signData = querystring.stringify(vnp_Params, { encode: false });
      const hmac = crypto.createHmac("sha512", this.vnp_HashSecret);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
      vnp_Params['vnp_SecureHash'] = signed;

      // Gửi request tới VNPay API
      const response = await fetch(this.vnp_Api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vnp_Params)
      });

      const result = await response.json();
      
      console.log('🔍 VNPay query result:', { orderId, responseCode: result.vnp_ResponseCode });

      return {
        success: result.vnp_ResponseCode === '00',
        code: result.vnp_ResponseCode,
        message: this.getResponseMessage(result.vnp_ResponseCode),
        data: result
      };

    } catch (error) {
      console.error('❌ Error querying VNPay transaction:', error);
      return {
        success: false,
        code: 'QUERY_ERROR',
        message: 'Lỗi tra cứu giao dịch'
      };
    }
  }

  /**
   * Sắp xếp object theo alphabetical order
   * @param {Object} obj - Object cần sắp xếp
   * @returns {Object} - Object đã được sắp xếp
   */
  sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    keys.forEach(key => {
      sorted[key] = obj[key];
    });
    return sorted;
  }

  /**
   * Lấy message từ response code
   * @param {string} code - Response code từ VNPay
   * @returns {string} - Message tương ứng
   */
  getResponseMessage(code) {
    const messages = {
      '00': 'Giao dịch thành công',
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
      '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
      '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
      '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
      '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
      '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch.',
      '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
      '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
      '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
      '75': 'Ngân hàng thanh toán đang bảo trì.',
      '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch',
      '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)'
    };

    return messages[code] || `Lỗi không xác định (${code})`;
  }

  /**
   * Lấy danh sách ngân hàng hỗ trợ
   * @returns {Array} - Danh sách ngân hàng
   */
  getSupportedBanks() {
    return [
      { code: 'NCB', name: 'Ngân hàng NCB' },
      { code: 'AGRIBANK', name: 'Ngân hàng Agribank' },
      { code: 'SCB', name: 'Ngân hàng SCB' },
      { code: 'SACOMBANK', name: 'Ngân hàng SacomBank' },
      { code: 'EXIMBANK', name: 'Ngân hàng EximBank' },
      { code: 'MSBANK', name: 'Ngân hàng MSBANK' },
      { code: 'NAMABANK', name: 'Ngân hàng NamABank' },
      { code: 'VNMART', name: 'Ví VnMart' },
      { code: 'VIETINBANK', name: 'Ngân hàng Vietinbank' },
      { code: 'VIETCOMBANK', name: 'Ngân hàng VCB' },
      { code: 'HDBANK', name: 'Ngân hàng HDBank' },
      { code: 'DONGABANK', name: 'Ngân hàng Đông Á' },
      { code: 'TPBANK', name: 'Ngân hàng TPBank' },
      { code: 'OJB', name: 'Ngân hàng OceanBank' },
      { code: 'BIDV', name: 'Ngân hàng BIDV' },
      { code: 'TECHCOMBANK', name: 'Ngân hàng Techcombank' },
      { code: 'VPBANK', name: 'Ngân hàng VPBank' },
      { code: 'MBBANK', name: 'Ngân hàng MBBank' },
      { code: 'ACB', name: 'Ngân hàng ACB' },
      { code: 'OCB', name: 'Ngân hàng OCB' },
      { code: 'IVB', name: 'Ngân hàng IVB' },
      { code: 'VISA', name: 'Thanh toán qua VISA/MASTER' }
    ];
  }
}

module.exports = VNPayService;