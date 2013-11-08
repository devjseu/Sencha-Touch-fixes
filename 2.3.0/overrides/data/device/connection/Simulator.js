/**
 * Overrides core simulator class to provide same functionality as in native apps
 *
 */
Ext.define('Ext.override.device.connection.Simulator',{
    constructor: function () {
        var me = this;
        window.addEventListener('online', function () {
            me.fireEvent('online', me);
            me.fireEvent('onlinechange', me, true);
        });
        window.addEventListener('offline', function () {
            me.fireEvent('offline', me);
            me.fireEvent('onlinechange', me, false);
        });
        this.callOverridden(arguments);
    }
});