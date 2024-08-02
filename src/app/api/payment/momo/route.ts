import { NextRequest, NextResponse } from "next/server";
import { payment_config_momo } from "src/lib/payment.config";
import * as crypto from 'crypto';
import * as https from 'https';

interface MoMoResponse {
    partnerCode: string;
    requestId: string;
    orderId: string;
    amount: number;
    responseTime: number;
    message: string;
    resultCode: number;
    payUrl: string;
    deeplink: string | undefined | null;
    qrCodeUrl: string | undefined | null;
    deeplinkMiniApp: string | undefined | null;
    signature: string | undefined | null;
    userFee: number | undefined | null;
}

export const POST = async (req: NextRequest) => {
  try {
    const payload = await req.json();
    const {transactionId, description, amount} = payload;
    const { partnerCode, accessKey, secretkey, domain, redirectUrl, ipnUrl, requestType, extraData } = payment_config_momo;
    
    var requestId = partnerCode + new Date().getTime();
    var orderId = transactionId;
    var orderInfo = description;

    //create HMAC SHA256 signature
    var rawSignature = "accessKey=" + accessKey
                    + "&amount=" + amount
                    + "&extraData=" + extraData
                    + "&ipnUrl=" + ipnUrl
                    + "&orderId=" + orderId
                    + "&orderInfo=" + orderInfo
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
    const requestBody = JSON.stringify({
        partnerCode : partnerCode,
        requestId : requestId,
        amount : amount,
        orderId : orderId,
        orderInfo : orderInfo,
        redirectUrl : redirectUrl,
        ipnUrl : ipnUrl,
        requestType : requestType,
        extraData : extraData,
        lang: 'en',
        signature : signature,
    });

    const endpoint = 'https://' + domain + '/v2/gateway/api/create';
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    }

    const res = await fetch(endpoint, {...options})
    const momoResponse = await res.json() as MoMoResponse;
    console.log(momoResponse)

    // const options = {
    //     hostname: domain,
    //     port: 443,
    //     path: '/v2/gateway/api/create',
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'Content-Length': Buffer.byteLength(requestBody)
    //     }
    // }

    // //Send the request and get the response
    // let data = '';
    // const request = https.request(options, res => {
    //     console.log(`Status: ${res.statusCode}`);
    //     console.log(`Headers: ${JSON.stringify(res.headers)}`);
    //     res.setEncoding('utf8');

    //     res.on('data', (chunk) => { 
    //         data += chunk.toString(); 
    //     }); 
    
    //     res.on('end', () => { 
    //         if (!res.complete) {
    //             throw new Error(`The connection was terminated while the message was still being sent`);
    //         }
    //         const body = JSON.parse(data); 
    //         console.log("body: ", body); 
    //     }); 
    // });

    // request.end();

    if (!momoResponse){
        return NextResponse.json({ response: "Empty response from Momo"}, {status: 502})
    }

    // List result code from Momo: https://developers.momo.vn/v3/docs/payment/api/result-handling/resultcode/
    // 0: Success
    // Others: Failed
    if (momoResponse.resultCode !== 0) {
        return NextResponse.json({ response: `Payment failed. Momo error code ${momoResponse.resultCode} - ${momoResponse.message}`}, {status: 502})
    }

    return NextResponse.json({response: momoResponse}, {status: 200})
    
  } catch (error) {
      console.log(error)
      return NextResponse.json({ response: "Failed to execute: " + error}, {status: 500})
  }
}
