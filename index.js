'use strict';

const fs = require('mz/fs');
const path = require('path');
const YAML = require('yaml');
const { spawn } = require('child_process');
const { formatCmdline } = require('./cmdline');

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

(async () => {
	fs.readFile(path.resolve('guests.yml'), 'utf8').then((data) => {
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

			for (let i = 0; i < count; i++) {
				const renderedTemplate = renderTemplate(templates[template], {
					guestId: i,
				});

				children.push(new Promise((resolve, reject) => {
					const proc = spawn(
						`qemu-system-${arch}`,
						renderedTemplate,
						{ stdio: 'inherit' }
					);
					proc.on('data', (data) => console.log);
					proc.on('exit', (code, signal) => {
						reject(new Error(`QEMU exited with code ${code}`));
					});
					proc.on('error', (error) => {
						reject(error);
					});

					proc.on('spawn', () => {
						resolve(proc);
					});
				}));
			}

			return Promise.all(children);
		});
	}).then((children) => {
		return new Promise((resolve, reject) => {
			// TODO: handle VM exits, crashes, etc.
		});
	});
})();
