/************************************************************************************************
* 
* File Name: pbx_agent_transfer
* Description: <>
* About Us: <>
* Date: 28/April/2022
* Modified Date:
*
************************************************************************************************/
var Event = require('./events.js');
var cfg = require('../pbx_config');
//var cache = require('./cache.js');
//var cache_request = cache();
var pbx_db = require('../db/pbx_db.js');
var pbx_api = require('../api/pbx_api.js');
var pbx_zmq = require('../zmq/pbx_zmq.js');
var pbx_logger = require('../logger/pbx_logger.js');
var awsS3 = require('../s3/awsS3.js');
var agent_processor = require('../api/agent_processor.js');
var express = require('express');
var dt = require('../common/datetime.js');
var ari = require('ari-client');
var util = require('util');
var path = require('path');
var fs = require('fs');
var mv = require('mv');
//const Lame = require("node-lame").Lame;

var logger = new pbx_logger();
var dateTime = new dt();
var agentProcessor = new agent_processor();
var awsS3 = new awsS3();

var dbOutput = "";
var dbSMEid = "";

var api = new pbx_api();
var zmq = new pbx_zmq();

/************************************************************************************************
* 
* Function Name: AgentOutgoingCall
* Description: <>
* Date: 28/April/2022
* 
************************************************************************************************/
function AgentOutgoingCall(call) {

  logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [AgentOutgoingCall]');

  this.state_name = "agent_transfer_state";
  logger.log('DEB', call.channel.id, 'agent_transfer', "Current State [" + call.currentState + "] Update to ==> [dialing]")
  call.currentState = "dialing";
  call.dialStatus = "NOANSWER";
  var ccBridge = null;
  call.totalHoldDuration = 0;

  this.enter = function () {
    var stateName = "agent_transfer_state";
    var playback;
    var sqlConn = new pbx_db();

    logger.log('DEB', call.channel.id, 'agent_transfer', "Entering agent_transfer_state: " + stateName);
    //call.channel.on("ChannelHangupRequest", on_hangup);

    call.ringTime = 0;
    call.ccEndNode = "CCG_" + call.allocated_agent + "_" + call.ringTime + "_" + call.dialStatus;
    //call.client.on("PlaybackFinished", on_playback_finished);
    //call.client.on('ChannelStateChange', channelStateChange);

    //call.client.on('ChannelDtmfReceived', on_dtmf);
    call.dialedLeg.on('ChannelDtmfReceived', on_dtmf);

    if ((call.user_ivr_state == "req_ATTENDANT_CALL_TRANSFER") || (call.user_ivr_state == "req_UNATTENDANT_CALL_TRANSFER")) {

      /* just cooment today 17may2022 for test, i think transfer array should put once the agent is busy and we are going to make call.
      call.transLegFlag = "0";
      call.transferCallFlag = '1';
      logger.log('DEB', call.channel.id, 'agent_transfer', "adding call detail of " + call.whichtransLeg + " in transferAgentArray ");
      appendTransferAgent(call.channel, call.idealAgentID, call.idealAgentNumber, call.catDescAgent, call.dialedLeg, call.dialedLeg.id, call.AgentStartCallTime, call.whichtransLeg, "0");
      call.origAgentSessionID = call.dialedLeg.id;
      call.transfreeAgentSessionID = "";
      */


 
      //call transfer request has inititated here...
      call.agent_extention = "";
      //In order to fix the error lets keep the dialedLeg in transferLeg and once the transferLeg statisStart then will upload the same variable with transferLeg actual values;
      call.transferLeg = call.dialedLeg;
      call.noDtmfTransferCount++;
      call.dialedLeg.snoopChannel(
        {
          app: cfg.asterisk.stasisApp, channelId: call.dialedLeg.id, spy: 'out', whisper: 'out', appArgs: 'SNOOPING_FOR_TRANSFER'
        },
        function (err, channel) {
          if (err) {
            logger.log('ERR', call.channel.id, 'agent_transfer', "error in snoopChannel: " + err)
          }
          else {
            logger.log('DEB', call.channel.id, 'agent_transfer', "Channel snoopChannel on(" + call.dialedLeg.id + ")");
          }

        });

    }
    else {
      logger.log('DEB', call.channel.id, 'agent_transfer', "invalid group DTMF(" + call.transDtmf + ")");
    }

    /************************************************************************************************
    * 
    * Function Name: start_playback
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function start_playback(state, session) {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [start_playback]');


      if (call.user_ivr_state == "YOUR_CALL_IMPT_TO_US") {
        logger.log('DEB', call.channel.id, 'agent_transfer', "IVR STATE (YOUR_CALL_IMPT_TO_US)");
        current_sound = "sound:" + cfg.media.dir + '/' + cfg.media.waiting_imp_call + '-' + call.language;
        logger.log('DEB', call.channel.id, 'ivr_detail', "Going to play media[" + current_sound + "]");
        playback = null;
        call.gmediaFile = current_sound;
        playback = call.client.Playback();
        logger.log('DEB', call.channel.id, 'agent_transfer', "channel:", call.channel.caller);
        session.play({ media: current_sound }, playback, function (err, playback) { logger.log('ERR', call.channel.id, 'ivr_detail', "...In Playback Handler:" + err) });
        debugger;
      }
      if (call.user_ivr_state == "YOUR_CALL_IMPT_TO_US_15SEC") {
        logger.log('DEB', call.channel.id, 'agent_transfer', "IVR STATE (YOUR_CALL_IMPT_TO_US_15SEC)");
        current_sound = "sound:" + cfg.media.dir + '/' + cfg.media.waiting_imp_call_15sec + '-' + call.language;
        logger.log('DEB', call.channel.id, 'ivr_detail', "Going to play media[" + current_sound + "]");
        playback = null;
        call.gmediaFile = current_sound;
        playback = call.client.Playback();
        logger.log('DEB', call.channel.id, 'agent_transfer', "channel:", call.channel.caller);
        session.play({ media: current_sound }, playback, function (err, playback) { logger.log('ERR', call.channel.id, 'ivr_detail', "...In Playback Handler:" + err) });
        debugger;
      }
      //else {
      //  logger.log('ERR', call.channel.id, 'agent_transfer', "Invalid DB response!");
      //}
      if (call.user_ivr_state == "req_ATTENDANT_CALL_TRANSFER") {
        logger.log('DEB', call.channel.id, 'agent_transfer', "IVR STATE (req_ATTENDANT_CALL_TRANSFER)");
        current_sound = "sound:" + cfg.media.dir + '/' + cfg.media.call_transfer + '-' + call.language;
        logger.log('DEB', call.channel.id, 'ivr_detail', "Going to play media[" + current_sound + "]");
        playback = null;
        call.gmediaFile = current_sound;
        //playback = call.client.Playback();

        logger.log('DEB', call.channel.id, 'ivr_detail', "callBridgeId[" + call.callBridgeId + "]");
        //call.callBridgeId.stopMoh(function(err) {
        //if (err) {
        //	throw err;
        //}
        playback = call.client.Playback();
        //call.client.bridges.record	
        //playback = call.client.client.Playback();
        logger.log('DEB', call.channel.id, 'agent_transfer', "channel:", call.channel.caller);
        //call.agentChannel.play({media: current_sound}, playback, function(err, playback){logger.log('ERR', call.channel.id, 'ivr_detail',"...In Playback Handler:"+err)});
        //call.client.bridges.play({media: current_sound, bridgeId: call.callBridgeId}, playback, function(err, playback){logger.log('ERR', call.channel.id, 'ivr_detail',"...In Playback Handler:"+err)});
        call.client.bridges.play({ media: current_sound, bridgeId: call.callBridgeId }, playback, function (err, playback) { logger.log('ERR', call.channel.id, 'ivr_detail', "...In Playback Handler:" + err) });
        debugger;
        //});
      }
      else if (call.user_ivr_state == "TRANSFER_AGENT_BUSY") {
        logger.log('DEB', call.channel.id, 'agent_transfer', "IVR STATE (TRANSFER_AGENT_BUSY)");
        current_sound = "sound:" + cfg.media.dir + '/' + cfg.media.agent_ext_busy + '-' + call.language;
        logger.log('DEB', call.channel.id, 'ivr_detail', "Going to play media[" + current_sound + "]");
        playback = null;
        call.gmediaFile = current_sound;
        playback = call.client.Playback();
        logger.log('DEB', call.channel.id, 'agent_transfer', "channel:", call.channel.caller);
        //call.channel.play({media: current_sound}, playback, function(err, playback){logger.log('ERR', call.channel.id, 'ivr_detail',"...In Playback Handler:"+err)});
        session.play({ media: current_sound }, playback, function (err, playback) { logger.log('ERR', call.channel.id, 'ivr_detail', "...In Playback Handler:" + err) });
        debugger;
      }
      else if (call.user_ivr_state == "TRANSFER_AGENT_INVALID") {
        logger.log('DEB', call.channel.id, 'agent_transfer', "IVR STATE (TRANSFER_AGENT_INVALID)");
        current_sound = "sound:" + cfg.media.dir + '/' + cfg.media.invalid_agent_ext + '-' + call.language;
        logger.log('DEB', call.channel.id, 'ivr_detail', "Going to play media[" + current_sound + "]");
        playback = null;
        call.gmediaFile = current_sound;
        playback = call.client.Playback();
        logger.log('DEB', call.channel.id, 'agent_transfer', "channel:", call.channel.caller);
        session.play({ media: current_sound }, playback, function (err, playback) { logger.log('ERR', call.channel.id, 'ivr_detail', "...In Playback Handler:" + err) });
        debugger;
      }
      else if (call.user_ivr_state == "TRANSFER_AGENT_NOTREACHABLE") {
        logger.log('DEB', call.channel.id, 'agent_transfer', "IVR STATE (TRANSFER_AGENT_NOTREACHABLE)");
        current_sound = "sound:" + cfg.media.dir + '/' + cfg.media.notrechable_agent_ext + '-' + call.language;
        logger.log('DEB', call.channel.id, 'ivr_detail', "Going to play media[" + current_sound + "]");
        playback = null;
        call.gmediaFile = current_sound;
        playback = call.client.Playback();
        logger.log('DEB', call.channel.id, 'agent_transfer', "channel:", call.channel.caller);
        session.play({ media: current_sound }, playback, function (err, playback) { logger.log('ERR', call.channel.id, 'ivr_detail', "...In Playback Handler:" + err) });
        debugger;
      }
      else if (call.user_ivr_state == "TRANSFER_AGENT_ONBREAK") {
        logger.log('DEB', call.channel.id, 'agent_transfer', "IVR STATE (TRANSFER_AGENT_ONBREAK)");
        current_sound = "sound:" + cfg.media.dir + '/' + cfg.media.agent_ext_onbreak + '-' + call.language;
        logger.log('DEB', call.channel.id, 'ivr_detail', "Going to play media[" + current_sound + "]");
        playback = null;
        call.gmediaFile = current_sound;
        playback = call.client.Playback();
        logger.log('DEB', call.channel.id, 'agent_transfer', "channel:", call.channel.caller);
        session.play({ media: current_sound }, playback, function (err, playback) { logger.log('ERR', call.channel.id, 'ivr_detail', "...In Playback Handler:" + err) });
        debugger;
      }
      else if (call.user_ivr_state == "caller_YOUR_HOLD_MUSIC") {
        logger.log('DEB', call.channel.id, 'agent_transfer', "IVR STATE (caller_YOUR_HOLD_MUSIC)");
        //current_sound = "sound:" + cfg.media.dir + '/' + cfg.media.call_hold_music + '-' + call.language;
        current_sound = "sound:" + cfg.media.dir + '/' + cfg.media.call_hold_music_35sec + '-' + call.language;
        logger.log('DEB', call.channel.id, 'ivr_detail', "Going to play media[" + current_sound + "]");
        playback = null;
        call.transHoldMusic = "1";
        call.gmediaFile = current_sound;
        playback = call.client.Playback();
        call.orignalAgentPlayback = playback;
        logger.log('DEB', call.channel.id, 'agent_transfer', "channel:", call.channel.caller);
        session.play({ media: current_sound }, playback, function (err, playback) { logger.log('ERR', call.channel.id, 'ivr_detail', "...In Playback Handler:" + err) });
        debugger;
      }
      else if (call.transHoldMusic == "1") {
        //current_sound = "sound:" + cfg.media.dir + '/' + cfg.media.call_hold_music + '-' + call.language;
        current_sound = "sound:" + cfg.media.dir + '/' + cfg.media.call_hold_music_35sec + '-' + call.language;
        logger.log('DEB', call.channel.id, 'ivr_detail', "Going to play media[" + current_sound + "]");
        playback = null;
        call.transHoldMusic = "1";
        call.gmediaFile = current_sound;
        playback = call.client.Playback();
        logger.log('DEB', call.channel.id, 'agent_transfer', "channel:", call.channel.caller);
        session.play({ media: current_sound }, playback, function (err, playback) { logger.log('ERR', call.channel.id, 'ivr_detail', "...In Playback Handler:" + err) });
        debugger;

      }



    }

    /************************************************************************************************
    * 
    * Function Name: on_playback_finished
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function on_playback_finished(event) {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'ON Event [on_playback_finished]');

      logger.log('DEB', call.channel.id, 'agent_transfer', "on_playback_finished ivr state " + call.user_ivr_state + "");

      //handel the case which play failed propmt about the agent status to agent and once finished go back to dailled session.
      if ((call.user_ivr_state == "TRANSFER_AGENT_ONBREAK") || (call.user_ivr_state == "TRANSFER_AGENT_NOTREACHABLE") || (call.user_ivr_state == "TRANSFER_AGENT_INVALID") || (call.user_ivr_state == "TRANSFER_AGENT_BUSY")) {
        if (call.dialedLegDinit == false) {
          //go back to dailed session if its still alive.
          jump_back_to_dailed_session();
        }
        else {
          //do nothing probally the dailled is killed so this might also get killed.
        }
      }


      if (call.user_ivr_state == "req_UNATTENDANT_CALL_TRANSFER") {


        //logger.log('DEB', call.channel.id, 'agent_transfer', "State-Machine Update to ==> [Event.AGENT_CALL]");
        //call.state_machine.change_state(Event.AGENT_CALL);

        if (call.flagTransferDtmfStarOne == "1") {
          //start the time to capture the agent extention id.
          logger.log('DEB', call.channel.id, 'agent_transfer', "[timerTransferDtmf] timer initialize..");
          call.objTransferDtmfStarOne = setTimeout(DTMF_Timeout, (cfg.timer.transfer_dtmf_timer * 1000));
          call.timerState = "transfer_dtmf_input";
        }


        if (playback && (playback.id == event.playback.id)) {
          if (call.channel) {
            logger.log('DEB', call.channel.id, 'agent_transfer', 'Play Promot (' + call.gmediaFile + ') finished');

            if (call.transHoldMusic == "1") {
              start_playback(call.currentState, call.channel);
              logger.log('DEB', call.channel.id, 'agent_transfer', 'Play Hold Music to Customer till we stopped...');
            }

            if (call.user_ivr_state == "YOUR_CALL_IMPT_TO_US") {

              //logger.log('DEB', call.channel.id, 'agent_transfer', "State-Machine Update to ==> [Event.AGENT_CALL]");
              //call.state_machine.change_state(Event.AGENT_CALL);

              //logger.log('DEB', call.channel.id, 'agent_transfer', "Disconnecting this call");
              //cleanup(); 
            }
            else if (call.user_ivr_state == "YOUR_CALL_IMPT_TO_US_15SEC") {

              //logger.log('DEB', call.channel.id, 'agent_transfer', "State-Machine Update to ==> [Event.AGENT_CALL]");
              //call.state_machine.change_state(Event.AGENT_CALL);
            }
          }


        }
      }

      else if (call.user_ivr_state == "TRANSFER_AGENT_INVALID") {

        //when agent extention was invalid, then we played the prompt to agent about this, now lets see if the custome side of
        //call is on hold then we will unhold it.
        //here we have received the agent prompt finished event of invalid extention.

        if (call.transHoldFlag == "1") {


          logger.log('DEB', call.channel.id, 'agent_transfer', "UnHold (default)");
          call.client.channels.stopMoh(
            {
              channelId: call.channel.id
            },
            function (err) {
              if (err) {
                logger.log('ERR', call.channel.id, 'agent_transfer', "[" + this.state_name + "]: error while UNHOLD stopMoh customer: " + err)
              }
              else {
                logger.log('DEB', call.channel.id, 'agent_transfer', "Channel UNHOLD stopMoh now...");
                call.transHoldFlag = "0";
              }

            }
          );

        }


        call.user_ivr_state = "req_UNATTENDANT_CALL_TRANSFER";
        call.agent_extention = "";

      }
    }

    /************************************************************************************************
    * 
    * Function Name: cleanup
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function cleanup() {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [cleanup]');
      call.channel.removeListener('ChannelHangupRequest', on_hangup);


      ////if (call.idealAgentFlag == '1' && call.agentChannel != null)
      /*if (call.CDRtransidealAgentFlag == '1') {
        logger.log('DEB', call.channel.id, 'agent_transfer', "calling makeAgentFree to mark the tried agent idle");
        makeAgentFree(call.channel);

      }*/
      if (call.agentChannel != null) {
        logger.log('DEB', call.channel.id, 'agent_transfer', "removeListener of ChannelDtmfReceived");
        //call.agentChannel.removeListener('ChannelDtmfReceived', on_dtmf);
      }
    }

    /************************************************************************************************
    * 
    * Function Name: cleanup_transferrer
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function cleanup_transferrer() {
      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [cleanup_transferrer]');
      call.channel.removeListener('ChannelHangupRequest', on_hangup);


      /*if (call.idealAgentFlag == '1')
      {                 
        logger.log('DEB', call.channel.id, 'agent_transfer', "calling makeAgentFree to mark the tried agent idle");
        makeAgentFree(call.channel);

      }
      if(call.agentChannel != null)
      {                 
        logger.log('DEB', call.channel.id, 'agent_transfer', "removeListener of ChannelDtmfReceived");
                    call.agentChannel.removeListener('ChannelDtmfReceived', on_dtmf);
      }*/
    }

    /************************************************************************************************
    * 
    * Function Name: jump_back_to_dailed_session
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function jump_back_to_dailed_session() {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [jump_back_to_dailed_session]');
      //call.channel.removeListener('ChannelHangupRequest', on_hangup);

      call.transferLeg.removeListener("ChannelHangupRequest", on_hangup);
      call.transferLeg.removeListener("PlaybackFinished", on_playback_finished);
      call.transferLeg.removeListener('ChannelStateChange', channelStateChange);
      call.transferLeg.removeListener('ChannelDtmfReceived', on_dtmf);
      call.dialedLeg.removeListener('ChannelDtmfReceived', on_dtmf);

      logger.log('DEB', call.channel.id, 'agent_transfer', 'Update state from [' + call.user_ivr_state + '] to [FAILED_TRANSFER_CASE]');
      call.user_ivr_state = "FAILED_TRANSFER_CASE"

      logger.log('DEB', call.channel.id, 'agent_transfer', "State-Machine Update to ==> [Event.AGENT_CALL]");
      call.state_machine.change_state(Event.AGENT_CALL);


    }

    /************************************************************************************************
    * 
    * Function Name: on_dtmf
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function on_dtmf(event, channel) {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'ON Event [on_dtmf]');

      logger.log('DEB', call.channel.id, 'agent_transfer', "DTMF event(" + event.digit + ") ");


      if ((call.user_ivr_state == "req_ATTENDANT_CALL_TRANSFER") || (call.user_ivr_state == "req_UNATTENDANT_CALL_TRANSFER")) {
        call.agent_extention = call.agent_extention + event.digit;
        if (call.agent_extention.length >= "4") {

          //clear the dtmf timer because we have received the dtmf before expire time
          logger.log('DEB', call.channel.id, 'agent_transfer', "lets clear the timer objTransferDtmfStarOne");
          clearTimeout(call.objTransferDtmfStarOne);

          logger.log('DEB', call.channel.id, 'agent_transfer', "Complete Agent Extention Received (" + call.agent_extention + ") & length (" + call.agent_extention.length + ")");
          logger.log('DEB', call.channel.id, 'agent_transfer', 'Update state from [' + call.user_ivr_state + '] to [TRANSFER_CALL_TO_EXTENTION]');
          call.callagentincomingstate = "TRANSFER_CALL_TO_EXTENTION";
          var postResponseHandlerCheckAgentExt = function (err, response, result) {

            logger.log('DEB', call.channel.id, 'agent_transfer', "API Status:" + result.status);
            logger.log('DEB', call.channel.id, 'agent_transfer', "API Message:" + result.message);

            logger.log('DEB', call.channel.id, 'agent_transfer', "API in_agent_id:" + result.data[0].in_agent_id);

            //if ((err) || (result.status == "0")) {
            if (err) {
              logger.log('ERR', call.channel.id, 'agent_transfer', 'error in validating agent extention(' + call.agent_extention + ') ' + err);
            } else {

              //result.data[0].in_agent_status;

              // Object.keys(result[0]).forEach(function (key) {
              //var row = result[0][key];
              //logger.log('DEB', call.channel.id, 'agent_transfer', "postResponseHandlerCheckAgentExt result:" + row.result)
              if (result.status == "0") {
                call.callType = '1';
                logger.log('DEB', call.channel.id, 'agent_transfer', "Agent Ext is invalid");
                call.user_ivr_state = "TRANSFER_AGENT_INVALID";



                start_playback(call.currentState, channel);
                logger.log('DEB', call.channel.id, 'agent_transfer', "restting agent_extention to black for start again.");
                call.agent_extention = "";



                if ((call.user_ivr_state == "TRANSFER_AGENT_ONBREAK") || (call.user_ivr_state == "TRANSFER_AGENT_NOTREACHABLE") || (call.user_ivr_state == "TRANSFER_AGENT_INVALID") || (call.user_ivr_state == "TRANSFER_AGENT_BUSY")) {
                  if (call.dialedLegDinit == false) {
                    //go back to dailed session if its still alive.
                    jump_back_to_dailed_session();
                  }
                  else {
                    //do nothing probally the dailled is killed so this might also get killed.
                  }
                }

              }
              else {

                //CONCAT(@in_agent_mobile,'#',@in_agent_id,'#',@in_group_name,'#',@in_agent_status,'#',@in_agent_sticky,'#',////////////@in_agent_masking,'#',@in_agent_score,'#',@in_agent_sticky_days,'#',@in_email_id,'#') AS result;


                //var apiResponseTmp = row.result.split("#");
                call.transAgentMobile = result.data[0].in_agent_mobile;
                call.transAgentId = result.data[0].in_agent_id;
                call.transAgentGroup = result.data[0].in_group_id;
                call.transAgenStatus = result.data[0].in_agent_status;
                call.transAgenSticky = result.data[0].in_agent_sticky;
                call.transAgenMasking = result.data[0].in_agent_masking;
                call.transAgenScore = result.data[0].in_agent_score;
                call.transAgenStickyDays = result.data[0].in_agent_sticky_days;
                call.transAgenEmailId = result.data[0].in_email_id;

                logger.log('DEB', call.channel.id, 'agent_transfer', "call transfer Agent Mobile No(" + call.transAgentMobile + ")");
                logger.log('DEB', call.channel.id, 'agent_transfer', "call transfer Agent ID(" + call.transAgentId + ")");
                logger.log('DEB', call.channel.id, 'agent_transfer', "call transfer Agent Group(" + call.transAgentGroup + ")");
                logger.log('DEB', call.channel.id, 'agent_transfer', "call transfer Agent Status(" + call.transAgenStatus + ")");
                logger.log('DEB', call.channel.id, 'agent_transfer', "call transfer Agent Sticky(" + call.transAgenSticky + ")");
                logger.log('DEB', call.channel.id, 'agent_transfer', "call transfer Agent Masking(" + call.transAgenMasking + ")");
                logger.log('DEB', call.channel.id, 'agent_transfer', "call transfer Agent Score(" + call.transAgenScore + ")");
                logger.log('DEB', call.channel.id, 'agent_transfer', "call transfer Agent Sticky Days(" + call.transAgenStickyDays + ")");
                logger.log('DEB', call.channel.id, 'agent_transfer', "call transfer Agent Email(" + call.transAgenEmailId + ")");

                //valid and idle agent to make call to.
                if (call.transAgenStatus == "1") {



                  logger.log('DEB', call.channel.id, 'agent_transfer', "Lets transfer call to agent..");
                  logger.log('DEB', call.channel.id, 'agent_transfer', "removing custome from bridge for now....");
                  removeChannelsFromBridge(channel, call.channel, call.callBridge);

                  call.user_ivr_state = "caller_YOUR_HOLD_MUSIC";

                  //I commented this code to check why I was not able to stop media file after agent answer call or rejected.
                  //by commenting this seems working.
                  //start_playback(call.currentState, call.channel);

                  //if its first time then play for dialed else play for transfer
                  if (call.transLegFlag == "0") {
                    call.orignalAgentHoldMusic = "1";
                    start_playback(call.currentState, call.dialedLeg);
                  }
                  else {
                    call.orignalAgentHoldMusic = "1";
                    start_playback(call.currentState, call.transferLeg);
                  }

                  if (call.transType == "UNATTENDANT_CALL_TRANSFER") {
                    addTransfreeChannelsToBridge(channel, call.channel, call.callBridge);

                  }
                  transfer(call.channel);
                }
                else if (call.transAgenStatus == "2") {
                  logger.log('DEB', call.channel.id, 'agent_transfer', "Agent is already on a call");
                  call.user_ivr_state = "TRANSFER_AGENT_BUSY";
                  start_playback(call.currentState, channel);

                }
                else if (call.transAgenStatus == "3") {
                  logger.log('DEB', call.channel.id, 'agent_transfer', "Agent is on break");
                  call.user_ivr_state = "TRANSFER_AGENT_ONBREAK";
                  start_playback(call.currentState, channel);
                }
                else {
                  logger.log('ERR', call.channel.id, 'agent_transfer', "Invalid Agent status " + call.transAgenStatus + "");
                  logger.log('DEB', call.channel.id, 'agent_transfer', "Agent Ext is invalid");
                  call.user_ivr_state = "TRANSFER_AGENT_INVALID";

                  start_playback(call.currentState, channel);

                }

                //handel the case which play failed propmt about the agent status to agent and once finished go back to dailled session.
                if ((call.user_ivr_state == "TRANSFER_AGENT_ONBREAK") || (call.user_ivr_state == "TRANSFER_AGENT_NOTREACHABLE") || (call.user_ivr_state == "TRANSFER_AGENT_INVALID") || (call.user_ivr_state == "TRANSFER_AGENT_BUSY")) {
                  if (call.dialedLegDinit == false) {
                    //go back to dailed session if its still alive.
                    jump_back_to_dailed_session();
                  }
                  else {
                    //do nothing probally the dailled is killed so this might also get killed.
                  }
                }


              }
              //});
            }
          }
          logger.log('DEB', call.channel.id, 'user_detail', "going to call function checkValidAgentExt");
          //sqlConn.checkValidAgentExt(call.smeID, call.agent_extention, call.channel.id, postResponseHandlerCheckAgentExt)
          api.checkValidAgentExt(call.channel.id, call.smeID, call.agent_extention, call.callSessionId,postResponseHandlerCheckAgentExt)

        }
        else {
          logger.log('DEB', call.channel.id, 'agent_transfer', "Agent Extention Received so far (" + call.agent_extention + ") & length (" + call.agent_extention.length + ") but not (4)");
        }

      }
      else if (call.user_ivr_state == "CALL_TRANSFER_INIT") {
        call.transferCallFlag = '1';

      }


      switch (event.digit) {
        case '*':

          logger.log('DEB', call.channel.id, 'agent_transfer', "State is " + call.user_ivr_state + "")

          if ((call.user_ivr_state == "caller_YOUR_HOLD_MUSIC")) {
            //need to complete the transfer.

            logger.log('DEB', call.channel.id, 'agent_transfer', "stopping hold music to customer leg.")
            if (playback) {
              if (call.channel) {
                call.transHoldMusic = "0";
                logger.log('DEB', call.channel.id, 'agent_transfer', '* stopping playing file (' + call.gmediaFile + ')');
                playback.stop();
              }
            }

            addTransfreeChannelsToBridge(channel, call.channel, call.callBridge);
            var retSessionId = getTransferSession(call.origAgentSessionID)
            if (retSessionId != "0") {
              logger.log('DEB', call.channel.id, 'agent_transfer', "hangup the Orignal Agent leg..")
              hangupAgentLeg(call.channel, retSessionId);

              call.transferLeg.on('ChannelDtmfReceived', on_dtmf);
              call.user_ivr_state = "ok_TRANSFER_COMPLETED";

              logger.log('DEB', call.channel.id, 'agent_transfer', "Channel State Updated to [" + call.user_ivr_state + "]")
              swapTransferAgents(call.transferLeg.id);

            }
            //end new version


          }
          else {
            call.transDtmf = event.digit;
            call.user_ivr_state = "TRANSFER_CASE_DTMF";
          }
          break;

        case '#':

          if (call.transHoldFlag == "0") {


            //this timer we are starting to play music to agent, just reminder after some seconds that the customer call is on hold.
            logger.log('DEB', call.channel.id, 'agent_transfer', "[hold_call_reminder] timer initialize..");
            call.objReminderCallHoldToAgent = setTimeout(hold_call_reminder, (cfg.timer.call_hold_reminder_to_agent_timer * 1000));

            if (call.transferLegState != "connected") {
              //check if the call transfer done success that menas it will have the session else dialed leg now need to manage
              //in transfer file, so lets put the dialed leg session.
              call.transferLeg = call.dialedLeg;
            }
            //play call is on hold now
            call.transferLeg.snoopChannel(
              {
                app: cfg.asterisk.stasisApp, channelId: call.transferLeg.id, spy: 'out', whisper: 'out', appArgs: 'SNOOPING_NOTIFY_AGENT_CUST_CALL_ON_HOLD'
              },

              function (err, channel) {
                if (err) {
                  logger.log('ERR', call.channel.id, 'agent_transfer', "error in snoopChannel: " + err)
                }
                else {
                  logger.log('DEB', call.channel.id, 'agent_transfer', "Channel snoopChannel on(" + call.transferLeg.id + ")");
                }

              });



            if (call.dbMusicOnHoldPrompt != "0") {

              logger.log('DEB', call.channel.id, 'agent_transfer', "Hold (custom) class " + call.smeID + "");
              call.startMohClass = call.smeID;
            }
            else {

              call.startMohClass = "Default";
              logger.log('DEB', call.channel.id, 'agent_transfer', "Hold (default) class");

            }

            call.client.channels.startMoh(
              {

                channelId: call.channel.id,
                mohClass: call.startMohClass
              },
              function (err) {
                if (err) {
                  logger.log('ERR', call.channel.id, 'agent_transfer', "[" + this.state_name + "]: error while HOLD customer: " + err)
                }
                else {

                  logger.log('DEB', call.channel.id, 'agent_transfer', "Customer ON HOLD now...");
                  call.transHoldFlag = "1";
                }

              }
            );

          }
          else {

            //if(call.flagTransferDtmfStarOne == "1")
            //{
            //clear the timer which we init to remind the agent that customer call is on hold
            logger.log('DEB', call.channel.id, 'agent_transfer', "lets clear the timer objReminderCallHoldToAgent");
            clearTimeout(call.objReminderCallHoldToAgent);
            //call.flagTransferDtmfStarOne='1';
            //}

            if (call.flagTransferDtmfStarOne == "1") {
              logger.log('DEB', call.channel.id, 'agent_transfer', "[timerTransferDtmf] timer initialize..");
              call.objTransferDtmfStarOne = setTimeout(DTMF_Timeout, (cfg.timer.transfer_dtmf_timer * 1000));
              call.timerState = "transfer_dtmf_input";
            }

            //lets play the media to agent before we unhold customer call.
            call.transferLeg.snoopChannel(
              {
                app: cfg.asterisk.stasisApp, channelId: call.transferLeg.id, spy: 'out', whisper: 'out', appArgs: 'SNOOPING_NOTIFY_AGENT_CUST_CALL_UNHOLD'
              },
              function (err, channel) {
                if (err) {
                  logger.log('ERR', call.channel.id, 'agent_transfer', "error in snoopChannel: " + err)
                }
                else {
                  logger.log('DEB', call.channel.id, 'agent_transfer', "Channel snoopChannel on(" + call.transferLeg.id + ")");
                }

              });



            logger.log('DEB', call.channel.id, 'agent_transfer', "UnHold (default)");
            call.client.channels.stopMoh(
              {
                channelId: call.channel.id
              },
              function (err) {
                if (err) {
                  logger.log('ERR', call.channel.id, 'agent_transfer', "[" + this.state_name + "]: error while UNHOLD stopMoh customer: " + err)
                }
                else {
                  logger.log('DEB', call.channel.id, 'agent_transfer', "Channel UNHOLD stopMoh now...");
                  call.transHoldFlag = "0";
                }

              }
            );


          }

          if (call.user_ivr_state == "CALL_TRANSFER_INIT") {
            //need to rollback the transfer and orignal agent need to keep talking to customer.
            logger.log('DEB', call.channel.id, 'agent_transfer', "stopping hold music to customer leg.")
            if (playback) {
              if (call.channel) {
                logger.log('DEB', call.channel.id, 'agent_transfer', '=========stopping playing file (' + call.gmediaFile + ')');
                //playback.stop();


                call.client.channels.stopMoh(
                  { channelId: call.channel.id },
                  function (err) {
                    if (err) {
                      logger.log('ERR', call.channel.id, 'agent_transfer', "============stopMoh error: " + err)

                    }
                    else {
                      logger.log('DEB', call.channel.id, 'agent_transfer', "============stopMoh success");
                      call.transHoldFlag = "0";
                    }
                  }
                );

              }
            }


            logger.log('DEB', call.channel.id, 'agent_transfer', "Removing Orignal Agent from the call..")
            logger.log('DEB', call.channel.id, 'agent_transfer', "adding Customer to the bridge again..")
            addTransfreeChannelsToBridge(channel, call.channel, call.callBridge);
            logger.log('DEB', call.channel.id, 'agent_transfer', "hangup the Orignal Agent leg..")
            hangupAgentLeg(call.channel, call.dialedLeg);
            call.user_ivr_state = "rollback_TRANSFER_COMPLETED";
            logger.log('DEB', call.channel.id, 'agent_transfer', "Channel State Updated to [" + call.user_ivr_state + "]")

          }
          else {
          }
          break;

        case '1':
          if ((call.transDtmf == "*") && (call.user_ivr_state == "TRANSFER_CASE_DTMF")) {
            call.transDtmf = call.transDtmf + event.digit;
            logger.log('DEB', call.channel.id, 'agent_transfer', "group DTMF(" + call.transDtmf + ")");
            if (call.transDtmf == "*1") {

              call.flagTransferDtmfStarOne = "1";

              //this is limit how many time I can transfer the call to others, default is 1
              logger.log('DEB', call.channel.id, 'agent_transfer', "transfer limit (" + call.callTransferRestrictionCount + ")");
              if (call.callTransferRestrictionCount < 1) {

                if (call.transHoldFlag == "0") {


                  if (call.dbMusicOnHoldPrompt != "0") {

                    logger.log('DEB', call.channel.id, 'agent_transfer', "Hold (custom) class " + call.smeID + "");
                    call.startMohClass = call.smeID;
                  }
                  else {

                    call.startMohClass = "Default";
                    logger.log('DEB', call.channel.id, 'agent_transfer', "Hold (default) class");

                  }

                  call.client.channels.startMoh(
                    {

                      channelId: call.channel.id,
                      mohClass: call.startMohClass
                    },
                    function (err) {
                      if (err) {
                        logger.log('ERR', call.channel.id, 'agent_transfer', "[" + this.state_name + "]: error while HOLD startMoh customer: " + err)
                      }
                      else {

                        logger.log('DEB', call.channel.id, 'agent_transfer', "Customer ON HOLD startMoh now...");
                        call.transHoldFlag = "1";
                      }

                    }
                  );


                }



                call.transType = "UNATTENDANT_CALL_TRANSFER";
                call.user_ivr_state = "req_UNATTENDANT_CALL_TRANSFER";
                call.agent_extention = "";

                call.whichtransLeg = "ORIGNAL_AGENT";
                logger.log('DEB', call.channel.id, 'agent_transfer', "Call Leg is now (" + call.whichtransLeg + ")");



                call.transferLeg.snoopChannel(
                  {
                    app: cfg.asterisk.stasisApp, channelId: call.transferLeg.id, spy: 'out', whisper: 'out', appArgs: 'SNOOPING_FOR_TRANSFER'
                  },
                  function (err, channel) {
                    if (err) {
                      logger.log('ERR', call.channel.id, 'agent_transfer', "error in snoopChannel: " + err)
                    }
                    else {
                      logger.log('DEB', call.channel.id, 'agent_transfer', "Channel snoopChannel on(" + call.transferLeg.id + ")");


                    }

                  });
              }
              else {
                logger.log('DEB', call.channel.id, 'agent_transfer', "transfer limit expired (" + call.callTransferRestrictionCount + ")");
              }

            }
            else {
              logger.log('DEB', call.channel.id, 'agent_transfer', "invalid group DTMF(" + call.transDtmf + ")");
            }
          }
          break;

      }
    }

    /************************************************************************************************
    * 
    * Function Name: on_hangup
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function on_hangup(event, channel) {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'ON Event [on_hangup]');

      logger.log('DEB', call.channel.id, 'agent_transfer', "Inside on_hangup");
      cleanup();
      logger.log('DEB', call.channel.id, 'agent_transfer', "State-Machine Update to ==> [Event.HANGUP]");
      call.state_machine.change_state(Event.HANGUP);
    }


    /************************************************************************************************
    * 
    * Function Name: cliRandom
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function cliRandom() {
      var min = 100000;
      var max = 999999;
      var x = Math.floor(Math.random() * (max - min + 1) + min);
      return x;

    }


    /************************************************************************************************
    * 
    * Function Name: getTransferSession
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function getTransferSession(CallSessionID) {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [getTransferSession]');
      logger.log('DEB', call.channel.id, 'agent_transfer', "transferAgentArray length (" + call.transferAgentArray.length + ")");

      var matchedAgentCntr = 0;
      var retvalSession = "0";
      for (var acnt = 0; acnt < call.transferAgentArray.length; acnt++) {
        var element = call.transferAgentArray[acnt];

        logger.log('DEB', call.channel.id, 'agent_transfer', "Printing values ==> (CallSessionID(" + element.Call_SessionID + "), AgentID(" + element.Agent_ID + "), AgentGroup(" + element.Agent_Group + "), AgentNumber(" + element.Agent_Number + ")), WhichCallLeg(" + element.Which_CallLeg + ")");

        if (element.Call_SessionID == CallSessionID) {
          retvalSession = element.Call_Session;

        }
      }
      return retvalSession;
    }

    /************************************************************************************************
* 
* Function Name: appendTransferAgent
* Description: <>
* Date: 28/April/2022
* 
************************************************************************************************/
    function appendTransferAgent(channel, AgentID, AgentNumber, AgentGroup, CallSession, CallSessionID, CallStartTime, WhichCallLeg, AnswerFlag) {
      logger.log('DEB', call.channel.id, 'agent_transfer', "appendTransferAgent to array: AgentID(" + AgentID + "), AgentNumber(" + AgentNumber + "), AgentGroup(" + AgentGroup + "), CallSession(" + CallSession + "), CallSessionID(" + CallSessionID + "), CallStartTime(" + CallStartTime + "), WhichCallLeg(" + WhichCallLeg + ") , AnswerFlag(" + AnswerFlag + ")");
      call.transferAgentArray.push({ Agent_ID: AgentID, Agent_Number: AgentNumber, Agent_Group: AgentGroup, Call_Session: CallSession, Call_SessionID: CallSessionID, Call_StartTime: CallStartTime, Which_CallLeg: WhichCallLeg, Answer_Flag: AnswerFlag });
    }

    /************************************************************************************************
    * 
    * Function Name: swapTransferAgents
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function swapTransferAgents(newSessionId) {
      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [swapTransferAgents]');
      call.origAgentSessionID = newSessionId;
      call.transfreeAgentSessionID = "";
    }

    /************************************************************************************************
    * 
    * Function Name: updateTransferAgent
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function updateTransferAgent(CallSessionID, ActionType, ActionValue) {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [updateTransferAgent]');
      logger.log('DEB', call.channel.id, 'agent_transfer', "transferAgentArray length (" + call.transferAgentArray.length + ")");

      var matchedAgentCntr = 0;
      var retvalSession = "0";
      for (var acnt = 0; acnt < call.transferAgentArray.length; acnt++) {
        var element = call.transferAgentArray[acnt];
        if (element.Call_SessionID == CallSessionID) {
          logger.log('DEB', call.channel.id, 'agent_transfer', "Agent " + element.Which_CallLeg + " from transferAgentArray detail (CallSessionID(" + element.Call_SessionID + "), AgentID(" + element.Agent_ID + "), AgentGroup(" + element.Agent_Group + "), AgentNumber(" + element.Agent_Number + ") AnswerFlag(" + element.Answer_Flag + "))");
          if (ActionType == "1") //update the Answer Flag
          {
            logger.log('DEB', call.channel.id, 'agent_transfer', "Update the AnswerFlag to (" + ActionValue + ")");
            element.Answer_Flag = ActionValue;
          }
        }
      }
    }


    /************************************************************************************************
    * 
    * Function Name: getUsedTransferAgentList
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function getUsedTransferAgentList(channel, AgentID, AgentNumber, catDesc) {
      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [getUsedTransferAgentList]');
      logger.log('DEB', call.channel.id, 'agent_transfer', "getUsedAgentList: AgentID(" + AgentID + "), catDesc(" + catDesc + "), AgentNumber(" + AgentNumber + ")");
      logger.log('DEB', call.channel.id, 'agent_transfer', "transferAgentArray length (" + call.transferAgentArray.length + ")");
      var matchedAgentCntr = 0;
      var tmpAgentList = "";

      for (var acnt = 0; acnt < call.transferAgentArray.length; acnt++) {
        var element = call.transferAgentArray[acnt];
        tmpAgentList = tmpAgentList + "," + element.AgentId;
      }
      logger.log('DEB', call.channel.id, 'agent_transfer', "already tried agents List (" + tmpAgentList + ")");
      return tmpAgentList;
    }

    /************************************************************************************************
    * 
    * Function Name: ValidateTransferAgent
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function ValidateTransferAgent(channel, AgentID, AgentNumber, catDesc) {
      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [ValidateTransferAgent]');
      logger.log('DEB', call.channel.id, 'agent_transfer', "ValidateAgent to array: AgentID(" + AgentID + "), catDesc(" + catDesc + "), AgentNumber(" + AgentNumber + ")");
      logger.log('DEB', call.channel.id, 'agent_transfer', "transferAgentArray length (" + call.transferAgentArray.length + ")");

      var matchedAgentCntr = 0;
      for (var acnt = 0; acnt < call.transferAgentArray.length; acnt++) {
        var element = call.transferAgentArray[acnt];

        if (element.AgentId === AgentID && element.AgentNumber === AgentNumber && element.AgentDesc === catDesc) {
          logger.log('DEB', call.channel.id, 'agent_transfer', "Agent has already tried: AgentID(" + AgentID + "), catDesc(" + catDesc + "), AgentNumber(" + AgentNumber + ")");
          matchedAgentCntr++;
        }
      }

      if (matchedAgentCntr >= call.queue_limit) {
        logger.log('DEB', call.channel.id, 'agent_transfer', "Agent limit exceeded: AgentID(" + AgentID + "), catDesc(" + catDesc + "), AgentNumber(" + AgentNumber + ")");
        return "stop";
      }
      else {
        logger.log('DEB', call.channel.id, 'agent_transfer', "Agent valid to orignate call: AgentID(" + AgentID + "), catDesc(" + catDesc + "), AgentNumber(" + AgentNumber + ")");
        return "start";
      }



    }
    /************************************************************************************************
    * 
    * Function Name: funcPushLiveEvent
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function funcPushLiveEvent(channel) {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [funcPushLiveEvent]');

      var newdatetime = dateTime.getcallDateTimeV2();
      //channel, event_name, crm_partner, sme_id, account_sid, session_id , recording_file_id, recording_file_url, agent_no, customer_no, longcode, start_datetime, end_datetime, call_type, call_mode, call_status, call_duration, custom_dtmf, optional_field, response_msg
      zmq.sendZmqMsg(call.channel.id, "evt_connected", call.crmPartner, call.smeID, call.accountSid, call.callSessionId, '0', '0', call.idealAgentNumber, call.calling_number, call.called_number, newdatetime, '0', call.callType, call.callMode, 'CALL CONNECTED', '0', '0', '0', '0');

    }

    /************************************************************************************************
    * 
    * Function Name: logAgentRecording
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function logAgentRecording(channel) {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [logAgentRecording]');

      var postResponseHandlerSaveRec = function (err, result) {
        if (err) {
          logger.log('ERR', call.channel.id, '', "Error thrown at DB call:" + err);
        }
        else {
          logger.log('DEB', call.channel.id, 'agent_transfer', "Success DB response where we called: " + result);
          call.adRecordingFileId = result;

        }
      }
      var aAgentFlag = "1";
      var aRecStatus = "0";
      var aInsertFlag = "1";
      var aRecordingFile = call.callRecordedFile + "#";
      logger.log('DEB', call.channel.id, 'agent_transfer', "aAgentFlag(" + aAgentFlag + ")");
      logger.log('DEB', call.channel.id, 'agent_transfer', "callSessionId(" + call.callSessionId + ")");
      logger.log('DEB', call.channel.id, 'agent_transfer', "smeID(" + call.smeID + ")");
      logger.log('DEB', call.channel.id, 'agent_transfer', "idealAgentID(" + call.idealAgentID + ")");
      logger.log('DEB', call.channel.id, 'agent_transfer', "customer Number(" + call.channel.caller.number + ")");
      logger.log('DEB', call.channel.id, 'agent_transfer', "AgentCallDuration(" + call.AgentCallDuration + ")");
      logger.log('DEB', call.channel.id, 'agent_transfer', "RecordingFile(" + aRecordingFile + ")");
      logger.log('DEB', call.channel.id, 'agent_transfer', "aRecStatus(" + aRecStatus + ")");
      logger.log('DEB', call.channel.id, 'agent_transfer', "aInsertFlag(" + aInsertFlag + ")");
      logger.log('DEB', call.channel.id, 'agent_transfer', "selfIP(" + cfg.server.self_ip + ")");
      sqlConn.saveRecordings(call.channel.id, aAgentFlag, call.callRecordedFileRaw, call.smeID, call.idealAgentID, call.channel.caller.number, call.AgentCallDuration, aRecordingFile, aRecStatus, aInsertFlag, cfg.server.self_ip, postResponseHandlerSaveRec)

    }


    //===========================================================================================
    //===========================================================================================
    //===========================================================================================
    //			Transfer Case
    //===========================================================================================
    //===========================================================================================
    //===========================================================================================
    //===========================================================================================

    /************************************************************************************************
    * 
    * Function Name: transfer
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function transfer(channel) {

      var FinalAgentCLI = "";
      var transferee = call.client.Channel();
      var tempcallerIDName = "wringg";
      var tempcallerIDNumber = "9000";

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [transfer]');

      logger.log('DEB', call.channel.id, 'agent_transfer', "for testing only-------transferee:(" + transferee + "), transferee.id:" + transferee.id + "");
      logger.log('DEB', call.channel.id, 'agent_transfer', "[[[[[[[[[[[[[[[[[[[[[[[[[[[ Transferee Channel created:" + transferee.id + "]]]]]]]]]]]]]]]]]]]]]]]]]]]");



      logger.log('DEB', call.channel.id, 'agent_transfer', "Agent " + call.transAgentMobile + " is safe to patch a call");

      logger.log('DEB', call.channel.id, 'agent_transfer', "###################### Dial Status is : " + call.dialStatus);
      logger.log('DEB', call.channel.id, 'agent_transfer', "###################### cc EndNode is : " + call.ccEndNode);
      call.allocated_agent = call.transAgentMobile;
      logger.log('DEB', call.channel.id, 'agent_transfer', "Will Dial the allocated Agent:" + call.transAgentMobile);
      logger.log('DEB', call.channel.id, 'agent_transfer', "and bridge the customer number:" + call.channel.caller.number);
      var newBridgeId = call.channel.caller.number + "_" + call.transAgentMobile;
      logger.log('DEB', call.channel.id, 'agent_transfer', "and bridge the customer number:" + call.channel.caller.number);

      if (call.smemasking == "1") {
        call.channel.caller.number
        var dynamicSC = cliRandom();
        //FinalAgentCLI = call.called_number;
        FinalAgentCLI = call.outVirtualNo;
        logger.log('DEB', call.channel.id, 'agent_transfer', "Masking [ON] setting CLI as [" + FinalAgentCLI + "]");
      }
      else {
        //FinalAgentCLI = call.called_number;
        FinalAgentCLI = call.outVirtualNo;
        logger.log('DEB', call.channel.id, 'agent_transfer', "Masking [OFF] setting CLI as [" + FinalAgentCLI + "]");
      }



      call.transferLeg = transferee;
      logger.log('IMP', call.channel.id, 'agent_transfer', "transferLegState Changed [" + call.transferLegState + " => ready]");
      call.transferLegState = "ready";

      //lets calculate the time when we had the agent ready to make call out.
      call.TransferAgentStartTime = dateTime.getAgentDateTime();
      logger.log('DEB', call.channel.id, 'agent_transfer', "TransferAgentStartTime [" + call.TransferAgentStartTime + "]");

      //I just change to 0 last filed earlier it was 1, seems this cause the issue that in transfer one call coming as answer and another failed.
      call.transfreeAgentSessionID = transferee.id;

      var endPoint = "SIP/" + call.transAgentMobile + "@" + cfg.asterisk.gw_ipaddr_port;
      var callerID = "ed_" + tempcallerIDName + " <" + FinalAgentCLI + ">";

      //var endPoint = "SIP/+917740023117@"+cfg.asterisk.gw_ipaddr_port;
      //var callerID = "ed_"+tempcallerIDName+" <"+FinalAgentCLI+">";




      logger.log('DEB', call.channel.id, 'agent_transfer', "Current State [" + call.currentState + "] Update to ==> [originating]")
      logger.log('DEB', call.channel.id, 'agent_transfer', "callerID(" + callerID + "), endPoint(" + endPoint + ")")
      call.currentState = "originating";

      call.originateTime = (new Date).getTime();
      logger.log('DEB', call.channel.id, 'agent_transfer', "Call Originate Time :  " + call.originateTime);
      call.waitingTime = (call.originateTime - call.startTime) / 1000;
      logger.log('DEB', call.channel.id, 'agent_transfer', " Waiting  time : [", call.waitingTime, "]");


      transferee.on('StasisEnd', function (event, channel) {

        logger.log('IMP', call.channel.id, 'agent_transfer', 'ON Event [StasisEnd - transferee.on]');

        //seems the this session is in destroyed states so saving the state.
        call.transferLegDinit = true;
        logger.log('DEB', call.channel.id, 'agent_transfer', "set transferLegDinit true");

        //setting calldisconnectedBy for this call
        if (call.calldisconnectedBy == "none") {
          call.calldisconnectedBy = "agent_disconnect"
        }

        logger.log('DEB', call.channel.id, 'agent_transfer', " channel inside StasisEnd  " + channel.id);
        logger.log('DEB', call.channel.id, 'agent_transfer', " Inside channel StasisEnd function ");


        //stop ringing tone for orignal agent...
        if ((call.orignalAgentHoldMusic == "1") && (call.transLegFlag == "0")) {
          logger.log('DEB', call.channel.id, 'agent_transfer', "stop ringing to orignal agent dialer(StasisEnd)")
          if (call.channel) {
            call.orignalAgentPlayback.stop();
            call.orignalAgentHoldMusic == "0";
          }
        }
        else if ((call.orignalAgentHoldMusic == "1") && (call.transLegFlag == "1")) {
          logger.log('DEB', call.channel.id, 'agent_transfer', "stop ringing to orignal agent transfree(StasisEnd)")
          if (call.channel) {
            call.orignalAgentPlayback.stop();
            call.orignalAgentHoldMusic == "0";
          }

        }
        else {
          logger.log('DEB', call.channel.id, 'agent_transfer', "nothing to stop(StasisEnd)")
        }

        //end here to stop tone for orignal agent...			

        hangupDialed(channel, transferee);

        //logger.log('DEB', call.channel.id, 'agent_transfer', "adding call detail of "+call.whichtransLeg+" in transferAgentArray ");
        //call.whichtransLeg = "TRANSFER_AGENT";









        //removeTransferAgent(call.channel, channel.id);


        if (call.dialedLegDinit == false) {
          //go back to dailed session if its still alive.
          jump_back_to_dailed_session();
        }
        else {
          //do nothing probally the dailled is killed so this might also get killed.
        }

      });

      transferee.on('ChannelDestroyed', function (event, transferee) {

        logger.log('IMP', call.channel.id, 'agent_transfer', 'ON Event [ChannelDestroyed - transferee.on]');

        //setting calldisconnectedBy for this call
        if (call.calldisconnectedBy === "none") {
          call.calldisconnectedBy = "agent_disconnect"
        }
        logger.log('DEB', call.channel.id, 'agent_transfer', 'Inside transferee ChannelDestroyed, Current State [' + call.currentState + ']');

        //seems the this session is in destroyed states so saving the state.
        call.transferLegDinit = true;
        logger.log('DEB', call.channel.id, 'agent_transfer', "set transferLegDinit true");

        logger.log('DEB', call.channel.id, 'agent_transfer', "TransferAgentRingingDuration is(" + call.TransferAgentRingingDuration + ")");
        logger.log('DEB', call.channel.id, 'agent_transfer', "TransferAgentConnectedStartTime is(" + call.TransferAgentConnectedStartTime + ")");

        if ((call.TransferAgentRingingDuration <= '0') || isNaN(call.TransferAgentRingingDuration)) {
          call.TransferAgentRingingEndTime = dateTime.getAgentDateTime();
          call.TransferAgentRingingDuration = dateTime.calculateDuration(call.TransferAgentRingingStartTime, call.TransferAgentRingingEndTime);
        }

        if (call.TransferAgentConnectedStartTime != 0) {
          call.TransferAgentConnectedEndTime = dateTime.getAgentDateTime();
          call.TransferAgentConnectedDuration = dateTime.calculateDuration(call.TransferAgentConnectedStartTime, call.TransferAgentConnectedEndTime);
        } else {
          call.TransferAgentConnectedDuration = '0';
        }

        logger.log('DEB', call.channel.id, 'agent_transfer', "||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||");
        logger.log('DEB', call.channel.id, 'agent_transfer', "TransferAgentRingingDuration(" + call.TransferAgentRingingDuration + ")");
        logger.log('DEB', call.channel.id, 'agent_transfer', "TransferAgentConnectedDuration(" + call.TransferAgentConnectedDuration + ")");
        logger.log('DEB', call.channel.id, 'agent_transfer', "||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||");


        //call.TransferAgentConnectedStartTime = "0";
        //call.TransferAgentRingingEndTime = dateTime.getAgentDateTime();
        //call.TransferAgentRingingDuration = dateTime.calculateDuration(call.TransferAgentRingingStartTime, call.TransferAgentRingingEndTime);
        //logger.log('DEB', call.channel.id, 'agent_transfer', "TransferAgentRingingDuration(" + call.TransferAgentRingingDuration + ")");

        //logger.log('ERR', call.channel.id, 'agent_transfer', "New transfer did not pick the call, thats why here " + call.transAgenStatus + "");
        //logger.log('DEB', call.channel.id, 'agent_transfer', "Agent Ext is not reachable");
        //call.user_ivr_state = "TRANSFER_AGENT_NOTREACHABLE";
        //start_playback(call.currentState, channel);

        //call.AgentConnectedEndTime = dateTime.getAgentDateTime();
        //call.AgentConnectedDuration = dateTime.calculateDuration(call.AgentConnectedStartTime, call.AgentConnectedEndTime);
        //logger.log('DEB', call.channel.id, 'agent_transfer', "AgentConnectedDuration(" + call.AgentConnectedDuration + ")");


        logger.log('DEB', call.channel.id, 'agent_transfer', 'Agent call disconneced, Reason_Cause[' + event.cause + '] Cause_Msg[' + event.cause_txt + ']');
        call.agentCallResponseCode = event.cause;
        call.agentCallResponseMsg = event.cause_txt;

        call.callInfo = "transfer";
        //call.AgentStartCallTime = call.TransferStartCallTime;
        //call.idealAgentID = call.transAgentId;
        //call.catDescAgent = call.transAgentGroup;


        call.transLegFlag = "0";
        call.transferCallFlag = '1';
        //logger.log('DEB', call.channel.id, 'agent_transfer', "adding call detail of " + call.whichtransLeg + " in transferAgentArray ");

        //appendTransferAgent(call.channel, call.transAgentId, call.transAgentMobile, call.transAgentGroup, call.transferLeg, call.transferLeg.id, call.AgentStartCallTime, call.whichtransLeg, "0");
        call.origAgentSessionID = call.transferLeg.id;
        call.transfreeAgentSessionID = "";


        /*if (call.transType == "UNATTENDANT_CALL_TRANSFER") {
          var retSession = getTransferSession(call.origAgentSessionID)
          if (retSession != "0") {
            logger.log('DEB', call.channel.id, 'agent_transfer', "hangup the Orignal Agent leg..")
            /////hangupAgentLeg(call.channel, retSession);
            /////hangupAgentLeg(call.channel, call.channel);


          }


        }*/

        //assuming that if the transferLegState is not "init" thats means will be one of the following so the agent is in busy
        //state so lets mark it free and generate cdr as well.
        //init => ready => originating => ringing => connected => disconnected.
        logger.log('DEB', call.channel.id, 'agent_transfer', 'transferLegState(' + call.transferLegState + ') && transAgentWriteCdrFlag(' + call.transAgentWriteCdrFlag + ')');
        if ((call.transferLegState != "init") && (call.transAgentWriteCdrFlag != true)) {

          call.callRouteReason = "transfer";
          logger.log('DEB', call.channel.id, 'agent_transfer', "callRouteReason:" + call.callRouteReason);

          logger.log('DEB', call.channel.id, 'agent_transfer', 'logAgentCdrTransfer generating agent cdr for transfer agent');
          agentProcessor.logAgentCdrTransfer(call);
          logger.log('DEB', call.channel.id, 'agent_transfer', 'freeTransferAgent marking transfer agent free');
          agentProcessor.freeTransferAgent(call);
          call.transAgentWriteCdrFlag = true;
        } else {
          logger.log('DEB', call.channel.id, 'agent_transfer', 'already, made transfer agent free and write transfer agent cdr');

        }

        if (call.transHoldFlag == "1") {



          if (call.orignalAgentHoldMusic == "1") {
            logger.log('DEB', call.channel.id, 'agent_transfer', "stop ringing to orignal agent dialer(StasisEnd)")
            if (call.channel) {
              call.orignalAgentPlayback.stop();
              call.orignalAgentHoldMusic == "0";
            }
          }


          call.agentDialed.snoopChannel(
            {
              app: cfg.asterisk.stasisApp, channelId: call.agentDialed.id, spy: 'out', whisper: 'out', appArgs: 'SNOOPING_NOTIFY_AGENT_CUST_CALL_UNHOLD'
            },
            function (err, channel) {
              if (err) {
                logger.log('ERR', call.channel.id, 'agent_transfer', "error in snoopChannel: " + err)
              }
              else {
                logger.log('DEB', call.channel.id, 'agent_transfer', "Channel snoopChannel on(" + call.agentDialed.id + ")");
              }

            });

          //clear the timer which we init to remind the agent that customer call is on hold
          logger.log('DEB', call.channel.id, 'agent_transfer', "lets clear the timer objReminderCallHoldToAgent");
          clearTimeout(call.objReminderCallHoldToAgent);


          logger.log('DEB', call.channel.id, 'agent_transfer', "UnHold (default)");

          call.client.channels.stopMoh(
            {
              channelId: call.channel.id
            },
            function (err) {
              if (err) {
                logger.log('ERR', call.channel.id, 'agent_transfer', "[" + this.state_name + "]: error while UNHOLD stopMoh customer: " + err)
              }
              else {
                logger.log('DEB', call.channel.id, 'agent_transfer', "Channel UNHOLD now...");
                call.transHoldFlag = "0";
              }

            }
          );

        } else {
          logger.log('DEB', call.channel.id, 'agent_transfer', "call not on hold...");
        }

        //assuming that if the transferLegState is not "init" thats means will be one of the following so the agent is in busy
        //state so lets mark it free and generate cdr as well.
        //init => ready => originating => ringing => connected => disconnected.
        logger.log('DEB', call.channel.id, 'agent_transfer', 'transferLegState(' + call.transferLegState + ') && transAgentWriteCdrFlag(' + call.transAgentWriteCdrFlag + ')');
        if ((call.transferLegState != "init") && (call.transAgentWriteCdrFlag != true)) {

          call.callRouteReason = "transfer";
          logger.log('DEB', call.channel.id, 'agent_transfer', "callRouteReason:" + call.callRouteReason);
          logger.log('DEB', call.channel.id, 'agent_transfer', 'logAgentCdrTransfer generating agent cdr for transfer agent');
          agentProcessor.logAgentCdrTransfer(call);
          logger.log('DEB', call.channel.id, 'agent_transfer', 'freeTransferAgent marking transfer agent free');
          agentProcessor.freeTransferAgent(call);
          call.transAgentWriteCdrFlag = true;
        } else {
          logger.log('DEB', call.channel.id, 'agent_transfer', 'already, made transfer agent free and write transfer agent cdr');

        }

        /*var retVal = getTransferAgent(transferee.id);
        logger.log('DEB', call.channel.id, 'agent_transfer', "getTransferAgent return (" + retVal.id + ")");
        if (retVal != "0") {
          logger.log('DEB', call.channel.id, 'agent_transfer', 'Check this Tarsem (' + transferee.id + ') ============================ (' + call.CDRtransAgentSessionId + ')');
          logger.log('DEB', call.channel.id, 'agent_transfer', 'generating agent cdr for agent (LAST TRANSFER)');
          //logAgentCdr(call.channel);
          //logAgentCdr(call.channel);
          agentProcessor.logAgentCdrTransfer(call);
        }
        else {
          logger.log('DEB', call.channel.id, 'agent_transfer', 'Check this Tarsem (' + transferee.id + ') ============================ (' + call.CDRtransAgentSessionId + ')');
          logger.log('ERR', call.channel.id, 'agent_transfer', 'Error while generating agent cdr for agent (LAST TRANSFER)');
        }*/
        //}




        //if (call.callRecordingStatus === "1")
        //ruko for recording some time 20may2022
        /*logger.log('DEB', call.channel.id, 'agent_transfer', 'checking recording condition ' + call.callRecordingStatus + '  and ' + call.transferAgentArray.length + '');
        if ((call.callRecordingStatus === "1") && (call.transferAgentArray.length == "0")) {
          logger.log('DEB', call.channel.id, 'agent_transfer', 'active recording, need to stop!');
          console.log("Accepted recording", call.callRecordedFile);
          call.client.recordings.stop(
            { recordingName: call.callRecordedFile },
            function (err) { }
          );

          var OLD_PATH = "/var/spool/asterisk/recording/" + call.callRecordedFile + ".wav";
          var NEW_PATH = cfg.media.rec_dir + "/" + call.callRecordedFile + ".wav";

          var adir = cfg.media.rec_dir + "/" + call.smeID;
          if (!fs.existsSync(adir)) {
            fs.mkdirSync(adir);
          }

          mv(OLD_PATH, NEW_PATH, function (err) {
            if (err) throw err
            logger.log('DEB', call.channel.id, 'agent_transfer', 'RECORDING Successfully Move from: (' + OLD_PATH + ') to: (' + NEW_PATH + ')')
            call.callRecordedFile = NEW_PATH;

            logger.log('DEB', call.channel.id, 'agent_transfer', 'storing recording in DB..');
            logAgentRecording(call.channel);
          })

        }
        else {
          logger.log('DEB', call.channel.id, 'agent_transfer', 'No active recording!');
        }*/



        //logger.log('DEB', call.channel.id, 'agent_transfer', 'transferAgentArray size now (' + call.transferAgentArray.length + ')');
        // if (call.transferAgentArray.length == "0") {
        // logger.log('DEB', call.channel.id, 'agent_transfer', 'Last Agent was in transferAgentArray so disconnect the customer leg (' + transferee.id + ')');
        //17may2022 just now
        /////logger.log('IMP', call.channel.id, 'agent_transfer', 'Init [hangupOriginal]');
        //////hangupOriginal(call.channel, transferee);
        //}
        //if (call.currentState == "originating") {
        // call.disconnectStatus = "NOANSWER";

        // logger.log('IMP', call.channel.id, 'agent_transfer', 'Init [cleanup]');
        /////ruko tarsem 17may2022cleanup();
        //logger.log('DEB', call.channel.id, 'agent_transfer', "State-Machine Update to ==> [Event.AGENT_CALL]");
        //call.state_machine.change_state(Event.AGENT_CALL);


        //return;
        // } else if (call.currentState == "feedback") {
        // logger.log('DEB', call.channel.id, 'agent_transfer', " call current state is : [" + call.currentState + "]");
        //return;
        // }
        // else if (call.currentState != "user_disconnect") {
        //  logger.log('DEB', call.channel.id, 'agent_transfer', "Current State [" + call.currentState + "] Update to ==> [agent_disconnect]")
        //   call.currentState = "agent_disconnect";
        //   call.disconnectStatus = "AGENT";
        // logger.log('DEB', call.channel.id, 'agent_transfer', " Call disconnected by agent");
        //}
        //just now 17may2022
        //////logger.log('IMP', call.channel.id, 'agent_transfer', 'Init [hangupOriginal]');
        ///////hangupOriginal(channel, transferee);


        if (call.callRecordingStatus == "1") { 


          if (cfg.system.recording_type == "wav") 
          {


            var tmp_callRecordedFile = call.callRecordedFile + ".wav";

						var REC_PATH = "/var/spool/asterisk/recording/" + call.callRecordedFile + ".wav";
						//var NEW_PATH = cfg.media.rec_dir + "/" + call.callRecordedFile + ".wav";


            logger.log('DEB', call.channel.id, 'agent_transfer', 'active recording, need to stop!');
						console.log("Accepted recording", call.callRecordedFile);

            //if(call.recordingStoppedFlag != true ){

              //call.recordingStoppedFlag = true;
                logger.log('DEB', call.channel.id, 'agent_transfer', 'active recording, need to stop!');
                console.log("Accepted recording", call.callRecordedFile);
                call.client.recordings.stop(
                  { recordingName: call.callRecordedFile },
                  function (err) { }
          );
              //} else 
            //{
              //logger.log('DEB', call.channel.id, 'agent_transfer', 'Have already stopped in MAIN'); 
            //}


						// call.client.recordings.stop(
						// 	{ recordingName: call.callRecordedFile },
						// 	function (err) { }
						// );
						

						var adir = cfg.media.rec_dir + "/" + call.smeID;
						if (!fs.existsSync(adir)) {
							fs.mkdirSync(adir);
						}

						call.callRecordedFile = REC_PATH;

						
							logger.log('DEB', call.channel.id, 'agent_transfer', 'RECORDING Successfully Done (' + REC_PATH + ')')
							call.callRecordedFile = REC_PATH;
							call.s3RecordedFile = REC_PATH;
							logger.log('DEB', call.channel.id, 'agent_transfer', 'storing recording in DB..');
							call.callDirection = "INCOMING";

							if (call.s3RecordedFile != undefined && call.s3RecordedFile.length != 0) {

								var postApiResponseHandler = function (err, data) {
									if (!err) {
										logger.log('DEB', call.channel.id, 'agent_transfer', "s3Upload Received: " + data.Location);
										console.log(data);

										call.s3uploadedUrl = data.Location;

										logger.log('DEB', call.channel.id, 'agent_transfer', "calling agentProcessor.SaveS3RecordingData ");
										agentProcessor.SaveS3RecordingData(call);

										fs.unlink(call.s3RecordedFile, (err) => {
											if (err) {
												logger.log('ERR', call.channel.id, 'agent_transfer', "DELETE error while deleting wav recording file("+call.s3RecordedFile+"):",err);
											  console.error(err)
											  //return
											} else {
												logger.log('DEB', call.channel.id, 'agent_transfer', "DELETE successfully deleting wav recording file"+call.s3RecordedFile+"",);
											}
										  
											//file removed
										  })

									}
									else {
										logger.log('ERR', call.channel.id, 'agent_transfer', 's3Upload failed');
									}

								}

								awsS3.s3Upload(call, call.smeID, call.s3RecordedFile, tmp_callRecordedFile, postApiResponseHandler);
							}
					

          } else if (cfg.system.recording_type == "mp3") {

            logger.log('DEB', call.channel.id, 'agent_transfer', 'active recording, need to stop!');
							console.log("Accepted recording", call.callRecordedFile);


              var tmp_callRecordedFile = call.callRecordedFile + ".wav";
		
							var REC_PATH = "/var/spool/asterisk/recording/" + call.callRecordedFile + ".wav";
              var NEW_MP3_PATH = cfg.media.rec_dir + "/" + call.callRecordedFile + ".mp3";

								logger.log('DEB', call.channel.id, 'agent_transfer', 'active recording, need to stop!');
									console.log("Accepted recording", call.callRecordedFile);
									call.client.recordings.stop(
                    { recordingName: call.callRecordedFile },
                    function (err) { }
            );
						   
		
							var adir = cfg.media.rec_dir + "/" + call.smeID;
							if (!fs.existsSync(adir)) {
								fs.mkdirSync(adir);
							}
		
							call.callRecordedFile = REC_PATH;
		
							//logger.log('DEB', call.channel.id, 'agent_transfer', 'storing recording in DB..('+call.s3RecordedFile+')');
							//agentProcessor.UploadS3Recording(call);
		
							
								logger.log('DEB', call.channel.id, 'agent_transfer', 'RECORDING Successfully Done (' + REC_PATH + ')')
								call.callRecordedFile = REC_PATH;
								//call.s3RecordedFile = NEW_PATH;
								call.s3RecordedFile = NEW_MP3_PATH;
								call.s3RecordedFileWav = REC_PATH;
								logger.log('DEB', call.channel.id, 'agent_transfer', 'storing recording in DB..');
								call.callDirection = "INCOMING";
								//agentProcessor.UploadS3Recording(call);
		
		
								const ffmpegCommand = `ffmpeg -i ${call.s3RecordedFileWav} -codec:a libmp3lame -qscale:a 2 ${call.s3RecordedFile}`;
								exec(ffmpegCommand, (error, stdout, stderr) => {
									if (!error) {
 

										// Encoding finished
										logger.log('DEB', call.channel.id, 'agent_transfer', "file encoded to mp3 " + call.s3RecordedFile+" from wav "+call.s3RecordedFileWav+"");
										if (call.s3RecordedFile != undefined && call.s3RecordedFile.length != 0) {
		
											var postApiResponseHandler = function (err, data) {
												if (!err) {
													logger.log('DEB', call.channel.id, 'agent_transfer', "UPLOAD S3 s3Upload Received: " + data.Location);
													console.log(data);
				
													call.s3uploadedUrl = data.Location;
													call.callDirection = "INCOMING";
													logger.log('DEB', call.channel.id, 'agent_transfer', "calling agentProcessor.SaveS3RecordingData ");
													agentProcessor.SaveS3RecordingData(call);
		
													fs.unlink(call.s3RecordedFileWav, (err) => {
														if (err) {
															logger.log('ERR', call.channel.id, 'agent_transfer', "DELETE error while deleting wav recording file("+call.s3RecordedFileWav+"):",err);
														  console.error(err)
														  //return
														} else {
															logger.log('DEB', call.channel.id, 'agent_transfer', "DELETE successfully deleting wav recording file"+call.s3RecordedFileWav+"",);
														}
													  
														//file removed
													  })

													  fs.unlink(call.s3RecordedFile, (err) => {
														if (err) {
															logger.log('ERR', call.channel.id, 'agent_transfer', "DELETE error while deleting mp3 recording file("+call.s3RecordedFile+"):",err);
														  console.error(err)
														  //return
														} else {
															logger.log('DEB', call.channel.id, 'agent_transfer', "DELETE successfully deleting mp3 recording file"+call.s3RecordedFile+"",);
														}
													  
														//file removed
													  })
		
				
												} 
												else {
													logger.log('ERR', call.channel.id, 'agent_transfer', 'UPLOAD s3Upload failed, store for retry');
				
													//call.s3uploadedUrl = data.Location;
				
													logger.log('DEB', call.channel.id, 'agent_transfer', "UPLOAD to s3 failed, store failed recording. SaveS3FailedRecordingData");
													agentProcessor.SaveS3FailedRecordingData(call);
												}
				
											}
				
											awsS3.s3Upload(call, call.smeID, call.s3RecordedFile, call.s3RecordedFile, postApiResponseHandler);
										}
									}
									else {
										// Something went wrong
										logger.log('ERR', call.channel.id, 'agent_transfer', "ENCODING failed, store failed recording. SaveS3FailedRecordingData error"+error+"");
		
										logger.log('ERR', call.channel.id, 'agent_transfer', "file encoded failed to mp3 " + call.s3RecordedFile+" from wav "+call.s3RecordedFileWav+"");
		
										agentProcessor.SaveS3FailedRecordingData(call);
									}
		
								});
						
		

          }
          else {
						logger.log('DEB', call.channel.id, 'agent_transfer', 'No active recording!');
					}

        }
        else {
          logger.log('DEB', call.channel.id, 'agent_transfer', 'No active recording!');
        }


        logger.log('DEB', call.channel.id, 'agent_transfer', "-----------------------------------$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");
        logger.log('DEB', call.channel.id, 'agent_transfer', "mainLegDinit(" + call.mainLegDinit + "), dialedLegDinit(" + call.dialedLegDinit + "), transferLegDinit(" + call.transferLegDinit + ")");
        if ((call.transferLegDinit == true) && (call.dialedLegDinit == true)) {
          logger.log('DEB', call.channel.id, 'agent_transfer', "transferLeg.hangup from main....");
          //transfer is killed & dialed is also killed so time to kill the main leg as well..
          call.mainLeg.hangup(function (err) {
            if (err) {
              logger.log('ERR', call.channel.id, 'agent_transfer', "Error while hangup main leg." + err);

            }
            else {
              logger.log('DEB', call.channel.id, 'agent_transfer', "success while hangup main leg.");
            }
          });
        }

        if (call.dialedLegDinit == false) {
          //go back to dailed session if its still alive.
          jump_back_to_dailed_session();
        }
        else {
          //do nothing probally the dailled is killed so this might also get killed.
        }

      });

      var evtSource = "channel:" + call.channel.id;
      logger.log('DEB', call.channel.id, 'agent_transfer', "stasisApp app name: " + cfg.asterisk.stasisApp);
      call.client.applications.subscribe(
        { applicationName: cfg.asterisk.stasisApp, eventSource: evtSource },
        function (err, application) {
          if (err) {
            logger.log('ERR', call.channel.id, 'agent_transfer', "Error while subscribing for channel!!");
          } else {
            logger.log('DEB', call.channel.id, 'agent_transfer', "Subscribed for channel successfully");
          }
        }
      );

      transferee.on('Ring', function (event, transferee) {

        logger.log('IMP', call.channel.id, 'agent_transfer', 'ON Event [Ring - transferee.on]');

        logger.log('DEB', call.channel.id, 'agent_transfer', "Ringing!!!");
      });

      /*call.client.channels.ring(
        {
          channelId: call.channel.id
        },
        function (err) {

          if (err) { logger.log("['ERR', call.channel.id, 'agent_transfer', " + this.state_name + "]: Error in Ringing Function " + err) }
        }

      );*/


      transferee.on('ChannelHold', function (event, transferee) {

        logger.log('IMP', call.channel.id, 'agent_transfer', 'ON Event [ChannelHold - transferee.on]');

        //call.holdEventTime = (new Date).getTime();
        //logger.log('DEB', call.channel.id, 'agent_transfer', "#####   ChannelHold and time is : !!!" + call.holdEventTime);
      });

      transferee.on('ChannelUnhold', function (event, transferee) {

        logger.log('IMP', call.channel.id, 'agent_transfer', 'ON Event [ChannelUnhold - transferee.on]');

        /*logger.log('DEB', call.channel.id, 'agent_transfer', " #####   ChannelUnhold !!!");
        call.currentTime = (new Date).getTime();
        var currentholdDuration = (call.currentTime - call.holdEventTime);
        logger.log('DEB', call.channel.id, 'agent_transfer', "current time is : " + call.currentTime);

        call.totalHoldDuration = call.totalHoldDuration + currentholdDuration;
        logger.log('DEB', call.channel.id, 'agent_transfer', "current hold Duration is : " + currentholdDuration);
        logger.log('DEB', call.channel.id, 'agent_transfer', "holdDuration " + call.totalHoldDuration / 1000);
        call.client.channels.setChannelVar(
          {
            channelId: call.channel.id,
            variable: "holdTime",
            value: call.totalHoldDuration / 1000
          },
          function (err) {
            if (err) { logger.log('ERR', call.channel.id, 'agent_transfer', "[" + this.state_name + "]: Error in SetChannelVar " + err) }
          }
        );*/


      });


      transferee.on('StasisStart', function (event, transferee) {

        logger.log('IMP', call.channel.id, 'agent_transfer', 'ON Event [StasisStart - transferee.on]');


        logger.log('DEB', call.channel.id, 'agent_transfer', "Stasis Started for transferee:  " + transferee.id);
        logger.log('DEB', call.channel.id, 'agent_transfer', "Stasis Started time : " + call.startTime);

        logger.log('IMP', call.channel.id, 'agent_transfer', "transferLegState Changed [" + call.transferLegState + " => connected]");
        call.transferLegState = "connected";

        call.transferLegInit = true;
        logger.log('DEB', call.channel.id, 'agent_transfer', "set transferLegInit true");

        call.TransferAgentConnectedEndTime = dateTime.getAgentDateTime();
        call.TransferAgentConnectedDuration = dateTime.calculateDuration(call.TransferAgentConnectedStartTime, call.TransferAgentConnectedEndTime);
        logger.log('DEB', call.channel.id, 'agent_transfer', "TransferAgentConnectedDuration(" + call.TransferAgentConnectedDuration + ")");


        call.transferCallFlag = '1';

        //clear the *1 waiitng dtmf prompt
        clearTimeout(call.objTransferDtmfStarOne);
        call.flagTransferDtmfStarOne = "0";

        //this is limit how many time I can transfer the call to others, default is 1
        call.callTransferRestrictionCount++;
        logger.log('DEB', call.channel.id, 'agent_transfer', "on Stasis callTransferRestrictionCount : " + call.callTransferRestrictionCount);

        //here, seems the seconds or to whom call transfered has answered the call, so lets unhole/stop playing music to customer leg now.
        if (call.transHoldFlag == "1") {



          logger.log('DEB', call.channel.id, 'agent_transfer', "UnHold (default)");

          if (call.orignalAgentHoldMusic == "1") {
            logger.log('DEB', call.channel.id, 'agent_transfer', "stop ringing to orignal agent dialer(StasisEnd)")
            if (call.channel) {
              call.orignalAgentPlayback.stop();
              call.orignalAgentHoldMusic == "0";
            }
          }

          call.client.channels.stopMoh(
            {
              channelId: call.channel.id
            },
            function (err) {
              if (err) {
                logger.log('ERR', call.channel.id, 'agent_transfer', "[" + this.state_name + "]: error while UNHOLD stopMoh customer: " + err)
              }
              else {
                logger.log('DEB', call.channel.id, 'agent_transfer', "Channel UNHOLD stopMoh now...");
                call.transHoldFlag = "0";
              }

            }
          );

        }

        if (call.transType == "UNATTENDANT_CALL_TRANSFER") {


          /*var retSession = getTransferSession(call.origAgentSessionID)
          if (retSession != "0") {
            logger.log('DEB', call.channel.id, 'agent_transfer', "hangup the Orignal Agent leg..")
            hangupAgentLeg(call.channel, retSession);
          }*/

          //logger.log('IMP', call.channel.id, 'agent_transfer', "transferLegState Changed [" + call.transferLegState + " => connected]");
          //call.transferClearState = "transfered";
          hangupAgentLeg(call.channel, call.dialedLeg);

          call.transferLeg = transferee;
          call.transferLeg.on('ChannelDtmfReceived', on_dtmf);
          call.user_ivr_state = "ok_TRANSFER_COMPLETED";
          logger.log('DEB', call.channel.id, 'agent_transfer', "Channel State Updated to [" + call.user_ivr_state + "]")


          logger.log('DEB', call.channel.id, 'agent_transfer', "stopping hold music to customer leg.")
          if (playback) {
            if (call.channel) {
              call.transHoldMusic = "0";
              logger.log('DEB', call.channel.id, 'agent_transfer', 'stopping playing file (' + call.gmediaFile + ')');
              //playback.stop();
              //console.log(playback);

            }


            call.client.channels.stopMoh(
              { channelId: call.channel.id },
              function (err) {
                if (err) {
                  logger.log('ERR', call.channel.id, 'agent_transfer', "2================stopMoh error: " + err)

                }
                else {
                  logger.log('DEB', call.channel.id, 'agent_transfer', "2================stopMoh success");
                  call.transHoldFlag = "0";
                }
              }
            );

            //after second agent answer the call, it was disconnect the call, so i below code comment.
            /*call.orignalAgentPlayback.stop(
              { channelId: call.channel.id },
              function (err) {
                if (err) {
                  logger.log('ERR', call.channel.id, 'agent_transfer', "3================stopMoh error: " + err)

                }
                else {
                  logger.log('DEB', call.channel.id, 'agent_transfer', "3================stopMoh success");
                  call.transHoldFlag = "0";
                }
              }
            );*/


          }


        }
        //stop ringing tone for orignal agent...
        if ((call.orignalAgentHoldMusic == "1") && (call.transLegFlag == "0")) {
          logger.log('DEB', call.channel.id, 'agent_transfer', "stop ringing to orignal agent dialer(StasisStart)")
          if (call.channel) {
            call.orignalAgentPlayback.stop();
            call.orignalAgentHoldMusic == "0";
          }
        }
        else if ((call.orignalAgentHoldMusic == "1") && (call.transLegFlag == "1")) {
          logger.log('DEB', call.channel.id, 'agent_transfer', "stop ringing to orignal agent transfree(StasisStart)")
          if (call.channel) {
            call.orignalAgentPlayback.stop();
            call.orignalAgentHoldMusic == "0";
          }

        }
        else {
          logger.log('DEB', call.channel.id, 'agent_transfer', "nothing to stop(StasisStart)")
        }
        //end here to stop tone for orignal agent...			

        //session.on('ChannelDtmfReceived', on_dtmf);


        addTransfreeChannelsToBridge(channel, transferee, call.callBridge);

        logger.log('DEB', call.channel.id, 'agent_transfer', "hangupAgentLeg because transfer is successfull");
        ////hangupAgentLeg(channel, call.dialedLeg);
      });

      transferee.on("ChannelHangupRequest", on_hangup);
      transferee.on("PlaybackFinished", on_playback_finished);
      transferee.on('ChannelStateChange', channelStateChange);
      logger.log('IMP', call.channel.id, 'agent_transfer', "transferLegState Changed [" + call.transferLegState + " => originating]");
      call.transferLegState = "originating";

      call.transferLegInit = true;
      logger.log('DEB', call.channel.id, 'agent_transfer', "set transferLegInit true");

      //setting this in case one transfer call already tried and trying 2nd so resetting this flag to false.
      call.transferLegDinit = false;

      transferee.originate(
        {
          endpoint: endPoint, app: cfg.asterisk.stasisApp, appArgs: 'AGENT_CH', callerId: callerID
        },
        function (err, transferee) {
          if (err) {
            logger.log('ERR', call.channel.id, 'agent_transfer', "Error in dialing(" + err + ")");

          }
          else {
            logger.log('IMP', call.channel.id, 'agent_transfer', 'Init [transferee.originate]');



          }

        });


    }
    //==========================================================================
    //==========================================================================
    //==========================================================================
    //		Transfer End Here
    //==========================================================================
    //==========================================================================
    //==========================================================================

    /************************************************************************************************
    * 
    * Function Name: hangupTransferrer
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function hangupTransferrer(session) {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [hangupTransferrer]');

      logger.log('DEB', call.channel.id, 'agent_transfer',
        'Channel ' + session.name + ' left our application, hanging up Transferrer: ' + session.name);

      session.hangup(function (err) {
      });
    }

    /************************************************************************************************
    * 
    * Function Name: hangupDialed
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function hangupDialed(channel, session) {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [hangupDialed]');

      logger.log('DEB', call.channel.id, 'agent_transfer',
        'Channel ' + channel.name + ' left our application, hanging up session channel: ' + session.name);

      session.hangup(function (err) {
        //logger.log('ERR', call.channel.id, 'agent_transfer', " Error while hanging up channel:"+ err);
      });
    }

    /************************************************************************************************
    * 
    * Function Name: hangupOriginal
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    /* handler for the session channel hanging up so we can gracefully hangup the other end */
    function hangupOriginal(channel, session) {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [hangupOriginal]');

      logger.log('DEB', call.channel.id, 'agent_transfer', 'Dialed channel ' + session.name + ' has been hung up, hanging up channel ' +
        channel.name);

      // hangup the other end
      channel.hangup(function (err) {
        // ignore error since original channel could have hung up, causing the
        // session channel to exit Stasis
      });

    }

    /************************************************************************************************
    * 
    * Function Name: hangupAgentLeg
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function hangupAgentLeg(channel, session) {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [hangupAgentLeg]');

      logger.log('DEB', call.channel.id, 'agent_transfer', 'Killing Agent Leg session.name(' + session.id + ') channel.name(' + channel.name + ')');
      session.hangup(function (err) {
      });
    }

    /************************************************************************************************
    * 
    * Function Name: addTransfreeChannelsToBridge
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function addTransfreeChannelsToBridge(channel, transfree, bridge) {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [addTransfreeChannelsToBridge]');

      logger.log('DEB', call.channel.id, 'agent_transfer', 'Adding channel ' + channel.name + ' and transfree channel ' + transfree.name + ' to bridge: ' + bridge.id);
      logger.log('DEB', call.channel.id, 'agent_transfer', '[[[[[[[[[[[[[[[[[[[[[[ transfree channel ' + transfree.id + ' added to bridge: ' + bridge.id + ']]]]]]]]]]]]]]]]]]]]]]');

      bridge.addChannel({ channel: transfree.id }, function (err) {
        if (err) {
          throw err;
        } else {
          call.BRIDGED_TIME = (new Date).getTime();
          var bridgedTime = parseInt(call.BRIDGED_TIME / 1000);
          logger.log('DEB', call.channel.id, 'agent_transfer', "Time When bridged:" + bridgedTime);
        }
      });
    }

    //bridge.addChannel({channel: 'uniqueid'});


    /************************************************************************************************
    * 
    * Function Name: removeChannelsFromBridge
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function removeChannelsFromBridge(channel, session, bridge) {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [removeChannelsFromBridge]');

      logger.log('DEB', call.channel.id, 'agent_transfer', '[[[[[[[[[[[[[[[[[[[[[ Removing channel ' + session.id + ' from bridge: ' + bridge.id + ']]]]]]]]]]]]]]]]]]]]]');

      //ari.bridges.list(function (err, bridges) {});

      /*call.client.bridges.list(function (err, bridges) 
      {
    
        logger.log('DEB', call.channel.id, 'agent_transfer', 'List of Channels in Bridge('+bridge.id+')');
        logger.log('DEB', call.channel.id, 'agent_transfer', 'List of Bridges('+bridges.bridgeId+')');
    
    
      });*/
      call.client.bridges.removeChannel({ bridgeId: bridge.id, channel: session.id }, function (err)
      //bridge.removeChannel({bridgeId: ,channel: channel.id}, function(err)
      {
        if (err) {
          throw err;
        } else {
          //call.BRIDGED_TIME = (new Date).getTime();
          //var bridgedTime = parseInt(call.BRIDGED_TIME/1000);
          //logger.log('DEB', call.channel.id, 'agent_transfer', "Time When bridged:"+bridgedTime);
          logger.log('DEB', call.channel.id, 'agent_transfer', "removeChannel");
        }
      });

    }

    /************************************************************************************************
    * 
    * Function Name: DTMF_Timeout
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function DTMF_Timeout() {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [DTMF_Timeout]');

      if ((call.timerState == "transfer_dtmf_input") && (call.flagTransferDtmfStarOne == "1")) {
        call.noDtmfTransferCount++;
        if (call.noDtmfTransferCount <= 3) {

          //if (playback) {
          //if (call.channel) {
          //call.transHoldMusic = "0";
          //logger.log('DEB', call.channel.id, 'agent_transfer', 'stopping playing file (' + call.gmediaFile + ')');
          //playback.stop();
          //}
          //}

          logger.log('DEB', call.channel.id, "timer [SNOOPING_FOR_TRY_AGAIN_LATER] sending..");
          call.transferLeg.snoopChannel(
            {
              app: cfg.asterisk.stasisApp, channelId: call.transferLeg.id, spy: 'out', whisper: 'out', appArgs: 'SNOOPING_FOR_TRY_AGAIN_LATER'
            },
            function (err, channel) {
              if (err) {
                logger.log('ERR', call.channel.id, 'agent_transfer', "error in snoopChannel: " + err)
              }
              else {
                logger.log('DEB', call.channel.id, 'agent_transfer', "Channel snoopChannel on(" + call.transferLeg.id + ")");


              }

            });
        }
        else {
          //call.noDtmfTransferCount=0;
          //no dtmf count has increased, so let unhole the customer call and connect him again.

          if (call.transHoldFlag != "0") {


            if (call.flagTransferDtmfStarOne == "1") {
              logger.log('DEB', call.channel.id, 'agent_transfer', "[timerTransferDtmf] timer initialize..");
              call.objTransferDtmfStarOne = setTimeout(DTMF_Timeout, (cfg.timer.transfer_dtmf_timer * 1000));
              call.timerState = "transfer_dtmf_input";
            }

            call.transferLeg.snoopChannel(
              {
                app: cfg.asterisk.stasisApp, channelId: call.transferLeg.id, spy: 'out', whisper: 'out', appArgs: 'SNOOPING_NOTIFY_AGENT_CUST_CALL_UNHOLD'
              },
              function (err, channel) {
                if (err) {
                  logger.log('ERR', call.channel.id, 'agent_transfer', "error in snoopChannel: " + err)
                }
                else {
                  logger.log('DEB', call.channel.id, 'agent_transfer', "Channel snoopChannel on(" + call.transferLeg.id + ")");
                }

              });



            call.client.channels.unhold(
              {
                channelId: call.channel.id
              },
              function (err) {
                if (err) {
                  logger.log('ERR', call.channel.id, 'agent_transfer', "[" + this.state_name + "]: error while UNHOLD customer: " + err)
                }
                else {
                  logger.log('DEB', call.channel.id, 'agent_transfer', "Channel UNHOLD now...");
                  call.transHoldFlag = "0";
                }

              }
            );
          }

        }

      }

    }

    /************************************************************************************************
    * 
    * Function Name: hold_call_reminder
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function hold_call_reminder() {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'Internal Function [hold_call_reminder]');
      if (call.transHoldFlag != "0") {

        call.transferLeg.snoopChannel(
          {
            app: cfg.asterisk.stasisApp, channelId: call.transferLeg.id, spy: 'out', whisper: 'out', appArgs: 'SNOOPING_NOTIFY_AGENT_CUST_CALL_ON_HOLD'
          },
          function (err, channel) {
            if (err) {
              logger.log('ERR', call.channel.id, 'agent_transfer', "error in snoopChannel: " + err)
            }
            else {
              logger.log('DEB', call.channel.id, 'agent_transfer', "Channel snoopChannel on(" + call.transferLeg.id + ")");


            }

          });

        //this timer we are starting to play music to agent, just reminder after some seconds that the customer call is on hold.
        logger.log('DEB', call.channel.id, 'agent_transfer', "[hold_call_reminder] timer initialize..");
        call.objReminderCallHoldToAgent = setTimeout(hold_call_reminder, (cfg.timer.call_hold_reminder_to_agent_timer * 1000));
        //call.flagTransferDtmfStarOne='1';

      }



    }

    /************************************************************************************************
    * 
    * Function Name: channelStateChange
    * Description: <>
    * Date: 28/April/2022
    * 
    ************************************************************************************************/
    function channelStateChange(event, session) {

      logger.log('IMP', call.channel.id, 'agent_transfer', 'ON Event [channelStateChange - ' + session.state + ']');

      logger.log('DEB', call.channel.id, 'agent_transfer', "State channelStateChange  Name:" + session.name + ", State:" + session.state + "");


      if (session.state == "Up") {

        call.transferLegInit = true;
        logger.log('DEB', call.channel.id, 'agent_transfer', "set transferLegInit true");

        agentProcessor.updateLiveCallTransfer(call, '1');

        call.TransferAgentConnectedStartTime = dateTime.getAgentDateTime();
        call.TransferAgentRingingEndTime = dateTime.getAgentDateTime();
        call.TransferAgentRingingDuration = dateTime.calculateDuration(call.TransferAgentRingingStartTime, call.TransferAgentRingingEndTime);
        logger.log('DEB', call.channel.id, 'agent_transfer', "AgentRingingDuration(" + call.TransferAgentRingingDuration + ")");

        logger.log('IMP', call.channel.id, 'agent_transfer', "transferLegState Changed [" + call.transferLegState + " => connected]");
        call.transferLegState = "connected";

        logger.log('DEB', call.channel.id, 'agent_transfer', "updateTransferAgent to AnswerFlag(answer-0)");
        updateTransferAgent(session.id, "1", "0");

        //this is to update the agent transfer leg has been answered.
        call.transAgenAnswerStatus = "0";
      }
      else if (session.state == "Ringing") {



        call.TransferAgentRingingStartTime = dateTime.getAgentDateTime();
        logger.log('DEB', call.channel.id, 'agent_transfer', "Ringing:  " + session.id);

        logger.log('IMP', call.channel.id, 'agent_transfer', "transferLegState Changed [" + call.transferLegState + " => ringing]");
        call.transferLegState = "ringing";

      }
      else {

        logger.log('DEB', call.channel.id, 'agent_transfer', "" + session.state + ":  " + session.id);

      }
    }

  }
}



module.exports = AgentOutgoingCall;

// vim: se ts=4 sw=4 expandtab

