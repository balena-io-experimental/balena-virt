#!/usr/bin/env node

"use strict";

const fs = require("mz/fs");
const path = require("path");
const YAML = require("yaml");
const { spawn } = require("child_process");
const { formatCmdline } = require("./parser");
const crypto = require("crypto");
const os = require("os");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv))
  .usage("Usage: $0 [-c config] [-p template] [-d]")
  .alias("c", "config")
  .describe("c", "Path to YAML guest config")
  .default("c", "guests.yml")
  .alias("p", "parse")
  .describe(
    "p",
    "Parse YAML guest template and output the resulting QEMU cmdline"
  )
  .alias("d", "dry-run")
  .describe(
    "d",
    "Perform a dry run. Combined with -p, this can be used to show the QEMU cmdline and exit."
  ).argv;

function renderTemplate(template, vars) {
  return template.map((element) => {
    const matches = Object.keys(vars).filter((v) => {
      if (element.constructor === String && element.includes(`{{${v}}}`)) {
        return element;
      }
    });

    for (const match of matches) {
      element = element.replace(`{{${match}}}`, vars[match]);
    }

    return element;
  });
}

function generateMacAddress(prefix, inputs) {
  const hash = crypto.createHash("sha256");
  inputs.forEach((input) => hash.update(input));
  const unique = hash
    .digest("hex")
    .slice(0, 6)
    .replace(/(..)/g, "$1:")
    .slice(0, -1);

  return `${prefix}${unique}`;
}

(async () => {
  const guestConfigPath = process.env.GUEST_CONFIG_PATH || argv.config;
  fs.readFile(path.resolve(guestConfigPath), "utf8")
    .then((data) => {
      return YAML.parse(data, { merge: true });
    })
    .then((parsed) => {
      let templates = {};
      for (const [key, value] of Object.entries(parsed.templates)) {
        if (!value) {
          console.warn(`WARNING: template '${key}' is empty, skipping`);
          continue;
        }

        templates[key] = formatCmdline(value);
      }

      let children = [];
      parsed.guests.forEach((instance) => {
        const { arch, count, template } = instance;

        if (!argv.dryRun) {
          console.log(
            `Spawning ${count} ${arch} children using template '${template}'`
          );
        }

        const qemuMacPrefix = "52:54:00:";
        /* Use the first physical MAC in combination with the guestId to seed the
         * unique MAC for the virtual interface.
         */
        const interfaces = os.networkInterfaces();
        delete interfaces.lo;
        const physicalMac = interfaces[Object.keys(interfaces)[0]][0].mac;

        for (let i = 0; i < count; i++) {
          const renderedTemplate = renderTemplate(templates[template], {
            guestId: i,
            macAddress: generateMacAddress(qemuMacPrefix, [
              physicalMac,
              `${i}`,
            ]),
            templateName: template,
          });

          if (
            argv.parse === true ||
            (argv.parse instanceof Array &&
              argv.parse.indexOf(template) > -1) ||
            argv.parse === template
          ) {
            console.log(
              `[${template}]: qemu-system-${arch} ${renderedTemplate.join(" ")}`
            );
          }

          if (argv.dryRun) return;

          children.push(
            new Promise((resolve, reject) => {
              const proc = spawn(`qemu-system-${arch}`, renderedTemplate, {
                stdio: "inherit",
              });
              proc.on("exit", (code) => {
                reject(new Error(`QEMU exited with code ${code}`));
              });
              proc.on("error", (error) => reject);
              proc.on("spawn", () => {
                resolve(proc);
              });
            })
          );
        }
      });

      return Promise.all(children);
    })
    .then((children) => {
      return new Promise((resolve, reject) => {
        children.forEach((child) => {
          child.on("close", (code, signal) => {
            console.log(
              `QEMU instance with PID ${child.pid} exited with code: ${code}, signal: ${signal}`
            );
          });
        });

        // TODO: handle VM exits, crashes, etc.
        console.log("All instances are running");
      });
    });
})();
