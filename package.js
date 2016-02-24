'use strict';

Package.describe({
    name: 'vazco:universe-autoform-scheduler',
    summary: 'Custom "afUniverseScheduler" input type for AutoForm',
    version: '0.1.2',
    git: 'https://github.com/vazco/meteor-universe-autoform-scheduler.git'
});

Package.onUse(function (api) {
    api.versionsFrom('1.0.4');
    api.use('jquery');
    api.use('templating');
    api.use('blaze');
    api.use('underscore');
    api.use('check');
    api.use('aldeed:autoform@4.0.0');
    api.use('rajit:bootstrap3-datepicker@1.1.1');
    api.use('tsega:bootstrap3-datetimepicker@3.1.3_3');
    api.use('momentjs:moment@2.9.0');
    api.use('vazco:universe-utilities@1.0.7');
    api.use('reactive-dict@1.1.0');
    api.use('aramk:rrule@2.1.0');

    api.addFiles([
        'universe-autoform-scheduler.html',
        'universe-autoform-scheduler.js',

        'universe-autoform-bootstrap-datepicker.html',
        'universe-autoform-bootstrap-datepicker.js',

        'stylesheets/styles.css'
    ], 'client');
});
