import { QueryTypes } from "sequelize";
import { sequelize } from "../../config/db";
import { logger } from "../../lib/logger";
import { glogger } from "../../helpers/logger";

export async function CallHoldStatus(where: any, callback: any) {
  try {
      let Query = "SELECT lc.site_id, iseu.url FROM live_calls lc LEFT JOIN ivr_site_endpoint_url iseu ON iseu.kommuno_sites_id = lc.site_id  WHERE lc.session_id = :session_id AND lc.sme_id = :sme_id AND iseu.api_type = 'hold' AND iseu.kommuno_sites_id = lc.site_id";
      let executeQuery = await sequelize.query<any>(Query, {
          raw: true,
          type: QueryTypes.SELECT,
          replacements: {
          session_id: where["sessionId"],
            sme_id: where["smeId"],
        }
      });
      callback(null, executeQuery);
  } catch (error: any) {
      glogger('ERR', "0", 'findIvrCallBackUrl', "error:" + error);
      callback(error, null);
      throw new Error(error);
  }
}

export async function CallUnHoldStatus(where: any, callback: any) {
  try {
    let Query = "SELECT lc.site_id, iseu.url FROM live_calls lc LEFT JOIN ivr_site_endpoint_url iseu ON iseu.kommuno_sites_id = lc.site_id  WHERE lc.session_id = :session_id AND lc.sme_id = :sme_id AND iseu.api_type = 'unhold' AND iseu.kommuno_sites_id = lc.site_id";
      let executeQuery = await sequelize.query<any>(Query, {
          raw: true,
          type: QueryTypes.SELECT,
          replacements: {
            session_id: where["sessionId"],
              sme_id: where["smeId"],
          }
          
      });
      callback(null, executeQuery);
  } catch (error: any) {
      glogger('ERR', "0", 'findIvrCallBackUrl', "error:" + error);
      callback(error, null);
      throw new Error(error);
  }
}

export async function CallMuteStatus(where: any, callback: any) {
  try {
    let Query = "SELECT lc.site_id, iseu.url FROM live_calls lc LEFT JOIN ivr_site_endpoint_url iseu ON iseu.kommuno_sites_id = lc.site_id  WHERE lc.session_id = :session_id AND lc.sme_id = :sme_id AND iseu.api_type = 'mute' AND iseu.kommuno_sites_id = lc.site_id";
      let executeQuery = await sequelize.query<any>(Query, {
          raw: true,
          type: QueryTypes.SELECT,
          replacements: {
            session_id: where["sessionId"],
              sme_id: where["smeId"],
          }
      });
      callback(null, executeQuery);
  } catch (error: any) {
      glogger('ERR', "0", 'findIvrCallBackUrl', "error:" + error);
      callback(error, null);
      throw new Error(error);
  }
}

export async function CallUnmuteStatus(where: any, callback: any) {
  try {
    let Query = "SELECT lc.site_id, iseu.url FROM live_calls lc LEFT JOIN ivr_site_endpoint_url iseu ON iseu.kommuno_sites_id = lc.site_id  WHERE lc.session_id = :session_id AND lc.sme_id = :sme_id AND iseu.api_type = 'unmute' AND iseu.kommuno_sites_id = lc.site_id";
      let executeQuery = await sequelize.query<any>(Query, {
          raw: true,
          type: QueryTypes.SELECT,
          replacements: {
            session_id: where["sessionId"],
              sme_id: where["smeId"],
          }
      });
      callback(null, executeQuery);
  } catch (error: any) {
      glogger('ERR', "0", 'findIvrCallBackUrl', "error:" + error);
      callback(error, null);
      throw new Error(error);
  }
}
