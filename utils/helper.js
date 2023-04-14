const Sib = require('sib-api-v3-sdk');
require('dotenv').config();
const nodemailer = require('nodemailer');
const SettingMaster = require("./../models/admin/settingMaster");

exports.createRandomNumber = () => {
    return Math.floor(1000 + Math.random() * 9000);
};

exports.makeid = (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
};



// exports.sendMail = (subject, textContent, senderName, email, html) => {

//     const apikey = process.env.SIB_API_KEY;

//     const defaulClient = Sib.ApiClient.instance;
//     const apiKey = defaulClient.authentications['api-key'];
//     apiKey.apiKey = apikey;

//     const tranEmailApi = new Sib.TransactionalEmailsApi();

//     const sender = {
//         email: 'himansu.malla@ntspl.co.in',
//         name: 'OMC Admin',
//     }

//     const receivers = [{
//         email: email,
//     }, ]

//     tranEmailApi
//         .sendTransacEmail({
//             sender,
//             to: receivers,
//             subject: subject,
//             textContent: textContent,
//             htmlContent: `<div align="center">
//                             <table cellspacing="0" cellpadding="0" width="580" bgcolor="#E8E8E8">
//                                 <tbody>
//                                     <tr>
//                                         <td>
//                                             <table cellspacing="0" cellpadding="0" width="580" bgcolor="#FFFFFF" style="border-style:solid;border-color:#b4bcbc;border-width:1px">
//                                                 <tbody>
//                                                     <tr>
//                                                         <td>
//                                                             <table border="0" cellspacing="0" cellpadding="0" width="500" bgcolor="#FFFFFF" valign="center" align="center" style="margin-right:50px;margin-left: 50px;">
//                                                                 <tbody>
//                                                                     <tr>
//                                                                         <td style="padding:30px 0px 0px;color:#080808;font-weight:lighter;font-family:Helvetica;font-size:12px;line-height:180%;vertical-align:top;text-align:center">
//                                                                             <span><a href="https://demo.ntspl.co.in/omc-cms" style="color:#080808;text-decoration:none;outline:none" target="_blank" data-saferedirecturl="https://demo.ntspl.co.in/omc-cms"><img src="https://demo.ntspl.co.in/omc-cms//assets/images/OMC-Logo.png" style="border:none;outline:none;width:200px;" class="CToWUd"></a><br></span>
//                                                                         </td>
//                                                                     </tr>
//                                                                     <tr>
//                                                                         <td cellpadding="0" align="center" bgcolor="#FFFFFF" style="border-collapse:collapse;color:black;font-family:Arial,Tahoma,Verdana,sans-serif;font-size:14px;font-weight:500;margin:0;text-align:left;line-height:165%;letter-spacing:0;padding-top:20px;padding-bottom:60px">
//                                                                             <p>Dear ${senderName},</p>
//                                                                             <p>Greetings from OMC Reads</p>

//                                                                             ${html}

//                                                                             Thanks & Regards,<br/>
//                                                                             OMC Reads
//                                                                         </td>
//                                                                     </tr>
//                                                                 </tbody>
//                                                             </table>
//                                                         </td>
//                                                     </tr>
//                                                 </tbody>
//                                             </table>
//                                         </td>
//                                     </tr>
//                                 </tbody>
//                             </table>
//                         </div>`
//         })
//         .then(() => {
//             return 1;
//         })
//         .catch((err) => {
//             return 2;
//         });
// };


exports.validatePhone = (mobileNumber) => {

    return String(mobileNumber)
        .toLowerCase()
        .match(
            /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
        );
}

exports.validateEmail = (email) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
}


exports.sendMail = async(subject, textContent, senderName, email, html) => {

    let from = 'test.ntspl@ntspl.co.in';

    let message = '';

    const existingSettingByDetails = await SettingMaster.findOne({
        status: 1,
        deleted: 0
    }, {
        'host': 1,
        'password': 1,
        'port': 1,
        'service': 1,
        'username': 1,
    });

    let host = existingSettingByDetails.host;
    let password = existingSettingByDetails.password;
    let port = existingSettingByDetails.port;
    let service = existingSettingByDetails.service;
    let username = existingSettingByDetails.username;

    let transportInfo = nodemailer.createTransport({
        host: host, // hostname
        secureConnection: false, // TLS requires secureConnection to be false
        port: port, // port for secure SMTP
        service: service,
        auth: {
            user: username,
            pass: password
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    message = {
        from: {
            name: 'OMC Reads',
            address: from
        },
        to: email,
        subject: subject,

        html: `<div align="center">
        <table cellspacing="0" cellpadding="0" width="580" bgcolor="#E8E8E8">
            <tbody>
                <tr>
                    <td>
                        <table cellspacing="0" cellpadding="0" width="580" bgcolor="#FFFFFF" style="border-style:solid;border-color:#b4bcbc;border-width:1px">
                            <tbody>
                                <tr>
                                    <td>
                                        <table border="0" cellspacing="0" cellpadding="0" width="500" bgcolor="#FFFFFF" valign="center" align="center" style="margin-right:50px;margin-left: 50px;">
                                            <tbody>
                                                <tr>
                                                    <td style="padding:30px 0px 0px;color:#080808;font-weight:lighter;font-family:Helvetica;font-size:12px;line-height:180%;vertical-align:top;text-align:center">
                                                        <span><a href="https://demo.ntspl.co.in/omc-cms" style="color:#080808;text-decoration:none;outline:none" target="_blank" data-saferedirecturl="https://demo.ntspl.co.in/omc-cms"><img src="https://sarkarinaukrieasyalert.com/wp-content/uploads/2020/10/OMC-Logo.png" style="border:none;outline:none;width:200px;" class="CToWUd"></a><br></span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td cellpadding="0" align="center" bgcolor="#FFFFFF" style="border-collapse:collapse;color:black;font-family:Arial,Tahoma,Verdana,sans-serif;font-size:14px;font-weight:500;margin:0;text-align:left;line-height:165%;letter-spacing:0;padding-top:20px;padding-bottom:60px">
                                                        <p>Dear ${senderName},</p>
                                                        <p>Greetings from OMC Reads</p>
    
                                                        ${html}
                                                        
                                                        Thanks & Regards,<br/>
                                                        OMC Reads
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>`
    }

    transportInfo.sendMail(message, function(err, info) {
        if (err) {
            console.log(err)
            return 2;
        } else {
            return 1;
        }
    });

}