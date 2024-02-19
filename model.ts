import { QueryTypes } from "sequelize";
import { sequelize } from "../../config/db";
import { logger } from "../../lib/logger";
import { glogger } from "../../helpers/logger";

import { addClickToCallRequest } from "../entities/crm.entity";

/** find */
export async function addClickToCall(payload: addClickToCallRequest, where: any, callback: any) {
  try {
    let Query =
      "INSERT INTO click2call_schedule (account_sid, group_name, agent_number, call_mode, call_priority, custom_dtmf, custom_dtmf_flag, from_no, live_event, live_event_flag, media_file_flag, media_file_id, name_file_flag, name_file_id, optional_field, virtual_number, recording_flag, scheduled_date, session_id, sme_id, time_limit, to_no, status, inserted_date,longcode_site) VALUES (:accountSid, :agentGroup, :agentNumber, :callMode, :callPriority, :customDtmf, :customDtmfFlag, :virtualNumber, :liveEvent, :liveEventFlag, :mediaFileFlag, :mediaFileId, :nameFileFlag, :nameFileId, :optionalField, :virtualNumber, :recordingFlag, :scheduleDateTime, :sessionId, :smeId, :timeLimit, :to, 0, :insertDateTime,:longcodeSiteName)  ";
    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.INSERT,
      replacements: { accountSid: payload["accountSid"], agentGroup: payload["agentGroup"], agentNumber: payload["agentNumber"], callMode: payload["callMode"], callPriority: payload["callPriority"], customDtmf: payload["customDtmf"], customDtmfFlag: payload["customDtmfFlag"], liveEvent: payload["liveEvent"], liveEventFlag: payload["liveEventFlag"], mediaFileFlag: payload["mediaFileFlag"], mediaFileId: payload["mediaFileId"], nameFileFlag: payload["nameFileFlag"], nameFileId: payload["nameFileId"], optionalField: payload["optionalField"], virtualNumber: where["virtualNumber"], recordingFlag: payload["recordingFlag"], scheduleDateTime: payload["scheduleDateTime"], sessionId: payload["sessionId"], smeId: payload["smeId"], timeLimit: payload["timeLimit"], to: payload["to"], insertDateTime: where["insertDateTime"], longcodeSiteName: where["longcodeSiteName"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'addClickToCall', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}


export async function findAgentLongcode(where: any, payload: any, callback: any) {
  try {
    let Query = "SELECT lg.longcode, ks.name,ks.id as site_id FROM longcodes_agent_mapping AS lgm LEFT JOIN longcodes AS lg ON lg.id =lgm.longcode_id  LEFT JOIN  kommuno_sites AS ks ON ks.id=lg.site_identifier WHERE lgm.agent_id = :agent_id and lg.status = 1 and  lg.number_type !='did'";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { agent_id: payload["agent_id"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'findAgentLongcode', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function authVerifyToken(payload: any, callback: any) {
  try {
    let Query = "SELECT username FROM users WHERE user_token = :user_token AND user_key= :user_key LIMIT 1";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { user_token: payload["user_token"], user_key: payload["user_key"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'authVerifyToken', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}


export async function findSmeLongcode(where: any, callback: any) {
  try {
    let Query = "SELECT  lg.longcode, ks.name,ks.id as site_id FROM longcodes_sme_mapping AS lgm LEFT JOIN longcodes AS lg ON lg.id =lgm.longcode_id LEFT JOIN  kommuno_sites AS ks ON ks.id=lg.site_identifier WHERE lgm.sme_id = :smeId and lg.status = 1 and  lg.number_type !='did'";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { smeId: where["smeId"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'findSmeLongcode', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}


export async function findPilotNumber(where: any, callback: any) {
  try {
    let Query = "SELECT  lg.longcode,ks.name,ks.id as site_id FROM longcodes_sme_mapping AS lgm LEFT JOIN longcodes AS lg ON lg.id =lgm.longcode_id LEFT JOIN  kommuno_sites AS ks ON ks.id=lg.site_identifier WHERE lgm.sme_id = :smeId and  SUBSTRING(TRIM(lg.longcode), -10) = SUBSTRING(:pilotNumber, -10)  and lg.status = 1";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { smeId: where["smeId"], pilotNumber: where["pilotNumber"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'findPilotNumber', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function findAgentDetails(where: any, callback: any) {
  try {
    let Query = "SELECT  agent_id from agent_details WHERE sme_id = :smeId and  SUBSTRING(TRIM(agent_mobile), -10) = SUBSTRING(:agentNumber, -10)  and status != -9 limit 1";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { smeId: where["smeId"], agentNumber: where["agentNumber"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'findAgentDetails', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}


export async function findCallscheduleData(where: any, callback: any) {
  try {
    let Query = "SELECT cs.call_schedule_id,cs.to_no, cs.from_no, cs.inserted_date,cs.scheduled_date,cs.media_file_id,cs.dtmf_received,cs.sme_id,cs.group_id,cs.group_name,cs.custom_dtmf,cs.call_mode,cs.name_file_id,cs.call_duration,cs.session_id,cs.recording_file_id,cs.call_status,cs.virtual_number,cs.status_callback_events,cs.status_callback_content_type,cs.account_sid,cs.agent_number,cs.custom_dtmf_flag,cs.time_limit,cs.recording_flag,cs.optional_field,cs.live_event_flag,cs.live_event,cs.name_file_flag,cs.media_file_flag,cs.voice_mail_flag,cs.voice_mail_recording, cs.agent_number_resp,cs.response_msg,cs.call_priority,cs.base_id,ad.agent_id FROM click2call_schedule AS cs LEFT JOIN agent_details AS ad ON SUBSTRING(TRIM(ad.agent_mobile), -10) = SUBSTRING(TRIM(cs.agent_number), -10) where cs.call_schedule_id = :callScheduleId limit 1 ";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { callScheduleId: where["callScheduleId"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'findCallscheduleData', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function findIvrCallBackUrl(where: any, callback: any) {
  try {
    let Query = "SELECT  sme_id ,crm_partner, status ,insert_datetime ,update_datetime,recording_url,recording_url_provider, outgoing_url,outgoing_url_provider,incoming_url ,incoming_url_provider,outgoing_auth_token,incoming_auth_token,call_popup_url,call_popup_auth_token,call_popup_provider from sme_crm_details  WHERE sme_id = :smeId limit 1";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { smeId: where["smeId"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'findIvrCallBackUrl', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}


export async function findIvrAgentDetails(where: any, callback: any) {
  try {
    let Query = 'SELECT ucd.id, ucd.sme_id,  DATE_FORMAT(ucd.insert_date, "%Y-%m-%d %H:%i:%s") as insert_date, ucd.duration, ucd.status, ucd.agent_id, ucd.response_message, ucd.agent_group, DATE_FORMAT(ucd.start_date, "%Y-%m-%d %H:%i:%s") as start_date, DATE_FORMAT(ucd.end_date, "%Y-%m-%d %H:%i:%s") as end_date, ucd.response_code, ucd.connected_duration, ucd.ringing_duration, ucd.customer_ani, ucd.session_id, ucd.call_mode,  ucd.call_info, ucd.call_route_reason, ad.agent_name as agent_name, ad.agent_mobile as agent_number FROM agent_report_details ucd left join agent_details ad on ucd.agent_id = ad.agent_id  WHERE ucd.session_id = :kommSessionId ';
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { kommSessionId: where["kommSessionId"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'findIvrAgentDetails', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function findIvrCallBackRecording(where: any, callback: any) {
  try {
    let Query = 'SELECT merged_file FROM mpbx_call_recording  WHERE call_id = :recordingId limit 1 ';
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { recordingId: where["recordingId"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'findIvrCallBackRecording', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}



/** find */
export async function FindAgentSummary(where: any, callback: any) {
  try {
    let agent_id = '';

    if (where['agentNumber'] != 0) {
      agent_id = "and SUBSTRING(TRIM(ad.agent_mobile), -10) = SUBSTRING(TRIM(" +where['agentNumber']+"), -10)";
    }

    let Query = "Select ad.agent_name, ad.agent_mobile, ad.sme_id, ad.agent_score, ad.sticky_days, ad.days_flag, ad.agent_email, ad.agent_masking, ad.out_permission_flag,  SUM(acd.total_in_calls) AS totalInCalls, SUM(acd.avg_call_duration) AS avgCallDuration, SUM(acd.in_failed_calls) AS inFailedCalls, SUM(acd.in_success_calls) AS inSuccessCalls, SUM(acd.total_out_calls) AS totalOutCalls, SUM(acd.total_calls) AS totalCalls, SUM(acd.total_call_duration) AS totalCallDuration, SUM(acd.out_success_calls) AS outSuccessCalls, (SUM(acd.out_success_calls) * 100) / (SUM(acd.total_out_calls)) AS outSuccess, SUM(acd.out_failed_calls) AS outFailedCalls, SUM(acd.office_hours) AS officeHours,SUM(acd.no_answer) AS noAnswer ,SUM(acd.lunch_hours) AS lunchHours, (SUM(acd.in_success_calls) * 100)/(SUM(acd.total_in_calls)) AS inSuccess , SUM(acd.total_ringing_duration) AS total_ringing_duration, SUM(acd.total_connected_duration) AS total_connected_duration from agent_details as ad left join agent_calling_details  as acd ON ad.agent_id =acd.agent_id and Date(acd.insert_date) BETWEEN :startDate and :endDate  where ad.sme_id = :sme_id " + agent_id + " group by ad.agent_id ";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { sme_id: where["sme_id"], agentNumber: where["agentNumber"], startDate: where["startDate"], endDate: where["endDate"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'FindAgentSummary', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}


/** find */
export async function findagentDayWiseSummary(where: any, callback: any) {
  try {
    let Query = "Select ad.agent_name, ad.agent_mobile, ad.sme_id, ad.agent_score, ad.sticky_days, ad.days_flag, ad.agent_email, ad.agent_masking, ad.out_permission_flag,  acd.total_in_calls AS totalInCalls, acd.avg_call_duration AS avgCallDuration, acd.in_failed_calls AS inFailedCalls, acd.in_success_calls AS inSuccessCalls,  acd.total_out_calls AS totalOutCalls, acd.total_calls AS totalCalls, acd.total_call_duration AS totalCallDuration, acd.out_success_calls AS outSuccessCalls, (acd.out_success_calls * 100) / (acd.total_out_calls) AS outSuccess, acd.out_failed_calls AS outFailedCalls, acd.office_hours AS officeHours,acd.no_answer AS noAnswer ,acd.lunch_hours AS lunchHours, (acd.in_success_calls * 100)/(acd.total_in_calls) AS inSuccess , acd.total_ringing_duration AS total_ringing_duration, acd.total_connected_duration AS total_connected_duration,acd.insert_date from agent_details as ad left join agent_calling_details  as acd ON ad.agent_id =acd.agent_id and Date(acd.insert_date) BETWEEN :startDate and :endDate  where ad.sme_id = :sme_id and SUBSTRING(TRIM(ad.agent_mobile), -10) = SUBSTRING(TRIM(" +where['agentNumber']+"), -10) order by acd.insert_date DESC ";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { sme_id: where["sme_id"], agentNumber: where["agentNumber"], startDate: where["startDate"], endDate: where["endDate"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'findagentDayWiseSummary', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}




/* Lead Status Summary data begins*/
export async function checkTotalLeadStatusSummaryExist(where: any, callback: any) {
  try {
    var Query = "SELECT id, lead_status_count FROM total_lead_status_summary WHERE sme_id = :smeId AND agent_id = :agentId AND lead_status = :leadStatus";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: {smeId: where["smeId"], agentId: where["agentId"], leadStatus: where["leadStatus"]},
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'checkTotalLeadStatusSummaryExist', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function updateTotalLeadStatusSummaryData(payload: any, callback: any) {
  try {
    let Query = "Update total_lead_status_summary set lead_status_count= :leadStatusCount where id = :id  limit 1 ";
    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.UPDATE,
      replacements: { leadStatusCount: payload["leadStatusCount"],  id: payload["id"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'updateTotalLeadStatusSummaryData', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function insertTotalLeadStatusSummaryData(payload: any,  callback: any) {
  try {
    let Query =
      "INSERT INTO total_lead_status_summary (sme_id, agent_id, lead_status, lead_status_count, till_date_time) values (:smeId, :agentId, :leadStatus, :leadStatusCount, :insertDateTime)";

    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.INSERT,
      replacements: {
        smeId: payload["smeId"],
        agentId: payload["agentId"],
        leadStatus: payload["leadStatus"],
        leadStatusCount: payload["leadStatusCount"],
        insertDateTime: payload["insertDateTime"],
      },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'insertTotalLeadStatusSummaryData', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}
/* Lead Status Summary data ends*/

/* Lead Source Summary data begins*/
export async function checkTotalLeadSourceSummaryExist(where: any, callback: any) {
  try {
    var Query = "SELECT id, lead_source_count FROM total_lead_source_summary WHERE sme_id = :smeId AND agent_id = :agentId AND source_id = :sourceId";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: {smeId: where["smeId"], agentId: where["agentId"], sourceId: where["sourceId"]},
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'checkTotalLeadSourceSummaryExist', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function updateTotalLeadSourceSummaryData(payload: any, callback: any) {
  try {
    let Query = "Update total_lead_source_summary set lead_source_count= :leadSourceCount where id = :id  limit 1 ";
    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.UPDATE,
      replacements: { leadSourceCount: payload["leadSourceCount"], id: payload["id"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'updateTotalLeadSourceSummaryData', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function insertTotalLeadSourceSummaryData(payload: any,  callback: any) {
  try {
    let Query =
      "INSERT INTO total_lead_source_summary (sme_id, agent_id, source_id, lead_source_count, till_date_time) values (:smeId, :agentId, :sourceId, :leadSourceCount, :insertDateTime)";

    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.INSERT,
      replacements: {
        smeId: payload["smeId"],
        agentId: payload["agentId"],
        sourceId: payload["sourceId"],
        leadSourceCount: payload["leadSourceCount"],
        insertDateTime: payload["insertDateTime"],
      },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    
    glogger('ERR', "0", 'insertTotalLeadSourceSummaryData', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}
/* Lead Source Summary data ends*/


export async function checkManualLeadExist(where: any, callback: any) {
  try {
    let Query = "SELECT * FROM unique_customer_detail WHERE SUBSTRING(TRIM(customer_number), -10)=SUBSTRING(:customer_number, -10) AND sme_id = :id LIMIT 1";
    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { customer_number: where["customer_number"], id: where["id"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    
    glogger('ERR', "0", 'checkManualLeadExist', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

/** insert manual lead data*/
export async function addManualLeadData(payload: any,  callback: any) {
  try {
    let Query =
      "INSERT INTO unique_customer_detail (sme_id, customer_number, recent_duration, recent_via_longcode, server_ip_address, recent_patched_agent_id, total_incoming_calls, total_outgoing_calls, lead_type, lead_status, city_id, product_id, product_price, assigned_agent_id, connected_call_duration, sticky_type, insert_date_time, update_date_time, call_type,source_id) values (:id, :customer_number, :recent_duration, :recent_via_longcode, :server_ip_address, :recent_patched_agent_id, :total_incoming_calls, :total_outgoing_calls, :lead_type, :lead_source_id, :city_id, :product_id, :product_price, :assigned_agent_id, :connected_call_duration, :sticky_type, :insert_date_time, :update_date_time, :call_type,:lead_source_id)";

    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.INSERT,
      replacements: {
        id: payload["id"],
        customer_number: payload["customer_number"],
        recent_duration: payload["recent_duration"],
        recent_via_longcode: payload["recent_via_longcode"],
        server_ip_address: payload["server_ip_address"],
        recent_patched_agent_id: payload["recent_patched_agent_id"],
        total_incoming_calls: payload["total_incoming_calls"],
        total_outgoing_calls: payload["total_outgoing_calls"],
        lead_type: payload["lead_type"],
        city_id: payload["city_id"],
        product_id: payload["product_id"],
        product_price: payload["product_price"],
        assigned_agent_id: payload["assigned_agent_id"],
        connected_call_duration: payload["connected_call_duration"],
        sticky_type: payload["sticky_type"],
        insert_date_time: payload["insert_date_time"],
        update_date_time: payload["update_date_time"],
        call_type: payload["call_type"],
        lead_source_id: payload["lead_source_id"],
      },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'addManualLeadData', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}



/* Lead Product Summary data begins*/
export async function checkTotalLeadProductSummaryExist(where: any, callback: any) {
  try {
    var Query = "SELECT id, lead_product_count FROM total_lead_product_summary WHERE sme_id = :smeId AND agent_id = :agentId AND product_id = :productId";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: {smeId: where["smeId"], agentId: where["agentId"], productId: where["productId"]},
    });
    callback(null, executeQuery);
  } catch (error: any) {
   
    glogger('ERR', "0", 'checkTotalLeadProductSummaryExist', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function updateTotalLeadProductSummaryData(payload: any, callback: any) {
  try {
    let Query = "Update total_lead_product_summary set lead_product_count= :leadProductCount where id = :id  limit 1 ";
    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.UPDATE,
      replacements: { leadProductCount: payload["leadProductCount"],  id: payload["id"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'updateTotalLeadProductSummaryData', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function insertTotalLeadProductSummaryData(payload: any,  callback: any) {
  try {
    let Query =
      "INSERT INTO total_lead_product_summary (sme_id, agent_id, product_id, lead_product_count, till_date_time) values (:smeId, :agentId, :productId, :leadProductCount, :insertDateTime)";

    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.INSERT,
      replacements: {
        smeId: payload["smeId"],
        agentId: payload["agentId"],
        productId: payload["productId"],
        leadProductCount: payload["leadProductCount"],
        insertDateTime: payload["insertDateTime"],
      },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'insertTotalLeadProductSummaryData', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}
/* Lead Product Summary data ends*/

/* Lead Type Summary data begins*/
export async function checkTotalLeadTypeSummaryExist(where: any, callback: any) {
  try {
    var Query = "SELECT id, lead_type_count FROM total_lead_type_summary WHERE sme_id = :smeId AND agent_id = :agentId AND lead_type = :leadType";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: {smeId: where["smeId"], agentId: where["agentId"], leadType: where["leadType"]},
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'checkTotalLeadTypeSummaryExist', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function updateTotalLeadTypeSummaryData(payload: any, callback: any) {
  try {
    let Query = "Update total_lead_type_summary set lead_type_count= :leadTypeCount where id = :id  limit 1 ";
    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.UPDATE,
      replacements: { leadTypeCount: payload["leadTypeCount"], id: payload["id"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'updateTotalLeadTypeSummaryData', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function insertTotalLeadTypeSummaryData(payload: any,  callback: any) {
  try {
    let Query =
      "INSERT INTO total_lead_type_summary (sme_id, agent_id, lead_type, lead_type_count, till_date_time) values (:smeId, :agentId, :leadType, :leadTypeCount, :insertDateTime)";

    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.INSERT,
      replacements: {
        smeId: payload["smeId"],
        agentId: payload["agentId"],
        leadType: payload["leadType"],
        leadTypeCount: payload["leadTypeCount"],
        insertDateTime: payload["insertDateTime"],
      },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'insertTotalLeadTypeSummaryData', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}
/* Lead Product Summary data ends*/


/* Lead City Summary data begins*/
export async function checkTotalLeadCitySummaryExist(where: any, callback: any) {
  try {
    var Query = "SELECT id, lead_city_count FROM total_lead_city_summary WHERE sme_id = :smeId AND agent_id = :agentId AND city_id = :cityId";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: {smeId: where["smeId"], agentId: where["agentId"], cityId: where["cityId"]},
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'checkTotalLeadCitySummaryExist', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function updateTotalLeadCitySummaryData(payload: any, callback: any) {
  try {
    let Query = "Update total_lead_city_summary set lead_city_count= :leadCityCount where id = :id  limit 1 ";
    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.UPDATE,
      replacements: { leadCityCount: payload["leadCityCount"],  id: payload["id"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'updateTotalLeadCitySummaryData', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function insertTotalLeadCitySummaryData(payload: any,  callback: any) {
  try {
    let Query =
      "INSERT INTO total_lead_city_summary (sme_id, agent_id, city_id, lead_city_count, till_date_time) values (:smeId, :agentId, :cityId, :leadCityCount, :insertDateTime)";

    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.INSERT,
      replacements: {
        smeId: payload["smeId"],
        agentId: payload["agentId"],
        cityId: payload["cityId"],
        leadCityCount: payload["leadCityCount"],
        insertDateTime: payload["insertDateTime"],
      },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'insertTotalLeadCitySummaryData', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}
/* Lead City Summary data ends*/


export async function findLeadSource(where: any, callback: any) {
  try {
    let Query = "SELECT id  FROM lead_source WHERE TRIM(source)=TRIM(:lead_source) AND created_by = :id LIMIT 1";
    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { lead_source: where["lead_source"], id: where["id"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    
    glogger('ERR', "0", 'findLeadSource', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function findCity(where: any, callback: any) {
  try {
    let Query = "SELECT cml.city_id as id from country_cities AS cc LEFT JOIN sme_cities_list AS cml on cc.id =cml.city_id WHERE  cml.sme_id=:id and cc.city_name=:city  LIMIT 1";
    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { city: where["city"],id: where["id"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    
    glogger('ERR', "0", 'findCity', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}


export async function findProduct(where: any, callback: any) {
  try {
    let Query = "SELECT id  FROM sme_product_list WHERE TRIM(product_name)=TRIM(:product_name) and status !=-9 LIMIT 1";
    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { product_name: where["product_name"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    
    glogger('ERR', "0", 'findProduct', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function findLeadStatus(where: any, callback: any) {
  try {
    let Query = "SELECT id  FROM lead_status WHERE TRIM(lead_status)=TRIM(:lead_status_name) and status !=-9 and created_by =:id  LIMIT 1";
    let executeQuery = await sequelize.query(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { lead_status_name: where["lead_status_name"], id: where["id"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    
    glogger('ERR', "0", 'findLeadStatus', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}


export async function findAgentData(where: any, callback: any) {
  try {
    let Query = "SELECT  agent_id as id from agent_details WHERE sme_id =:id and  SUBSTRING(TRIM(agent_mobile), -10) = SUBSTRING(:agent_number, -10)  and status != -9";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { id: where["id"], agent_number: where["agent_number"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'findAgentData', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function findSmeExist(where: any, callback: any) {
  try {
    let Query = "SELECT id, search_longcode_random FROM sme_profile  WHERE id = :smeId and status = 1 limit 1";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { smeId: where["smeId"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    glogger('ERR', "0", 'findSmeLongcode', "error:" + error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function findVirtualNumberSmeWise(where: any, callback: any) {
  try {
    let Query = "SELECT  lg.longcode, lg.id, lg.site_identifier,ks.name FROM longcodes_sme_mapping AS lgm LEFT JOIN longcodes AS lg ON lg.id =lgm.longcode_id LEFT JOIN  kommuno_sites AS ks ON ks.id=lg.site_identifier WHERE lgm.sme_id = :smeId and lg.status = 1 and lg.number_type !='did'";
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { smeId: where["smeId"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    logger.error(error);
    callback(error, null);
    throw new Error(error);
  }
}


export async function getAgentTimeForToday(where: any, payload:any, callback: any) {
  try {
    let Query = "SELECT * from agent_details_timing  where agent_id =:agent_id  and days_week= UPPER(DATE_FORMAT(:currentDate,'%a'))  limit 1";

    
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { agent_id: where["agent_id"],currentDate: payload["currentDate"]},
    });

    callback(null, executeQuery);
  } catch (error: any) {
    logger.error(error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function findKomunoSitesUrlByCallMode(where: any, payload:any,callback: any) {
  try {
    let Query = "SELECT id, kommuno_sites_id,url from ivr_site_endpoint_url  where mode =:callMode  and priority=:callPriority and kommuno_sites_id =:longcodeSiteId   limit 1";

    
    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { callMode: where["callMode"],callPriority: where["callPriority"],longcodeSiteId: payload["longcodeSiteId"]},
    });

    callback(null, executeQuery);
  } catch (error: any) {
    logger.error(error);
    callback(error, null);
    throw new Error(error);
  }
}

export async function FindAllSmeIvrPlan(where: any, callback: any) {
  try {
    let Query =
      "SELECT  DATEDIFF(DATE(spm.expiration_date_time), CURDATE()) AS validay_days_left, spm.package_id ,spm.amount , spm.discount, spm.discount_amount,pp.call_type, spm.minutes ,spm.no_of_calls,spm.unlimited_calls,spm.agent_limit , spm.validity_months, spm.activate_date_time,spm.expiration_date_time, spm.payment_by, spm.pack_type from sme_package_mapping as spm left join product_package as pp on  spm.package_id =pp.id WHERE spm.sme_id=:smeId limit 1  ";

    let executeQuery = await sequelize.query<any>(Query, {
      raw: true,
      type: QueryTypes.SELECT,
      replacements: { smeId: where["smeId"] },
    });
    callback(null, executeQuery);
  } catch (error: any) {
    logger.error(error);
    callback(error, null);
    throw new Error(error);
  }
}
