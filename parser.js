'use strict';

function formatArray(arr, options={
	itemPrepend: null,
}) {
	let out = [];
	for (const item of arr) {
		if (options.itemPrepend) out.push(options.itemPrepend);
		let fmtVal = formatEntry(item);
		out.push(fmtVal);
	}

	return out;
}

function formatObject(obj, options={
	keyValueDelim: '=',
	paramDelim: ',',
}) {
	let out = [];
	for (const [key, value] of Object.entries(obj)) {
		let fmtVal = formatEntry(value);
		const preamble = [key, (value !== null) ? options.keyValueDelim : ''];
		out.push(
			preamble.concat(
				(fmtVal instanceof Array) ? fmtVal : [fmtVal]
			).join('')
		);
	}

	return out;
}

function formatEntry(entry, options={
	paramDelim: ',',
	itemPrepend: null,
}) {
	let out = [];
	if (entry == null) {
		if (options.itemPrepend) out.push(options.itemPrepend);
	} else {
		switch (entry.constructor) {
			case Object:
				if (options.itemPrepend) out.push(options.itemPrepend);
				out = out.concat(formatObject(entry));
				break;
			case Array:
				out = out.concat(formatArray(entry, options));
				break
			case Number:
			case String:
				if (options.itemPrepend) out.push(options.itemPrepend);
				out = out.concat(entry);
				break;
		}
	}

	return options.paramDelim != null
		? out.join(options.paramDelim) : out;
}

module.exports = {
	formatCmdline: (template) => {
		let cmdline = [];
		for (const [key, value] of Object.entries(template)) {
			cmdline = cmdline.concat(
				formatEntry(value, {itemPrepend: `-${key}`})
			);
		}

		return cmdline;
	}
};


