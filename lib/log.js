/**
 * JS console logging library
 * Kit Cochrane
 * V1.00
 */

//imports
import { appendFile } from "node:fs/promises";
const fs = require("fs");

//console esc code constants
export const body = "\x1b[22m";
export const bold = "\x1b[1m";
export const succ = "\x1b[32;1m";
export const warn = "\x1b[36;1m";
export const err = "\x1b[31;1m";
export const clear = "\x1b[0m";
export const grey = "\x1b[90m";

//log constant export to be used to add to log, loading values from .env
export const log = new ClientLog(process.env.PNAME, process.env.LOGFILE);

//log class
class ClientLog {
  //class fields
  startTime;
  client;
  logFile;

  /**
   * Constructor for the log class
   * @param {String} clientName Name given for generic messages in the log
   * @param {String} logPath Path to the log file
   */
  constructor(clientName, logPath) {
    //get start time for uptime tracking
    this.startTime = new Date();

    //rename old log
    fs.rename(logPath, `${logPath}.old`, (err) => {
      if (err) {
        this.warn(
          `Old logfile could not be moved or was not found. Current log may be inaccurate!`,
        );
      }
    });

    //init class fields
    this.client = clientName;
    this.logFile = logPath;
  }

  async uptime() {
    //get current time
    let currTime = new Date();

    //calculate uptime
    let uptime = currTime.getTime() - this.startTime.getTime();

    //get hours, minutes, and seconds
    let seconds = Math.floor(uptime / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(seconds / 3600);

    //return uptime depending on time
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes % 60}m ${seconds % 60}s`;
    } else {
      return `${seconds % 60}s`;
    }
  }

  /**
   * Method to write to the log
   * @param {String} msg The message to be written
   * @param {String} src The source, If needed
   */
  async out(msg, src) {
    //get current time for message
    let currTime = new Date().toISOString();

    //check for src designation
    if (src === undefined) {
      //log to console
      console.log(
        `${grey}${currTime} ${clear}${bold}${this.client}${body}: ${msg}`,
      );
      //append to log file
      appendFile(this.logFile, `${currTime} ${this.client}: ${msg}\n`);
    } else {
      //log to console with src
      console.log(
        `${grey}${currTime} ${clear}${bold}${this.client} [${src}]${body}: ${msg}`,
      );
      //append to log file
      appendFile(this.logFile, `${currTime} ${this.client} [${src}]: ${msg}\n`);
    }
  }

  /**
   * Log a warning message
   * @param {String} msg The message to be written
   * @param {String} src The source, If needed
   */
  async warn(msg, src) {
    //get current time
    let currTime = new Date().toISOString();

    //check for src designation
    if (src === undefined) {
      //log to console without src designation
      console.log(`${grey}${currTime} ${clear}${warn}WARNING${body}: ${msg}`);
      //append to log file without src designation
      appendFile(this.logFile, `${currTime} WARNING: ${msg}\n`);
    } else {
      //log to console
      console.log(
        `${grey}${currTime} ${clear}${warn}WARNING [${src}]${body}: ${msg}`,
      );
      //append to log file
      appendFile(this.logFile, `${currTime} WARNING [${src}]: ${msg}\n`);
    }
  }

  async success(msg, src) {
    //get current time
    let currTime = new Date().toISOString();

    //check for src designation
    if (src === undefined) {
      //log to console without src designation
      console.log(`${grey}${currTime} ${clear}${succ}SUCCESS${body}: ${msg}`);
      //append to log file
      appendFile(this.logFile, `${currTime} SUCCESS: ${msg}\n`);
    } else {
      //log to console
      console.log(
        `${grey}${currTime} ${clear}${succ}SUCCESS [${src}]${body}: ${msg}`,
      );
      //append to log file
      appendFile(this.logFile, `${currTime} SUCCESS [${src}]: ${msg}\n`);
    }
  }

  /**
   * Log a generic error message.
   * @param {int} code The error code.
   * @param {String} msg The error message to log.
   * @param {String} src The source of the error.
   */
  async err(code, msg, src) {
    //get current time
    let currTime = new Date().toISOString();

    //check for src designation
    if (src === undefined) {
      //no src designation, log without src
      console.error(
        `${grey}${currTime} ${clear}${err}ERROR ${code}${body}: ${msg}`,
      );
      //append to log file without src
      appendFile(this.logFile, `${currTime} ERROR ${code}: ${msg}\n`);
    } else {
      //src designation, log with src
      console.error(
        `${grey}${currTime} ${clear}${err}ERROR ${code} [${src}]${body}: ${msg}`,
      );
      //append to log file with src
      appendFile(this.logFile, `${currTime} ERROR ${code} [${src}]: ${msg}\n`);
    }
  }

  /**
   * Logs a system error.
   * @param {int} code The error code.
   * @param {String} msg The error message to log.
   * @param {String} src The source of the error.
   */
  async systemErr(code, msg, src) {
    //get current time
    let currTime = new Date().toISOString();

    //check for src designation
    if (src === undefined) {
      //no src, log without src
      console.error(
        `${grey}${currTime} ${clear}${err}${this.client} ERROR ${code}${body}: ${msg}`,
      );
      //append to log file
      appendFile(
        this.logFile,
        `${currTime} ${this.client} ERROR ${code}: ${msg}\n`,
      );
    } else {
      //log with src
      console.error(
        `${grey}${currTime} ${clear}${err}${this.client} ERROR ${code} [${src}]${body}: ${msg}`,
      );
      //append to log file
      appendFile(
        this.logFile,
        `${currTime} ${this.client} ERROR ${code} [${src}]: ${msg}\n`,
      );
    }
  }

  /**
   * Logs a critical error.
   * @param {int} code The error code.
   * @param {String} msg The error message to log.
   * @param {String} src The source of the error.
   */
  async critErr(code, msg, src) {
    //get current time
    let currTime = new Date().toISOString();

    //check for src designation
    if (src === undefined) {
      //log to console without src designation
      console.error(
        `${grey}${currTime} ${clear}${err}CRITICAL ERROR ${code} [${src}]${body}: ${msg}`,
      );
      //append to log file
      appendFile(
        this.logFile,
        `${currTime} CRITICAL ERROR ${code} [${src}]: ${msg}\n`,
      );
    } else {
      //log to console
      console.error(
        `${currTime} ${clear}${err}CRITICAL ERROR ${code}${body}: ${msg}`,
      );
      //append to log file
      appendFile(this.logFile, `${currTime} CRITICAL ERROR ${code}: ${msg}\n`);
    }
  }
}
