import { NextRequest, NextResponse } from "next/server";
import { payment_config_momo } from "src/lib/payment.config";
import * as crypto from 'crypto';
import { connectMongoDB } from "src/config/connectMongoDB";
import Transaction from "src/models/transaction/model";
import { verifyAuth } from "src/lib/authentication";

interface MoMoResponse {
    partnerCode: string;
    requestId: string;
    orderId: string;
    amount: number;
    responseTime: number;
    message: string;
    resultCode: number;
    payUrl: string;
    deeplink?: string;
    qrCodeUrl?: string;
    deeplinkMiniApp?: string;
    signature?: string;
    userFee?: number;
}

const _removeTransaction = async (transactionId: string | null) => {
    if (!transactionId) return;
    await Transaction.deleteOne({_id: transactionId});
}

export const POST = async (req: NextRequest) => {
    let transactionIdGlobal: string | null = null;
  try {
    await connectMongoDB();

    const verification = await verifyAuth(req.headers)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    const authUser = verification.response;

    const payload = await req.json();
    const {transactionId} = payload;
    transactionIdGlobal = transactionId;

    let transaction = await Transaction.findOne({_id: transactionId});
    if (!transaction) {
        return NextResponse.json({ response: "Transaction not found"}, {status: 404})
    }

    if (transaction.userId.toString() !== authUser._id.toString()) {
        return NextResponse.json({ response: "Unauthorized"}, {status: 401})
    }

    const { partnerCode, accessKey, secretkey, domain, redirectUrl, ipnUrl, requestType, extraData } = payment_config_momo;
    
    var requestId = partnerCode + new Date().getTime();
    var amount = transaction.amount;
    var userId = transaction.userId;
    var orderId = transactionId;
    var orderInfo = `Pay with MoMo ${transactionId} ${transaction.description ?? ""}`;

    //create HMAC SHA256 signature
    var rawSignature = "accessKey=" + accessKey
                    + "&amount=" + amount
                    + "&extraData=" + extraData
                    + "&ipnUrl=" + ipnUrl
                    + "&orderId=" + orderId
                    + "&orderInfo=" + orderInfo
                    // + "&partnerClientId=" + userId
                    + "&partnerCode=" + partnerCode
                    + "&redirectUrl=" + redirectUrl
                    + "&requestId=" + requestId
                    + "&requestType=" + requestType;
    
    var signature = crypto.createHmac('sha256', secretkey)
        .update(rawSignature)
        .digest('hex');
    console.log("--------------------SIGNATURE----------------")
    console.log(rawSignature)
    console.log(signature)

    //json object send to MoMo endpoint
    const requestBody = {
        partnerCode : partnerCode,
        requestId : requestId,
        amount : amount,
        orderId : orderId,
        orderInfo : orderInfo,
        redirectUrl : redirectUrl,
        ipnUrl : ipnUrl,
        // partnerClientId: userId,
        requestType : requestType,
        extraData : extraData,
        lang: 'en',
        signature : signature,
    };

    console.log("requestBody: ", requestBody)

    const endpoint = 'https://' + domain + '/v2/gateway/api/create';
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'Content-Length': String(Buffer.byteLength(JSON.stringify(requestBody)))
        },
        body: JSON.stringify(requestBody)
    }

    const res = await fetch(endpoint, {...options})
    const momoResponse = await res.json() as MoMoResponse;
    console.log("Momo Response: ", momoResponse)


    if (!momoResponse){
        // TODO: Handle empty response from Momo - remove transaction from database
        await _removeTransaction(transactionId);
        return NextResponse.json({ response: "Empty response from Momo"}, {status: 502})
    }

    // List result code from Momo: https://developers.momo.vn/v3/docs/payment/api/result-handling/resultcode/
    // 0: Success
    // Others: Failed
    if (momoResponse.resultCode !== 0) {
        // TODO: Handle failed payment - remove transaction from database
        await _removeTransaction(transactionId);
        return NextResponse.json({ response: `Payment failed. Momo error code ${momoResponse.resultCode} - ${momoResponse.message}`}, {status: 400})
    }
    
    return NextResponse.json({response: momoResponse}, {status: 200})
    
  } catch (error) {
    // TODO: Handle error - remove transaction from database
      console.log(error)
      await _removeTransaction(transactionIdGlobal);
      return NextResponse.json({ response: "Failed to execute: " + error}, {status: 500})
  }
}
