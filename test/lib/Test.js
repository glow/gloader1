/** @namespace */
Test = {
	hasPlan: false,
	results: [],
	output: "",
	ran: 0,
	passed: 0,
	failed: 0,
	console: null
};

Test.setConsole = function(element) {
	this.console = element;
	
	this.summary = document.createElement("PRE");
	this.summary.setAttribute("class", "testSummary");
	this.summary.className = "testSummary";
	this.console.parentNode.insertBefore(this.summary, this.console.nextSibling );
	
	// flush output cache
	this.console.innerHTML = this.output;
	this.output = "";
	this.summarize();
}

Test.log = function(msg) {
	if (this.console == null) {

		if (typeof window.console != "undefined") {
			console.log(msg);
		}
		this.output += "<div>"+msg+"<"+"/div>";
		return;
	}
	
	var message = document.createElement("DIV");
	message.innerHTML = msg;
	
	this.console.appendChild(message);
	
	this.summarize();
}

Test.summarize = function() {
	if (this.summary) {
		this.summary.innerHTML = (this.hasPlan? "planned: "+this.planned+"<br>" : "")
		+ "    ran: "+this.ran+"<br>"
		+ " passed: "+this.passed+"<br>"
		+ " failed: "+this.failed+"<br>";
	}
}

Test.tell = function(msg) {
	if (typeof msg.push != "undefined") msg = "<br>"+msg.join("<br>");
	this.log(msg);
};

Test.diag = function(msg) {
	if (typeof msg.push != "undefined") msg = "# <br>"+msg.join("# <br>");
	this.log("# "+msg);
};

Test.plan = function(n) {
	this.planned = n;
	this.hasPlan = true;
	
	this.tell("1.."+this.planned);
};

Test.pass = function(msg) {
	this.ran++;
	this.passed++;
	this.tell("ok "+(this.ran? this.ran+" " : "")+"- "+msg); 
};

Test.fail = function(msg) {
	this.ran++;
	this.failed++;
	this.tell("not ok "+(this.ran? this.ran+" " : "")+"- "+msg); 
};

Test.ok = function(val, msg) { /*debug*///console.log("Test.ok("+val+", "+msg+")");
	if (!!val) Test.pass(msg);
	else Test.fail(msg);
};