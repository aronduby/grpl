$.PubSub = {
	callbacks: {},
	add: function(e, fn){
		// make sure we have that e callback
		if(e in this.callbacks == false)
			return false;

		// add it to our callback/deffer
		if(this.isDeferred(this.callbacks[e])){
			this.callbacks[e].then(fn);
		} else {
			this.callbacks[e].add(fn);
		}

		return this;
	},
	isDeferred: function(obj){
		return 'promise' in obj;
	}
}