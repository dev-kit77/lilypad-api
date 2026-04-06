/**
 * JS console logging library
 * Kit Cochrane
 * V1.00
 */

import { appendFile } from "node:fs/promises";

const fs = require('fs')

export const body = "\x1b[22m";
export const bold = "\x1b[1m";
export const succ = "\x1b[32;1m";
export const warn = "\x1b[36;1m";
export const err = "\x1b[31;1m";
export const clear = "\x1b[0m";

export class ClientLog {
  client;
  logFile;

  constructor(clientName, logPath) {
    this.client = clientName;
    this.logFile = logPath;
    
    fs.unlink(this.logFile,
      (err) => {
        if (err) {
          console.error(`Error removing file: ${err}`);
          return;
        }
      });
  }

  async out(msg, src) {
    let currTime = new Date().toISOString();
    console.log(`${currTime} ${bold}${this.client}${body}: ${msg}`);
    appendFile(this.logFile, `${currTime} ${this.client}: ${msg}`);
  }

  async warn(msg, src) {
    let currTime = new Date().toISOString();
    console.log(`${currTime} ${warn}WARNING${body}: ${msg}`);
    appendFile(this.logFile, `${currTime} WARNING: ${msg}`);
  }

  async success(msg, src) {
    let currTime = new Date().toISOString();
    console.log(`${currTime} ${succ}SUCCESS${body}: ${msg}`);
    appendFile(this.logFile, `${currTime} SUCCESS: ${msg}`);
  }

  async err(code, msg, src) {
    let currTime = new Date().toISOString();
    console.error(`${currTime} ${err}ERROR ${code}${body}: ${msg}`);
    appendFile(this.logFile, `${currTime} ERROR ${code}: ${msg}`);
  }

  async systemErr(code, msg, src) {
    let currTime = new Date().toISOString();
    console.error(
      `${currTime} ${err}${this.client} ERROR ${code}${body}: ${msg}`,
    );
    appendFile(
      this.logFile,
      `${currTime} ${this.client} ERROR ${code}: ${msg}`,
    );
  }

  async critErr(code, msg, src) {
    let currTime = new Date().toISOString();
    console.log(
      `${currTime} ${err}CRITICAL ERROR ${code}${body}: ${msg}`
    );
    appendFile(
      this.logFile, `${currTime} CRITICAL ERROR ${code}: ${msg}`
    );
  }
}
