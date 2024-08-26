import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { payment_config_momo } from "src/lib/payment.config";
import Transaction from "src/models/transaction/model";

const _removeTransaction = async (transactionId: string | null) => {
    if (!transactionId) return;
    await Transaction.deleteOne({_id: transactionId});
}

export const POST = async (req: NextRequest) => {
    let transactionIdGlobal: string | null = null;
  try {
    // Parse the incoming request body
    const ipnData = await req.json();

    // Log the received IPN data
    console.log("IPN received:", ipnData);
    const { accessKey, secretkey, domain, redirectUrl, ipnUrl, requestType } = payment_config_momo;

    // Validate the necessary fields
    const {
      orderType,
      amount,
      partnerCode,
      orderId,
      extraData,
      signature,
      transId,
      responseTime,
      resultCode,
      message,
      payType,
      requestId,
      orderInfo,
    } = ipnData;

    transactionIdGlobal = orderId;
    let transaction = await Transaction.findOne({_id: transactionIdGlobal});
    if (!transaction) {
        return NextResponse.json({ response: "Transaction not found"}, {status: 404})
    }

    // You may want to verify the signature to ensure the request is from MoMo
    var rawSignature = "accessKey=" + accessKey
                    + "&amount=" + amount
                    + "&extraData=" + extraData
                    + "&message=" + message
                    + "&orderId=" + orderId
                    + "&orderInfo=" + orderInfo
                    + "&orderType=" + orderType
                    + "&partnerCode=" + partnerCode
                    + "&payType=" + payType
                    + "&requestId=" + requestId
                    + "&responseTime=" + responseTime
                    + "&resultCode=" + resultCode
                    + "&transId=" + transId;
    const generatedSignature = crypto
      .createHmac("sha256", secretkey)
      .update(rawSignature)
      .digest("hex");

    if (signature !== generatedSignature) {
      console.error("Invalid signature:", signature);
      await _removeTransaction(transactionIdGlobal);
      return NextResponse.json(
        { response: {
            message: "Invalid signature",
            resultCode: 1 // Error code
        } },
        { status: 404 }
      );
    }

    // Process the IPN (e.g., update the order status in your database)
    // Example: await updateOrderStatus(orderId, "paid");

    // Return a successful response to MoMo
    return NextResponse.json(
      { response: {
            message: "Success",
            resultCode: 0
      } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error handling IPN:", error);
    await _removeTransaction(transactionIdGlobal);
    return NextResponse.json(
      { response: {
            message: "Error",
            resultCode: 1 // Error code
      } },
      { status: 500 }
    );
  }
};
