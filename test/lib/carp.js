function carp(obj, msg) {
	var out = print_r(obj);

	var console = window.open('','','width=300,height=400');
	console.document.write("<html><head><title>Console<"+"/title><"+"/head>");
	console.document.write("<body><code>"+(msg? "<p>"+msg+"<"+"/p>" : "")+"<pre>"+out+"<"+"/pre><"+"/code><"+"/body><"+"/html>");
	console.document.close();
}

/**
 * Concatenates the values of a variable into an easily readable string
 * @author Matt Hackett [scriptnode.com]
 * @param {Object} x The variable to debug
 * @param {Number} max The maximum number of recursions allowed (keep low, around 5 for HTML elements to prevent errors) [default: 10]
 * @param {String} sep The separator to use between [default: a single space ' ']
 * @param {Number} l The current level deep (amount of recursion). Do not use this parameter: it's for the function's own use
 */
function print_r(x, max, sep, l) {

	l = l || 0;
	max = max || 10;
	sep = sep || ' ';

	if (l > max) {
		return "[WARNING: Too much recursion]\n";
	}

	var
		i,
		r = '',
		t = typeof x,
		tab = '';

	if (x === null) {
		r += "{null}\n";
	}
	else if (t == 'object') {

		l++;

		for (i = 0; i < l; i++) {
			tab += sep;
		}

		if (x && x.push) {
			t = 'array';
		}

		r += '{' + t + "} \n";

		for (i in x) {
			try {
				r += tab + i + ': ' + print_r(x[i], max, sep, (l + 1));
			} catch(e) {
				return "[ERROR: " + e + "]\n";
			}
		}

	}
	else {

		if (t == 'string') {
			if (x == '') {
				x = '""';
			}
		}

		r += '{' + t + '} ' + x + "\n";

	}

	return r;
};