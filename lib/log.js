/**
 * JS console logging library
 * Kit Cochrane
 * V1.00
 */

import { appendFile } from "node:fs/promises";
const fs = require("fs");

export const body = "\x1b[22m";
export const bold = "\x1b[1m";
export const succ = "\x1b[32;1m";
export const warn = "\x1b[36;1m";
export const err = "\x1b[31;1m";
export const clear = "\x1b[0m";

export const log = new ClientLog(process.env.PNAME, process.env.LOGFILE);

class ClientLog {
  client;
  logFile;

  constructor(clientName, logPath) {
    fs.rename(logPath, `${logPath}.old`, (err) => {
      if (err) {
        this.warn(
          `Old logfile could not be moved or was not found. Current log may be inaccurate!`,
        );
      }
    });

    this.client = clientName;
    this.logFile = logPath;
  }

  async out(msg, src) {
    let currTime = new Date().toISOString();
    if (src === undefined) {
      console.log(`${currTime} ${bold}${this.client}${body}: ${msg}`);
      appendFile(this.logFile, `${currTime} ${this.client}: ${msg}`);
    } else {
      console.log(`${currTime} ${bold}${this.client} [${src}]${body}: ${msg}`);
      appendFile(this.logFile, `${currTime} ${this.client} [${src}]: ${msg}`);
    }
  }

  async warn(msg, src) {
    let currTime = new Date().toISOString();
    if (src === undefined) {
      console.log(`${currTime} ${warn}WARNING${body}: ${msg}`);
      appendFile(this.logFile, `${currTime} WARNING: ${msg}`);
    } else {
      console.log(`${currTime} ${warn}WARNING [${src}]${body}: ${msg}`);
      appendFile(this.logFile, `${currTime} WARNING [${src}]: ${msg}`);
    }
  }

  async success(msg, src) {
    let currTime = new Date().toISOString();
    if (src === undefined) {
      console.log(`${currTime} ${succ}SUCCESS${body}: ${msg}`);
      appendFile(this.logFile, `${currTime} SUCCESS: ${msg}`);
    } else {
      console.log(`${currTime} ${succ}SUCCESS [${src}]${body}: ${msg}`);
      appendFile(this.logFile, `${currTime} SUCCESS [${src}]: ${msg}`);
    }
  }

  async err(code, msg, src) {
    let currTime = new Date().toISOString();
    if (src === undefined) {
      console.error(`${currTime} ${err}ERROR ${code}${body}: ${msg}`);
      appendFile(this.logFile, `${currTime} ERROR ${code}: ${msg}`);
    } else {
      console.error(`${currTime} ${err}ERROR ${code} [${src}]${body}: ${msg}`);
      appendFile(this.logFile, `${currTime} ERROR ${code} [${src}]: ${msg}`);
    }
  }

  async systemErr(code, msg, src) {
    let currTime = new Date().toISOString();
    if (src === undefined) {
      console.error(
        `${currTime} ${err}${this.client} ERROR ${code}${body}: ${msg}`,
      );
      appendFile(
        this.logFile,
        `${currTime} ${this.client} ERROR ${code}: ${msg}`,
      );
    } else {
      console.error(
        `${currTime} ${err}${this.client} ERROR ${code} [${src}]${body}: ${msg}`,
      );
      appendFile(
        this.logFile,
        `${currTime} ${this.client} ERROR ${code} [${src}]: ${msg}`,
      );
    }
  }

  async critErr(code, msg, src) {
    let currTime = new Date().toISOString();
    console.log(`${currTime} ${err}CRITICAL ERROR ${code}${body}: ${msg}`);
    appendFile(this.logFile, `${currTime} CRITICAL ERROR ${code}: ${msg}`);
    if (src === undefined) {
      console.error(
        `${currTime} ${err}CRITICAL ERROR ${code} [${src}]${body}: ${msg}`,
      );
      appendFile(
        this.logFile,
        `${currTime} CRITICAL ERROR ${code} [${src}]: ${msg}`,
      );
    } else {
    }
  }
}
