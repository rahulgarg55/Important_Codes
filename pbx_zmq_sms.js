const cfg = require('../pbx_config');
const pbx_logger = require('../logger/pbx_logger');
const { socket } = require("zeromq");
const logger = new pbx_logger();
class PbxZmqSms {
    constructor() {
        if (! (this instanceof PbxZmqSms)) {
            return new PbxZmqSms();
        }
        this.gDbConn = '';
        this.gDbPool = '';
        this.gSocksms = socket("push");
    }

    bind() {
        logger.log('DEB', 0, 'zmq_sms', `host: ${cfg.zmq_sms.ip}`);
        logger.log('DEB', 0, 'zmq_sms', `user: ${cfg.zmq_sms.port}`);
        logger.log('DEB', 0, 'zmq_sms', `db: ${cfg.zmq_sms.protocol}`);
        this.gSocksms.connect(`${cfg.zmq_sms.protocol}://${cfg.zmq_sms.ip}:${cfg.zmq_sms.port}`);
        logger.log('DEB', 0, 'zmq_sms', `ZMQ socket connected successfully`);

    }

    sendZmqMsg(channel, event_name, crm_partner, sme_id, account_sid, session_id, recording_file_id, recording_file_url, agent_no, customer_no, longcode, start_datetime, end_datetime, call_type, call_mode, call_status, call_duration, custom_dtmf, optional_field, response_msg, msgType) {
        logger.log('DEB', channel, 'zmq_sms', "Inside notifyAutodialer");
        logger.log('DEB', channel, 'zmq_sms', `event_name(${event_name})`);
        logger.log('DEB', channel, 'zmq_sms', `crm_partner(${crm_partner})`);
        logger.log('DEB', channel, 'zmq_sms', `sme_id(${sme_id})`);
        logger.log('DEB', channel, 'zmq_sms', `account_sid(${account_sid})`);
        logger.log('DEB', channel, 'zmq_sms', `session_id(${session_id})`);
        logger.log('DEB', channel, 'zmq_sms', `recording_file_id(${recording_file_id})`);
        logger.log('DEB', channel, 'zmq_sms', `recording_file_url(${recording_file_url})`);
        logger.log('DEB', channel, 'zmq_sms', `agent_no(${agent_no})`);
        logger.log('DEB', channel, 'zmq_sms', `customer_no(${customer_no})`);
        logger.log('DEB', channel, 'zmq_sms', `longcode(${longcode})`);
        logger.log('DEB', channel, 'zmq_sms', `start_datetime(${start_datetime})`);
        logger.log('DEB', channel, 'zmq_sms', `end_datetime(${end_datetime})`);
        logger.log('DEB', channel, 'zmq_sms', `call_type(${call_type})`);
        logger.log('DEB', channel, 'zmq_sms', `call_mode(${call_mode})`);
        logger.log('DEB', channel, 'zmq_sms', `call_status(${call_status})`);
        logger.log('DEB', channel, 'zmq_sms', `call_duration(${call_duration})`);
        logger.log('DEB', channel, 'zmq_sms', `custom_dtmf(${custom_dtmf})`);
        logger.log('DEB', channel, 'zmq_sms', `optional_field(${optional_field})`);
        logger.log('DEB', channel, 'zmq_sms', `response_msg(${response_msg})`);
        logger.log('DEB', channel, 'zmq_sms', `msgType(${msgType})`);

        const jsonObject = {
            event: event_name,
            crmPartner: crm_partner,
            smeId: sme_id,
            accountSid: account_sid,
            sessionId: session_id,
            recordingFileId: recording_file_id,
            recordingFileUrl: recording_file_url,
            agentNo: agent_no,
            customerNo: customer_no,
            longcode: longcode,
            startDateTime: start_datetime,
            endDateTime: end_datetime,
            callType: call_type,
            callMode: call_mode,
            callStatus: call_status,
            callDuration: call_duration,
            customDtmf: custom_dtmf,
            optionalField: optional_field,
            responseMsg: response_msg,
            msgType: msgType
        };

        const stringObject = JSON.stringify(jsonObject);
        this.gSocksms.send([event_name, stringObject]);
        logger.log('DEB', channel, 'zmq_sms', `sent zmq message successfully ZMQ (${event_name})`);
    }
}

module.exports = PbxZmqSms;
