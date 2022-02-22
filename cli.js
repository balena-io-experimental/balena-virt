#!/usr/bin/env node

'use strict';

const fs = require('mz/fs');
const path = require('path');
const YAML = require('yaml');
const { spawn } = require('child_process');
const { formatCmdline } = require('./parser');
const crypto = require('crypto');
const os = require('os');

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
	const hash = crypto.createHash('sha256');
	inputs.forEach(input => hash.update(input));
	const unique = hash.digest('hex')
		.slice(0, 6)
		.replace(/(..)/g, '$1:')
		.slice(0, -1);

	return `${prefix}${unique}`;
}

(async () => {
	const guestConfigPath = process.env.GUEST_CONFIG_PATH || 'guests.yml';
	fs.readFile(path.resolve(guestConfigPath), 'utf8').then((data) => {
		return YAML.parse(data);
	}).then((parsed) => {
		let templates = {};
		for (const [key, value] of Object.entries(parsed.templates)) {
			templates[key] = formatCmdline(value);
		}

		let children = [];
		parsed.guests.forEach(instance => {
			const { arch, count, template } = instance;
			console.log(`Spawning ${count} ${arch} children using template '${template}'`);

			const qemuMacPrefix = '52:54:00:';
			/* Use the first physical MAC in combination with the guestId to seed the
			 * unique MAC for the virtual interface.
			 */
			const interfaces = os.networkInterfaces();
			delete interfaces.lo;
			const physicalMac = interfaces[Object.keys(interfaces)[0]][0].mac;

			for (let i = 0; i < count; i++) {
				const renderedTemplate = renderTemplate(templates[template], {
					guestId: i,
					macAddress: generateMacAddress(
						qemuMacPrefix,
						[physicalMac, `${i}`],
					)
				});

				children.push(new Promise((resolve, reject) => {
					const proc = spawn(
						`qemu-system-${arch}`,
						renderedTemplate,
						{ stdio: 'inherit' }
					);
					proc.on('exit', (code) => {
						reject(new Error(`QEMU exited with code ${code}`));
					});
					proc.on('error', error => reject);
					proc.on('spawn', () => { resolve(proc); });
				}));
			}
		});

		return Promise.all(children);
	}).then((children) => {
		return new Promise((resolve, reject) => {
			children.forEach(child => {
				child.on('close', (code, signal) => {
					console.log(`QEMU instance with PID ${child.pid} exited with code: ${code}, signal: ${signal}`);
				});
			});

			// TODO: handle VM exits, crashes, etc.
			console.log('All instances are running');
		});
	});
})();
