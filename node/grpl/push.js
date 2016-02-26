/*
 *	Currently everything in here is specific to GCM setup (mostly same with front-end?)
 *	Once the Web Push Protocol is up and running this should be updated
*/


var Q = require('q'),
	murmurhash = require('murmurhash'),
	gcm_api_key = require('./gcm-api-key'),
	gcm = require('node-gcm-service');


function getPool(){ return module.parent.exports.pool; };

/*
 *	Subscribe and unsubscribe will be provided url endpoints
 *	we only want to store the id's that are at the end of those
 *	this extracts that id off the end
*/ 
function extractRegistrationId(endpoint){
	return endpoint.split('/').pop();
};

/*
 *	Store the subscription id in the database
 *	called from the service worker push manager subscription
*/
exports.subscribe = function(endpoint){
	var d = Q.defer(),
		registration_id = extractRegistrationId(endpoint);

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		// first check if the registration id already exists and we're just updating
		// normally a replace or insert on duplicate key update would work but these ids are huge (potentially 4k)
		// so no being able to index on the actual registration id field
		// and the hashes could technically collide so no using that
		// so check for the hash, and if there's none insert
		// if there's multiple compare the actual field to the value - do nothing on match, insert if no match
		var hash = murmurhash.v3(registration_id);
		db.query("SELECT hash, registration_id FROM push_subscription WHERE hash=?", [hash], function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			if(results.length === 0){
				db.query("INSERT INTO push_subscription SET hash = ?, registration_id = ?", [hash, registration_id], function(err, results){
					if(err){ d.reject(err); db.release(); return false; }
					d.resolve(registration_id);
					db.release();
				});
			} else {
				var matched = false;
				// slightly hacky way to do a foreach with the ability to break
				results.every(function(row){
					if(row.registration_id == registration_id){
						matched = true;
						return false;
					}
				});

				if(matched){
					d.resolve(registration_id);
					db.release();
				} else {
					db.query("INSERT INTO push_subscription SET hash = ?, registration_id = ?", [hash, registration_id], function(err, results){
						if(err){ d.reject(err); db.release(); return false; }
						d.resolve(registration_id);
						db.release();
					});
				}
			}
		});
	});

	return d.promise;
};

/*
 *	Remove the subscription id from the database
 *	called from the service worker push manager subscription
*/
exports.unsubscribe = function(endpoint){
	var d = Q.defer(),
		registration_id = extractRegistrationId(endpoint);

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		// see the huge note from subscribe
		var hash = murmurhash.v3(registration_id);
		db.query("SELECT id, hash, registration_id FROM push_subscription WHERE hash = ?", [hash], function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			if(results.length == 0){
				// nothing stored in db(?), just resolve
				d.resolve(registration_id);
				db.release();
			} else {
				var id = false;
				results.every(function(row){
					if(row.registration_id == registration_id){
						id = row.id;
						return false;
					}
				});

				db.query("DELETE FROM push_subscription WHERE id = ?", [id], function(err, results){
					if(err){ d.reject(err); db.release(); return false; }
					d.resolve(registration_id);
					db.release();
				});
			}
		});
	});

	return d.promise;
};



/*
 *	Send the push notification
 *	right now this is only used to trigger scoring updated notifications (since no passing data)
 *	although this could probably be greatly expanded in the future
*/
exports.send = function(dry_run){
	var d = Q.defer();

	if(dry_run == undefined || dry_run !== true)
		dry_run == false;

	getAllRegistrationIds()
	.then(function(registration_ids){

		var message = new gcm.Message({
			collapse_key: 'scoring-updated',
			data: {},
			dry_run: dry_run
		});

		var sender = new gcm.Sender();
		sender.setAPIKey(gcm_api_key);

		sender.sendMessage(message.toJSON(), registration_ids, true, function(err, rsp) {
			if(err){
				d.reject(err);
				return false;
			}

			// delete any not registered or invalid registration ids
			if(rsp.failures_length > 0){
				var failed_ids = rsp.failures.NotRegistered.concat( rsp.failures.InvalidRegistration ),
					to_remove = [];

				failed_ids.forEach(function(id){
					to_remove.push({
						registration_id: id,
						hash: murmurhash.v3(id)
					});
				});
				
				deleteSubscriptions(to_remove);
			}

			// update any new registration ids
			if(rsp.canonical_ids_length > 0){
				canonical_ids.forEach(function(subscription){
					subscription.hash = murmurhash.v3(subscription.registration_id);
					subscription.new_hash = murmurhash.v3(subscription.new_registration_id);
				});

				updateSubscriptions(canonical_ids);
			}

			var resolve_with = {
				success: rsp.success_length,
				failures: rsp.failures_length,
				canonical_ids: rsp.canonical_ids_length
			};
			d.resolve(resolve_with);
		});
	})
	.fail(function(err){
		d.reject(err);
	}).done();

	return d.promise;
};



