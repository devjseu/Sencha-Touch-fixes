/**
 * Overrides sql driver for local storages adding support for mapping property in models
 * and real count
 */
Ext.define('Ext.override.data.proxy.Sql', {
    override: 'Ext.data.proxy.Sql',
    initialize: function () {
        this.callOverridden(arguments);
    },

    create: function (operation, callback, scope) {
        var me = this,
            db = me.getDatabaseObject(),
            records = operation.getRecords(),
            tableExists = me.getTableExists(),
        //todo: added by S.Widelak
        // <field-mapping>
            model = me.getModel(),
            fields = model.getFields(),
            hasMap;
        // </field-mapping>

        operation.setStarted();

        db.transaction(function (transaction) {
                if (!tableExists) {
                    me.createTable(transaction);
                }

                me.insertRecords(records, transaction, function (resultSet, error) {

                    if (operation.process(operation.getAction(), resultSet) === false) {
                        me.fireEvent('exception', me, operation);
                    }

                    if (error) {
                        operation.setException(error);
                    }


                    // todo:added by S.Widelak
                    // <field-mapping>
                    fields.each(function (field) {
                        hasMap = (field.getMapping() !== null);
                        if (hasMap) {
                            Ext.Array.each(operation.getRecords(), function (record) {
                                record.suspendEvents();
                                record.set(field.getName(), record.get(field.getMapping()));
                                record.resumeEvents();
                            });
                        }
                    });
                    // </field-mapping>
                }, me);
            },
            function (transaction, error) {
                me.setException(operation, error);
                if (typeof callback == 'function') {
                    callback.call(scope || me, operation);
                }
            },
            function (transaction) {
                if (typeof callback == 'function') {
                    callback.call(scope || me, operation);
                }
            }
        );
    },

    read: function (operation, callback, scope) {
        var me = this,
            db = me.getDatabaseObject(),
            model = me.getModel(),
        //todo: added by S.Widelak
        // <field-mapping>
            fields = model.getFields(),
        // </field-mapping>
            idProperty = model.getIdProperty(),
            tableExists = me.getTableExists(),
            params = operation.getParams() || {},
            id = params[idProperty],
            sorters = operation.getSorters(),
            filters = operation.getFilters(),
            page = operation.getPage(),
            start = operation.getStart(),
            limit = operation.getLimit(),
            filtered, i, ln,
        //todo: added by S.Widelak
        // <field-mapping>
            hasMap;
        // </field-mapping>
        params = Ext.apply(params, {
            page: page,
            start: start,
            limit: limit,
            sorters: sorters,
            filters: filters
        });

        operation.setStarted();

        db.transaction(function (transaction) {
                if (!tableExists) {
                    me.createTable(transaction);
                }

                me.selectRecords(transaction, id !== undefined ? id : params, function (resultSet, error) {
                    if (operation.process(operation.getAction(), resultSet) === false) {
                        me.fireEvent('exception', me, operation);
                    }

                    if (error) {
                        operation.setException(error);
                    }

                    if (filters && filters.length) {
                        filtered = Ext.create('Ext.util.Collection', function (record) {
                            return record.getId();
                        });
                        filtered.setFilterRoot('data');
                        for (i = 0, ln = filters.length; i < ln; i++) {
                            if (filters[i].getProperty() === null) {
                                filtered.addFilter(filters[i]);
                            }
                        }
                        filtered.addAll(operation.getRecords());

                        operation.setRecords(filtered.items.slice());
                        resultSet.setRecords(operation.getRecords());
                        resultSet.setCount(filtered.items.length);
                        resultSet.setTotal(filtered.items.length);
                    }
                    // todo:added by S.Widelak
                    // <field-mapping>
                    fields.each(function (field) {
                        hasMap = (field.getMapping() !== null);
                        if (hasMap) {
                            Ext.Array.each(operation.getRecords(), function (record) {
                                record.suspendEvents();
                                record.set(field.getName(), record.get(field.getMapping()));
                                record.resumeEvents();
                            });
                        }
                    });
                    // </field-mapping>
                });
            },
            function (transaction, error) {
                me.setException(operation, error);
                if (typeof callback == 'function') {
                    callback.call(scope || me, operation);
                }
            },
            function (transaction) {
                if (typeof callback == 'function') {
                    callback.call(scope || me, operation);
                }
            }
        );
    },
    selectRecords: function (transaction, params, callback, scope) {
        var me = this,
            table = me.getTable(),
            idProperty = me.getModel().getIdProperty(),
            sql = 'SELECT * FROM ' + table,
        // todo:added by S.Widelak
        // <sql-count>
            sqlCount = 'SELECT COUNT(*) FROM ' + table,
        // </sql-count>
            records = [],
            filterStatement = ' WHERE ',
            sortStatement = ' ORDER BY ',
            i, ln, data, result, count, rows, filter, sorter, property, value;

        result = new Ext.data.ResultSet({
            records: records,
            success: true
        });

        if (!Ext.isObject(params)) {
            sql += filterStatement + idProperty + ' = ' + params;
            sqlCount += filterStatement + idProperty + ' = ' + params;
        } else {
            ln = params.filters && params.filters.length;
            if (ln) {
                for (i = 0; i < ln; i++) {
                    filter = params.filters[i];
                    property = filter.getProperty();
                    value = filter.getValue();
                    if (property !== null) {
                        sql += filterStatement + property + ' ' + (filter.getAnyMatch() ? ('LIKE \'%' + value + '%\'') : ('= \'' + value + '\''));
                        // todo:added by S.Widelak
                        // <sql-count>
                        sqlCount += filterStatement + property + ' ' + (filter.getAnyMatch() ? ('LIKE \'%' + value + '%\'') : ('= \'' + value + '\''));
                        // </sql-count>
                        filterStatement = ' AND ';
                    }
                }
            }

            ln = params.sorters && params.sorters.length;
            if (ln) {
                for (i = 0; i < ln; i++) {
                    sorter = params.sorters[i];
                    property = sorter.getProperty();
                    if (property !== null) {
                        sql += sortStatement + property + ' ' + sorter.getDirection();
                        sortStatement = ', ';
                    }
                }
            }

            // handle start, limit, sort, filter and group params
            if (params.page !== undefined) {
                sql += ' LIMIT ' + parseInt(params.start, 10) + ', ' + parseInt(params.limit, 10);
            }
        }
        transaction.executeSql(sqlCount, null, function (tx, results) {
                // todo:added by S.Widelak
                // <sql-count>
                count = results.rows.item(0)["COUNT(*)"];
                // </sql-count>
                transaction.executeSql(sql, null,
                    function (transaction, resultSet) {
                        rows = resultSet.rows;

                        for (i = 0, ln = count; i < ln; i++) {
                            data = rows.item(i);
                            records.push({
                                clientId: null,
                                id: data[idProperty],
                                data: data,
                                node: data
                            });
                        }

                        result.setSuccess(true);
                        result.setTotal(count);
                        result.setCount(count);

                        if (typeof callback == 'function') {
                            callback.call(scope || me, result);
                        }
                    },
                    function (transaction, error) {
                        result.setSuccess(false);
                        result.setTotal(0);
                        result.setCount(0);

                        if (typeof callback == 'function') {
                            callback.call(scope || me, result, error);
                        }
                    }
                );
            },
            // todo:added by S.Widelak
            // <sql-count>
            function (transaction, error) {
                result.setSuccess(false);
                result.setTotal(0);
                result.setCount(0);

                if (typeof callback == 'function') {
                    callback.call(scope || me, result, error);
                }
            }
            // </sql-count>
        );
    }
});