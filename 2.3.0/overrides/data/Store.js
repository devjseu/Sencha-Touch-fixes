/**
* Automatically synchronize store after create response from server.
* Checks if returned records are the same as on frontend and removes those
* which wasn't created.
* IMPORTANT: response should contain clientId property in each response
*/
Ext.define('Ext.override.data.Store', {
    override: 'Ext.data.Store',
    initialize: function () {
        this.callOverridden(arguments);
    },
    /**
     * Bugfix TOUCH-4738
     */
    sync: function (options) {
        var me = this,
            operations = {},
            toCreate = me.getNewRecords(),
            toUpdate = me.getUpdatedRecords(),
            toDestroy = me.getRemovedRecords(),
            needsSync = false;

        if (me.isSynchronizing()) {
            console.log('need sync again');
            me.syncAgain = true;
            return {
                added: null,
                updated: null,
                removed: null
            };
        }

        if (toCreate.length > 0) {
            operations.create = toCreate;
            needsSync = true;
        }

        if (toUpdate.length > 0) {
            operations.update = toUpdate;
            needsSync = true;
        }

        if (toDestroy.length > 0) {
            operations.destroy = toDestroy;
            needsSync = true;
        }

        if (needsSync && me.fireEvent('beforesync', this, operations) !== false) {
            me.synchronizing = true;
            me.getProxy().batch(Ext.merge({
                operations: operations,
                listeners: me.getBatchListeners()
            }, options || {}));
        }

        return {
            added: toCreate,
            updated: toUpdate,
            removed: toDestroy
        };
    },
    /**
     * Bugfix TOUCH-4738
     */
    onProxyWrite: function (operation) {
        var me = this,
            success = operation.wasSuccessful(),
            records = operation.getRecords();

        switch (operation.getAction()) {
            case 'create':
                me.onCreateRecords(records, operation, success);
                break;
            case 'update':
                me.onUpdateRecords(records, operation, success);
                break;
            case 'destroy':
                me.onDestroyRecords(records, operation, success);
                break;
        }

        if (success) {
            me.fireEvent('write', me, operation);
        }
        //this is a callback that would have been passed to the 'create', 'update' or 'destroy' function and is optional
        Ext.callback(operation.getCallback(), operation.getScope() || me, [records, operation, success]);
        // if we done clear flag and check if we need sync store again
        me.synchronizing = false;
        if (me.needSyncAgain()) {
            me.syncAgain = false;
            me.sync()
        }
    },
    onCreateRecords: function (records, operation, success) {
        var backendRecords = operation.getResultSet().getRecords(),
            store = this;
        Ext.Array.forEach(backendRecords, function (r, i, a) {
            if (!Ext.Object.getKeys(r.data).length) {
                store.each(function (rec) {
                    if (rec.getId() === r.node.clientId) {
                        store.remove(rec);
                    }
                });
                store.removed = [];
            }
        });
    }
});