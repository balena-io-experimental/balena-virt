'use strict';

function formatEntry(obj, options={
	keyValueDelim: '=',
	paramDelim: ',',
	itemPrepend: null,
}) {
	let out = [];
	for (const [key, value] of Object.entries(obj)) {
		let fmtVal = (value instanceof Object)
			? formatEntry(value) : value;
		const preamble = (obj instanceof Array) ? [] : [key, options.keyValueDelim];
		if (options.itemPrepend) out.push(options.itemPrepend);
		out.push(
			preamble.concat(
				(fmtVal instanceof Array) ? fmtVal : [fmtVal]
			).join('')
		);
	}

	return options.paramDelim != null
		? out.join(options.paramDelim) : out;
}

module.exports = {
	formatCmdline: (template) => {
		let cmdline = [];
		for (const [key, value] of Object.entries(template)) {
			switch(key) {
				case 'drives':
					cmdline = cmdline.concat(formatEntry(value, {
						itemPrepend: '-drive',
					}));
					break;
				case 'net':
					cmdline = cmdline.concat(formatEntry(value, {
						itemPrepend: '-net',
						keyValueDelim: ',',
					}));
					break;
				default:
					let arg = [`-${key}`]
					if (value) arg.push(value);
					cmdline = cmdline.concat(arg);
			}
		}

		return cmdline;
	}
};


