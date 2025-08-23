import fs from "fs";
import path from "path";
import chalk from "chalk";

class Logger {
  constructor({ name = "app" } = {}) {
    this.name = name;
    
    // Ensure log directory exists
    const logDir = "./log";
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    this.logFile = path.join(logDir, `${name}.log`);
    this.colors = {
      info: chalk.blue,
      success: chalk.green,
      warn: chalk.yellow,
      error: chalk.red,
      debug: chalk.gray,
      peer: chalk.magenta,
      connection: chalk.cyan,
    };
  }

  _formatMessage({ level, message, data = null }) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.name.toUpperCase()}] [${level.toUpperCase()}]`;
    let fullMessage = `${prefix} ${message}`;

    if (data) {
      fullMessage += ` ${JSON.stringify(data)}`;
    }

    return fullMessage;
  }

  _writeToFile({ message }) {
    try {
      fs.appendFileSync(this.logFile, message + "\n");
    } catch (error) {
      console.error("Failed to write to log file:", error.message);
    }
  }

  _log({ level, message, data = null }) {
    const formattedMessage = this._formatMessage({ level, message, data });
    const coloredMessage = this.colors[level] ? this.colors[level](formattedMessage) : formattedMessage;

    console.log(coloredMessage);
    this._writeToFile({ message: formattedMessage });
  }

  info(message, data) {
    this._log({ level: "info", message, data });
  }
  success(message, data) {
    this._log({ level: "success", message, data });
  }
  warn(message, data) {
    this._log({ level: "warn", message, data });
  }
  error(message, data) {
    this._log({ level: "error", message, data });
  }
  debug(message, data) {
    this._log({ level: "debug", message, data });
  }
  peer(message, data) {
    this._log({ level: "peer", message, data });
  }
  connection(message, data) {
    this._log({ level: "connection", message, data });
  }

  separator() {
    const line = "─".repeat(80);
    console.log(chalk.gray(line));
    this._writeToFile(line);
  }
}

export default Logger;