/*
 *	Gets all of the subscribed registration ids
*/
function getAllRegistrationIds(){
	var d = Q.defer();

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		var options = {
			sql: "SELECT registration_id FROM push_subscription",
			typeCast: function(field, next){
				if(field.name == 'registration_id'){
					return field.string();
				}
				return next();
			}
		};

		db.query(options, function(err, results){
			if(err){ d.reject(err); db.release(); return false; }

			var ids = [];
			results.forEach(function(row){
				ids.push(row.registration_id);
			})
			d.resolve(ids);
			db.release();
		});
	});

	return d.promise;
};


/*
 *	Removes supplied subscriptions from the database
*/
function deleteSubscriptions(subscriptions){
	var d = Q.defer(),
		promises = [];

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		subscriptions.forEach(function(subscription){
			var promise = Q.Promise(function(resolve, reject, notify){
				// see the note in subscribe
				db.query("SELECT id, registration_id FROM push_subscription WHERE hash = ?", [subscription.hash], function(err, results){
					if(err){ reject(err); return false; }

					if(results.length == 1){
						resolve(results[0].id);
					} else {
						results.every(function(row){
							if(row.registration_id == subscription.registration_id){
								resolve(row.id);
								return false;
							}
						});	
					}
				})

			});
			promises.push(promise);
		});

		Q.allSettled(promises).then(function(results){
			var ids = [];
			results.forEach(function(r){
				if(r.state === "fulfilled") {
					ids.push(r.value);
				}
			});

			db.query("DELETE FROM push_subscription WHERE id IN (?)", [ids], function(err, results){
				if(err)
					d.reject(err); 
				else
					d.resolve(results);
				
				db.release();
			});
		});
	});

	return d.promise;
}


/*
 *	Updates supplied subscriptions to their new hash and registration id in the database
*/
function updateSubscriptions(subscriptions){
	var d = Q.defer(),
		promises = [];

	getPool().getConnection(function(err, db){
		if(err){ d.reject(err); return false; }

		subscriptions.forEach(function(subscription){
			var promise = Q.Promise(function(resolve, reject, notify){
				// see the note in subscribe
				db.query("SELECT id, registration_id FROM push_subscription WHERE hash = ?", [subscription.old_hash], function(err, results){
					if(err){ reject(err); return false; }

					var update = {
						id: null,
						hash: subscription.new_hash,
						registration_id: subscription.registration_id
					};

					if(results.length == 1){
						update.id = results[0].id;
					} else {
						results.every(function(row){
							if(row.registration_id == subscription.registration_id){
								update.id = row.id;
								return false;
							}
						});
					}

					resolve(update);
				});
			});
			promises.push(promise);			
		});

		Q.allSettled(promises).then(function(results){
			var sets = [];
			results.forEach(function(r){
				if(r.state === "fulfilled") {
					sets.push([r.value.id, r.value.hash, r.value.registration_id]);
				}
			});

			db.query("REPLACE INTO push_subscription (id, hash, registration_id) VALUES ?", [sets], function(err, results){
				if(err)
					d.reject(err); 
				else
					d.resolve(results);
				
				db.release();
			});
		});
	});

	return d.promise;
}