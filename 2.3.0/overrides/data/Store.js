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